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

  if (!name) {
    return { status: "error", message: "Name is required." }
  }

  const base = getRequiredEnv("NEXT_PUBLIC_API_BASE_URL").replace(/\/+$/, "")
  const url = `${base}/recipes`

  const payload = {
    name,
    description: description || undefined,
    instructions
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
