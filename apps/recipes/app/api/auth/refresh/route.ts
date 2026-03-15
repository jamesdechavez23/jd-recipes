import { InitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider"
import { NextResponse, type NextRequest } from "next/server"

import {
  ACCESS_TOKEN_COOKIE_NAME,
  DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS,
  ID_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  USERNAME_COOKIE_NAME,
  buildHttpOnlyCookieOptions
} from "@recipes/utils/authCookies"
import {
  getCognitoClient,
  getCognitoClientId,
  getCognitoSecretHash
} from "@recipes/utils/cognito"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function safeRedirectPath(value: string | null) {
  if (!value) return "/recipes"
  if (!value.startsWith("/")) return "/recipes"
  if (value.startsWith("//")) return "/recipes"
  return value
}

export async function GET(req: NextRequest) {
  const redirectTo = safeRedirectPath(req.nextUrl.searchParams.get("redirect"))

  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value
  const username = req.cookies.get(USERNAME_COOKIE_NAME)?.value

  if (!refreshToken) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("redirect", redirectTo)
    return NextResponse.redirect(loginUrl)
  }

  const forwardedProto = req.headers.get("x-forwarded-proto")
  const isSecure = forwardedProto === "https"

  try {
    const client = await getCognitoClient()
    const clientId = await getCognitoClientId()

    const hasClientSecret = Boolean(process.env.COGNITO_USER_POOL_CLIENT_SECRET)
    if (hasClientSecret && !username) {
      throw new Error(
        "Missing username cookie required to refresh tokens for an app client with a client secret."
      )
    }

    const secretHash = username
      ? await getCognitoSecretHash(username)
      : undefined

    const result = await client.send(
      new InitiateAuthCommand({
        ClientId: clientId,
        AuthFlow: "REFRESH_TOKEN_AUTH",
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
          ...(username ? { USERNAME: username } : {}),
          ...(secretHash ? { SECRET_HASH: secretHash } : {})
        }
      })
    )

    const accessToken = result.AuthenticationResult?.AccessToken
    const idToken = result.AuthenticationResult?.IdToken
    const expiresIn = result.AuthenticationResult?.ExpiresIn

    if (!accessToken || !idToken || typeof expiresIn !== "number") {
      throw new Error("Refresh did not return expected tokens")
    }

    const response = NextResponse.redirect(new URL(redirectTo, req.url))
    response.headers.set("Cache-Control", "no-store")

    response.cookies.set(
      ACCESS_TOKEN_COOKIE_NAME,
      accessToken,
      buildHttpOnlyCookieOptions({ isSecure, maxAgeSeconds: expiresIn })
    )
    response.cookies.set(
      ID_TOKEN_COOKIE_NAME,
      idToken,
      buildHttpOnlyCookieOptions({ isSecure, maxAgeSeconds: expiresIn })
    )

    // Keep the existing refresh token + username cookies alive.
    response.cookies.set(
      REFRESH_TOKEN_COOKIE_NAME,
      refreshToken,
      buildHttpOnlyCookieOptions({
        isSecure,
        maxAgeSeconds: DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS
      })
    )
    if (username) {
      response.cookies.set(
        USERNAME_COOKIE_NAME,
        username,
        buildHttpOnlyCookieOptions({
          isSecure,
          maxAgeSeconds: DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS
        })
      )
    }

    return response
  } catch {
    const response = NextResponse.redirect(
      new URL(`/login?redirect=${encodeURIComponent(redirectTo)}`, req.url)
    )
    response.cookies.delete(ACCESS_TOKEN_COOKIE_NAME)
    response.cookies.delete(ID_TOKEN_COOKIE_NAME)
    response.cookies.delete(REFRESH_TOKEN_COOKIE_NAME)
    response.cookies.delete(USERNAME_COOKIE_NAME)
    return response
  }
}
