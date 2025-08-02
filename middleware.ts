import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "./lib/supabase/middleware"
import { checkPublicPage } from "./lib/utils"

export async function middleware(request: NextRequest) {
   const { pathname } = request.nextUrl
   const isPublicPage = checkPublicPage(pathname)
   const { supabase, response } = createClient(request)

   const { data, error } = await supabase.auth.getClaims()
   const user = data?.claims || null

   if (error || !user) {
      if (error) console.error("Error fetching user claims:", { error })
      if (isPublicPage) {
         return NextResponse.next(response)
      }
      const loginUrl = new URL("/login", request.url)
      return NextResponse.redirect(loginUrl)
   }

   if (user && isPublicPage) {
      const redirectUrl = new URL("/recipe-book", request.url)
      return NextResponse.redirect(redirectUrl)
   }

   return NextResponse.next(response)
}

export const config = {
   matcher: [
      /*
       * Match all request paths except:
       * - _next/static (static files)
       * - _next/image (image optimization files)
       * - favicon.ico (favicon file)
       * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
       * Feel free to modify this pattern to include more paths.
       */
      "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|pdf|webp)$).*)"
   ]
}
