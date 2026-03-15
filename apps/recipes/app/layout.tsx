import "@repo/ui/styles.css"
import "@recipes/ui/globals.css"
import type { Metadata } from "next"
import { cookies } from "next/headers"

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

  return (
    <html lang="en">
      <body>
        <header className="p-4 flex items-center justify-end gap-2">
          <ThemeToggle />
          {isAuthed ? (
            <form action={signOutAction}>
              <Button variant="outline" type="submit">
                Sign out
              </Button>
            </form>
          ) : null}
        </header>
        {children}
      </body>
    </html>
  )
}
