import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  value: string;
  className?: string;
}

// Mapeo de estados/urgencias a estilos de color.
const styleMap: Record<string, string> = {
  // urgencia
  alta: "bg-emergency/10 text-emergency-dark border-emergency/30",
  media: "bg-warning/20 text-yellow-800 border-warning-dark/30",
  baja: "bg-safe/10 text-green-800 border-safe/30",
  // estados de reporte
  pendiente: "bg-gray-100 text-gray-700 border-gray-300",
  revisado: "bg-trust/10 text-trust border-trust/30",
  asignado: "bg-blue-100 text-blue-800 border-blue-300",
  atendido: "bg-safe/10 text-green-800 border-safe/30",
  falso: "bg-red-100 text-red-700 border-red-300",
  duplicado: "bg-gray-100 text-gray-500 border-gray-300",
  // voluntarios
  disponible: "bg-safe/10 text-green-800 border-safe/30",
  inactivo: "bg-gray-100 text-gray-500 border-gray-300",
  // desaparecidos
  buscando: "bg-warning/20 text-yellow-800 border-warning-dark/30",
  encontrado: "bg-safe/10 text-green-800 border-safe/30",
  // donaciones
  coordinada: "bg-trust/10 text-trust border-trust/30",
  entregada: "bg-safe/10 text-green-800 border-safe/30",
};

export default function StatusBadge({ value, className }: StatusBadgeProps) {
  const style = styleMap[value] || "bg-gray-100 text-gray-700 border-gray-300";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
        style,
        className
      )}
    >
      {value}
    </span>
  );
}
