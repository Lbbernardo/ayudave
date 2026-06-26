import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "emergency" | "safe" | "outline" | "ghost" | "warning";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-trust text-white shadow-sm hover:bg-trust/90 focus-visible:ring-trust",
  emergency:
    "bg-emergency text-white shadow-sm hover:bg-emergency-dark focus-visible:ring-emergency",
  safe: "bg-safe text-white shadow-sm hover:bg-safe/90 focus-visible:ring-safe",
  warning:
    "bg-warning text-gray-900 shadow-sm hover:bg-warning-dark focus-visible:ring-warning-dark",
  outline:
    "border-2 border-trust text-trust bg-white hover:bg-trust/5 focus-visible:ring-trust",
  ghost: "text-trust hover:bg-trust/5 focus-visible:ring-trust",
};

const sizes: Record<Size, string> = {
  sm: "min-h-[40px] px-3.5 py-2 text-sm",
  md: "min-h-[48px] px-5 py-2.5 text-base",
  lg: "min-h-[54px] px-6 py-3.5 text-lg",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", fullWidth, className, children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 disabled:shadow-none",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
