import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import ThemeToggle from "@/components/ui/ThemeToggle"
import Navbar from "@/components/ui/Navbar"

const geistSans = Geist({
   variable: "--font-geist-sans",
   subsets: ["latin"]
})

const geistMono = Geist_Mono({
   variable: "--font-geist-mono",
   subsets: ["latin"]
})

export const metadata: Metadata = {
   title: "JD-Recipes",
   description: "Online Recipe Book application from JD"
}

export type User = {
   id: string
   email: string
}

export default function RootLayout({
   children
}: Readonly<{
   children: React.ReactNode
}>) {
   const user: User = {
      id: "1",
      email: "user@example.com"
   }

   return (
      <html lang="en" className="dark">
         <body className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}>
            <ThemeToggle />
            <Navbar user={null} />
            {children}
         </body>
      </html>
   )
}
