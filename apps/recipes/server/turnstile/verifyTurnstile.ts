"use server"

import "server-only"

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export async function verifyTurnstileToken(token: string, remoteIp?: string) {
  const secret = process.env.CF_TURNSTILE_SECRET
  if (!secret) {
    throw new Error("Turnstile secret not configured on server.")
  }

  const body = new URLSearchParams()
  body.set("secret", secret)
  body.set("response", token)
  if (remoteIp) body.set("remoteip", remoteIp)

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString()
  })

  if (!res.ok) return false
  const data = await res.json()
  return Boolean(data.success)
}
