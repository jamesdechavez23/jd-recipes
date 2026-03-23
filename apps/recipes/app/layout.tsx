import "@repo/ui/styles.css"
import "@recipes/ui/globals.css"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"

import AppNavbar from "@repo/ui/app-navbar"
import { Button } from "@repo/ui/shadcn/button"
import ThemeToggle from "@repo/ui/theme-toggle"

import signOutAction from "./(actions)/signOutAction"
import { ACCESS_TOKEN_COOKIE_NAME } from "@recipes/utils/authCookies"

export const metadata: Metadata = {
  title: "JD-Recipes",
  description: "Recipe App"
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const isAuthed = Boolean(cookieStore.get(ACCESS_TOKEN_COOKIE_NAME)?.value)
  const homeHref = isAuthed ? "/recipe" : "/"

  return (
    <html lang="en">
      <body>
        <AppNavbar>
          <Link
            href={homeHref}
            className="text-lg font-bold tracking-tight"
            aria-label="JD-Recipes"
          >
            JD-Recipes
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle storageKey="jd-recipes-theme" />
            {isAuthed ? (
              <form action={signOutAction}>
                <Button variant="outline" type="submit">
                  Sign out
                </Button>
              </form>
            ) : null}
          </div>
        </AppNavbar>
        {children}
      </body>
    </html>
  )
}
