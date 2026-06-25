"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { AppNotification } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function NotificationBell({ userId }: { userId: string }) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    const sb = getSupabaseClient();
    if (!sb) return;
    const { data } = await sb
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as AppNotification[]) || []);
  }, [userId]);

  // Carga inicial + suscripción en vivo (Supabase Realtime).
  useEffect(() => {
    void Promise.resolve().then(load);
    const sb = getSupabaseClient();
    if (!sb) return;
    const channel = sb
      .channel(`notif:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setItems((prev) => [payload.new as AppNotification, ...prev]);
        }
      )
      .subscribe();
    return () => {
      void sb.removeChannel(channel);
    };
  }, [userId, load]);

  const unread = items.filter((n) => !n.read).length;

  async function markAllRead() {
    const sb = getSupabaseClient();
    if (!sb || unread === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await sb
      .from("notifications")
      .update({ read: true })
      .eq("user_id", userId)
      .eq("read", false);
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) void markAllRead();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-xl hover:bg-surface"
        aria-label="Notificaciones"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emergency px-1 text-xs font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
            Notificaciones
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">
                Sin notificaciones todavía.
              </p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className="border-b border-gray-50 px-4 py-3 last:border-b-0"
                >
                  <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-gray-600">{n.body}</p>}
                  <p className="mt-1 text-xs text-gray-400">
                    {formatDate(n.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
