"use server"

import "server-only"

import { revalidatePath } from "next/cache"

import {
  CurrentUserError,
  requireCurrentUser
} from "@recipes/server/auth/requireCurrentUser"
import {
  addRecipeIngredientsToShoppingList,
  AddRecipeIngredientsToShoppingListError,
  type ShoppingListIngredientSelectionInput
} from "@recipes/server/shopping-list/addRecipeIngredientsToShoppingList"
import { RecipeOwnershipError } from "@recipes/server/recipes/ensureRecipeOwnership"
import { getDbPool } from "@recipes/server/db/pool"
import { isCognitoAdmin } from "@recipes/utils/cognitoJwt"

import type { AddRecipeIngredientsToShoppingListActionState } from "../../shopping-list/(ui)/actionTypes"

function parseSelectedIngredients(
  value: FormDataEntryValue | null
): ShoppingListIngredientSelectionInput[] | null {
  if (typeof value !== "string") return null

  try {
    const parsed = JSON.parse(value) as unknown
    if (!Array.isArray(parsed)) return null

    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return []

      const ingredientId = Number(
        (entry as { ingredientId?: unknown }).ingredientId
      )
      const quantityInput = (entry as { quantityInput?: unknown }).quantityInput
      const unit = (entry as { unit?: unknown }).unit

      if (!Number.isInteger(ingredientId) || ingredientId <= 0) {
        return []
      }

      return [
        {
          ingredientId,
          quantityInput:
            typeof quantityInput === "string" ? quantityInput : undefined,
          unit: typeof unit === "string" ? unit : undefined
        }
      ]
    })
  } catch {
    return null
  }
}

export default async function addRecipeIngredientsToShoppingListAction(
  recipeId: number,
  _prevState: AddRecipeIngredientsToShoppingListActionState,
  formData: FormData
): Promise<AddRecipeIngredientsToShoppingListActionState> {
  let currentUser
  try {
    currentUser = await requireCurrentUser()
  } catch (error) {
    if (error instanceof CurrentUserError) {
      return {
        status: "error",
        httpStatus: error.httpStatus,
        message: error.message
      }
    }

    return {
      status: "error",
      httpStatus: 401,
      message: "Missing auth token. Please log in again."
    }
  }

  const selectedIngredients = parseSelectedIngredients(
    formData.get("ingredientsJson")
  )
  if (!selectedIngredients || selectedIngredients.length === 0) {
    return {
      status: "error",
      message: "Select at least one ingredient to add to the shopping list."
    }
  }

  try {
    if (!isCognitoAdmin(currentUser.payload)) {
      try {
        const pool = await getDbPool()
        const countResult = await pool.query<{ cnt: number }>(
          "select count(*)::int as cnt from shopping_list_items sli join shopping_lists sl on sl.id = sli.shopping_list_id where sl.owner_sub = $1 and sli.is_checked = false",
          [currentUser.sub]
        )
        const existing = Number(countResult.rows[0]?.cnt ?? 0)
        if (existing + selectedIngredients.length > 20) {
          return {
            status: "error",
            httpStatus: 400,
            message: `Shopping list limit reached (20 items). You may add ${Math.max(
              0,
              20 - existing
            )} more. Upgrade to add more.`
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return { status: "error", message }
      }
    }

    const result = await addRecipeIngredientsToShoppingList({
      ownerSub: currentUser.sub,
      recipeId,
      ingredients: selectedIngredients
    })

    revalidatePath("/recipe/shopping-list")

    return {
      status: "success",
      addedCount: result.addedCount,
      skippedCount: result.skippedCount
    }
  } catch (error) {
    if (
      error instanceof CurrentUserError ||
      error instanceof RecipeOwnershipError ||
      error instanceof AddRecipeIngredientsToShoppingListError
    ) {
      return {
        status: "error",
        httpStatus: error.httpStatus,
        message: error.message
      }
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : String(error)
    }
  }
}
