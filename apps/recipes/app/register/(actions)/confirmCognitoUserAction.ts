"use server"

import "server-only"

import { ConfirmSignUpCommand } from "@aws-sdk/client-cognito-identity-provider"
import { redirect } from "next/navigation"
import {
  getCognitoClient,
  getCognitoClientId,
  getCognitoSecretHash
} from "@recipes/utils/cognito"

export type ConfirmState =
  | { status: "idle" }
  | { status: "error"; message: string; email?: string }
  | { status: "success"; message: string }

export default async function confirmCognitoUserAction(
  _prevState: ConfirmState,
  formData: FormData
): Promise<ConfirmState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const code = String(formData.get("code") ?? "").trim()

  if (!email) return { status: "error", message: "Email is required." }
  if (!code)
    return { status: "error", message: "Confirmation code is required.", email }

  try {
    const client = await getCognitoClient()
    const clientId = await getCognitoClientId()
    const secretHash = await getCognitoSecretHash(email)

    await client.send(
      new ConfirmSignUpCommand({
        ClientId: clientId,
        ...(secretHash ? { SecretHash: secretHash } : {}),
        Username: email,
        ConfirmationCode: code
      })
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Confirmation failed."
    return { status: "error", message, email }
  }
  redirect(`/login?registered=1`)
}
