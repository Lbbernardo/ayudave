"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import PublicLayout from "@/components/layout/PublicLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import LoadingState from "@/components/ui/LoadingState";
import EmptyState from "@/components/ui/EmptyState";
import AlertBanner from "@/components/ui/AlertBanner";
import NotificationBell from "@/components/portal/NotificationBell";
import HelperOnboarding from "@/components/portal/HelperOnboarding";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { ensureProfile, getSession, signOut } from "@/lib/auth";
import {
  acceptAssignment,
  completeAssignment,
  rejectAssignment,
  startAssignment,
} from "@/lib/matching";
import type { Assignment, CaseUpdate, Report } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface CaseRow {
  assignment: Assignment;
  report: Report;
  timeline: CaseUpdate[];
}

export default function PanelPage() {
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loadingCases, setLoadingCases] = useState(false);
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  // Detectar sesión (incluye el aterrizaje del magic link).
  useEffect(() => {
    const sb = getSupabaseClient();
    let mounted = true;
    void getSession().then(async (s) => {
      if (!mounted) return;
      setUserId(s?.user.id ?? null);
      setEmail(s?.user.email ?? null);
      setChecking(false);
      if (s?.user) await ensureProfile(s.user.id, s.user.email ?? null);
    });
    const sub = sb?.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user.id ?? null);
      setEmail(s?.user.email ?? null);
      setChecking(false);
    });
    return () => {
      mounted = false;
      sub?.data.subscription.unsubscribe();
    };
  }, []);

  const loadCases = useCallback(async (uid: string) => {
    const sb = getSupabaseClient();
    if (!sb) return;
    setLoadingCases(true);
    // 1. Registros de ayudante (voluntario/donante) de esta cuenta.
    const [vols, dons] = await Promise.all([
      sb.from("volunteers").select("id").eq("user_id", uid),
      sb.from("donations").select("id").eq("user_id", uid),
    ]);
    const ids = [
      ...((vols.data as { id: string }[]) || []).map((v) => v.id),
      ...((dons.data as { id: string }[]) || []).map((d) => d.id),
    ];
    setHasProfile(ids.length > 0);
    if (ids.length === 0) {
      setCases([]);
      setLoadingCases(false);
      return;
    }
    // 2. Asignaciones activas.
    const { data: assigns } = await sb
      .from("assignments")
      .select("*")
      .in("assigned_to_id", ids)
      .in("status", ["asignado", "aceptado", "en_camino"]);
    const list = (assigns as Assignment[]) || [];
    if (list.length === 0) {
      setCases([]);
      setLoadingCases(false);
      return;
    }
    // 3. Reportes + timeline.
    const reportIds = Array.from(new Set(list.map((a) => a.report_id)));
    const [repRes, cuRes] = await Promise.all([
      sb.from("reports").select("*").in("id", reportIds),
      sb
        .from("case_updates")
        .select("*")
        .in("report_id", reportIds)
        .order("created_at", { ascending: false }),
    ]);
    const reportsById = new Map(
      ((repRes.data as Report[]) || []).map((r) => [r.id, r])
    );
    const updatesByReport = new Map<string, CaseUpdate[]>();
    for (const cu of (cuRes.data as CaseUpdate[]) || []) {
      const arr = updatesByReport.get(cu.report_id) || [];
      arr.push(cu);
      updatesByReport.set(cu.report_id, arr);
    }
    const rows: CaseRow[] = [];
    for (const a of list) {
      const report = reportsById.get(a.report_id);
      if (report)
        rows.push({
          assignment: a,
          report,
          timeline: updatesByReport.get(a.report_id) || [],
        });
    }
    setCases(rows);
    setLoadingCases(false);
  }, []);

  useEffect(() => {
    if (userId) void Promise.resolve().then(() => loadCases(userId));
  }, [userId, loadCases]);

  async function act(
    row: CaseRow,
    action: () => Promise<unknown>,
    msg?: string
  ) {
    setBusyId(row.assignment.id);
    setNotice("");
    await action();
    if (userId) await loadCases(userId);
    setBusyId(null);
    if (msg) setNotice(msg);
  }

  // --- Estados de carga / sin sesión ---
  if (checking) {
    return (
      <PublicLayout>
        <LoadingState label="Verificando tu sesión…" />
      </PublicLayout>
    );
  }

  if (!userId) {
    return (
      <PublicLayout>
        <PageHeader title="Portal de ayudantes" icon="📋" />
        {!isSupabaseConfigured && (
          <AlertBanner tone="warning" className="mb-4">
            Supabase no está configurado: el portal no funcionará en modo demo.
          </AlertBanner>
        )}
        <Card className="space-y-3 text-center">
          <p className="text-gray-700">
            Inicia sesión para ver los casos que te fueron asignados, tu línea de
            tiempo y tus notificaciones.
          </p>
          <Link href="/login">
            <Button variant="primary" size="lg" fullWidth>
              Entrar con mi correo
            </Button>
          </Link>
        </Card>
      </PublicLayout>
    );
  }

  // --- Portal autenticado ---
  return (
    <PublicLayout>
      <div className="mb-4 flex items-start justify-between gap-3">
        <PageHeader title="Mis casos" subtitle={email ?? undefined} icon="📋" />
        <div className="flex items-center gap-2">
          <NotificationBell userId={userId} />
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              setUserId(null);
            }}
          >
            Salir
          </Button>
        </div>
      </div>

      {notice && (
        <AlertBanner tone="info" className="mb-4">
          {notice}
        </AlertBanner>
      )}

      {loadingCases || hasProfile === null ? (
        <LoadingState />
      ) : hasProfile === false ? (
        <HelperOnboarding
          userId={userId}
          email={email}
          onDone={() => void loadCases(userId)}
        />
      ) : cases.length === 0 ? (
        <EmptyState
          title="¡Perfil listo! Aún no tienes casos"
          description="Cuando haya un caso cercano que coincida con lo que ofreces, aparecerá aquí y te llegará una notificación 🔔."
          icon="📭"
        />
      ) : (
        <div className="space-y-4">
          {cases.map((row) => (
            <CaseCard
              key={row.assignment.id}
              row={row}
              busy={busyId === row.assignment.id}
              onAccept={() =>
                act(row, () => acceptAssignment(row.assignment.id, row.report.id))
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
      )}
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
  const { assignment, report, timeline } = row;
  const status = assignment.status;
  const [showTimeline, setShowTimeline] = useState(false);

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

      {/* Timeline del caso */}
      <div className="border-t border-gray-100 pt-2">
        <button
          type="button"
          onClick={() => setShowTimeline((v) => !v)}
          className="text-sm font-semibold text-trust"
        >
          {showTimeline ? "Ocultar" : "Ver"} línea de tiempo ({timeline.length})
        </button>
        {showTimeline && (
          <ol className="mt-2 space-y-2">
            {timeline.length === 0 ? (
              <li className="text-sm text-gray-500">Sin eventos todavía.</li>
            ) : (
              timeline.map((cu) => (
                <li key={cu.id} className="flex gap-2 text-sm">
                  <span aria-hidden>•</span>
                  <div>
                    <p className="text-gray-800">{cu.note}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(cu.created_at)}
                      {cu.actor ? ` · ${cu.actor}` : ""}
                    </p>
                  </div>
                </li>
              ))
            )}
          </ol>
        )}
      </div>
    </Card>
  );
}
