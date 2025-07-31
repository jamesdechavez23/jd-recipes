"use client"

import { useState } from "react"
import { Button } from "./shadcn/button"
import { createClient } from "@/lib/supabase/client"
import GoogleSVG from "./GoogleSVG"
export default function SignInWithGoogleButton({ text }: { text?: string }) {
   const [error, setError] = useState("")
   const handleSignIn = async () => {
      setError("")
      const { success, error } = await signInWithGoogle()
      if (error && !success) {
         setError(error)
      }
   }
   return (
      <div className="w-full flex flex-col items-center">
         <Button className="w-full" variant={"outline"} onClick={handleSignIn}>
            {text}
            <span className="ml-2">
               <GoogleSVG />
            </span>
         </Button>
         {error && <p className="text-destructive mt-2">{error}</p>}
      </div>
   )
}

async function signInWithGoogle() {
   const supabase = createClient()

   const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
         redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/register/callback`
      }
   })
   if (error) {
      console.error("Error signing in with Google:", { error })
      return { success: false, error: "There was an error signing in with Google. Please try again later." }
   }
   return { success: true, error: null }
}
