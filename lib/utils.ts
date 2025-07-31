import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
   return twMerge(clsx(inputs))
}

export function checkPublicPage(pathname: string): boolean {
   const PUBLIC_PAGES_EXACT = ["/", "/login", "/forgot-password"]
   const PUBLIC_PAGES_DYNAMIC = ["/demo/", "/register"]

   return PUBLIC_PAGES_EXACT.includes(pathname) || PUBLIC_PAGES_DYNAMIC.some(page => pathname.startsWith(page))
}
