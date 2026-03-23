import * as React from "react"

import { cn } from "./shadcn/lib/utils"

type AppNavbarProps = React.ComponentProps<"header"> & {
  innerClassName?: string
}

export default function AppNavbar({
  className,
  innerClassName,
  children,
  ...props
}: AppNavbarProps) {
  return (
    <header
      className={cn(
        "border-b border-border/45 bg-background/90 px-4 py-4 backdrop-blur-sm",
        className
      )}
      {...props}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3",
          innerClassName
        )}
      >
        {children}
      </div>
    </header>
  )
}
