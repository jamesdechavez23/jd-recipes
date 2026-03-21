import "server-only"

import { cookies } from "next/headers"
import type { JWTPayload } from "jose"

import { ID_TOKEN_COOKIE_NAME } from "@recipes/utils/authCookies"
import { verifyCognitoIdToken } from "@recipes/utils/cognitoJwt"

export class CurrentUserError extends Error {
  httpStatus: number

  constructor(httpStatus: number, message: string) {
    super(message)
    this.name = "CurrentUserError"
    this.httpStatus = httpStatus
  }
}

export type CurrentUser = {
  sub: string
  idToken: string
  payload: JWTPayload
}

export async function requireCurrentUser(): Promise<CurrentUser> {
  const cookieStore = await cookies()
  const idToken = cookieStore.get(ID_TOKEN_COOKIE_NAME)?.value

  if (!idToken) {
    throw new CurrentUserError(401, "Missing auth token. Please log in again.")
  }

  let payload: JWTPayload
  try {
    payload = await verifyCognitoIdToken(idToken)
  } catch {
    throw new CurrentUserError(401, "Invalid auth token. Please log in again.")
  }

  const sub = typeof payload.sub === "string" ? payload.sub.trim() : ""
  if (!sub) {
    throw new CurrentUserError(401, "Auth token is missing the user identity.")
  }

  return { sub, idToken, payload }
}
