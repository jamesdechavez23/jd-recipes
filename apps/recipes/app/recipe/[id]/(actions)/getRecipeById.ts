"use server"

import "server-only"

import {
  CurrentUserError,
  requireCurrentUser
} from "@recipes/server/auth/requireCurrentUser"
import {
  getRecipeByIdFromDb,
  type RecipeById,
  type RecipeIngredient
} from "@recipes/server/recipes/getRecipeById"

export default async function getRecipeById({
  id
}: {
  id: number
}): Promise<RecipeById> {
  try {
    await requireCurrentUser()
    const recipe = await getRecipeByIdFromDb(id)

    if (!recipe) {
      throw new Error("Recipe not found")
    }

    return recipe
  } catch (error) {
    if (error instanceof CurrentUserError) {
      throw new Error(error.message)
    }

    throw error
  }
}
