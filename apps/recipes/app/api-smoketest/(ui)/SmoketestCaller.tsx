"use client"

import { useState, useTransition } from "react"
import { Button } from "@repo/ui/shadcn/button"
import type { SmoketestResult } from "../(actions)/callSmoketest"

type CallState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "done"
      httpStatus: number
      ok: boolean
      bodyText: string
      bodyJson: unknown | null
    }
  | { status: "error"; message: string }

function tryParseJson(text: string): unknown | null {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

type SmoketestCallerProps = {
  callSmoketestAction: () => Promise<SmoketestResult>
}

export default function SmoketestCaller({
  callSmoketestAction
}: SmoketestCallerProps) {
  const [isPending, startTransition] = useTransition()

  const [state, setState] = useState<CallState>({ status: "idle" })

  async function callSmoketest() {
    setState({ status: "loading" })
    startTransition(() => {
      callSmoketestAction()
        .then((res) => {
          const bodyJson = tryParseJson(res.bodyText)
          setState({
            status: "done",
            httpStatus: res.httpStatus,
            ok: res.ok,
            bodyText: res.bodyText,
            bodyJson
          })
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : String(err)
          setState({ status: "error", message })
        })
    })
  }

  return (
    <section className="flex flex-col gap-4 w-full max-w-xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={callSmoketest} disabled={state.status === "loading"}>
          {state.status === "loading" || isPending
            ? "Calling…"
            : "Call Lambda Smoketest"}
        </Button>
        <p className="text-sm text-muted-foreground break-all">
          Mode: Server Action
        </p>
      </div>

      {state.status === "error" ? (
        <p className="text-sm text-red-600">{state.message}</p>
      ) : null}

      {state.status === "done" ? (
        <div className="border rounded p-3 text-sm">
          <p>
            HTTP: {state.httpStatus} {state.ok ? "(ok)" : "(error)"}
          </p>
          <pre className="mt-2 whitespace-pre-wrap wrap-break-word">
            {state.bodyJson
              ? JSON.stringify(state.bodyJson, null, 2)
              : state.bodyText}
          </pre>
        </div>
      ) : null}
    </section>
  )
}
