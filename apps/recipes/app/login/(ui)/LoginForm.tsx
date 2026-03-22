"use client"

import { useActionState } from "react"
import Link from "next/link"

import { Alert, AlertDescription } from "@repo/ui/shadcn/alert"
import { Button } from "@repo/ui/shadcn/button"
import { Input } from "@repo/ui/shadcn/input"
import { Label } from "@repo/ui/shadcn/label"

import loginCognitoUserAction, {
  type LoginState
} from "../(actions)/loginCognitoUserAction"
import TurnstileWidget from "@recipes/app/(components)/TurnstileWidget"

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, action, pending] = useActionState(loginCognitoUserAction, {
    status: "idle"
  } satisfies LoginState)

  return (
    <div className="space-y-4">
      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <form action={action} className="space-y-4">
        <input type="hidden" name="redirect" value={redirectTo} />

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
            autoComplete="current-password"
            required
          />
        </div>

        {/* <TurnstileWidget /> */}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>

        <p className="text-sm text-muted-foreground">
          Don’t have an account?{" "}
          <Link className="text-link underline" href="/register">
            Create one
          </Link>
        </p>
      </form>
    </div>
  )
}
