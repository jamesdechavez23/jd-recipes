"use client"

import { useActionState } from "react"
import Link from "next/link"

import { Button } from "@repo/ui/shadcn/button"

import loginCognitoUserAction, {
  type LoginState
} from "../(actions)/loginCognitoUserAction"

export default function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, action, pending] = useActionState(loginCognitoUserAction, {
    status: "idle"
  } satisfies LoginState)

  return (
    <div className="max-w-sm space-y-4">
      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <form action={action} className="space-y-4">
        <input type="hidden" name="redirect" value={redirectTo} />

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
            autoComplete="current-password"
            required
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
          />
        </div>

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
