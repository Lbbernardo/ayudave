// Envía por correo la clave de acceso de 4 dígitos a un voluntario/donante.
// Server-side: la clave del proveedor NO se expone al navegador.
// Usa Resend si RESEND_API_KEY está configurada; si no, hace placeholder.
// El registro NO depende de esto: la clave también se muestra en pantalla.

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let payload: { email?: string; code?: string; name?: string; role?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const { email, code, name, role } = payload;
  if (!email || !code) {
    return NextResponse.json({ ok: false, error: "Faltan datos." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "AyudaVE <onboarding@resend.dev>";
  const rol = role === "donor" ? "donante" : "voluntario";
  const subject = "AyudaVE — Tu clave de acceso";
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:0 auto;color:#111827">
      <h2 style="color:#1d4ed8">¡Gracias por registrarte como ${rol}${name ? ", " + escHtml(name) : ""}! 🤝</h2>
      <p>Esta es tu clave de acceso personal de AyudaVE. Guárdala: la puedes usar
      para identificarte y dar seguimiento a tus casos.</p>
      <div style="text-align:center;margin:24px 0">
        <div style="display:inline-block;background:#1d4ed8;color:#fff;font-size:32px;
             font-weight:700;letter-spacing:8px;padding:14px 28px;border-radius:12px">
          ${escHtml(code)}
        </div>
      </div>
      <p style="font-size:13px;color:#6b7280">Si no te registraste en AyudaVE, ignora este correo.</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
      <p style="font-size:12px;color:#9ca3af">AyudaVE — SOS Venezuela. Esta plataforma no reemplaza
      a los servicios oficiales de emergencia.</p>
    </div>`;

  if (!apiKey) {
    console.log("[access-code] placeholder (sin RESEND_API_KEY)", { to: email, code });
    return NextResponse.json({ ok: true, sent: false, placeholder: true });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [email], subject, html }),
    });
    if (!res.ok) {
      console.error("[access-code] Resend error", res.status, await res.text());
      return NextResponse.json({ ok: false, error: "No se pudo enviar el correo." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sent: true });
  } catch (e) {
    console.error("[access-code] error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
