import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "./lib/supabase/middleware"
import { checkPublicPage } from "./lib/utils"

export async function middleware(request: NextRequest) {
   const { pathname } = request.nextUrl

   try {
      const { supabase, response } = await createClient(request)
      const { data } = await supabase.auth.getClaims()
      const user = data?.claims
      const isPublicPage = checkPublicPage(pathname)

      if (isPublicPage || user) {
         return response
      }

      if (!user && !isPublicPage) {
         const loginUrl = new URL("/login", request.url)
         console.log(`Redirecting from ${pathname} to ${loginUrl.pathname}`, { user, isPublicPage })
         return NextResponse.redirect(loginUrl)
      }

      return response
   } catch (error) {
      console.error("Error in middleware:", { error })
      return NextResponse.next()
   }
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
