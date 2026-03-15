const PUBLIC_PATHS = [
  "/register/*",
  "/login/*",
  "/api/auth/refresh/*",
  "/"
] as const

export default function checkIfPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((pattern) => {
    if (pattern === "/") return pathname === "/"

    if (pattern.endsWith("/*")) {
      const base = pattern.slice(0, -2)
      return pathname === base || pathname.startsWith(`${base}/`)
    }

    return pathname === pattern
  })
}
