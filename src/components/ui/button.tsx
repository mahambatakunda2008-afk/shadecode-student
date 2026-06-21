import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-[var(--radius)] border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all outline-none select-none shadow-sm hover:-translate-y-px disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none focus-visible:ring-4 focus-visible:ring-[var(--ring)] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg:not([class*='size-'])]:size-4 group-hover/button:[&_svg]:scale-105",
  {
    variants: {
      variant: {
        default: "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[0_10px_28px_var(--primary-glow)] hover:bg-[var(--primary-hover)]",
        outline:
          "border-[var(--card-border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-2)]",
        secondary:
          "border-[var(--card-border)] bg-[var(--surface-2)] text-[var(--foreground)] hover:bg-[var(--surface-3)]",
        ghost:
          "bg-transparent text-[var(--muted-foreground)] shadow-none hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]",
        destructive:
          "border-[color-mix(in_srgb,var(--danger)_24%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)] shadow-none hover:bg-[var(--danger-soft)]",
        link: "text-[var(--primary)] shadow-none underline-offset-4 hover:underline hover:translate-y-0",
      },
      size: {
        default:
          "h-10 gap-2 px-4",
        xs: "h-7 gap-1 rounded-[10px] px-2 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-[10px] px-3 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2 px-5",
        icon: "size-10",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
