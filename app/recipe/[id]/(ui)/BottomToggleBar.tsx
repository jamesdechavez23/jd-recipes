"use client"
import { Button } from "@/components/ui/shadcn/button"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect } from "react"

export default function BottomToggleBar() {
   const router = useRouter()
   const searchParams = useSearchParams()
   const currentToggle = searchParams.get("toggle")

   useEffect(() => {
      if (!currentToggle) {
         const params = new URLSearchParams(searchParams)
         params.set("toggle", "ingredients")
         router.replace(`?${params.toString()}`, { scroll: false })
      }
   }, [currentToggle, router, searchParams])

   const handleClick = useCallback(
      (toggle: string) => {
         const params = new URLSearchParams(Array.from(searchParams.entries()))
         params.set("toggle", toggle)
         router.replace(`?${params.toString()}`, { scroll: false })
      },
      [router, searchParams]
   )

   return (
      <div className="fixed bottom-0 left-0 w-full bg-muted border-t flex justify-around z-50 md:hidden">
         <Button
            className={`px-4 py-2 border w-1/2 rounded-none h-full ${currentToggle === "ingredients" ? "bg-primary text-primary-foreground" : ""}`}
            variant="outline"
            onClick={() => handleClick("ingredients")}
            disabled={currentToggle === "ingredients"}
         >
            Ingredients
         </Button>
         <Button
            className={`px-4 py-2 border w-1/2 rounded-none h-full ${currentToggle === "instructions" ? "bg-primary text-primary-foreground" : ""}`}
            variant="outline"
            onClick={() => handleClick("instructions")}
            disabled={currentToggle === "instructions"}
         >
            Instructions
         </Button>
      </div>
   )
}
