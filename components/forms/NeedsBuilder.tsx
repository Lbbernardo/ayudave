"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { NEED_TYPES, URGENCY_OPTIONS } from "@/lib/types";
import type { NeedInput } from "@/lib/opportunities";

interface Props {
  needs: NeedInput[];
  onChange: (needs: NeedInput[]) => void;
}

const blank: NeedInput = {
  need_type: "agua",
  title: "",
  description: "",
  quantity_needed: 1,
  unit: "personas",
  urgency: "media",
};

export default function NeedsBuilder({ needs, onChange }: Props) {
  function update(i: number, patch: Partial<NeedInput>) {
    onChange(needs.map((n, idx) => (idx === i ? { ...n, ...patch } : n)));
  }
  function add() {
    onChange([...needs, { ...blank }]);
  }
  function remove(i: number) {
    onChange(needs.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-3">
      {needs.map((n, i) => {
        const isPeople = ["personas"].includes(n.unit || "personas");
        return (
          <Card key={i} className="space-y-3 border-trust/20 bg-trust/[0.03]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800">Necesidad {i + 1}</span>
              {needs.length > 1 && (
                <button type="button" onClick={() => remove(i)} className="text-xs font-semibold text-emergency">
                  Quitar
                </button>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Tipo</label>
              <select
                value={n.need_type}
                onChange={(e) => {
                  const meta = NEED_TYPES.find((t) => t.value === e.target.value);
                  update(i, {
                    need_type: e.target.value,
                    title: n.title || (meta ? meta.label : ""),
                  });
                }}
                className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-trust/60"
              >
                {NEED_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Título corto</label>
              <input
                value={n.title}
                onChange={(e) => update(i, { title: e.target.value })}
                placeholder="Ej. Cocineros para almuerzo"
                className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-trust/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-800">Cantidad</label>
                <input
                  type="number"
                  min={1}
                  value={n.quantity_needed}
                  onChange={(e) => update(i, { quantity_needed: Math.max(1, Number(e.target.value) || 1) })}
                  className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-trust/60"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-800">Unidad</label>
                <select
                  value={n.unit}
                  onChange={(e) => update(i, { unit: e.target.value })}
                  className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-trust/60"
                >
                  <option value="personas">personas</option>
                  <option value="litros">litros</option>
                  <option value="kg">kg</option>
                  <option value="cajas">cajas</option>
                  <option value="unidades">unidades</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">Urgencia</label>
              <select
                value={n.urgency}
                onChange={(e) => update(i, { urgency: e.target.value })}
                className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-trust/60"
              >
                {URGENCY_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-800">
                Detalle <span className="font-normal text-gray-400">(opcional)</span>
              </label>
              <textarea
                value={n.description ?? ""}
                onChange={(e) => update(i, { description: e.target.value })}
                rows={2}
                placeholder={isPeople ? "Horario, qué harán, dónde presentarse…" : "Marca, presentación, detalles…"}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-trust/60"
              />
            </div>
          </Card>
        );
      })}

      <Button type="button" variant="outline" fullWidth onClick={add}>
        + Agregar otra necesidad
      </Button>
    </div>
  );
}
