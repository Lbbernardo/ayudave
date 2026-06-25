import { redirect } from "next/navigation";

// El registro de voluntarios ahora vive DENTRO del portal (/panel), siempre
// con sesión iniciada para que quede vinculado a la cuenta (sin registros
// anónimos). Esta ruta antigua redirige al portal.
export default function VoluntarioPage() {
  redirect("/panel");
}
