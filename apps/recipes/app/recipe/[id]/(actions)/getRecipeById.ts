"use server"

import "server-only"

import { cookies } from "next/headers"
import { ID_TOKEN_COOKIE_NAME } from "@recipes/utils/authCookies"

export type RecipeIngredient = {
  ingredientId: number
  name: string
  category?: string | null
  quantity?: number | null
  unit?: string | null
}

export type RecipeById = {
  id: number
  name: string
  description: string | null
  video?: string | null
  instructions: unknown
  ingredients: RecipeIngredient[]
}

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export default async function getRecipeById({
  id
}: {
  id: number
}): Promise<RecipeById> {
  const cookieStore = await cookies()
  const idToken = cookieStore.get(ID_TOKEN_COOKIE_NAME)?.value

  if (!idToken) {
    throw new Error("Missing auth token. Please log in again.")
  }

  const base = getRequiredEnv("NEXT_PUBLIC_API_BASE_URL").replace(/\/+$/, "")
  const url = `${base}/recipes/${id}`

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${idToken}`
    },
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

    throw new Error(`GET ${url} -> ${res.status}: ${String(message)}`)
  }

  if (bodyJson && typeof bodyJson === "object" && bodyJson !== null) {
    // Expecting { ok: true, recipe: ... }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipe = (bodyJson as any).recipe ?? bodyJson
    if (recipe && typeof recipe === "object") {
      return recipe as RecipeById
    }
  }

  throw new Error(`GET ${url} -> Unexpected response: ${bodyText}`)
}
