"use server"

import "server-only"

import {
  AdminAccessError,
  requireAdminAccessToken
} from "@recipes/utils/requireAdmin"
import { createIngredient } from "@recipes/server/ingredients/createIngredient"
import type { CreateIngredientActionState } from "../(ui)/create-recipe-form/actionTypes"

function asTrimmedString(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return ""
  return value.trim()
}

export default async function createIngredientAction(
  _prevState: CreateIngredientActionState,
  formData: FormData
): Promise<CreateIngredientActionState> {
  try {
    await requireAdminAccessToken()
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return {
        status: "error",
        httpStatus: error.httpStatus,
        message: error.message
      }
    }
    throw error
  }

  const name = asTrimmedString(formData.get("name"))
  const category = asTrimmedString(formData.get("category"))
  const unit = asTrimmedString(formData.get("unit"))

  if (!name) {
    return { status: "error", message: "Ingredient name is required." }
  }

  const payload = {
    name,
    category: category || undefined,
    unit: unit || undefined
  }

  try {
    const ingredient = await createIngredient(payload)

    return {
      status: "success",
      ingredient
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { status: "error", message }
  }
}
