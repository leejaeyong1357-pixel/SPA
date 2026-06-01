"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "danger" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary: "bg-teczen-navy hover:bg-teczen-navy-dark text-white",
  secondary: "bg-teczen-blue/10 hover:bg-teczen-blue/20 text-teczen-blue border border-teczen-blue/30",
  danger: "bg-teczen-red hover:bg-teczen-red-dark text-white",
  outline: "bg-teczen-blue hover:bg-blue-700 text-white",
  ghost: "bg-teczen-blue/10 hover:bg-teczen-blue/20 text-teczen-blue",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-6 py-3.5 text-lg",
};

const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", fullWidth, className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export default Button;
