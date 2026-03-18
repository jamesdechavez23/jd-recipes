"use server"

import "server-only"

import { cookies } from "next/headers"
import { ID_TOKEN_COOKIE_NAME } from "@recipes/utils/authCookies"

export type CreateIngredientActionState =
  | { status: "idle" }
  | {
      status: "success"
      ingredient: {
        id: number
        name: string
        category?: string | null
        unit?: string | null
      }
    }
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

export default async function createIngredientAction(
  _prevState: CreateIngredientActionState,
  formData: FormData
): Promise<CreateIngredientActionState> {
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
  const category = asTrimmedString(formData.get("category"))
  const unit = asTrimmedString(formData.get("unit"))

  if (!name) {
    return { status: "error", message: "Ingredient name is required." }
  }

  const base = getRequiredEnv("NEXT_PUBLIC_API_BASE_URL").replace(/\/+$/, "")
  const url = `${base}/ingredients`

  const payload = {
    name,
    category: category || undefined,
    unit: unit || undefined
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

    if (bodyJson && typeof bodyJson === "object" && bodyJson !== null) {
      // Expecting { ok: true, ingredient: ... }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ingredient = (bodyJson as any).ingredient
      if (ingredient && typeof ingredient === "object") {
        const id = Number(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (ingredient as any).id
        )
        const ingName = String(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (ingredient as any).name ?? ""
        )

        if (Number.isInteger(id) && id > 0 && ingName) {
          return {
            status: "success",
            ingredient: {
              id,
              name: ingName,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              category: ((ingredient as any).category ?? null) as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              unit: ((ingredient as any).unit ?? null) as any
            }
          }
        }
      }
    }

    return {
      status: "error",
      message: `POST ${url} -> ${res.status}: Unexpected response`
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { status: "error", message }
  }
}
