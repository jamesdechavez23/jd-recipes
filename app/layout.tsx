import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import ThemeToggle from "@/components/ui/ThemeToggle"
import Navbar from "@/components/ui/Navbar"
import { createClient } from "@/lib/supabase/server"

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

export default async function RootLayout({
   children
}: Readonly<{
   children: React.ReactNode
}>) {
   const supabase = await createClient()
   const { data } = await supabase.auth.getClaims()
   const user = data?.claims || null
   return (
      <html lang="en">
         <body className={`${geistSans.variable} ${geistMono.variable} bg-background text-foreground antialiased`}>
            <ThemeToggle />
            <Navbar user={user} />
            {children}
         </body>
      </html>
   )
}
