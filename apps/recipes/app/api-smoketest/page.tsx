import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import SmoketestCaller from "./(ui)/SmoketestCaller"
import { ACCESS_TOKEN_COOKIE_NAME } from "@recipes/utils/authCookies"
import {
  AdminAccessError,
  requireAdminAccessToken
} from "@recipes/utils/requireAdmin"
import callSmoketestAction from "./(actions)/callSmoketest"

export default async function ApiSmoketestPage() {
  try {
    await requireAdminAccessToken()
  } catch (error) {
    if (error instanceof AdminAccessError) {
      redirect(
        error.httpStatus === 401 ? "/login?redirect=/api-smoketest" : "/recipe"
      )
    }
    throw error
  }

  const cookieStore = await cookies()
  const isAuthed = Boolean(cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value)

  return (
    <main className="flex flex-col items-center min-h-screen gap-6 p-8">
      <h1 className="text-2xl font-bold">API Smoketest</h1>
      <p className="text-sm text-muted-foreground max-w-xl">
        This page is admin-only and calls your deployed Lambda smoketest over
        HTTP via a Server Action. The Server Action reads your HTTP-only Cognito
        access token cookie and adds an Authorization header when calling API
        Gateway.
      </p>
      <SmoketestCaller callSmoketestAction={callSmoketestAction} />
      {isAuthed && (
        <p className="text-sm text-green-600">
          You are authenticated as an admin. The smoketest will include your
          access token in the request.
        </p>
      )}
    </main>
  )
}
