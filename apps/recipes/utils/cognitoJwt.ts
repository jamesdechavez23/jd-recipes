import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose"

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function getCognitoIssuer() {
  const region = getRequiredEnv("NEXT_PUBLIC_COGNITO_REGION")
  const userPoolId = getRequiredEnv("NEXT_PUBLIC_COGNITO_USER_POOL_ID")
  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
}

let remoteJwks: ReturnType<typeof createRemoteJWKSet> | undefined

function getRemoteJwks() {
  if (remoteJwks) return remoteJwks
  const issuer = getCognitoIssuer()
  remoteJwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`))
  return remoteJwks
}

export async function verifyCognitoAccessToken(token: string) {
  const issuer = getCognitoIssuer()
  const expectedClientId = getRequiredEnv(
    "NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID"
  )

  const { payload } = await jwtVerify(token, getRemoteJwks(), {
    issuer
  })

  if (payload.token_use !== "access") {
    throw new Error("JWT is not an access token")
  }

  if (payload.client_id !== expectedClientId) {
    throw new Error("JWT client_id does not match this app client")
  }

  return payload
}

export function getCognitoGroups(payload: JWTPayload): string[] {
  const rawGroups = payload["cognito:groups"]

  if (Array.isArray(rawGroups)) {
    return rawGroups
      .filter((group): group is string => typeof group === "string")
      .map((group) => group.trim())
      .filter(Boolean)
  }

  if (typeof rawGroups === "string") {
    const trimmed = rawGroups.trim()

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed
            .filter((group): group is string => typeof group === "string")
            .map((group) => group.trim())
            .filter(Boolean)
        }
      } catch {
        const inner = trimmed.slice(1, -1).trim()
        if (!inner) return []

        return inner
          .split(",")
          .map((group) => group.trim().replace(/^['\"]|['\"]$/g, ""))
          .filter(Boolean)
      }
    }

    return trimmed
      .split(",")
      .map((group) => group.trim())
      .filter(Boolean)
  }

  return []
}

export function isCognitoAdmin(payload: JWTPayload): boolean {
  return getCognitoGroups(payload).includes("admin")
}
