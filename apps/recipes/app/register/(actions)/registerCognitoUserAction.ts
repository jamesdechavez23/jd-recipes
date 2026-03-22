"use server"

import "server-only"

import { SignUpCommand } from "@aws-sdk/client-cognito-identity-provider"
import {
  getCognitoClient,
  getCognitoClientId,
  getCognitoSecretHash
} from "@recipes/utils/cognito"
import { verifyTurnstileToken } from "@recipes/server/turnstile/verifyTurnstile"

export type RegisterState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "needs-confirmation"; email: string }
  | { status: "success"; message: string }

export default async function registerCognitoUserAction(
  _prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")

  if (!email) return { status: "error", message: "Email is required." }
  if (!password) return { status: "error", message: "Password is required." }
  if (password !== confirmPassword) {
    return { status: "error", message: "Passwords do not match." }
  }

  const turnstileToken = String(formData.get("turnstileToken") ?? "").trim()
  if (!turnstileToken) {
    return { status: "error", message: "Captcha verification is required." }
  }

  try {
    const ok = await verifyTurnstileToken(turnstileToken)
    if (!ok) {
      return { status: "error", message: "Captcha verification failed." }
    }

    const client = await getCognitoClient()
    const clientId = await getCognitoClientId()
    const secretHash = await getCognitoSecretHash(email)

    await client.send(
      new SignUpCommand({
        ClientId: clientId,
        ...(secretHash ? { SecretHash: secretHash } : {}),
        Username: email,
        Password: password,
        UserAttributes: [{ Name: "email", Value: email }]
      })
    )

    return { status: "needs-confirmation", email }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed."

    if (
      typeof err === "object" &&
      err &&
      "name" in err &&
      (err as { name?: string }).name === "UsernameExistsException"
    ) {
      return {
        status: "error",
        message: "An account with that email already exists. Try logging in."
      }
    }

    return { status: "error", message }
  }
}
