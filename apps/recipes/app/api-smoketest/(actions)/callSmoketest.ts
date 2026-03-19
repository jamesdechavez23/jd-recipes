"use server"

import "server-only"

import {
  AdminAccessError,
  requireAdminAccessToken
} from "@recipes/utils/requireAdmin"

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
  let accessToken: string
  try {
    ;({ accessToken } = await requireAdminAccessToken())
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return {
        httpStatus: error.httpStatus,
        ok: false,
        bodyText: JSON.stringify({ ok: false, error: error.message })
      }
    }
    throw error
  }

  const base = getRequiredEnv("NEXT_PUBLIC_API_BASE_URL").replace(/\/+$/, "")
  const upstreamUrl = `${base}/smoketest`

  const upstreamRes = await fetch(upstreamUrl, {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`
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
