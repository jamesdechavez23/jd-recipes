"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import type { RecipeDeleteActionState } from "../../new/(ui)/create-recipe-form/actionTypes"
import {
  CurrentUserError,
  requireCurrentUser
} from "@recipes/server/auth/requireCurrentUser"
import { deleteRecipe } from "@recipes/server/recipes/deleteRecipe"
import { RecipeOwnershipError } from "@recipes/server/recipes/ensureRecipeOwnership"

export default async function deleteRecipeAction(
  recipeId: number,
  _prevState: RecipeDeleteActionState,
  _formData: FormData
): Promise<RecipeDeleteActionState> {
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

  try {
    await deleteRecipe({
      recipeId,
      deletedBySub: currentUser.sub
    })
  } catch (error) {
    if (error instanceof RecipeOwnershipError) {
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
  redirect("/recipe")
}
