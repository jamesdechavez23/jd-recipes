"use server"

import "server-only"

import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider"
import { createHmac } from "crypto"

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export async function getCognitoClient() {
  const region = getRequiredEnv("NEXT_PUBLIC_COGNITO_REGION")
  return new CognitoIdentityProviderClient({ region })
}

export async function getCognitoClientId() {
  return getRequiredEnv("NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID")
}

function getCognitoClientSecret() {
  return process.env.COGNITO_USER_POOL_CLIENT_SECRET
}

export async function getCognitoSecretHash(username: string) {
  const clientSecret = getCognitoClientSecret()
  if (!clientSecret) return undefined

  const clientId = await getCognitoClientId()

  return createHmac("sha256", clientSecret)
    .update(username + clientId)
    .digest("base64")
}
