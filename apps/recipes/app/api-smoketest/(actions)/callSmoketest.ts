"use server"

import "server-only"

import { cookies } from "next/headers"
import { ID_TOKEN_COOKIE_NAME } from "@recipes/utils/authCookies"

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export type SmoketestResult = {
  httpStatus: number
  ok: boolean
  bodyText: string
}

export default async function callSmoketest(): Promise<SmoketestResult> {
  const cookieStore = await cookies()
  const idToken = cookieStore.get(ID_TOKEN_COOKIE_NAME)?.value

  if (!idToken) {
    return {
      httpStatus: 401,
      ok: false,
      bodyText: JSON.stringify({ ok: false, error: "Missing id token cookie" })
    }
  }

  const base = getRequiredEnv("NEXT_PUBLIC_API_BASE_URL").replace(/\/+$/, "")
  const upstreamUrl = `${base}/smoketest`

  const upstreamRes = await fetch(upstreamUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${idToken}`
    },
    cache: "no-store"
  })

  const bodyText = await upstreamRes.text()
  return {
    httpStatus: upstreamRes.status,
    ok: upstreamRes.ok,
    bodyText
  }
}
