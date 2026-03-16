"use server"

import "server-only"

import { cookies } from "next/headers"
import { ID_TOKEN_COOKIE_NAME } from "@recipes/utils/authCookies"

export type IngredientListItem = {
  id: number
  name: string
  category?: string | null
  unit?: string | null
}

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}

export async function getIngredients(): Promise<IngredientListItem[]> {
  const cookieStore = await cookies()
  const idToken = cookieStore.get(ID_TOKEN_COOKIE_NAME)?.value

  if (!idToken) {
    throw new Error("Missing auth token. Please log in again.")
  }

  const base = getRequiredEnv("NEXT_PUBLIC_API_BASE_URL").replace(/\/+$/, "")
  const url = `${base}/ingredients`

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
    // Expecting { ok: true, ingredients: [...] }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ingredients = (bodyJson as any).ingredients
    if (Array.isArray(ingredients)) {
      return ingredients as IngredientListItem[]
    }
  }

  throw new Error(
    `GET ${url} -> ${res.status}: Unexpected response: ${toErrorMessage(bodyText)}`
  )
}
