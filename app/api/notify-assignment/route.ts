// Envía dos correos cuando un voluntario acepta un caso desde el mapa:
//   1. Al voluntario: datos de contacto del caso + mensaje de fortaleza.
//   2. A quien pidió ayuda (si dejó email): aviso de que fue asignado.
//
// Usa Resend si RESEND_API_KEY está configurada; si no, imprime en consola.

import { NextResponse } from "next/server";

interface Payload {
  // Voluntario
  volunteerName: string;
  volunteerEmail?: string;
  // Caso
  reportId: string;
  helpType: string;
  requesterName: string;
  requesterPhone?: string | null;
  requesterAddress?: string | null;
  requesterDescription?: string | null;
  city?: string | null;
  state?: string | null;
  // Para notificar a quien pidió ayuda
  requesterEmail?: string | null;
  trackingUrl?: string | null;
}

const FROM = process.env.EMAIL_FROM ?? "AyudaVE <onboarding@resend.dev>";
const API_KEY = () => process.env.RESEND_API_KEY;

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const key = API_KEY();
  if (!key) {
    console.log("[email] placeholder (sin RESEND_API_KEY)", { to, subject });
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  if (!res.ok) console.error("[email] Resend error", res.status, await res.text());
  return res.ok;
}

export async function POST(req: Request) {
  let body: Payload;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }

  const {
    volunteerName, volunteerEmail,
    helpType, requesterName, requesterPhone, requesterAddress,
    requesterDescription, city, state,
    requesterEmail, trackingUrl,
  } = body;

  const zona = [city, state].filter(Boolean).join(", ") || "—";

  // ── Email 1: al voluntario ──────────────────────────────────────────────
  if (volunteerEmail) {
    const html = `
      <div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111827">
        <h2 style="color:#1d4ed8">¡Gracias por ayudar, ${escHtml(volunteerName)}! 🌟</h2>
        <p style="font-size:15px;line-height:1.6">
          En medio de la adversidad, hay personas como tú que eligen actuar.
          Tu decisión de ayudar hoy puede cambiar la vida de alguien para siempre.
          <strong>Eres una luz en la oscuridad.</strong>
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
        <h3 style="color:#111827;margin-bottom:12px">📋 Datos del caso asignado</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280;width:140px">Tipo de ayuda</td>
              <td style="padding:6px 0;font-weight:600">${escHtml(helpType)}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Nombre</td>
              <td style="padding:6px 0">${escHtml(requesterName)}</td></tr>
          ${requesterPhone ? `<tr><td style="padding:6px 0;color:#6b7280">Teléfono</td>
              <td style="padding:6px 0;font-weight:600">${escHtml(requesterPhone)}</td></tr>` : ""}
          ${requesterAddress ? `<tr><td style="padding:6px 0;color:#6b7280">Dirección</td>
              <td style="padding:6px 0">${escHtml(requesterAddress)}</td></tr>` : ""}
          <tr><td style="padding:6px 0;color:#6b7280">Zona</td>
              <td style="padding:6px 0">${escHtml(zona)}</td></tr>
          ${requesterDescription ? `<tr><td style="padding:6px 0;color:#6b7280;vertical-align:top">Descripción</td>
              <td style="padding:6px 0">${escHtml(requesterDescription)}</td></tr>` : ""}
        </table>
        <p style="margin-top:20px;font-size:13px;color:#6b7280">
          Por favor, comunícate con la persona lo antes posible. Si no puedes atender
          el caso, notifica al coordinador.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
        <p style="font-size:12px;color:#9ca3af">AyudaVE — SOS Venezuela. Esta plataforma no reemplaza
        a los servicios oficiales de emergencia.</p>
      </div>`;
    await sendEmail(volunteerEmail, `AyudaVE — Tienes un caso asignado: ${helpType}`, html);
  }

  // ── Email 2: a quien pidió ayuda ────────────────────────────────────────
  if (requesterEmail) {
    const html = `
      <div style="font-family:system-ui,Arial,sans-serif;max-width:520px;margin:0 auto;color:#111827">
        <h2 style="color:#16a34a">¡Buenas noticias! Alguien quiere ayudarte 🙌</h2>
        <p style="font-size:15px;line-height:1.6">
          Tu solicitud de <strong>${escHtml(helpType)}</strong> fue asignada al
          voluntario <strong>${escHtml(volunteerName)}</strong>, quien se comunicará
          contigo a la brevedad.
        </p>
        <p style="font-size:15px;line-height:1.6">
          No estás solo/a. Hay personas dispuestas a ayudar y juntos saldremos
          adelante. <strong>Ten fe y mantente seguro/a.</strong>
        </p>
        ${trackingUrl ? `
        <p style="text-align:center;margin:24px 0">
          <a href="${trackingUrl}" style="background:#1d4ed8;color:#fff;text-decoration:none;
             padding:12px 22px;border-radius:8px;font-weight:600;display:inline-block">
            Ver el estado de mi caso
          </a>
        </p>` : ""}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
        <p style="font-size:12px;color:#9ca3af">AyudaVE — SOS Venezuela. Esta plataforma no reemplaza
        a los servicios oficiales de emergencia.</p>
      </div>`;
    await sendEmail(requesterEmail, "AyudaVE — Tu caso fue asignado a un voluntario", html);
  }

  return NextResponse.json({ ok: true });
}

function escHtml(s?: string | null): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
