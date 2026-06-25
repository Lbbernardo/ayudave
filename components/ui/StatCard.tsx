import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Accent = "trust" | "emergency" | "safe" | "warning" | "neutral";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  accent?: Accent;
  hint?: string;
}

const accents: Record<Accent, string> = {
  trust: "text-trust",
  emergency: "text-emergency",
  safe: "text-safe",
  warning: "text-warning-dark",
  neutral: "text-gray-800",
};

export default function StatCard({
  label,
  value,
  icon,
  accent = "neutral",
  hint,
}: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <p className={cn("mt-2 text-3xl font-bold", accents[accent])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}
