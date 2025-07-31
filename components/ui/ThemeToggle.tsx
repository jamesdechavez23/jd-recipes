"use client"
import { useEffect, useState } from "react"
import { Sun, Moon } from "lucide-react"
import { Switch } from "@/components/ui/shadcn/switch"

export default function ThemeToggle() {
   const [isDark, setIsDark] = useState(false)

   useEffect(() => {
      const stored = localStorage.getItem("theme")
      if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
         document.documentElement.classList.add("dark")
         setIsDark(true)
      }
   }, [])

   const toggleTheme = () => {
      const html = document.documentElement
      if (html.classList.contains("dark")) {
         html.classList.remove("dark")
         localStorage.setItem("theme", "light")
         setIsDark(false)
      } else {
         html.classList.add("dark")
         localStorage.setItem("theme", "dark")
         setIsDark(true)
      }
      window.dispatchEvent(new Event("theme-changed"))
   }

   return (
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
         <Sun className={`transition-colors ${isDark ? "text-foreground" : "text-primary"}`} size={20} />
         <Switch checked={isDark} onCheckedChange={toggleTheme} />
         <Moon className={`transition-colors ${isDark ? "text-primary" : "text-foreground"}`} size={20} />
      </div>
   )
}
