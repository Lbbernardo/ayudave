// Envío del correo de seguimiento a quien pide ayuda (sin login).
// Server-side: la clave del proveedor NO se expone al navegador.
//
// Hoy usa Resend (https://resend.com) por fetch (sin instalar dependencias).
// Si no hay RESEND_API_KEY configurada, hace un placeholder (console.log) y
// no falla: el flujo de reporte sigue funcionando y el enlace igual se muestra
// en pantalla.
//
// TODO: alternativamente conectar Gmail SMTP (nodemailer), Twilio, etc.

import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let payload: { email?: string; trackingUrl?: string; helpType?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const { email, trackingUrl, helpType } = payload;
  if (!email || !trackingUrl) {
    return NextResponse.json({ ok: false, error: "Faltan datos." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "AyudaVE <onboarding@resend.dev>";
  const subject = "AyudaVE — Seguimiento de tu solicitud de ayuda";
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111827">
      <h2 style="color:#1d4ed8">Recibimos tu solicitud 🆘</h2>
      <p>Tu solicitud${helpType ? ` de <strong>${helpType}</strong>` : ""} fue recibida.
      Estamos intentando conectarte con una persona cercana que pueda ayudarte.</p>
      <p>Puedes ver el avance de tu caso en cualquier momento desde este enlace:</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${trackingUrl}" style="background:#1d4ed8;color:#fff;text-decoration:none;
           padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">
          Ver el estado de mi caso
        </a>
      </p>
      <p style="font-size:13px;color:#6b7280">Guarda este correo. Si el botón no funciona, copia y pega
      este enlace:<br>${trackingUrl}</p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
      <p style="font-size:12px;color:#9ca3af">AyudaVE — SOS Venezuela. Esta plataforma no reemplaza a los
      servicios oficiales de emergencia. Si estás en peligro inmediato, contacta a servicios oficiales.</p>
    </div>`;

  // Sin proveedor configurado -> placeholder, sin error.
  if (!apiKey) {
    console.log("[email] placeholder (sin RESEND_API_KEY)", { to: email, trackingUrl });
    return NextResponse.json({ ok: true, sent: false, placeholder: true });
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [email], subject, html }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error("[email] Resend error", res.status, detail);
      return NextResponse.json({ ok: false, error: "No se pudo enviar el correo." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, sent: true });
  } catch (e) {
    console.error("[email] error", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
