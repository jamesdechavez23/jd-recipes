"use server"

import "server-only"

import { notFound } from "next/navigation"

import {
  CurrentUserError,
  requireCurrentUser
} from "@recipes/server/auth/requireCurrentUser"
import {
  getRecipeByIdFromDb,
  type RecipeById
} from "@recipes/server/recipes/getRecipeById"
import {
  ensureRecipeOwnership,
  RecipeOwnershipError
} from "@recipes/server/recipes/ensureRecipeOwnership"

export default async function getRecipeById({
  id
}: {
  id: number
}): Promise<RecipeById> {
  try {
    const currentUser = await requireCurrentUser()
    await ensureRecipeOwnership(id, currentUser.sub)
    const recipe = await getRecipeByIdFromDb(id)

    if (!recipe) {
      throw new Error("Recipe not found")
    }

    return recipe
  } catch (error) {
    if (error instanceof RecipeOwnershipError) {
      notFound()
    }

    if (error instanceof CurrentUserError) {
      throw new Error(error.message)
    }

    throw error
  }
}
