// Proxy de AyudaVE (en Next.js 16 el "middleware" se llama Proxy).
//
// Protección simple del panel /admin con HTTP Basic Auth.
// La contraseña vive en la variable de entorno ADMIN_PASSWORD (server-side,
// NO se expone al navegador). Si no está configurada, no se bloquea nada
// (útil en local), pero en producción debe estar definida.
//
// TODO (antes de un uso estable): reemplazar por Supabase Auth con roles.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export function proxy(request: NextRequest) {
  // Sin contraseña configurada => no protegemos (entorno local/desarrollo).
  if (!ADMIN_PASSWORD) {
    console.warn(
      "[proxy] ADMIN_PASSWORD no está configurada: /admin queda SIN protección."
    );
    return NextResponse.next();
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const sep = decoded.indexOf(":");
      const user = decoded.slice(0, sep);
      const pass = decoded.slice(sep + 1);
      if (user === ADMIN_USER && pass === ADMIN_PASSWORD) {
        return NextResponse.next();
      }
    } catch {
      // credenciales mal formadas -> cae al 401
    }
  }

  return new NextResponse("Autenticación requerida.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="AyudaVE Admin", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
