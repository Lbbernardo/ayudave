import { cn } from "@/lib/utils";

export interface BarDatum {
  label: string;
  value: number;
  color?: string; // clase de fondo Tailwind, ej. "bg-emergency"
}

interface BarChartProps {
  data: BarDatum[];
  className?: string;
  emptyLabel?: string;
}

/**
 * Gráfico de barras horizontal, sin dependencias externas. Ideal para móvil.
 */
export default function BarChart({ data, className, emptyLabel = "Sin datos" }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const total = data.reduce((s, d) => s + d.value, 0);

  if (total === 0) {
    return (
      <div className={cn("py-8 text-center text-sm text-gray-400", className)}>
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      {data.map((d) => {
        const pct = Math.round((d.value / max) * 100);
        return (
          <div key={d.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-gray-700">{d.label}</span>
              <span className="tabular-nums font-semibold text-gray-900">{d.value}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn("h-full rounded-full transition-all", d.color || "bg-trust")}
                style={{ width: `${Math.max(pct, d.value > 0 ? 6 : 0)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
