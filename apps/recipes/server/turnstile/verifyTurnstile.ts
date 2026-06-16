"use server"

import "server-only"

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export async function verifyTurnstileToken(token: string, remoteIp?: string) {
  const secret = process.env.CF_TURNSTILE_SECRET
  if (!secret) {
    console.error("Turnstile secret not configured on server.")
    return false
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

  console.log("Test fetch response:", { res })

  if (!res.ok) {
    const responseText = await res.text()
    console.error(
      "Failed to verify Turnstile token:",
      res.status,
      res.statusText,
      responseText
    )
    return false
  }

  const data = await res.json()
  console.log("Turnstile verification response:", data)
  return Boolean(data.success)
}
