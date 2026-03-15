"use client"

import { useActionState } from "react"
import Link from "next/link"

import { Button } from "@repo/ui/shadcn/button"

import confirmCognitoUserAction from "../(actions)/confirmCognitoUserAction"
import registerCognitoUserAction, {
  type RegisterState
} from "../(actions)/registerCognitoUserAction"

export default function RegisterForm() {
  const [registerState, registerAction, registerPending] = useActionState(
    registerCognitoUserAction,
    { status: "idle" } satisfies RegisterState
  )

  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmCognitoUserAction,
    { status: "idle" }
  )

  const errorMessage =
    registerState.status === "error"
      ? registerState.message
      : confirmState.status === "error"
        ? confirmState.message
        : null

  return (
    <div className="max-w-sm space-y-4">
      {errorMessage ? (
        <p className="text-sm text-destructive">{errorMessage}</p>
      ) : null}

      {registerState.status !== "needs-confirmation" ? (
        <form action={registerAction} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            />
          </div>

          <Button type="submit" disabled={registerPending} className="w-full">
            {registerPending ? "Creating account…" : "Create account"}
          </Button>

          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link className="text-link underline" href="/login">
              Sign in
            </Link>
          </p>
        </form>
      ) : (
        <form action={confirmAction} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the confirmation code sent to your email.
          </p>

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={registerState.email}
              readOnly
              className="h-9 w-full rounded-md border border-input bg-muted px-3 text-sm text-foreground"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="code" className="text-sm font-medium">
              Confirmation code
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            />
          </div>

          <Button type="submit" disabled={confirmPending} className="w-full">
            {confirmPending ? "Confirming…" : "Confirm account"}
          </Button>
        </form>
      )}
    </div>
  )
}
