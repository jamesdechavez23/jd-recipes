import "server-only"

import type {
  RecipeIngredientInput,
  RecipeStepInput,
  RecipeStepIngredientInput
} from "@recipes/server/recipes/createRecipe"

type ParseRecipeFormDataSuccess = {
  ok: true
  value: {
    name: string
    description?: string
    videoUrl?: string
    instructions: RecipeStepInput[]
    ingredients?: RecipeIngredientInput[]
  }
}

type ParseRecipeFormDataError = {
  ok: false
  error: string
}

export type ParseRecipeFormDataResult =
  | ParseRecipeFormDataSuccess
  | ParseRecipeFormDataError

function asTrimmedString(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return ""
  return value.trim()
}

function parseInstructions(raw: string): RecipeStepInput[] {
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

function parseInstructionsJson(raw: string) {
  if (!raw) return { ok: true as const, value: [] as RecipeStepInput[] }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      ok: false as const,
      error: "Instructions payload is not valid JSON"
    }
  }

  if (!Array.isArray(parsed)) {
    return {
      ok: false as const,
      error: "Instructions payload must be an array"
    }
  }

  const out: RecipeStepInput[] = []

  for (let idx = 0; idx < parsed.length; idx++) {
    const item = parsed[idx]
    if (!item || typeof item !== "object") {
      return {
        ok: false as const,
        error: "Instructions payload contains an invalid item"
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyItem = item as any

    const step = Number(anyItem.step ?? idx + 1)
    if (!Number.isInteger(step) || step <= 0) {
      return {
        ok: false as const,
        error: "Each instruction must have a valid step"
      }
    }

    const timeRaw = anyItem.time_minutes
    let time_minutes: number | null | undefined = undefined
    if (timeRaw === "" || timeRaw === null || timeRaw === undefined) {
      time_minutes = null
    } else if (timeRaw !== undefined) {
      const parsedTime = typeof timeRaw === "number" ? timeRaw : Number(timeRaw)
      if (!Number.isFinite(parsedTime)) {
        return { ok: false as const, error: "time_minutes must be a number" }
      }
      time_minutes = parsedTime
    }

    const stepInstructionsRaw = anyItem.step_instructions
    let step_instructions: RecipeStepIngredientInput[] | undefined = undefined
    if (stepInstructionsRaw !== undefined) {
      if (!Array.isArray(stepInstructionsRaw)) {
        return {
          ok: false as const,
          error: "step_instructions must be an array when provided"
        }
      }

      const parsedStepIngredients: RecipeStepIngredientInput[] = []
      for (const stepIngredient of stepInstructionsRaw) {
        if (!stepIngredient || typeof stepIngredient !== "object") {
          return {
            ok: false as const,
            error: "step_instructions contains an invalid item"
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyStepIngredient = stepIngredient as any

        const ingredientId = Number(anyStepIngredient.ingredientId)
        if (!Number.isInteger(ingredientId) || ingredientId <= 0) {
          return {
            ok: false as const,
            error: "Each step ingredient must have a valid ingredientId"
          }
        }

        const quantityRaw = anyStepIngredient.quantity
        let quantity: number | null = null
        if (
          quantityRaw !== undefined &&
          quantityRaw !== null &&
          quantityRaw !== ""
        ) {
          const parsedQuantity =
            typeof quantityRaw === "number" ? quantityRaw : Number(quantityRaw)
          if (!Number.isFinite(parsedQuantity)) {
            return {
              ok: false as const,
              error: "Step ingredient quantity must be a number"
            }
          }
          quantity = parsedQuantity
        }

        const unitRaw = anyStepIngredient.unit
        const unit = typeof unitRaw === "string" ? unitRaw.trim() : ""
        const quantityDisplayRaw = anyStepIngredient.quantity_display
        const quantity_display =
          typeof quantityDisplayRaw === "string"
            ? quantityDisplayRaw.trim() || null
            : null

        if (quantity !== null && !unit) {
          return {
            ok: false as const,
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

  return { ok: true as const, value: out }
}

function parseIngredientsJson(raw: string) {
  if (!raw) return { ok: true as const, value: [] as RecipeIngredientInput[] }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return {
      ok: false as const,
      error: "Ingredients payload is not valid JSON"
    }
  }

  if (!Array.isArray(parsed)) {
    return { ok: false as const, error: "Ingredients payload must be an array" }
  }

  const out: RecipeIngredientInput[] = []

  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      return {
        ok: false as const,
        error: "Ingredients payload contains an invalid item"
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyItem = item as any

    const ingredientId = Number(anyItem.ingredientId)
    if (!Number.isInteger(ingredientId) || ingredientId <= 0) {
      return {
        ok: false as const,
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
      const parsedQuantity =
        typeof quantityRaw === "number" ? quantityRaw : Number(quantityRaw)
      if (!Number.isFinite(parsedQuantity)) {
        return {
          ok: false as const,
          error: "Ingredient quantity must be a number"
        }
      }
      quantity = parsedQuantity
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
        ok: false as const,
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

  const seen = new Set<number>()
  const unique: RecipeIngredientInput[] = []
  for (const ingredient of out) {
    if (seen.has(ingredient.ingredientId)) continue
    seen.add(ingredient.ingredientId)
    unique.push(ingredient)
  }

  return { ok: true as const, value: unique }
}

export function parseRecipeFormData(
  formData: FormData
): ParseRecipeFormDataResult {
  const name = asTrimmedString(formData.get("name"))
  const description = asTrimmedString(formData.get("description"))
  const videoUrl = asTrimmedString(formData.get("videoUrl"))

  const instructionsJson = asTrimmedString(formData.get("instructionsJson"))
  const parsedInstructions = parseInstructionsJson(instructionsJson)
  if (!parsedInstructions.ok) {
    return { ok: false, error: parsedInstructions.error }
  }

  const instructionsLegacyText = asTrimmedString(formData.get("instructions"))
  const instructions =
    parsedInstructions.value.length > 0
      ? parsedInstructions.value
      : parseInstructions(instructionsLegacyText)

  const ingredientsJson = asTrimmedString(formData.get("ingredientsJson"))
  const parsedIngredients = parseIngredientsJson(ingredientsJson)
  if (!parsedIngredients.ok) {
    return { ok: false, error: parsedIngredients.error }
  }

  if (!name) {
    return { ok: false, error: "Name is required." }
  }

  if (instructions.length === 0) {
    return { ok: false, error: "At least one instruction is required." }
  }

  return {
    ok: true,
    value: {
      name,
      description: description || undefined,
      videoUrl: videoUrl || undefined,
      instructions,
      ingredients:
        parsedIngredients.value.length > 0 ? parsedIngredients.value : undefined
    }
  }
}
