import "server-only"

import { cookies } from "next/headers"

import { ACCESS_TOKEN_COOKIE_NAME } from "./authCookies"
import { isCognitoAdmin, verifyCognitoAccessToken } from "./cognitoJwt"

export class AdminAccessError extends Error {
  httpStatus: number

  constructor(httpStatus: number, message: string) {
    super(message)
    this.name = "AdminAccessError"
    this.httpStatus = httpStatus
  }
}

export async function requireAdminAccessToken() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value

  if (!accessToken) {
    throw new AdminAccessError(401, "Missing access token cookie")
  }

  let payload
  try {
    payload = await verifyCognitoAccessToken(accessToken)
  } catch {
    throw new AdminAccessError(401, "Invalid access token")
  }

  if (!isCognitoAdmin(payload)) {
    throw new AdminAccessError(403, "Admin access required")
  }

  return { accessToken, payload }
}
