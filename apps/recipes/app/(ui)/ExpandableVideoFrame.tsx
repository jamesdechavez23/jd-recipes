"use client"

import { useEffect, useId, useState, type ReactNode } from "react"
import { Button } from "@repo/ui/shadcn/button"

export const EXPANDABLE_FRAME_EXPANDED_EVENT =
  "jd-recipes:expandable-frame-expanded"

type ExpandableVideoFrameProps = {
  children: ReactNode
  reserveViewportHeight?: string
  expandLabel?: string
  collapseLabel?: string
}

export default function ExpandableVideoFrame({
  children,
  reserveViewportHeight = "22rem",
  expandLabel = "Expand video",
  collapseLabel = "Reset video size"
}: ExpandableVideoFrameProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [canExpand, setCanExpand] = useState(false)
  const titleId = useId()

  function toggleExpanded() {
    setIsExpanded((value) => !value)
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    const mediaQuery = window.matchMedia("(min-width: 768px)")

    const syncCanExpand = (event?: MediaQueryListEvent) => {
      const matches = event?.matches ?? mediaQuery.matches
      setCanExpand(matches)
      if (!matches) setIsExpanded(false)
    }

    syncCanExpand()
    mediaQuery.addEventListener("change", syncCanExpand)

    return () => mediaQuery.removeEventListener("change", syncCanExpand)
  }, [])

  useEffect(() => {
    if (!isExpanded || !canExpand || typeof window === "undefined") return

    window.dispatchEvent(new CustomEvent(EXPANDABLE_FRAME_EXPANDED_EVENT))
  }, [canExpand, isExpanded])

  return (
    <div
      className={
        isExpanded && canExpand
          ? "relative left-1/2 w-screen max-w-none -translate-x-1/2 px-4 sm:px-8"
          : "w-full"
      }
    >
      <div
        id={titleId}
        className="mx-auto flex w-full flex-col gap-3 rounded transition-[max-width] duration-200 ease-out"
        style={
          isExpanded && canExpand
            ? {
                maxWidth: `min(92vw, calc((100vh - ${reserveViewportHeight}) * 16 / 9))`
              }
            : undefined
        }
      >
        <div className="hidden items-center justify-end gap-3 md:flex">
          <Button
            type="button"
            variant="secondary"
            aria-expanded={isExpanded}
            aria-controls={titleId}
            aria-hidden={!canExpand}
            onClick={toggleExpanded}
          >
            {isExpanded ? collapseLabel : expandLabel}
          </Button>
        </div>

        {children}
      </div>
    </div>
  )
}
