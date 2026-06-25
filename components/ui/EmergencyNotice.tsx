import AlertBanner from "./AlertBanner";

/** Aviso legal reutilizable que debe aparecer en home y formularios. */
export default function EmergencyNotice({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <AlertBanner tone="warning" title={compact ? undefined : "Aviso importante"}>
      Esta plataforma <strong>no reemplaza</strong> a Protección Civil, bomberos,
      policía, ambulancias ni servicios oficiales de emergencia. Si estás en
      peligro inmediato, contacta a los servicios oficiales o a personas
      cercanas.
    </AlertBanner>
  );
}
