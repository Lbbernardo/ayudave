import Link from "next/link";
import { ReactNode } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

interface FormSuccessProps {
  title?: string;
  message?: ReactNode;
  onReset: () => void;
  resetLabel?: string;
}

export default function FormSuccess({
  title = "Tu reporte fue recibido",
  message,
  onReset,
  resetLabel = "Crear otro reporte",
}: FormSuccessProps) {
  return (
    <Card className="text-center">
      <div className="text-5xl">✅</div>
      <h2 className="mt-3 text-xl font-bold text-gray-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
        {message ?? (
          <>
            Si estás en peligro inmediato, intenta contactar a servicios
            oficiales o personas cercanas.
          </>
        )}
      </p>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <Button type="button" variant="outline" fullWidth className="sm:w-auto" onClick={onReset}>
          {resetLabel}
        </Button>
        <Link href="/" className="w-full sm:w-auto">
          <Button type="button" variant="primary" fullWidth>
            Volver al inicio
          </Button>
        </Link>
      </div>
    </Card>
  );
}
