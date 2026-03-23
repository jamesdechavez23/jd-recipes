import "@repo/ui/styles.css"
import "../ui/globals.css"
import type { Metadata } from "next"
import Link from "next/link"
import { Orbitron } from "next/font/google"

import AppNavbar from "@repo/ui/app-navbar"
import ThemeToggle from "@repo/ui/theme-toggle"

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["600", "700"]
})

export const metadata: Metadata = {
  title: "Speed Knight Challenge",
  description: "speedknightchallenge.com"
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AppNavbar>
          <Link
            href="/"
            aria-label="Speed Knight Challenge"
            className={
              orbitron.className +
              " rounded-md border border-border/70 bg-card/70 px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.28em] text-foreground shadow-sm transition-colors hover:border-primary/60 hover:text-primary"
            }
          >
            <span className="bg-linear-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
              Speed Knight Challenge
            </span>
          </Link>
          <ThemeToggle storageKey="spk-theme" />
        </AppNavbar>
        {children}
      </body>
    </html>
  )
}
