import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "./lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        default: "border-border bg-background text-foreground",
        destructive: "border-destructive/30 bg-destructive/10 text-destructive",
        success: "border-success/30 bg-success/10 text-success"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("leading-relaxed", className)}
      {...props}
    />
  )
}

export { Alert, AlertDescription }
