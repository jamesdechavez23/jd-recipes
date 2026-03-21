"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import type { RecipeEditorActionState } from "../../new/(ui)/create-recipe-form/actionTypes"
import {
  CurrentUserError,
  requireCurrentUser
} from "@recipes/server/auth/requireCurrentUser"
import { CreateRecipeError } from "@recipes/server/recipes/createRecipe"
import { RecipeOwnershipError } from "@recipes/server/recipes/ensureRecipeOwnership"
import { parseRecipeFormData } from "@recipes/server/recipes/parseRecipeFormData"
import { updateRecipe } from "@recipes/server/recipes/updateRecipe"

export default async function updateRecipeAction(
  recipeId: number,
  _prevState: RecipeEditorActionState,
  formData: FormData
): Promise<RecipeEditorActionState> {
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

  const parsedFormData = parseRecipeFormData(formData)
  if (!parsedFormData.ok) {
    return { status: "error", message: parsedFormData.error }
  }

  try {
    await updateRecipe({
      recipeId,
      updatedBySub: currentUser.sub,
      ...parsedFormData.value
    })
  } catch (error) {
    if (
      error instanceof CurrentUserError ||
      error instanceof RecipeOwnershipError ||
      error instanceof CreateRecipeError
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

  revalidatePath("/recipe", "layout")
  revalidatePath(`/recipe/${recipeId}`)
  revalidatePath(`/recipe/${recipeId}/edit`)
  redirect(`/recipe/${recipeId}`)
}
