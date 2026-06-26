import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
}

export default function Card({
  padded = true,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-100 bg-card shadow-sm shadow-gray-200/60",
        padded && "p-4 sm:p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
