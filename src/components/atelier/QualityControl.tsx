"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { StatusBadge } from "@/components/admin/ui";
import { toast } from "@/lib/admin/store";
import type { Row } from "@/lib/admin/types";
import { QC_CHECKS } from "@/lib/atelier/constants";
import { rpc, useRows } from "@/lib/atelier/store";
import type { Batch } from "./ProductionBatches";
import { AppHeader, Empty, Field, Notice, Section, btnGold, fmtDateTime, inputCls, label, panel } from "./ui";

type Result = "approved" | "rework_required" | "rejected";
const RESULTS: { value: Result; label: string; tone: string }[] = [
  { value: "approved", label: "Approved", tone: "border-emerald-300/60 bg-emerald-400/10 text-emerald-100" },
  { value: "rework_required", label: "Rework required", tone: "border-gold/60 bg-gold/10 text-gold-light" },
  { value: "rejected", label: "Rejected", tone: "border-red-300/60 bg-red-400/10 text-red-100" },
];

/** The QC checklist. Used by admins in the CRM and by QC inspectors in the worker portal. */
export function QcForm({ batch, live, designName }: { batch: Batch; live: boolean; designName?: string }) {
  const [checks, setChecks] = useState<Record<string, boolean | null>>(Object.fromEntries(QC_CHECKS.map((c) => [c.key, null])));
  const [result, setResult] = useState<Result>("approved");
  const [approved, setApproved] = useState(batch.quantity);
  const [rejected, setRejected] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const all = QC_CHECKS.every((c) => checks[c.key] !== null);
  const failed = QC_CHECKS.filter((c) => checks[c.key] === false);

  const submit = async () => {
    if (!all) return toast("Complete every checklist item", "danger");
    if (result === "approved" && failed.length && !notes.trim()) return toast("Note why failed checks are acceptable", "danger");
    if (approved + rejected > batch.quantity) return toast("Approved + rejected cannot exceed the batch quantity", "danger");
    setBusy(true);
    const { error } = await rpc(live, "atelier_record_qc", { p_batch: batch.id, p_checklist: checks, p_result: result, p_approved: approved, p_rejected: rejected, p_notes: notes || null }, ["production_batches", "quality_inspections", "production_tasks"]);
    setBusy(false);
    if (error) toast(error, "danger");
    else toast(result === "approved" ? `${approved} pieces approved — ready to receive into stock` : result === "rework_required" ? "Sent back for rework" : "Batch rejected");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ivory/70">{designName ? `${designName} · ` : ""}{batch.batch_no} · size {batch.size}{batch.color ? ` · ${batch.color}` : ""} · {batch.quantity} pcs</p>
      <ul className="divide-y divide-gold/10 border border-gold/15">
        {QC_CHECKS.map((c) => (
          <li key={c.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <span className="text-sm text-ivory/85">{c.label}</span>
            <span className="flex gap-1" role="group" aria-label={c.label}>
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  aria-pressed={checks[c.key] === v}
                  onClick={() => setChecks((s) => ({ ...s, [c.key]: v }))}
                  className={`min-w-14 border px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.2em] transition-colors ${checks[c.key] === v ? (v ? "border-emerald-300/60 bg-emerald-400/15 text-emerald-100" : "border-red-300/60 bg-red-400/15 text-red-100") : "border-ivory/15 text-ivory/50 hover:border-gold/40"}`}
                >
                  {v ? "Pass" : "Fail"}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-3 gap-2">
        {RESULTS.map((r) => (
          <button key={r.value} type="button" onClick={() => setResult(r.value)} className={`relative border px-3 py-3 text-[0.6rem] uppercase tracking-[0.2em] ${result === r.value ? r.tone : "border-ivory/15 text-ivory/55"}`}>
            {r.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Approved pieces"><input type="number" min={0} max={batch.quantity} value={approved} disabled={result !== "approved"} onChange={(e) => setApproved(Math.max(0, Number(e.target.value)))} className={inputCls} /></Field>
        <Field label="Rejected / rework pieces"><input type="number" min={0} max={batch.quantity} value={rejected} onChange={(e) => setRejected(Math.max(0, Number(e.target.value)))} className={inputCls} /></Field>
      </div>
      <Field label="Inspector notes"><textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Measurements taken, defects found, rework instructions…" /></Field>
      {failed.length > 0 && result === "approved" && <Notice tone="danger">{failed.length} check(s) failed. Approving anyway requires a note, or choose “Rework required”.</Notice>}
      <button onClick={submit} disabled={busy} className={`${btnGold} w-full`}>{busy ? "Recording…" : "Record inspection"}</button>
      <p className="text-[0.6rem] text-ivory/40">Recorded with your name and time. Inspectors who worked on a batch cannot inspect it. Only approved pieces can be received into finished inventory.</p>
    </div>
  );
}

export function QualityControl({ live }: { live: boolean }) {
  const batches = useRows<Batch>("production_batches", "*", live, { order: "created_at" });
  const designs = useRows("garment_designs", "id,name", live);
  const history = useRows("quality_inspections", "*", live, { order: "inspected_at" });
  const queue = batches.rows.filter((b) => b.status === "quality_check");
  const [selected, setSelected] = useState<string | null>(null);
  const current = queue.find((b) => b.id === selected) ?? queue[0];
  const dname = (id: unknown) => String(designs.rows.find((d) => d.id === id)?.name ?? "");

  return (
    <div className="space-y-6">
      <AppHeader live={live} eyebrow="Atelier · Quality Control" title="Quality Control" description="Inspect finished batches against the SAVLINO checklist. Only QC-approved pieces enter finished inventory." />
      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className={`${panel} p-3`}>
          <p className="px-2 pb-2 text-[0.6rem] uppercase tracking-[0.28em] text-ivory/50">Waiting for inspection · {queue.length}</p>
          <ul className="space-y-1">
            {queue.map((b) => (
              <li key={b.id}>
                <button onClick={() => setSelected(b.id)} className={`relative w-full px-3 py-3 text-left ${current?.id === b.id ? "text-ivory" : "text-ivory/65 hover:bg-gold/5"}`}>
                  {current?.id === b.id && <motion.span layoutId="qc-active" className="absolute inset-0 border border-gold/50 bg-gold/10" />}
                  <span className="relative block text-sm">{b.batch_no}</span>
                  <span className="relative block text-xs text-ivory/50">{dname(b.design_id)} · size {b.size} · {b.quantity} pcs</span>
                </button>
              </li>
            ))}
            {!queue.length && <li className="p-3 text-xs text-ivory/45">Nothing waiting. Batches arrive here after finishing.</li>}
          </ul>
        </aside>
        <div className="min-w-0 space-y-4">
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div key={current.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <Section title="Inspection checklist"><QcForm batch={current} live={live} designName={dname(current.design_id)} /></Section>
              </motion.div>
            ) : (
              <Empty title="No batches in quality check" body="When a batch finishes, send it to quality check from Production Batches." />
            )}
          </AnimatePresence>
          <Section title="Inspection history">
            <ul className="space-y-2">
              {history.rows.map((q: Row) => {
                const b = batches.rows.find((x) => x.id === q.batch_id);
                return (
                  <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gold/10 pb-2 text-sm">
                    <span><span className="text-ivory">{b?.batch_no ?? "Batch"}</span> <span className="text-xs text-ivory/50">· approved {String(q.approved_quantity)} · rejected {String(q.rejected_quantity)}{q.notes ? ` · ${String(q.notes)}` : ""}</span><span className="block text-[0.6rem] text-ivory/40">{fmtDateTime(q.inspected_at)}</span></span>
                    <StatusBadge value={label(q.result).replace(/ /g, "_")} />
                  </li>
                );
              })}
              {!history.rows.length && <li className="text-sm text-ivory/45">No inspections recorded yet.</li>}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}
