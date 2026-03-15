export const ACCESS_TOKEN_COOKIE_NAME = "jd-recipes-auth-token"
export const ID_TOKEN_COOKIE_NAME = "jd-recipes-id-token"
export const REFRESH_TOKEN_COOKIE_NAME = "jd-recipes-refresh-token"
export const USERNAME_COOKIE_NAME = "jd-recipes-username"

export const DEFAULT_REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export function buildHttpOnlyCookieOptions(options: {
  isSecure: boolean
  maxAgeSeconds: number
}) {
  return {
    httpOnly: true,
    secure: options.isSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: options.maxAgeSeconds
  }
}
