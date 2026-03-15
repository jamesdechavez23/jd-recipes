import { createRemoteJWKSet, jwtVerify } from "jose"

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
