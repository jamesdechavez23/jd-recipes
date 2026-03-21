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
