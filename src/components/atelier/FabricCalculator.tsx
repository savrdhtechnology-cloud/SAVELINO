"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/admin/ui";
import { toast } from "@/lib/admin/store";
import type { Row } from "@/lib/admin/types";
import { DEFAULT_SPEC, LININGS, SLEEVES, STANDARD_SIZES, type DesignSpec, type Measurements } from "@/lib/atelier/constants";
import { estimateFabric, verifiedConsumption } from "@/lib/atelier/fabric";
import { rpc, useRows, write } from "@/lib/atelier/store";
import { AppHeader, Empty, Field, Notice, Section, Segmented, Select, btnGold, btnLine, fmtDate, inputCls, panel } from "./ui";

type Design = Row & { name: string; status: string; category: string; spec: Partial<DesignSpec> };
type Marker = Row & { design_id: string; size: string; fabric_role: string; fabric_width_cm: number; layout_type: string; marker_length_cm: number; pieces_per_marker: number; shrinkage_pct: number; status: string; notes?: string; verified_at?: string };

const num = (v: string, d = 0) => (Number.isFinite(Number(v)) && v !== "" ? Number(v) : d);

export function FabricCalculator({ live }: { live: boolean }) {
  const designs = useRows<Design>("garment_designs", "id,name,status,category,spec", live, { order: "updated_at" });
  const charts = useRows("size_charts", "id,category,status,version", live, { order: "version" });
  const [designId, setDesignId] = useState("");
  const design = designs.rows.find((d) => d.id === designId) ?? designs.rows.find((d) => d.status === "approved") ?? designs.rows[0];
  const chart = charts.rows.find((c) => c.category === design?.category && c.status === "approved");
  const ms = useRows<Row & Measurements & { size: string }>("size_measurements", "*", live, { filter: { column: "size_chart_id", value: chart?.id ?? "-" } });
  const markers = useRows<Marker>("cutting_layouts", "*", live, { filter: { column: "design_id", value: design?.id ?? "-" }, order: "created_at" });

  const [size, setSize] = useState("36");
  const [width, setWidth] = useState("112");
  const [layout, setLayout] = useState<"single_ply" | "folded">("folded");
  const [qty, setQty] = useState("10");
  const [shrink, setShrink] = useState("3");
  const [waste, setWaste] = useState("8");
  const [sleeve, setSleeve] = useState<string>("");
  const [lining, setLining] = useState<string>("");

  const spec: DesignSpec = { ...DEFAULT_SPEC, ...(design?.spec ?? {}), ...(sleeve ? { sleeve } : {}), ...(lining ? { lining } : {}) };
  const m = ms.rows.find((r) => r.size === size);
  const result = useMemo(
    () => (m ? estimateFabric({ measurements: m, spec, fabricWidthCm: num(width, 112), quantity: Math.max(1, num(qty, 1)), layout, shrinkagePct: num(shrink), wastagePct: num(waste) }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [m, JSON.stringify(spec), width, qty, layout, shrink, waste],
  );

  const forSize = markers.rows.filter((x) => x.size === size);
  const verifiedMain = forSize.find((x) => x.fabric_role === "main" && x.status === "verified");
  const verifiedLining = forSize.find((x) => x.fabric_role === "lining" && x.status === "verified");
  const needsLining = spec.lining !== "none";

  const [mk, setMk] = useState({ role: "main", width: "112", layout: "folded", length: "", per: "2", shrink: "3", notes: "" });
  const addMarker = async () => {
    if (!design || !num(mk.length)) return toast("Enter the measured marker length", "danger");
    const { error } = await write(live, "cutting_layouts", "insert", {
      design_id: design.id, size, fabric_role: mk.role, fabric_width_cm: num(mk.width, 112), layout_type: mk.layout, marker_length_cm: num(mk.length), pieces_per_marker: Math.max(1, num(mk.per, 1)), shrinkage_pct: num(mk.shrink), notes: mk.notes || null,
    });
    if (error) toast(error, "danger");
    else {
      toast("Marker recorded — awaiting Pattern Master verification");
      setMk((s) => ({ ...s, length: "", notes: "" }));
    }
  };
  const verify = async (id: string) => {
    const { error } = await rpc(live, "atelier_verify_marker", { p_layout: id, p_comment: null }, ["cutting_layouts"]);
    if (error) toast(error, "danger");
    else toast("Marker verified — it can now be used for cutting and reservation");
  };

  return (
    <div className="space-y-6">
      <AppHeader
        live={live}
        eyebrow="Atelier · Fabric Calculator"
        title="Fabric Calculator"
        description="Plan fabric by design, size, width, lay, sleeve, lining and quantity. Estimates are for planning; confirmed cutting requirements come only from verified markers."
        actions={<Select ariaLabel="Design" value={design?.id ?? ""} onChange={setDesignId} options={designs.rows.map((d) => ({ value: d.id, label: d.name }))} />}
      />
      {!design ? (
        <Empty title="No designs yet" body="Create a design first." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          <Section title="Inputs">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Size"><Select value={size} onChange={setSize} options={STANDARD_SIZES.map((s) => ({ value: s, label: s }))} /></Field>
              <Field label="Quantity"><input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} /></Field>
              <Field label="Fabric width (cm)">
                <input type="number" min={60} value={width} onChange={(e) => setWidth(e.target.value)} list="widths" className={inputCls} />
                <datalist id="widths"><option value="91" /><option value="112" /><option value="140" /><option value="150" /></datalist>
              </Field>
              <Field label="Lay"><Segmented id="lay" value={layout} onChange={setLayout} options={[{ value: "folded", label: "Folded" }, { value: "single_ply", label: "Single" }]} /></Field>
              <Field label="Sleeve style"><Select value={sleeve} onChange={setSleeve} options={[{ value: "", label: `Design (${design.spec?.sleeve ?? DEFAULT_SPEC.sleeve})` }, ...SLEEVES.map((s) => ({ value: s.value, label: s.label }))]} /></Field>
              <Field label="Lining"><Select value={lining} onChange={setLining} options={[{ value: "", label: `Design (${design.spec?.lining ?? DEFAULT_SPEC.lining})` }, ...LININGS.map((l) => ({ value: l, label: l === "none" ? "No lining" : l }))]} /></Field>
              <Field label="Shrinkage %"><input type="number" min={0} max={30} step={0.5} value={shrink} onChange={(e) => setShrink(e.target.value)} className={inputCls} /></Field>
              <Field label="Cutting wastage %"><input type="number" min={0} max={50} step={0.5} value={waste} onChange={(e) => setWaste(e.target.value)} className={inputCls} /></Field>
            </div>
            {!chart && <div className="mt-4"><Notice tone="danger">Approve a size chart for this category to calculate.</Notice></div>}
          </Section>

          <div className="min-w-0 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <motion.div layout className={`${panel} border-sky-300/25 p-5`}>
                <p className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.25em] text-sky-200">Planning estimate <span className="border border-sky-300/40 px-2 py-0.5 text-[0.5rem]">Not for cutting</span></p>
                {result ? (
                  <>
                    <p className="mt-3 font-display text-5xl text-ivory">{result.totalMetres.toFixed(2)}<span className="ml-2 text-lg text-ivory/50">m</span></p>
                    <p className="mt-1 text-xs text-ivory/55">Main fabric for {qty} pcs · {(result.perPieceCm / 100).toFixed(2)} m per piece before shrinkage & wastage</p>
                    {needsLining && <p className="mt-2 text-sm text-ivory/75">Lining ≈ {result.liningMetres.toFixed(2)} m</p>}
                    <p className="mt-2 text-xs text-ivory/45">Lay efficiency ≈ {Math.round(result.efficiency * 100)}%</p>
                    {result.warnings.map((w) => <p key={w} className="mt-2 text-xs text-gold-light">{w}</p>)}
                  </>
                ) : (
                  <p className="mt-3 text-sm text-ivory/50">Needs measurements for size {size}.</p>
                )}
              </motion.div>
              <motion.div layout className={`${panel} p-5 ${verifiedMain ? "border-emerald-300/30" : "border-red-300/25"}`}>
                <p className="flex items-center justify-between text-[0.6rem] uppercase tracking-[0.25em] text-emerald-200">Confirmed cutting requirement <span className="border border-emerald-300/40 px-2 py-0.5 text-[0.5rem]">Verified marker</span></p>
                {verifiedMain ? (
                  <>
                    <p className="mt-3 font-display text-5xl text-ivory">{verifiedConsumption(verifiedMain, Math.max(1, num(qty, 1))).toFixed(2)}<span className="ml-2 text-lg text-ivory/50">m</span></p>
                    <p className="mt-1 text-xs text-ivory/55">{verifiedMain.marker_length_cm} cm marker · {verifiedMain.pieces_per_marker} pcs per lay · {verifiedMain.fabric_width_cm} cm wide · +{verifiedMain.shrinkage_pct}% shrinkage</p>
                    {needsLining && <p className="mt-2 text-sm text-ivory/75">{verifiedLining ? `Lining ${verifiedConsumption(verifiedLining, Math.max(1, num(qty, 1))).toFixed(2)} m (verified)` : "Lining: no verified marker yet"}</p>}
                  </>
                ) : (
                  <p className="mt-3 text-sm text-red-200/90">No verified marker for size {size}. Fabric cannot be reserved or cut until the Pattern Master verifies a marker below.</p>
                )}
              </motion.div>
            </div>

            {result && (
              <Section title="Pieces in the estimate">
                <table className="w-full text-sm">
                  <thead><tr className="text-[0.55rem] uppercase tracking-[0.2em] text-ivory/45"><th className="py-2 text-left font-normal">Piece</th><th className="font-normal">Width</th><th className="font-normal">Length</th><th className="font-normal">Cut</th></tr></thead>
                  <tbody>
                    {result.pieces.map((p) => (
                      <tr key={p.label} className="border-t border-gold/[0.07] text-center"><td className="py-2 text-left text-ivory/80">{p.label}</td><td className="tabular-nums">{p.width} cm</td><td className="tabular-nums">{p.height} cm</td><td>{p.copies}×</td></tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            <Section title={`Markers · size ${size}`}>
              <ul className="space-y-2">
                {forSize.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-gold/10 pb-2 text-sm">
                    <span className="text-ivory/80">
                      <span className="capitalize text-ivory">{x.fabric_role}</span> · {x.marker_length_cm} cm · {x.pieces_per_marker} pcs · {x.fabric_width_cm} cm {x.layout_type.replace("_", " ")} · +{x.shrinkage_pct}%
                      {x.notes ? <span className="block text-xs text-ivory/45">{x.notes}</span> : null}
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusBadge value={x.status === "verified" ? "verified" : "pending"} />
                      {x.status === "verified" ? <span className="text-[0.6rem] text-ivory/40">{fmtDate(x.verified_at)}</span> : <button onClick={() => verify(x.id)} className={btnLine}>Verify</button>}
                    </span>
                  </li>
                ))}
                {!forSize.length && <li className="text-sm text-ivory/45">No markers recorded for this size.</li>}
              </ul>
              <div className="mt-4 grid gap-3 border-t border-gold/10 pt-4 sm:grid-cols-3 lg:grid-cols-7">
                <Field label="Fabric"><Select value={mk.role} onChange={(v) => setMk({ ...mk, role: v })} options={[{ value: "main", label: "Main" }, { value: "lining", label: "Lining" }]} /></Field>
                <Field label="Width cm"><input type="number" value={mk.width} onChange={(e) => setMk({ ...mk, width: e.target.value })} className={inputCls} /></Field>
                <Field label="Lay"><Select value={mk.layout} onChange={(v) => setMk({ ...mk, layout: v })} options={[{ value: "folded", label: "Folded" }, { value: "single_ply", label: "Single ply" }, { value: "nested", label: "Nested" }]} /></Field>
                <Field label="Marker cm"><input type="number" value={mk.length} onChange={(e) => setMk({ ...mk, length: e.target.value })} className={inputCls} placeholder="measured" /></Field>
                <Field label="Pcs / lay"><input type="number" min={1} value={mk.per} onChange={(e) => setMk({ ...mk, per: e.target.value })} className={inputCls} /></Field>
                <Field label="Shrink %"><input type="number" value={mk.shrink} onChange={(e) => setMk({ ...mk, shrink: e.target.value })} className={inputCls} /></Field>
                <div className="flex items-end"><button onClick={addMarker} className={`${btnGold} w-full`}>Record marker</button></div>
              </div>
              <p className="mt-3 text-[0.65rem] text-ivory/45">Record the marker length measured on the cutting table. It stays “pending” until the Pattern Master verifies it.</p>
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
