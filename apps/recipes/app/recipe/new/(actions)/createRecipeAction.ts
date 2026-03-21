"use server"

import "server-only"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
  CreateRecipeError,
  createRecipe,
  type RecipeIngredientInput,
  type RecipeStepInput,
  type RecipeStepIngredientInput
} from "@recipes/server/recipes/createRecipe"
import {
  CurrentUserError,
  requireCurrentUser
} from "@recipes/server/auth/requireCurrentUser"

export type CreateRecipeActionState =
  | { status: "idle" }
  | { status: "success"; recipe: unknown }
  | { status: "error"; message: string; httpStatus?: number }

function tryGetRecipeId(recipe: unknown): number | null {
  if (!recipe || typeof recipe !== "object") return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyRecipe = recipe as any
  const id = Number(anyRecipe.id ?? anyRecipe.recipeId)
  return Number.isInteger(id) && id > 0 ? id : null
}

function asTrimmedString(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return ""
  return value.trim()
}

function parseInstructions(raw: string): RecipeStepInput[] {
  // Treat each non-empty line as a step.
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      step: index + 1,
      short_desc: line,
      long_desc: undefined,
      heat: undefined,
      time_minutes: undefined,
      step_instructions: []
    }))
}

function parseInstructionsJson(
  raw: string
): { ok: true; value: RecipeStepInput[] } | { ok: false; error: string } {
  if (!raw) return { ok: true, value: [] }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "Instructions payload is not valid JSON" }
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: "Instructions payload must be an array" }
  }

  const out: RecipeStepInput[] = []

  for (let idx = 0; idx < parsed.length; idx++) {
    const item = parsed[idx]
    if (!item || typeof item !== "object") {
      return {
        ok: false,
        error: "Instructions payload contains an invalid item"
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyItem = item as any

    const step = Number(anyItem.step ?? idx + 1)
    if (!Number.isInteger(step) || step <= 0) {
      return { ok: false, error: "Each instruction must have a valid step" }
    }

    const timeRaw = anyItem.time_minutes
    let time_minutes: number | null | undefined = undefined
    if (timeRaw === "" || timeRaw === null || timeRaw === undefined) {
      time_minutes = null
    } else if (timeRaw !== undefined) {
      const t = typeof timeRaw === "number" ? timeRaw : Number(timeRaw)
      if (!Number.isFinite(t)) {
        return { ok: false, error: "time_minutes must be a number" }
      }
      time_minutes = t
    }

    const siRaw = anyItem.step_instructions
    let step_instructions: RecipeStepIngredientInput[] | undefined = undefined
    if (siRaw !== undefined) {
      if (!Array.isArray(siRaw)) {
        return {
          ok: false,
          error: "step_instructions must be an array when provided"
        }
      }

      const parsedStepIngredients: RecipeStepIngredientInput[] = []
      for (const si of siRaw) {
        if (!si || typeof si !== "object") {
          return {
            ok: false,
            error: "step_instructions contains an invalid item"
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anySi = si as any

        const ingredientId = Number(anySi.ingredientId)
        if (!Number.isInteger(ingredientId) || ingredientId <= 0) {
          return {
            ok: false,
            error: "Each step ingredient must have a valid ingredientId"
          }
        }

        const quantityRaw = anySi.quantity
        let quantity: number | null = null
        if (
          quantityRaw !== undefined &&
          quantityRaw !== null &&
          quantityRaw !== ""
        ) {
          const q =
            typeof quantityRaw === "number" ? quantityRaw : Number(quantityRaw)
          if (!Number.isFinite(q)) {
            return {
              ok: false,
              error: "Step ingredient quantity must be a number"
            }
          }
          quantity = q
        }

        const unitRaw = anySi.unit
        const unit = typeof unitRaw === "string" ? unitRaw.trim() : ""
        const quantityDisplayRaw = anySi.quantity_display
        const quantity_display =
          typeof quantityDisplayRaw === "string"
            ? quantityDisplayRaw.trim() || null
            : null

        if (quantity !== null && !unit) {
          return {
            ok: false,
            error: "Unit is required when quantity is provided"
          }
        }

        parsedStepIngredients.push({
          ingredientId,
          quantity,
          quantity_display,
          unit: unit || null
        })
      }

      step_instructions = parsedStepIngredients
    }

    out.push({
      step,
      short_desc:
        typeof anyItem.short_desc === "string" ? anyItem.short_desc : undefined,
      long_desc:
        typeof anyItem.long_desc === "string" ? anyItem.long_desc : undefined,
      heat: typeof anyItem.heat === "string" ? anyItem.heat : undefined,
      time_minutes,
      step_instructions
    })
  }

  return { ok: true, value: out }
}

function parseIngredientsJson(
  raw: string
): { ok: true; value: RecipeIngredientInput[] } | { ok: false; error: string } {
  if (!raw) return { ok: true, value: [] }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: "Ingredients payload is not valid JSON" }
  }

  if (!Array.isArray(parsed)) {
    return { ok: false, error: "Ingredients payload must be an array" }
  }

  const out: RecipeIngredientInput[] = []

  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      return {
        ok: false,
        error: "Ingredients payload contains an invalid item"
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyItem = item as any

    const ingredientId = Number(anyItem.ingredientId)
    if (!Number.isInteger(ingredientId) || ingredientId <= 0) {
      return {
        ok: false,
        error: "Each ingredient must have a valid ingredientId"
      }
    }

    const quantityRaw = anyItem.quantity
    let quantity: number | null = null
    if (
      quantityRaw !== undefined &&
      quantityRaw !== null &&
      quantityRaw !== ""
    ) {
      const q =
        typeof quantityRaw === "number" ? quantityRaw : Number(quantityRaw)
      if (!Number.isFinite(q)) {
        return { ok: false, error: "Ingredient quantity must be a number" }
      }
      quantity = q
    }

    const unitRaw = anyItem.unit
    const unit = typeof unitRaw === "string" ? unitRaw.trim() : ""
    const quantityDisplayRaw = anyItem.quantity_display
    const quantity_display =
      typeof quantityDisplayRaw === "string"
        ? quantityDisplayRaw.trim() || null
        : null

    if (quantity !== null && !unit) {
      return {
        ok: false,
        error: "Unit is required when quantity is provided"
      }
    }

    out.push({
      ingredientId,
      quantity,
      quantity_display,
      unit: unit || null
    })
  }

  // de-dupe by ingredientId (first wins) while preserving order
  const seen = new Set<number>()
  const unique: RecipeIngredientInput[] = []
  for (const x of out) {
    if (seen.has(x.ingredientId)) continue
    seen.add(x.ingredientId)
    unique.push(x)
  }

  return { ok: true, value: unique }
}

export default async function createRecipeAction(
  _prevState: CreateRecipeActionState,
  formData: FormData
): Promise<CreateRecipeActionState> {
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

  const name = asTrimmedString(formData.get("name"))
  const description = asTrimmedString(formData.get("description"))
  const videoUrl = asTrimmedString(formData.get("videoUrl"))
  const instructionsJson = asTrimmedString(formData.get("instructionsJson"))
  const instructionsParsed = parseInstructionsJson(instructionsJson)
  if (!instructionsParsed.ok) {
    return { status: "error", message: instructionsParsed.error }
  }

  const instructionsLegacyText = asTrimmedString(formData.get("instructions"))
  const instructionsLegacy = parseInstructions(instructionsLegacyText)
  const instructions =
    instructionsParsed.value.length > 0
      ? instructionsParsed.value
      : instructionsLegacy

  const ingredientsJson = asTrimmedString(formData.get("ingredientsJson"))
  const ingredientsParsed = parseIngredientsJson(ingredientsJson)
  if (!ingredientsParsed.ok) {
    return { status: "error", message: ingredientsParsed.error }
  }

  const ingredients = ingredientsParsed.value

  if (!name) {
    return { status: "error", message: "Name is required." }
  }

  if (instructions.length === 0) {
    return {
      status: "error",
      message: "At least one instruction is required."
    }
  }

  const payload = {
    createdBySub: currentUser.sub,
    name,
    description: description || undefined,
    videoUrl: videoUrl || undefined,
    instructions,
    ingredients: ingredients.length > 0 ? ingredients : undefined
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
