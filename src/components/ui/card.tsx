import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * src/components/ui/card.tsx
 *
 * Was imported by src/components/dashboard/DashboardReimagined.tsx but
 * never existed in this repo -- a build-breaking missing module found
 * on `main` during Blueprint Reconciliation merge verification (2026-08-08).
 * Card has no interaction logic (unlike button.tsx, which wraps a real
 * @base-ui/react/button primitive), so it isn't one of @base-ui/react's
 * primitives -- this follows shadcn/ui's standard Card implementation,
 * styled with this repo's existing CSS custom properties for visual
 * consistency with button.tsx and the rest of the design system.
 */

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-4 rounded-[var(--radius)] border border-[var(--card-border)] bg-[var(--surface)] py-5 shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex flex-col gap-1.5 px-5", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-base leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-sm text-[var(--muted-foreground)]", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-content" className={cn("px-5", className)} {...props} />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-5", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter }
