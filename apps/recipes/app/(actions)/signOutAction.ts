"use server"

import "server-only"

import { GlobalSignOutCommand } from "@aws-sdk/client-cognito-identity-provider"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  ACCESS_TOKEN_COOKIE_NAME,
  ID_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  USERNAME_COOKIE_NAME
} from "@recipes/utils/authCookies"
import { getCognitoClient } from "@recipes/utils/cognito"

export default async function signOutAction() {
  const cookieStore = await cookies()

  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value
  if (accessToken) {
    try {
      const client = await getCognitoClient()
      await client.send(new GlobalSignOutCommand({ AccessToken: accessToken }))
    } catch {
      // If Cognito sign-out fails, still clear cookies locally.
    }
  }

  cookieStore.delete(ACCESS_TOKEN_COOKIE_NAME)
  cookieStore.delete(ID_TOKEN_COOKIE_NAME)
  cookieStore.delete(REFRESH_TOKEN_COOKIE_NAME)
  cookieStore.delete(USERNAME_COOKIE_NAME)
  redirect("/login")
}
