"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export const Checkbox = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      className={cn(
        "h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500",
        className
      )}
      {...props}
    />
  )
)
Checkbox.displayName = "Checkbox"