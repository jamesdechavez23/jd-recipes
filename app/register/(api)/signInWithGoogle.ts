import { createClient } from "@/lib/supabase/client"

export default async function signInWithGoogle() {
   const supabase = createClient()

   const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
         redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/register/callback?next=/recipe-book`
      }
   })
   if (error) {
      console.error("Error signing in with Google:", { error })
      return { success: false, error: "There was an error signing in with Google. Please try again later." }
   }
   return { success: true, error: null }
}
