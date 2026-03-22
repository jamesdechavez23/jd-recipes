"use client"

import { useActionState } from "react"
import Link from "next/link"

import { Alert, AlertDescription } from "@repo/ui/shadcn/alert"
import { Button } from "@repo/ui/shadcn/button"
import { Input } from "@repo/ui/shadcn/input"
import { Label } from "@repo/ui/shadcn/label"

import confirmCognitoUserAction from "../(actions)/confirmCognitoUserAction"
import registerCognitoUserAction, {
  type RegisterState
} from "../(actions)/registerCognitoUserAction"
import TurnstileWidget from "@recipes/app/(components)/TurnstileWidget"

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
    <div className="space-y-4">
      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {registerState.status !== "needs-confirmation" ? (
        <form action={registerAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>

          <TurnstileWidget />

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
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={registerState.email}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="code">Confirmation code</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
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
