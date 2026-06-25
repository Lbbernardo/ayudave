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

// Compara dos teléfonos por sus dígitos, tolerando formatos y prefijos.
function phoneMatches(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false;
  const da = a.replace(/\D/g, "");
  const db = b.replace(/\D/g, "");
  if (!da || !db) return false;
  return da === db || da.endsWith(db) || db.endsWith(da);
}

export default function MiAyudaPage() {
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  async function handleSearch(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setNotice("");
    const data = new FormData(ev.currentTarget);
    const phone = String(data.get("phone") || "").trim();
    if (!phone) return;

    setLoading(true);
    setSearched(true);
    await runSearch(phone);
    setLoading(false);
  }

  // Guardamos el último teléfono buscado para poder recargar tras una acción.
  const [lastPhone, setLastPhone] = useState("");

  async function runSearch(phone: string) {
    setLastPhone(phone);
    if (!isSupabaseConfigured) {
      setCases([]);
      return;
    }
    const supabase = getSupabaseClient();

    // 1. Encontrar al voluntario/donante por teléfono (matching tolerante).
    const [volsRes, donsRes] = await Promise.all([
      supabase!.from("volunteers").select("id, phone"),
      supabase!.from("donations").select("id, phone"),
    ]);
    const ids = new Set<string>();
    for (const v of (volsRes.data as Pick<Volunteer, "id" | "phone">[]) || [])
      if (phoneMatches(v.phone, phone)) ids.add(v.id);
    for (const d of (donsRes.data as Pick<Donation, "id" | "phone">[]) || [])
      if (phoneMatches(d.phone, phone)) ids.add(d.id);

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
    await runSearch(lastPhone);
    setBusyId(null);
    if (successMsg) setNotice(successMsg);
  }

  return (
    <PublicLayout>
      <PageHeader
        title="Mis casos"
        subtitle="Ingresa tu teléfono para ver los casos que te fueron asignados."
        icon="📋"
      />

      <form onSubmit={handleSearch} className="mb-4">
        <Card className="space-y-3">
          <FormInput
            label="Tu teléfono"
            name="phone"
            type="tel"
            placeholder="+58 414 1234567"
            hint="Usa el mismo teléfono con el que te registraste."
            required
          />
          <Button type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
            {loading ? "Buscando…" : "Ver mis casos"}
          </Button>
        </Card>
      </form>

      {notice && (
        <AlertBanner tone="info" className="mb-4">
          {notice}
        </AlertBanner>
      )}

      {!isSupabaseConfigured && searched && (
        <AlertBanner tone="warning" className="mb-4">
          Supabase no está configurado: no hay casos reales para mostrar.
        </AlertBanner>
      )}

      {searched && !loading && cases.length === 0 && isSupabaseConfigured && (
        <EmptyState
          title="No encontramos casos a tu nombre"
          description="Verifica que el teléfono sea el mismo con el que te registraste. Cuando haya un caso cercano, aparecerá aquí."
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
