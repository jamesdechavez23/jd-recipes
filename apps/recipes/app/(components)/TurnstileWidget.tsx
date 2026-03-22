"use client"

import { useEffect, useId, useRef } from "react"

declare global {
  interface Window {
    turnstile?: any
  }
}

export default function TurnstileWidget() {
  const id = useId()
  const widgetRef = useRef<HTMLDivElement | null>(null)
  const inputId = `turnstile-token-${id}`

  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_CF_TURNSTILE_SITE_KEY
    if (!siteKey) return

    const renderWidget = () => {
      try {
        const el = widgetRef.current
        if (!el) return
        // Prevent double-rendering (React strict-mode remounts)
        if (el.dataset.turnstileRendered === "1") return

        if (window.turnstile) {
          const widgetId = window.turnstile.render(el, {
            sitekey: siteKey,
            callback: (token: string) => {
              const input = document.getElementById(
                inputId
              ) as HTMLInputElement | null
              if (input) input.value = token
            }
          })
          try {
            el.dataset.turnstileRendered = "1"
            if (widgetId) el.dataset.turnstileWidgetId = String(widgetId)
          } catch (e) {
            // ignore dataset failures
          }
        }
      } catch (e) {
        // ignore
      }
    }

    if (window.turnstile) {
      renderWidget()
      return
    }

    const existing = document.querySelector(
      'script[src*="challenges.cloudflare.com/turnstile"]'
    ) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener("load", renderWidget)
      return () => existing.removeEventListener("load", renderWidget)
    }

    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
    script.async = true
    script.defer = true
    script.addEventListener("load", renderWidget)
    document.body.appendChild(script)

    return () => {
      script.removeEventListener("load", renderWidget)
    }
  }, [inputId])

  return (
    <div className="turnstile-widget">
      <div ref={widgetRef} />
      <input type="hidden" name="turnstileToken" id={inputId} />
    </div>
  )
}
