import "@repo/ui/styles.css"
import "@recipes/ui/globals.css"
import type { Metadata } from "next"
import { cookies } from "next/headers"
import Link from "next/link"

import { Button } from "@repo/ui/shadcn/button"

import ThemeToggle from "./(ui)/ThemeToggle"
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
        <header className="flex items-center justify-between gap-2 border-b border-border/45 bg-background/90 p-4 backdrop-blur-sm">
          <Link
            href={homeHref}
            className="text-lg font-bold tracking-tight"
            aria-label="JD-Recipes"
          >
            JD-Recipes
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {isAuthed ? (
              <form action={signOutAction}>
                <Button variant="outline" type="submit">
                  Sign out
                </Button>
              </form>
            ) : null}
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}
