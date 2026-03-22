"use client"

import { type ReactNode } from "react"

type ExpandableVideoFrameProps = {
  children: ReactNode
}

export default function ExpandableVideoFrame({
  children
}: ExpandableVideoFrameProps) {
  return (
    <div className="w-full">
      <div className="mx-auto flex w-full flex-col gap-3 rounded transition-[max-width] duration-200 ease-out">
        {children}
      </div>
    </div>
  )
}
