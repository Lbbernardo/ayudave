"use client";

import { FormEvent, useState } from "react";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import FormInput from "@/components/ui/FormInput";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import AlertBanner from "@/components/ui/AlertBanner";
import EmptyState from "@/components/ui/EmptyState";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  acceptAssignment,
  completeAssignment,
  rejectAssignment,
  startAssignment,
} from "@/lib/matching";
import type { Assignment, Donation, Report, Volunteer } from "@/lib/types";

interface CaseRow {
  assignment: Assignment;
  report: Report;
}

// Compara dos correos sin distinguir mayúsculas ni espacios.
function emailMatches(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export default function MiAyudaPage() {
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const [wrongCode, setWrongCode] = useState(false);

  async function handleSearch(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setNotice("");
    const data = new FormData(ev.currentTarget);
    const email = String(data.get("email") || "").trim();
    const code = String(data.get("code") || "").trim();
    if (!email || !code) return;

    setLoading(true);
    setSearched(true);
    await runSearch(email, code);
    setLoading(false);
  }

  // Guardamos lo último buscado para poder recargar tras una acción.
  const [lastEmail, setLastEmail] = useState("");
  const [lastCode, setLastCode] = useState("");

  async function runSearch(email: string, code: string) {
    setLastEmail(email);
    setLastCode(code);
    setWrongCode(false);
    if (!isSupabaseConfigured) {
      setCases([]);
      return;
    }
    const supabase = getSupabaseClient();

    // 1. Encontrar al voluntario/donante por correo + clave de acceso.
    const [volsRes, donsRes] = await Promise.all([
      supabase!.from("volunteers").select("id, email, access_code"),
      supabase!.from("donations").select("id, email, access_code"),
    ]);
    type Rec = { id: string; email: string | null; access_code: string | null };
    const all: Rec[] = [
      ...((volsRes.data as Rec[]) || []),
      ...((donsRes.data as Rec[]) || []),
    ];

    const emailHits = all.filter((r) => emailMatches(r.email, email));
    const ids = new Set<string>();
    for (const r of emailHits)
      if (String(r.access_code ?? "").trim() === code) ids.add(r.id);

    // Correo correcto pero clave equivocada.
    if (ids.size === 0 && emailHits.length > 0) {
      setWrongCode(true);
      setCases([]);
      return;
    }
    if (ids.size === 0) {
      setCases([]);
      return;
    }

    // 2. Buscar sus asignaciones (excluyendo las cerradas).
    const { data: assignData } = await supabase!
      .from("assignments")
      .select("*")
      .in("assigned_to_id", Array.from(ids))
      .in("status", ["asignado", "aceptado", "en_camino"]);
    const assigns = (assignData as Assignment[]) || [];
    if (assigns.length === 0) {
      setCases([]);
      return;
    }

    // 3. Traer los reportes asociados.
    const reportIds = Array.from(new Set(assigns.map((a) => a.report_id)));
    const { data: repData } = await supabase!
      .from("reports")
      .select("*")
      .in("id", reportIds);
    const reportsById = new Map(
      ((repData as Report[]) || []).map((r) => [r.id, r])
    );

    const rows: CaseRow[] = [];
    for (const a of assigns) {
      const report = reportsById.get(a.report_id);
      if (report) rows.push({ assignment: a, report });
    }
    setCases(rows);
  }

  async function act(
    row: CaseRow,
    action: () => Promise<unknown>,
    successMsg?: string
  ) {
    setBusyId(row.assignment.id);
    setNotice("");
    await action();
    await runSearch(lastEmail, lastCode);
    setBusyId(null);
    if (successMsg) setNotice(successMsg);
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Mis casos"
        subtitle="Ingresa con tu correo y la clave de 4 dígitos que recibiste al registrarte."
        icon="📋"
      />

      <form onSubmit={handleSearch} className="mb-4">
        <Card className="space-y-3">
          <FormInput
            label="Tu correo electrónico"
            name="email"
            type="email"
            placeholder="tucorreo@ejemplo.com"
            hint="El mismo correo con el que te registraste."
            required
          />
          <FormInput
            label="Clave de acceso (4 dígitos)"
            name="code"
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="1234"
            hint="Te la mostramos al registrarte y te la enviamos por correo."
            required
          />
          <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
            {loading ? "Ingresando…" : "Entrar y ver mis casos"}
          </Button>
        </Card>
      </form>

      {notice && (
        <AlertBanner tone="info" className="mb-4">
          {notice}
        </AlertBanner>
      )}

      {wrongCode && (
        <AlertBanner tone="emergency" className="mb-4">
          La clave no coincide con ese correo. Revisa los 4 dígitos que recibiste
          al registrarte.
        </AlertBanner>
      )}

      {!isSupabaseConfigured && searched && (
        <AlertBanner tone="warning" className="mb-4">
          Supabase no está configurado: no hay casos reales para mostrar.
        </AlertBanner>
      )}

      {searched && !loading && !wrongCode && cases.length === 0 && isSupabaseConfigured && (
        <EmptyState
          title="No tienes casos asignados todavía"
          description="Verifica que el correo y la clave sean correctos. Cuando te asignemos un caso cercano, aparecerá aquí."
          icon="📭"
        />
      )}

      <div className="space-y-4">
        {cases.map((row) => (
          <CaseCard
            key={row.assignment.id}
            row={row}
            busy={busyId === row.assignment.id}
            onAccept={() =>
              act(row, () =>
                acceptAssignment(row.assignment.id, row.report.id)
              )
            }
            onStart={() =>
              act(row, () => startAssignment(row.assignment.id, row.report.id))
            }
            onComplete={() =>
              act(
                row,
                () => completeAssignment(row.assignment.id, row.report.id),
                "¡Gracias! Marcaste el caso como completado."
              )
            }
            onReject={() =>
              act(
                row,
                () => rejectAssignment(row.assignment.id, row.report.id),
                "Entendido. Intentamos asignar el caso a otra persona cercana."
              )
            }
          />
        ))}
      </div>
    </PublicLayout>
  );
}

function CaseCard({
  row,
  busy,
  onAccept,
  onStart,
  onComplete,
  onReject,
}: {
  row: CaseRow;
  busy: boolean;
  onAccept: () => void;
  onStart: () => void;
  onComplete: () => void;
  onReject: () => void;
}) {
  const { assignment, report } = row;
  const status = assignment.status;

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-bold text-gray-900">{report.help_type}</span>
        <StatusBadge value={status} />
      </div>

      <div className="space-y-1 text-sm text-gray-700">
        <p>
          <span className="font-semibold">Zona:</span> {report.city || "—"},{" "}
          {report.state || "—"}
        </p>
        <p>
          <span className="font-semibold">Urgencia:</span> {report.urgency}
        </p>
        {assignment.distance_km != null && (
          <p>
            <span className="font-semibold">Distancia aprox.:</span>{" "}
            {assignment.distance_km} km
          </p>
        )}
        {report.description && (
          <p>
            <span className="font-semibold">Descripción:</span> {report.description}
          </p>
        )}
      </div>

      {/* Botones según el estado del caso */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {status === "asignado" && (
          <Button variant="primary" size="lg" disabled={busy} onClick={onAccept}>
            Aceptar caso
          </Button>
        )}
        {status === "aceptado" && (
          <Button variant="primary" size="lg" disabled={busy} onClick={onStart}>
            Estoy en camino
          </Button>
        )}
        {(status === "aceptado" || status === "en_camino") && (
          <Button variant="safe" size="lg" disabled={busy} onClick={onComplete}>
            Completado
          </Button>
        )}
        <Button variant="outline" size="lg" disabled={busy} onClick={onReject}>
          No puedo ayudar
        </Button>
      </div>
    </Card>
  );
}
