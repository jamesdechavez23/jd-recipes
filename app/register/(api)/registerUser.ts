"use server"

import { createClient } from "@/lib/supabase/server"
import { RegisterFormValues } from "../RegisterForm"

export default async function registerUser({ email, password, captchaToken }: RegisterFormValues) {
   const supabase = await createClient()

   const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
         captchaToken,
         emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/register/callback?next=/recipe-book`
      }
   })

   if (error) {
      console.error("Error signing up:", { error })
      return { success: false, error: "There was an error signing you up. Please try again later." }
   }

   return { success: true, error: null }
}
