"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

type Theme = "light" | "dark"

const STORAGE_KEY = "jd-recipes-theme"

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

function applyTheme(theme: Theme) {
  const root = document.documentElement

  root.classList.remove("light", "dark")

  if (theme === "light") root.classList.add("light")
  if (theme === "dark") root.classList.add("dark")

  root.style.colorScheme = theme
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light")

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const initial: Theme =
      stored === "light" || stored === "dark" ? stored : getSystemTheme()

    setTheme(initial)
    applyTheme(initial)
  }, [])

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark"
    setTheme(next)
    window.localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  }

  const isDark = theme === "dark"

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className="relative inline-flex h-8 w-14 items-center rounded-full border border-border bg-muted px-1 transition-colors"
    >
      <span
        className={
          "pointer-events-none inline-flex size-6 items-center justify-center rounded-full bg-background text-foreground shadow-sm transition-transform duration-200 " +
          (isDark ? "translate-x-6" : "translate-x-0")
        }
      >
        {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </span>
    </button>
  )
}
