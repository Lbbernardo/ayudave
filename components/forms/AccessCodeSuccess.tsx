import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import type { OnboardingResult } from "@/components/portal/HelperOnboarding";

/** Pantalla de éxito que muestra la clave de acceso de 4 dígitos. */
export default function AccessCodeSuccess({
  result,
  onReset,
  resetLabel,
}: {
  result: OnboardingResult;
  onReset: () => void;
  resetLabel: string;
}) {
  return (
    <div className="space-y-4">
      <Card className="text-center">
        <div className="text-5xl">🎉</div>
        <h2 className="mt-3 text-xl font-bold text-gray-900">¡Registro completado!</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-gray-600">
          Esta es tu clave de acceso personal. Guárdala bien.
        </p>
        <div className="mx-auto mt-4 inline-block rounded-2xl bg-trust px-8 py-4 text-4xl font-bold tracking-[0.4em] text-white shadow-lg">
          {result.code}
        </div>
        <p className="mt-3 text-sm">
          {result.email ? (
            result.emailed ? (
              <span className="text-safe">✅ También te la enviamos a {result.email}.</span>
            ) : (
              <span className="text-gray-500">
                Anótala: no pudimos confirmar el envío por correo, pero tu registro quedó guardado.
              </span>
            )
          ) : (
            <span className="text-gray-500">
              Anótala ahora. (No dejaste correo, así que no la enviamos por email.)
            </span>
          )}
        </p>
      </Card>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <Button type="button" variant="outline" fullWidth className="sm:w-auto" onClick={onReset}>
          {resetLabel}
        </Button>
        <Link href="/" className="w-full sm:w-auto">
          <Button type="button" variant="primary" fullWidth>Volver al inicio</Button>
        </Link>
      </div>
    </div>
  );
}
