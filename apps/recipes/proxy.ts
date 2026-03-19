import { NextResponse, type NextRequest } from "next/server"
import checkIfPublicPath from "./utils/checkIfPublicPath"
import {
  ACCESS_TOKEN_COOKIE_NAME,
  ID_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
  USERNAME_COOKIE_NAME
} from "./utils/authCookies"
import { isCognitoAdmin, verifyCognitoAccessToken } from "./utils/cognitoJwt"

const REFRESH_PATH = "/api/auth/refresh"
const REFRESH_IF_EXPIRING_IN_SECONDS = 60
const ADMIN_ONLY_PATHS = ["/api-smoketest"]

export async function proxy(req: NextRequest) {
  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE_NAME)?.value
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE_NAME)?.value
  const { pathname } = req.nextUrl
  const isPublicPath = checkIfPublicPath(pathname)
  const redirectOrigin =
    process.env.NEXT_PUBLIC_REDIRECT_ORIGIN ?? req.nextUrl.origin

  const requestPathWithSearch = `${req.nextUrl.pathname}${req.nextUrl.search}`

  function redirectToLogin() {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("redirect", requestPathWithSearch)
    return NextResponse.redirect(loginUrl)
  }

  function redirectToRefresh() {
    const refreshUrl = new URL(REFRESH_PATH, req.url)
    refreshUrl.searchParams.set("redirect", requestPathWithSearch)
    return NextResponse.redirect(refreshUrl)
  }

  function redirectToRecipe() {
    return NextResponse.redirect(new URL("/recipe", req.url))
  }

  const isAdminOnlyPath = ADMIN_ONLY_PATHS.some(
    (adminPath) =>
      pathname === adminPath || pathname.startsWith(`${adminPath}/`)
  )

  if (pathname === REFRESH_PATH || pathname.startsWith(`${REFRESH_PATH}/`)) {
    return NextResponse.next()
  }

  if (!accessToken) {
    if (!isPublicPath && refreshToken) return redirectToRefresh()
    if (!isPublicPath) return redirectToLogin()
    return NextResponse.next()
  }

  try {
    const payload = await verifyCognitoAccessToken(accessToken)
    const exp = payload.exp
    if (
      typeof exp === "number" &&
      refreshToken &&
      !isPublicPath &&
      exp - Math.floor(Date.now() / 1000) <= REFRESH_IF_EXPIRING_IN_SECONDS
    ) {
      return redirectToRefresh()
    }

    if (isPublicPath) {
      return NextResponse.redirect(`${redirectOrigin}/recipe`)
    }

    if (isAdminOnlyPath && !isCognitoAdmin(payload)) {
      return redirectToRecipe()
    }

    return NextResponse.next()
  } catch {
    if (!isPublicPath && refreshToken) return redirectToRefresh()

    const response = isPublicPath ? NextResponse.next() : redirectToLogin()
    response.cookies.delete(ACCESS_TOKEN_COOKIE_NAME)
    response.cookies.delete(ID_TOKEN_COOKIE_NAME)
    response.cookies.delete(REFRESH_TOKEN_COOKIE_NAME)
    response.cookies.delete(USERNAME_COOKIE_NAME)
    return response
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
