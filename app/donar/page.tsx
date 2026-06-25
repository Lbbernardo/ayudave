import { redirect } from "next/navigation";

// El registro de donantes ahora vive DENTRO del portal (/panel), siempre con
// sesión iniciada para que quede vinculado a la cuenta (sin registros
// anónimos). Esta ruta antigua redirige al portal.
export default function DonarPage() {
  redirect("/panel");
}
