"use server"

import "server-only"

import {
  CurrentUserError,
  requireCurrentUser
} from "@recipes/server/auth/requireCurrentUser"
import {
  getIngredientsList,
  type IngredientListItem
} from "@recipes/server/ingredients/getIngredients"

export async function getIngredients(): Promise<IngredientListItem[]> {
  try {
    await requireCurrentUser()
    return await getIngredientsList()
  } catch (error) {
    if (error instanceof CurrentUserError) {
      throw new Error(error.message)
    }

    throw error
  }
}
