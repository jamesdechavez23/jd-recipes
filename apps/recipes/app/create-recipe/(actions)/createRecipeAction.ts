"use server"

import "server-only"

import { cookies } from "next/headers"
import { ID_TOKEN_COOKIE_NAME } from "@recipes/utils/authCookies"

export type CreateRecipeActionState =
  | { status: "idle" }
  | { status: "success"; recipe: unknown }
  | { status: "error"; message: string; httpStatus?: number }

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function asTrimmedString(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return ""
  return value.trim()
}

function parseInstructions(raw: string): string[] {
  // Treat each non-empty line as a step.
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseIngredientIds(entries: FormDataEntryValue[]): number[] {
  const ids: number[] = []

  for (const entry of entries) {
    if (typeof entry !== "string") continue
    const parsed = Number.parseInt(entry, 10)
    if (!Number.isInteger(parsed)) continue
    if (parsed <= 0) continue
    ids.push(parsed)
  }

  return Array.from(new Set(ids))
}

type RecipeIngredientInput = {
  ingredientId: number
  quantity?: number | null
  unit?: string | null
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

    if (quantity !== null && !unit) {
      return {
        ok: false,
        error: "Unit is required when quantity is provided"
      }
    }

    out.push({
      ingredientId,
      quantity,
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
  const cookieStore = await cookies()
  const idToken = cookieStore.get(ID_TOKEN_COOKIE_NAME)?.value

  if (!idToken) {
    return {
      status: "error",
      httpStatus: 401,
      message: "Missing auth token. Please log in again."
    }
  }

  const name = asTrimmedString(formData.get("name"))
  const description = asTrimmedString(formData.get("description"))
  const instructionsText = asTrimmedString(formData.get("instructions"))
  const instructions = parseInstructions(instructionsText)
  const ingredientsJson = asTrimmedString(formData.get("ingredientsJson"))
  const ingredientsParsed = parseIngredientsJson(ingredientsJson)
  if (!ingredientsParsed.ok) {
    return { status: "error", message: ingredientsParsed.error }
  }

  const ingredients = ingredientsParsed.value
  const ingredientIds =
    ingredients.length === 0
      ? parseIngredientIds(formData.getAll("ingredientIds"))
      : []

  if (!name) {
    return { status: "error", message: "Name is required." }
  }

  const base = getRequiredEnv("NEXT_PUBLIC_API_BASE_URL").replace(/\/+$/, "")
  const url = `${base}/recipes`

  const payload = {
    name,
    description: description || undefined,
    instructions,
    ingredients: ingredients.length > 0 ? ingredients : undefined,
    ingredientIds: ingredientIds.length > 0 ? ingredientIds : undefined
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify(payload),
      cache: "no-store"
    })

    const bodyText = await res.text()
    let bodyJson: unknown = null
    try {
      bodyJson = JSON.parse(bodyText)
    } catch {
      bodyJson = null
    }

    if (!res.ok) {
      const message =
        (bodyJson && typeof bodyJson === "object" && bodyJson !== null
          ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (bodyJson as any).error || (bodyJson as any).message
          : null) ||
        bodyText ||
        "Request failed"

      return {
        status: "error",
        httpStatus: res.status,
        message: `POST ${url} -> ${res.status}: ${String(message)}`
      }
    }

    // Expecting { ok: true, recipe: ... }
    if (bodyJson && typeof bodyJson === "object" && bodyJson !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recipe = (bodyJson as any).recipe ?? bodyJson
      return { status: "success", recipe }
    }

    return { status: "success", recipe: bodyText }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { status: "error", message }
  }
}
