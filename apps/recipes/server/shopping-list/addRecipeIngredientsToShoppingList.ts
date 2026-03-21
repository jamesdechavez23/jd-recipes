import "server-only"

import { withDbTransaction } from "@recipes/server/db/pool"
import { ensureRecipeOwnership } from "@recipes/server/recipes/ensureRecipeOwnership"
import { getRecipeByIdFromDb } from "@recipes/server/recipes/getRecipeById"

import { ensureShoppingListForOwner } from "./ensureShoppingListForOwner"

export class AddRecipeIngredientsToShoppingListError extends Error {
  httpStatus: number

  constructor(httpStatus: number, message: string) {
    super(message)
    this.name = "AddRecipeIngredientsToShoppingListError"
    this.httpStatus = httpStatus
  }
}

type ExistingItemRow = {
  ingredientId: number | null
}

export type ShoppingListIngredientSelectionInput = {
  ingredientId: number
  quantityInput?: string | null
  unit?: string | null
}

function sanitizeText(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : ""
  return trimmed || null
}

function parseNumericQuantity(value: string | null) {
  if (!value) return null

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function addRecipeIngredientsToShoppingList(input: {
  ownerSub: string
  recipeId: number
  ingredients: ShoppingListIngredientSelectionInput[]
}) {
  await ensureRecipeOwnership(input.recipeId, input.ownerSub)

  const recipe = await getRecipeByIdFromDb(input.recipeId)
  if (!recipe) {
    throw new AddRecipeIngredientsToShoppingListError(404, "Recipe not found")
  }

  const ingredientById = new Map(
    recipe.ingredients.map((ingredient) => [
      ingredient.ingredientId,
      ingredient
    ])
  )

  const seenIngredientIds = new Set<number>()
  const selectedIngredients = input.ingredients.flatMap((selection) => {
    if (
      !Number.isInteger(selection.ingredientId) ||
      selection.ingredientId <= 0
    ) {
      return []
    }

    if (seenIngredientIds.has(selection.ingredientId)) {
      return []
    }

    seenIngredientIds.add(selection.ingredientId)

    const recipeIngredient = ingredientById.get(selection.ingredientId)
    if (!recipeIngredient) {
      throw new AddRecipeIngredientsToShoppingListError(
        400,
        "One or more selected ingredients do not belong to this recipe."
      )
    }

    const quantityInput = sanitizeText(selection.quantityInput)
    const unit = sanitizeText(selection.unit)
    const quantity = parseNumericQuantity(quantityInput)

    if (quantity !== null && !unit) {
      throw new AddRecipeIngredientsToShoppingListError(
        400,
        `Please provide a unit for ${recipeIngredient.name}.`
      )
    }

    return [
      {
        ingredientId: selection.ingredientId,
        name: recipeIngredient.name,
        quantity,
        quantityDisplay: quantityInput,
        unit
      }
    ]
  })

  if (selectedIngredients.length === 0) {
    throw new AddRecipeIngredientsToShoppingListError(
      400,
      "Select at least one ingredient to add to the shopping list."
    )
  }

  if (recipe.ingredients.length === 0) {
    return {
      shoppingListId: (await ensureShoppingListForOwner(input.ownerSub)).id,
      addedCount: 0,
      skippedCount: 0
    }
  }

  const shoppingList = await ensureShoppingListForOwner(input.ownerSub)

  return withDbTransaction(async (client) => {
    const ingredientIds = selectedIngredients.map(
      (ingredient) => ingredient.ingredientId
    )

    const existingItemsResult = await client.query<ExistingItemRow>(
      'select ingredient_id as "ingredientId" from shopping_list_items where shopping_list_id = $1 and added_from_recipe_id = $2 and is_checked = false and ingredient_id = any($3::int[])',
      [shoppingList.id, input.recipeId, ingredientIds]
    )

    const existingIngredientIds = new Set(
      existingItemsResult.rows
        .map((row) => row.ingredientId)
        .filter((ingredientId): ingredientId is number =>
          Number.isInteger(ingredientId)
        )
    )

    const missingIngredients = recipe.ingredients.filter(
      (ingredient) =>
        ingredientIds.includes(ingredient.ingredientId) &&
        !existingIngredientIds.has(ingredient.ingredientId)
    )

    for (const ingredient of selectedIngredients) {
      if (existingIngredientIds.has(ingredient.ingredientId)) {
        continue
      }

      await client.query(
        "insert into shopping_list_items (shopping_list_id, ingredient_id, ingredient_name_snapshot, quantity, quantity_display, unit, added_from_recipe_id) values ($1, $2, $3, $4, $5, $6, $7)",
        [
          shoppingList.id,
          ingredient.ingredientId,
          ingredient.name,
          ingredient.quantity,
          ingredient.quantityDisplay,
          ingredient.unit,
          input.recipeId
        ]
      )
    }

    if (missingIngredients.length > 0) {
      await client.query(
        "update shopping_lists set updated_at = now() where id = $1",
        [shoppingList.id]
      )
    }

    return {
      shoppingListId: shoppingList.id,
      addedCount: selectedIngredients.length - existingIngredientIds.size,
      skippedCount: existingIngredientIds.size
    }
  })
}
