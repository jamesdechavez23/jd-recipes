import "@repo/ui/styles.css"
import "./globals.css"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "JD-Recipes",
  description: "Recipe App"
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
