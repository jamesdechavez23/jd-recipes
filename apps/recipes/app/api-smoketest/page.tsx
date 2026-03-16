import { cookies } from "next/headers"
import SmoketestCaller from "./(ui)/SmoketestCaller"
import { ID_TOKEN_COOKIE_NAME } from "@recipes/utils/authCookies"
import callSmoketestAction from "./(actions)/callSmoketest"

export default async function ApiSmoketestPage() {
  const cookieStore = await cookies()
  const isAuthed = Boolean(cookieStore.get(ID_TOKEN_COOKIE_NAME)?.value)
  return (
    <main className="flex flex-col items-center min-h-screen gap-6 p-8">
      <h1 className="text-2xl font-bold">API Smoketest</h1>
      <p className="text-sm text-muted-foreground max-w-xl">
        This page calls your deployed Lambda smoketest over HTTP via a Server
        Action. The Server Action reads your HTTP-only Cognito token cookie and
        adds an Authorization header when calling API Gateway.
      </p>
      <SmoketestCaller callSmoketestAction={callSmoketestAction} />
      {isAuthed && (
        <p className="text-sm text-green-600">
          You are authenticated! The smoketest will include your token in the
          request.
        </p>
      )}
    </main>
  )
}
