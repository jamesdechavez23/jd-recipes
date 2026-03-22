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
    console.log("Turnstile useEffect start, siteKey=", siteKey)
    if (!siteKey) return

    const renderWidget = () => {
      try {
        const el = widgetRef.current
        console.log("renderWidget called, widgetRef=", el)
        if (!el) return
        // Prevent double-rendering (React strict-mode remounts)
        console.log("turnstileRendered dataset:", el.dataset.turnstileRendered)
        if (el.dataset.turnstileRendered === "1") return

        if (window.turnstile) {
          console.log("window.turnstile available, rendering widget")
          const widgetId = window.turnstile.render(el, {
            sitekey: siteKey,
            callback: (token: string) => {
              const input = document.getElementById(
                inputId
              ) as HTMLInputElement | null
              console.log(
                "Turnstile callback token:",
                token,
                "inputElement:",
                input
              )
              if (input) input.value = token
            }
          })
          try {
            el.dataset.turnstileRendered = "1"
            if (widgetId) el.dataset.turnstileWidgetId = String(widgetId)
            console.log("turnstile.render returned widgetId=", widgetId)
          } catch (e) {
            console.error("Turnstile dataset write error:", e)
          }
        }
      } catch (e) {
        console.error("Turnstile render error:", e)
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
      console.log("Found existing Turnstile script, attaching load listener")
      existing.addEventListener("load", renderWidget)
      return () => {
        console.log("Removing existing Turnstile script load listener")
        existing.removeEventListener("load", renderWidget)
      }
    }

    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
    script.async = true
    script.defer = true
    console.log("Appending Turnstile script and waiting for load")
    script.addEventListener("load", () => {
      console.log("Turnstile script loaded")
      renderWidget()
    })
    document.body.appendChild(script)

    return () => {
      console.log("Removing Turnstile script load listener / cleanup")
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
