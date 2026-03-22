"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  CreateRecipeError,
  createRecipe
} from "@recipes/server/recipes/createRecipe"
import {
  CurrentUserError,
  requireCurrentUser
} from "@recipes/server/auth/requireCurrentUser"
import { getDbPool } from "@recipes/server/db/pool"
import { isCognitoAdmin } from "@recipes/utils/cognitoJwt"
import type { RecipeEditorActionState } from "../(ui)/create-recipe-form/actionTypes"
import { parseRecipeFormData } from "@recipes/server/recipes/parseRecipeFormData"

function tryGetRecipeId(recipe: unknown): number | null {
  if (!recipe || typeof recipe !== "object") return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyRecipe = recipe as any
  const id = Number(anyRecipe.id ?? anyRecipe.recipeId)
  return Number.isInteger(id) && id > 0 ? id : null
}

export default async function createRecipeAction(
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

  const payload = {
    createdBySub: currentUser.sub,
    ...parsedFormData.value
  }

  try {
    if (!isCognitoAdmin(currentUser.payload)) {
      const pool = await getDbPool()
      const countResult = await pool.query<{ cnt: number }>(
        "select count(*)::int as cnt from recipes where created_by_sub = $1",
        [currentUser.sub]
      )
      const existing = Number(countResult.rows[0]?.cnt ?? 0)
      if (existing >= 3) {
        return {
          status: "error",
          httpStatus: 400,
          message: "Recipe limit reached (3). Upgrade to create more."
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { status: "error", message }
  }

  let recipeId: number | null = null
  let createdRecipe: unknown = null

  try {
    createdRecipe = await createRecipe(payload)
    recipeId = tryGetRecipeId(createdRecipe)
  } catch (err) {
    if (err instanceof CreateRecipeError) {
      return {
        status: "error",
        httpStatus: err.httpStatus,
        message: err.message
      }
    }

    const message = err instanceof Error ? err.message : String(err)
    return { status: "error", message }
  }

  if (recipeId) {
    revalidatePath("/recipe", "layout")
    revalidatePath(`/recipe/${recipeId}`)
    redirect(`/recipe/${recipeId}`)
  }

  return {
    status: "error",
    message:
      "Recipe created, but the API response did not include an id to redirect to."
  }
}
