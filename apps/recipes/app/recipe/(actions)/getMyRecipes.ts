"use server"

import "server-only"

import {
  CurrentUserError,
  requireCurrentUser
} from "@recipes/server/auth/requireCurrentUser"
import {
  getMyRecipesByCreatorSub,
  type MyRecipeListItem
} from "@recipes/server/recipes/getMyRecipes"

export default async function getMyRecipes(): Promise<MyRecipeListItem[]> {
  try {
    const currentUser = await requireCurrentUser()
    return await getMyRecipesByCreatorSub(currentUser.sub)
  } catch (error) {
    if (error instanceof CurrentUserError) {
      throw new Error(error.message)
    }

    throw error
  }
}
