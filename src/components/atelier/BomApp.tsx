"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "@/lib/admin/store";
import type { Row } from "@/lib/admin/types";
import { BOM_ITEMS, STANDARD_SIZES } from "@/lib/atelier/constants";
import { verifiedConsumption } from "@/lib/atelier/fabric";
import { useRows, write } from "@/lib/atelier/store";
import { AppHeader, Empty, Field, Notice, Section, Select, btnDanger, btnLine, inputCls, label } from "./ui";

type Line = Row & { design_id: string; item_type: string; material_id: string | null; description: string | null; unit: string; qty_per_piece: number; wastage_pct: number };
type Material = Row & { name: string; color?: string; unit: string; quantity: number };
type Marker = Row & { size: string; fabric_role: string; status: string; marker_length_cm: number; pieces_per_marker: number; shrinkage_pct: number };
type Consumption = Row & { batch_id: string; material_id: string | null; kind: string; quantity: number; unit?: string; basis?: string };
type Batch = Row & { batch_no: string; design_id: string; size: string; quantity: number; status: string };

export function BomApp({ live }: { live: boolean }) {
  const designs = useRows("garment_designs", "id,name,status", live, { order: "updated_at" });
  const [designId, setDesignId] = useState("");
  const design = designs.rows.find((d) => d.id === designId) ?? designs.rows.find((d) => d.status === "approved") ?? designs.rows[0];
  const lines = useRows<Line>("design_bom", "*", live, { filter: { column: "design_id", value: design?.id ?? "-" }, order: "created_at", asc: true });
  const materials = useRows<Material>("materials", "id,name,color,unit,quantity", live, { order: "name", asc: true });
  const markers = useRows<Marker>("cutting_layouts", "id,size,fabric_role,status,marker_length_cm,pieces_per_marker,shrinkage_pct", live, { filter: { column: "design_id", value: design?.id ?? "-" } });
  const batches = useRows<Batch>("production_batches", "id,batch_no,design_id,size,quantity,status", live, { filter: { column: "design_id", value: design?.id ?? "-" }, order: "created_at" });
  const consumption = useRows<Consumption>("material_consumption", "*", live, { order: "created_at" });
  const [qty, setQty] = useState(10);
  const [size, setSize] = useState("36");
  const [actual, setActual] = useState({ batch: "", material: "", quantity: "" });

  const mat = (id: string | null) => materials.rows.find((m) => m.id === id);
  const add = async (item: string) => {
    if (!design) return;
    const unit = BOM_ITEMS.find((b) => b.value === item)?.unit ?? "pcs";
    const { error } = await write(live, "design_bom", "insert", { design_id: design.id, item_type: item, unit, qty_per_piece: 0, wastage_pct: 0 });
    if (error) toast(error, "danger");
  };
  const update = async (id: string, patch: Record<string, unknown>) => {
    const { error } = await write(live, "design_bom", "update", patch, id);
    if (error) toast(error, "danger");
  };
  const remove = async (id: string) => {
    const { error } = await write(live, "design_bom", "delete", null, id);
    if (error) toast(error, "danger");
  };

  const need = (l: Line) => {
    if (l.item_type === "main_fabric" || l.item_type === "lining") {
      const mk = markers.rows.find((x) => x.size === size && x.fabric_role === (l.item_type === "main_fabric" ? "main" : "lining") && x.status === "verified");
      return mk ? { value: verifiedConsumption(mk, qty), basis: "verified marker" } : { value: null, basis: "needs verified marker" };
    }
    return { value: Math.ceil(l.qty_per_piece * qty * (1 + l.wastage_pct / 100) * 100) / 100, basis: "BOM" };
  };

  const recordActual = async () => {
    const q = Number(actual.quantity);
    if (!actual.batch || !actual.material || !(q > 0)) return toast("Choose a batch, material and quantity", "danger");
    const { error } = await write(live, "material_consumption", "insert", { batch_id: actual.batch, material_id: actual.material, kind: "actual", quantity: q, unit: mat(actual.material)?.unit, basis: "manual" });
    if (error) toast(error, "danger");
    else {
      toast("Actual consumption recorded");
      setActual({ batch: "", material: "", quantity: "" });
    }
  };

  const batchIds = new Set(batches.rows.map((b) => b.id));
  const designConsumption = consumption.rows.filter((c) => batchIds.has(c.batch_id));

  return (
    <div className="space-y-6">
      <AppHeader
        live={live}
        eyebrow="Atelier · Bill of Materials"
        title="Bill of Materials"
        description="A reusable BOM for each design, linked to Fabrics & Materials stock. Reservation deducts stock when a batch is released; fabric always comes from a verified marker."
        actions={<Select ariaLabel="Design" value={design?.id ?? ""} onChange={setDesignId} options={designs.rows.map((d) => ({ value: d.id, label: String(d.name) }))} />}
      />
      {!design ? (
        <Empty title="No designs yet" body="Create a design in the Design Studio first." />
      ) : (
        <>
          <Section
            title={`BOM · ${String(design.name)}`}
            aside={
              <div className="flex flex-wrap items-center gap-2">
                <Select ariaLabel="Add BOM line" value="" onChange={(v) => v && add(v)} options={[{ value: "", label: "+ Add line…" }, ...BOM_ITEMS.map((b) => ({ value: b.value, label: b.label }))]} />
              </div>
            }
          >
            {lines.rows.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="text-[0.55rem] uppercase tracking-[0.2em] text-ivory/45">
                      {["Item", "Inventory material", "Description", "Unit", "Qty / piece", "Wastage %", `Need · ${qty} pcs`, "In stock", ""].map((h) => <th key={h} className="px-2 py-2 text-left font-normal">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence initial={false}>
                      {lines.rows.map((l) => {
                        const n = need(l);
                        const m = mat(l.material_id);
                        const short = n.value !== null && m && Number(m.quantity) < n.value;
                        const fabric = l.item_type === "main_fabric" || l.item_type === "lining";
                        return (
                          <motion.tr key={l.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-t border-gold/[0.07] align-top">
                            <td className="px-2 py-2 text-ivory">{BOM_ITEMS.find((b) => b.value === l.item_type)?.label ?? label(l.item_type)}</td>
                            <td className="px-2 py-2">
                              <Select ariaLabel="Inventory material" value={l.material_id ?? ""} onChange={(v) => update(l.id, { material_id: v || null })} options={[{ value: "", label: "Not linked" }, ...materials.rows.map((x) => ({ value: x.id, label: `${x.name}${x.color ? ` · ${x.color}` : ""}` }))]} />
                            </td>
                            <td className="px-2 py-2"><input defaultValue={l.description ?? ""} onBlur={(e) => e.target.value !== (l.description ?? "") && update(l.id, { description: e.target.value || null })} className={inputCls} aria-label="Description" /></td>
                            <td className="px-2 py-2"><input defaultValue={l.unit} onBlur={(e) => e.target.value !== l.unit && update(l.id, { unit: e.target.value || "pcs" })} className={`${inputCls} w-20`} aria-label="Unit" /></td>
                            <td className="px-2 py-2">
                              {fabric ? (
                                <span className="text-xs text-ivory/50">from verified marker</span>
                              ) : (
                                <input type="number" min={0} step={0.01} defaultValue={l.qty_per_piece} onBlur={(e) => Number(e.target.value) !== Number(l.qty_per_piece) && update(l.id, { qty_per_piece: Number(e.target.value) })} className={`${inputCls} w-24`} aria-label="Quantity per piece" />
                              )}
                            </td>
                            <td className="px-2 py-2">{!fabric && <input type="number" min={0} max={50} defaultValue={l.wastage_pct} onBlur={(e) => Number(e.target.value) !== Number(l.wastage_pct) && update(l.id, { wastage_pct: Number(e.target.value) })} className={`${inputCls} w-20`} aria-label="Wastage percent" />}</td>
                            <td className="px-2 py-2 tabular-nums">
                              {n.value === null ? <span className="text-xs text-red-200">{n.basis}</span> : <span className="text-ivory">{n.value} {l.unit}<span className="block text-[0.6rem] text-ivory/40">{n.basis}</span></span>}
                            </td>
                            <td className={`px-2 py-2 tabular-nums ${short ? "text-red-200" : "text-ivory/75"}`}>{m ? `${m.quantity} ${m.unit}` : <span className="text-xs text-gold-light">link material</span>}</td>
                            <td className="px-2 py-2 text-right"><button onClick={() => remove(l.id)} className={btnDanger} aria-label="Remove line">×</button></td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty title="No BOM lines yet" body="Add main fabric, lining, pads, hooks, thread, lace, zippers, labels and packaging." />
            )}
            <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-gold/10 pt-4">
              <Field label="Plan quantity"><input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))} className={`${inputCls} w-28`} /></Field>
              <Field label="Size"><Select value={size} onChange={setSize} options={STANDARD_SIZES.map((s) => ({ value: s, label: s }))} /></Field>
              <p className="max-w-xl text-xs text-ivory/45">Every line must be linked to a material before a batch can reserve stock. Main fabric and lining quantities come only from verified markers for the batch size.</p>
            </div>
          </Section>

          <Section title="Estimated vs actual consumption by batch">
            {batches.rows.length ? (
              <div className="space-y-3">
                {batches.rows.map((b) => {
                  const rows = designConsumption.filter((c) => c.batch_id === b.id);
                  const byMat = new Map<string, { reserved: number; actual: number; shortage: number; unit?: string }>();
                  for (const c of rows) {
                    const k = c.material_id ?? "—";
                    const e = byMat.get(k) ?? { reserved: 0, actual: 0, shortage: 0, unit: c.unit };
                    if (c.kind === "reserved") e.reserved += Number(c.quantity);
                    if (c.kind === "actual") e.actual += Number(c.quantity);
                    if (c.kind === "shortage_report") e.shortage += Number(c.quantity);
                    byMat.set(k, e);
                  }
                  return (
                    <div key={b.id} className="border border-gold/10 p-3">
                      <p className="text-sm text-ivory">{b.batch_no} <span className="text-xs text-ivory/45">· size {b.size} · {b.quantity} pcs · {label(b.status)}</span></p>
                      {byMat.size ? (
                        <table className="mt-2 w-full text-xs">
                          <tbody>
                            {[...byMat.entries()].map(([k, v]) => {
                              const variance = v.actual && v.reserved ? ((v.actual - v.reserved) / v.reserved) * 100 : null;
                              return (
                                <tr key={k} className="border-t border-gold/[0.06]">
                                  <td className="py-1.5 text-ivory/75">{mat(k)?.name ?? "Unlinked material"}</td>
                                  <td className="tabular-nums">Reserved {v.reserved} {v.unit}</td>
                                  <td className="tabular-nums">Actual {v.actual || "—"}</td>
                                  <td className={`tabular-nums ${variance !== null && variance > 0 ? "text-red-200" : "text-emerald-200"}`}>{variance === null ? "" : `${variance > 0 ? "+" : ""}${variance.toFixed(1)}%`}</td>
                                  <td className="text-gold-light">{v.shortage ? `Shortage reported: ${v.shortage}` : ""}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <p className="mt-1 text-xs text-ivory/40">No reservation yet.</p>
                      )}
                    </div>
                  );
                })}
                <div className="flex flex-wrap items-end gap-3 border-t border-gold/10 pt-3">
                  <Field label="Batch"><Select value={actual.batch} onChange={(v) => setActual({ ...actual, batch: v })} options={[{ value: "", label: "Choose…" }, ...batches.rows.map((b) => ({ value: b.id, label: b.batch_no }))]} /></Field>
                  <Field label="Material"><Select value={actual.material} onChange={(v) => setActual({ ...actual, material: v })} options={[{ value: "", label: "Choose…" }, ...materials.rows.map((m) => ({ value: m.id, label: m.name }))]} /></Field>
                  <Field label="Actual used"><input type="number" min={0} step={0.01} value={actual.quantity} onChange={(e) => setActual({ ...actual, quantity: e.target.value })} className={`${inputCls} w-28`} /></Field>
                  <button onClick={recordActual} className={btnLine}>Record actual</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ivory/45">Batches for this design will show reserved vs actual material here.</p>
            )}
          </Section>
          <Notice tone="info">Stock reservation happens from Production Batches → “Reserve materials”. It is all-or-nothing: if any material is short, nothing is deducted.</Notice>
        </>
      )}
    </div>
  );
}
