import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "warning" | "emergency" | "info" | "safe";

interface AlertBannerProps {
  tone?: Tone;
  title?: string;
  children: ReactNode;
  className?: string;
}

const tones: Record<Tone, { box: string; icon: string }> = {
  warning: {
    box: "bg-warning/15 border-warning-dark/40 text-yellow-900",
    icon: "⚠️",
  },
  emergency: {
    box: "bg-emergency/10 border-emergency/40 text-emergency-dark",
    icon: "🚨",
  },
  info: {
    box: "bg-trust/10 border-trust/30 text-trust",
    icon: "ℹ️",
  },
  safe: {
    box: "bg-safe/10 border-safe/30 text-green-800",
    icon: "✅",
  },
};

export default function AlertBanner({
  tone = "warning",
  title,
  children,
  className,
}: AlertBannerProps) {
  const t = tones[tone];
  return (
    <div
      role="alert"
      className={cn(
        "flex gap-3 rounded-2xl border px-4 py-3.5 text-sm",
        t.box,
        className
      )}
    >
      <span aria-hidden className="text-lg leading-none">
        {t.icon}
      </span>
      <div>
        {title && <p className="font-bold">{title}</p>}
        <div className={title ? "mt-0.5" : ""}>{children}</div>
      </div>
    </div>
  );
}
