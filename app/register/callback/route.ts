import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
   const { searchParams, origin } = new URL(request.url)
   const code = searchParams.get("code")
   let next = searchParams.get("next") ?? "/"
   if (!next.startsWith("/")) {
      next = "/"
   }
   console.log("Code received:", code)

   if (code) {
      const supabase = await createClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
         console.error("Error exchanging code for session:", { error })
         return NextResponse.redirect(`${origin}/login?error=code_exchange_failed`)
      }
      return NextResponse.redirect(`${origin}${next}`)
   }
}
