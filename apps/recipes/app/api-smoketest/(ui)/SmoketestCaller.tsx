"use client"

import { useMemo, useState } from "react"
import { Button } from "@repo/ui/shadcn/button"

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

export default function SmoketestCaller() {
  const url = useMemo(() => {
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim()
    if (!base) return ""

    return `${base.replace(/\/+$/, "")}/smoketest`
  }, [])

  const [state, setState] = useState<CallState>({ status: "idle" })

  async function callSmoketest() {
    if (!url) {
      setState({
        status: "error",
        message:
          "Missing NEXT_PUBLIC_API_BASE_URL (recommended) or NEXT_PUBLIC_API_SMOKETEST_URL. Set it to your API Gateway invoke URL.",
      })
      return
    }

    setState({ status: "loading" })
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      })

      const bodyText = await res.text()
      const bodyJson = tryParseJson(bodyText)

      setState({
        status: "done",
        httpStatus: res.status,
        ok: res.ok,
        bodyText,
        bodyJson,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setState({ status: "error", message })
    }
  }

  return (
    <section className="flex flex-col gap-4 w-full max-w-xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={callSmoketest} disabled={state.status === "loading"}>
          {state.status === "loading" ? "Calling…" : "Call Lambda Smoketest"}
        </Button>
        <p className="text-sm text-muted-foreground break-all">
          URL: {url || "(not set)"}
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
