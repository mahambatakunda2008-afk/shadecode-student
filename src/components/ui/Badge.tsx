import React from "react";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Text to display inside the badge */
  children: React.ReactNode;
  /** Optional background color variant (default uses primary) */
  variant?: "primary" | "success" | "warning" | "danger";
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "primary", className, ...rest }) => {
  const variantColors: Record<string, string> = {
    primary: "bg-primary text-white",
    success: "bg-success text-white",
    warning: "bg-warning text-white",
    danger: "bg-danger text-white",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantColors[variant]} ${className ?? ""}`}
      {...rest}
    >
      {children}
    </span>
  );
};
