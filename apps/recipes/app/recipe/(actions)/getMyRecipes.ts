"use server"

import "server-only"

import { cookies } from "next/headers"
import { ID_TOKEN_COOKIE_NAME } from "@recipes/utils/authCookies"

export type MyRecipeListItem = {
  id: number
  name: string
  ingredient_names?: string[]
  created_at?: string
  updated_at?: string
}

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export default async function getMyRecipes(): Promise<MyRecipeListItem[]> {
  const cookieStore = await cookies()
  const idToken = cookieStore.get(ID_TOKEN_COOKIE_NAME)?.value

  if (!idToken) {
    throw new Error("Missing auth token. Please log in again.")
  }

  const base = getRequiredEnv("NEXT_PUBLIC_API_BASE_URL").replace(/\/+$/, "")
  const url = `${base}/recipes/mine`

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
    // Expecting { ok: true, recipes: [...] }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recipes = (bodyJson as any).recipes
    if (Array.isArray(recipes)) return recipes as MyRecipeListItem[]
  }

  throw new Error(`GET ${url} -> Unexpected response: ${bodyText}`)
}
