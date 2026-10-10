"use client";

import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/admin/ui";
import { toast } from "@/lib/admin/store";
import type { Row } from "@/lib/admin/types";
import { DESIGN_CATEGORIES, MEASUREMENT_FIELDS, STANDARD_SIZES, STARTER_MEASUREMENTS, type MeasurementKey } from "@/lib/atelier/constants";
import { rpc, useRows, write } from "@/lib/atelier/store";
import { AppHeader, Empty, Notice, Section, Segmented, Select, btnGhost, btnGold, btnLine, fmtDate, panel } from "./ui";

type Chart = Row & { category: string; name: string; version: number; status: string; unit: string; approved_at?: string; created_at?: string };
type Measure = Row & { size_chart_id: string; size: string } & Record<MeasurementKey, number>;

export function SizeCharts({ live }: { live: boolean }) {
  const charts = useRows<Chart>("size_charts", "id,category,name,version,status,unit,notes,approved_at,created_at", live, { order: "version" });
  const [chartId, setChartId] = useState<string | null>(null);
  const chart = charts.rows.find((c) => c.id === chartId) ?? charts.rows.find((c) => c.status === "approved") ?? charts.rows[0];
  const ms = useRows<Measure>("size_measurements", "*", live, { filter: { column: "size_chart_id", value: chart?.id ?? "-" } });
  const [mode, setMode] = useState<"chart" | "grading">("chart");
  const [draft, setDraft] = useState<Record<string, Partial<Record<MeasurementKey, number>>>>({});

  useEffect(() => setDraft({}), [chart?.id]);

  const locked = chart?.status !== "draft";
  const bySize = useMemo(() => Object.fromEntries(ms.rows.map((m) => [m.size, m])), [ms.rows]);
  const value = (size: string, k: MeasurementKey) => draft[size]?.[k] ?? bySize[size]?.[k];
  const dirty = Object.keys(draft).length > 0;

  const create = async () => {
    const version = Math.max(0, ...charts.rows.map((c) => Number(c.version))) + 1;
    const { data, error } = await write(live, "size_charts", "insert", { category: "designer-blouses", name: "Blouse standard sizes", version });
    if (error) return toast(error, "danger");
    if (data && !Array.isArray(data)) setChartId(String((data as Row).id));
  };

  const clone = async () => {
    if (!chart) return;
    const { data, error } = await rpc<string>(live, "atelier_clone_size_chart", { p_chart: chart.id }, ["size_charts", "size_measurements"]);
    if (error) return toast(error, "danger");
    if (data) setChartId(data);
    toast("New draft version created");
  };

  const loadStarter = async () => {
    if (!chart) return;
    const rows = STANDARD_SIZES.filter((s) => !bySize[s]).map((s) => ({ size_chart_id: chart.id, size: s, ...STARTER_MEASUREMENTS[s] }));
    const { error } = await write(live, "size_measurements", "insert", rows);
    if (error) toast(error, "danger");
    else toast("Starter values added — measure fit samples and correct before approving");
  };

  const save = async () => {
    if (!chart) return;
    for (const [size, patch] of Object.entries(draft)) {
      const row = bySize[size];
      const { error } = row
        ? await write(live, "size_measurements", "update", patch, row.id)
        : await write(live, "size_measurements", "insert", { size_chart_id: chart.id, size, ...STARTER_MEASUREMENTS[size], ...patch });
      if (error) return toast(error, "danger");
    }
    setDraft({});
    toast("Measurements saved");
  };

  const approve = async () => {
    if (!chart) return;
    if (dirty) return toast("Save your changes first", "danger");
    const { error } = await rpc(live, "atelier_approve_size_chart", { p_chart: chart.id, p_comment: null }, ["size_charts"]);
    if (error) toast(error, "danger");
    else toast("Size chart approved — patterns can now be drafted from it");
  };

  return (
    <div className="space-y-6">
      <AppHeader
        live={live}
        eyebrow="Atelier · Size Charts"
        title="Standard Size Charts"
        description="Measurement charts for sizes 32–42. Each size links to its verified pattern set. Approved charts are locked; create a new version to change them."
        actions={<button onClick={create} className={btnLine}>+ New chart</button>}
      />
      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className={`${panel} p-3`}>
          <p className="px-2 pb-2 text-[0.6rem] uppercase tracking-[0.28em] text-ivory/50">Chart versions</p>
          <ul className="space-y-1">
            {charts.rows.map((c) => (
              <li key={c.id}>
                <button onClick={() => setChartId(c.id)} className={`relative w-full px-3 py-3 text-left ${chart?.id === c.id ? "text-ivory" : "text-ivory/65 hover:bg-gold/5"}`}>
                  {chart?.id === c.id && <motion.span layoutId="chart-active" className="absolute inset-0 border border-gold/50 bg-gold/10" />}
                  <span className="relative block text-sm">{c.name} · v{c.version}</span>
                  <span className="relative mt-1 flex items-center justify-between text-[0.6rem] text-ivory/45">
                    {DESIGN_CATEGORIES.find((x) => x.value === c.category)?.label}
                    <StatusBadge value={c.status} />
                  </span>
                </button>
              </li>
            ))}
            {!charts.rows.length && <li className="p-3 text-xs text-ivory/45">{charts.loading ? "Loading…" : "No charts yet."}</li>}
          </ul>
        </aside>

        {chart ? (
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented id="chart-mode" value={mode} onChange={setMode} options={[{ value: "chart", label: "Measurements" }, { value: "grading", label: "Grading" }]} />
              <div className="flex flex-wrap gap-2">
                {chart.status === "draft" && ms.rows.length < STANDARD_SIZES.length && <button onClick={loadStarter} className={btnGhost}>Add starter values (unverified)</button>}
                {chart.status === "draft" && <button onClick={save} disabled={!dirty} className={btnLine}>Save measurements</button>}
                {chart.status === "draft" && <button onClick={approve} disabled={!ms.rows.length} className={btnGold}>Approve chart</button>}
                {chart.status !== "draft" && <button onClick={clone} className={btnLine}>New version from this chart</button>}
              </div>
            </div>
            {chart.status === "approved" && <Notice>Approved {fmtDate(chart.approved_at)} — locked. Workers and patterns read from this chart. Changes require a new version and fresh approval.</Notice>}
            {chart.status === "draft" && <Notice tone="info">Draft — values here are not used for production until the Pattern Master approves the chart. Starter values are typical figures only; replace them with measurements verified on fit samples.</Notice>}

            {mode === "chart" ? (
              <div className={`${panel} overflow-x-auto`}>
                <table className="w-full min-w-[860px] text-sm">
                  <thead>
                    <tr className="border-b border-gold/15 text-[0.55rem] uppercase tracking-[0.2em] text-ivory/50">
                      <th className="px-3 py-3 text-left font-normal">Measurement ({chart.unit})</th>
                      {STANDARD_SIZES.map((s) => (
                        <th key={s} className="px-2 py-3 text-center font-normal">Size {s}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MEASUREMENT_FIELDS.map((f) => (
                      <tr key={f.key} className="border-b border-gold/[0.07]">
                        <td className="px-3 py-2 text-ivory/80">{f.label}</td>
                        {STANDARD_SIZES.map((s) => {
                          const v = value(s, f.key);
                          const changed = draft[s]?.[f.key] !== undefined;
                          return (
                            <td key={s} className="px-1.5 py-1.5 text-center">
                              {locked ? (
                                <span className="tabular-nums text-ivory/85">{v ?? "—"}</span>
                              ) : (
                                <input
                                  type="number"
                                  step="0.5"
                                  min={0}
                                  aria-label={`${f.label} size ${s}`}
                                  value={v ?? ""}
                                  onChange={(e) => setDraft((d) => ({ ...d, [s]: { ...d[s], [f.key]: e.target.value === "" ? undefined : Number(e.target.value) } }))}
                                  className={`w-20 border bg-noir/60 px-2 py-1.5 text-center tabular-nums text-ivory outline-none focus:border-gold ${changed ? "border-gold" : "border-gold/15"}`}
                                />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Grading measures={ms.rows} />
            )}
          </div>
        ) : (
          <Empty title="No size chart yet" body="Create a chart for Designer Blouses, enter the measurements for sizes 32–42 and send it for approval." action={<button onClick={create} className={btnGold}>+ New chart</button>} />
        )}
      </div>
    </div>
  );
}

function Grading({ measures }: { measures: Measure[] }) {
  const [base, setBase] = useState("36");
  const by = Object.fromEntries(measures.map((m) => [m.size, m]));
  if (!by[base]) return <Empty title="No base size" body="Add measurements first." />;
  return (
    <Section title="Grade rules (difference from base size)" aside={<Select ariaLabel="Base size" value={base} onChange={setBase} options={STANDARD_SIZES.map((s) => ({ value: s, label: `Base ${s}` }))} />}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="text-[0.55rem] uppercase tracking-[0.2em] text-ivory/50">
              <th className="px-3 py-2 text-left font-normal">Measurement</th>
              {STANDARD_SIZES.map((s) => <th key={s} className="px-2 py-2 text-center font-normal">{s}</th>)}
            </tr>
          </thead>
          <tbody>
            {MEASUREMENT_FIELDS.filter((f) => !["ease", "seam_allowance"].includes(f.key)).map((f) => (
              <tr key={f.key} className="border-t border-gold/[0.07]">
                <td className="px-3 py-2 text-ivory/80">{f.label}</td>
                {STANDARD_SIZES.map((s) => {
                  const d = by[s] ? Number(by[s][f.key]) - Number(by[base][f.key]) : null;
                  return (
                    <td key={s} className={`px-2 py-2 text-center tabular-nums ${s === base ? "text-gold" : d && d > 0 ? "text-emerald-200" : d && d < 0 ? "text-sky-200" : "text-ivory/50"}`}>
                      {d === null ? "—" : s === base ? Number(by[base][f.key]) : `${d > 0 ? "+" : ""}${d.toFixed(1)}`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-ivory/45">Pattern pieces for each size are drafted from that size’s own measurements, so grading follows these increments exactly. Review the nested grade in the Pattern Library before approving.</p>
    </Section>
  );
}
