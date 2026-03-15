"use server"

import "server-only"

import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider"
import { cookies } from "next/headers"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import {
  getCognitoClient,
  getCognitoClientId,
  getCognitoSecretHash
} from "@recipes/utils/cognito"
import {
  ACCESS_TOKEN_COOKIE_NAME,
  DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS,
  ID_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  USERNAME_COOKIE_NAME,
  buildHttpOnlyCookieOptions
} from "@recipes/utils/authCookies"

function safeRedirectPath(value: string | null) {
  if (!value) return "/recipes"
  if (!value.startsWith("/")) return "/recipes"
  if (value.startsWith("//")) return "/recipes"
  return value
}

export type LoginState =
  | { status: "idle" }
  | { status: "error"; message: string }

export default async function loginCognitoUserAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const password = String(formData.get("password") ?? "")
  const redirectTo = safeRedirectPath(
    typeof formData.get("redirect") === "string"
      ? (formData.get("redirect") as string)
      : null
  )

  if (!email) return { status: "error", message: "Email is required." }
  if (!password) return { status: "error", message: "Password is required." }

  try {
    const client = await getCognitoClient()
    const clientId = await getCognitoClientId()
    const secretHash = await getCognitoSecretHash(email)

    const result = await client.send(
      new InitiateAuthCommand({
        ClientId: clientId,
        AuthFlow: "USER_PASSWORD_AUTH",
        AuthParameters: {
          USERNAME: email,
          PASSWORD: password,
          ...(secretHash ? { SECRET_HASH: secretHash } : {})
        }
      })
    )

    const accessToken = result.AuthenticationResult?.AccessToken
    const idToken = result.AuthenticationResult?.IdToken
    const refreshToken = result.AuthenticationResult?.RefreshToken
    const expiresIn = result.AuthenticationResult?.ExpiresIn

    if (!accessToken || !idToken || typeof expiresIn !== "number") {
      return {
        status: "error",
        message:
          "Login did not return a token. Your Cognito app client may require a different auth flow."
      }
    }
    if (!refreshToken) {
      return {
        status: "error",
        message:
          "Login did not return a refresh token. Check your Cognito app client auth flow and refresh token validity settings."
      }
    }

    const cookieStore = await cookies()
    const headerStore = await headers()
    const forwardedProto = headerStore.get("x-forwarded-proto")
    const isSecure = forwardedProto === "https"

    cookieStore.set(
      ACCESS_TOKEN_COOKIE_NAME,
      accessToken,
      buildHttpOnlyCookieOptions({ isSecure, maxAgeSeconds: expiresIn })
    )
    cookieStore.set(
      ID_TOKEN_COOKIE_NAME,
      idToken,
      buildHttpOnlyCookieOptions({ isSecure, maxAgeSeconds: expiresIn })
    )
    cookieStore.set(
      REFRESH_TOKEN_COOKIE_NAME,
      refreshToken,
      buildHttpOnlyCookieOptions({
        isSecure,
        maxAgeSeconds: DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS
      })
    )
    cookieStore.set(
      USERNAME_COOKIE_NAME,
      email,
      buildHttpOnlyCookieOptions({
        isSecure,
        maxAgeSeconds: DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS
      })
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed."
    return { status: "error", message }
  }
  redirect(redirectTo)
}
