"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/admin/ui";
import { toast } from "@/lib/admin/store";
import type { Row } from "@/lib/admin/types";
import { BATCH_LABEL, BATCH_STATUSES, PRIORITIES, STANDARD_SIZES, type BatchStatus } from "@/lib/atelier/constants";
import { rpc, useRows, write } from "@/lib/atelier/store";
import { SidePanel } from "./SidePanel";
import { AppHeader, Empty, Field, Notice, Section, Segmented, Select, Stat, btnDanger, btnGhost, btnGold, btnLine, fmtDate, fmtDateTime, inputCls, label, panel } from "./ui";

export type Batch = Row & { batch_no: string; design_id: string; design_version: number | null; size: string; color: string | null; quantity: number; priority: string; due_date: string | null; status: BatchStatus; product_variant_id: string | null; order_id: string | null; notes?: string | null; created_at?: string };
export type Task = Row & { batch_id: string; stage: string; title: string; instructions: string | null; quantity: number; status: string; materials: { item: string; material: string; unit: string; per_piece: number }[]; minutes_worked: number; completion_photo?: string | null; started_at?: string; completed_at?: string };
type Design = Row & { name: string; code: string; status: string; spec: { colors?: string[] } };
type Member = Row & { name: string; role: string; atelier_role?: string | null; active?: boolean };

const PRIORITY_TONE: Record<string, string> = { urgent: "text-red-200 border-red-300/40", high: "text-gold border-gold/50", normal: "text-ivory/70 border-ivory/20", low: "text-ivory/45 border-ivory/15" };
const NEXT: Partial<Record<BatchStatus, { fn: string; label: string }>> = {
  draft: { fn: "atelier_approve_batch", label: "Approve & generate job cards" },
  approved: { fn: "atelier_reserve_materials", label: "Reserve materials" },
  material_reserved: { fn: "atelier_advance_batch", label: "Start cutting" },
  cutting: { fn: "atelier_advance_batch", label: "Move to stitching" },
  stitching: { fn: "atelier_advance_batch", label: "Move to finishing" },
  finishing: { fn: "atelier_advance_batch", label: "Send to quality check" },
  completed: { fn: "atelier_receive_stock", label: "Receive QC-approved stock" },
};

export function ProductionBatches({ live }: { live: boolean }) {
  const batches = useRows<Batch>("production_batches", "*", live, { order: "created_at" });
  const designs = useRows<Design>("garment_designs", "id,name,code,status,spec", live, { order: "name", asc: true });
  const [view, setView] = useState<"board" | "list">("board");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const open = batches.rows.find((b) => b.id === openId) ?? null;
  const dname = (id: string) => designs.rows.find((d) => d.id === id)?.name ?? "—";

  const stats = useMemo(() => {
    const now = Date.now();
    const active = batches.rows.filter((b) => !["completed", "stock_received", "draft"].includes(b.status));
    return {
      active: active.length,
      due: active.filter((b) => b.due_date && new Date(b.due_date).getTime() - now < 7 * 86400000).length,
      qc: batches.rows.filter((b) => b.status === "quality_check").length,
      pieces: active.reduce((s, b) => s + b.quantity, 0),
    };
  }, [batches.rows]);

  return (
    <div className="space-y-6">
      <AppHeader
        live={live}
        eyebrow="Atelier · Production"
        title="Production Batches"
        description="Plan batches from approved designs, generate job cards, reserve materials and move work from cutting to stock. Every step is checked and logged."
        actions={
          <>
            <Segmented id="batch-view" value={view} onChange={setView} options={[{ value: "board", label: "Board" }, { value: "list", label: "List" }]} />
            <button onClick={() => setCreating(true)} className={btnGold}>+ New batch</button>
          </>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Active batches" value={stats.active} />
        <Stat label="Pieces in production" value={stats.pieces} />
        <Stat label="Due within 7 days" value={stats.due} />
        <Stat label="Waiting for QC" value={stats.qc} />
      </div>

      {view === "board" ? (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {BATCH_STATUSES.map((s) => {
            const col = batches.rows.filter((b) => b.status === s);
            return (
              <div key={s} className={`${panel} w-64 shrink-0`}>
                <p className="flex items-center justify-between border-b border-gold/10 px-3 py-2.5 text-[0.55rem] uppercase tracking-[0.22em] text-ivory/60">{BATCH_LABEL[s]} <span className="text-gold">{col.length}</span></p>
                <div className="min-h-[140px] space-y-2 p-2">
                  {col.map((b, i) => (
                    <motion.button
                      key={b.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      whileHover={{ y: -2 }}
                      onClick={() => setOpenId(b.id)}
                      className="block w-full border border-gold/15 bg-noir/50 p-3 text-left hover:border-gold/50"
                    >
                      <span className="flex items-center justify-between text-[0.6rem] text-ivory/50">{b.batch_no}<span className={`border px-1.5 py-0.5 text-[0.5rem] uppercase tracking-[0.15em] ${PRIORITY_TONE[b.priority]}`}>{b.priority}</span></span>
                      <span className="mt-1.5 block text-sm text-ivory">{dname(b.design_id)}</span>
                      <span className="mt-1 block text-xs text-ivory/55">Size {b.size}{b.color ? ` · ${b.color}` : ""} · {b.quantity} pcs</span>
                      {b.due_date && <span className="mt-1 block text-[0.6rem] text-ivory/40">Due {fmtDate(b.due_date)}</span>}
                    </motion.button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`${panel} overflow-x-auto`}>
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr className="border-b border-gold/15 text-left text-[0.55rem] uppercase tracking-[0.2em] text-ivory/45">{["Batch", "Design", "Size", "Colour", "Qty", "Priority", "Due", "Status"].map((h) => <th key={h} className="px-4 py-3 font-normal">{h}</th>)}</tr></thead>
            <tbody>
              {batches.rows.map((b) => (
                <tr key={b.id} onClick={() => setOpenId(b.id)} className="cursor-pointer border-b border-gold/[0.07] text-ivory/80 hover:bg-gold/5">
                  <td className="px-4 py-3 text-ivory">{b.batch_no}</td><td className="px-4 py-3">{dname(b.design_id)}</td><td className="px-4 py-3">{b.size}</td><td className="px-4 py-3">{b.color ?? "—"}</td><td className="px-4 py-3 tabular-nums">{b.quantity}</td><td className="px-4 py-3 capitalize">{b.priority}</td><td className="px-4 py-3">{fmtDate(b.due_date)}</td><td className="px-4 py-3"><StatusBadge value={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!batches.rows.length && <div className="p-6"><Empty title="No batches yet" body="Create a batch from an approved design." /></div>}
        </div>
      )}

      <SidePanel open={creating} onClose={() => setCreating(false)} title="New production batch">
        <CreateBatch live={live} designs={designs.rows} onDone={(id) => { setCreating(false); if (id) setOpenId(id); }} />
      </SidePanel>
      <SidePanel open={!!open} onClose={() => setOpenId(null)} title={open ? open.batch_no : ""} subtitle={open ? `${dname(open.design_id)} · size ${open.size}${open.color ? ` · ${open.color}` : ""} · ${open.quantity} pcs` : null}>
        {open && <BatchDetail key={open.id} batch={open} live={live} />}
      </SidePanel>
    </div>
  );
}

function CreateBatch({ live, designs, onDone }: { live: boolean; designs: Design[]; onDone: (id?: string) => void }) {
  const approved = designs.filter((d) => d.status === "approved");
  const variants = useRows("product_variants", "id,sku,size,color", live, { order: "sku", asc: true });
  const orders = useRows("orders", "id,order_number,status", live, { order: "created_at", limit: 200 });
  const [f, setF] = useState({ design: approved[0]?.id ?? "", size: "36", color: "", quantity: "10", priority: "normal", due: "", variant: "", order: "", notes: "" });
  const design = approved.find((d) => d.id === f.design);
  const colors = design?.spec?.colors ?? [];

  const save = async () => {
    if (!design) return toast("Choose an approved design", "danger");
    const q = Number(f.quantity);
    if (!(q >= 1)) return toast("Quantity must be at least 1", "danger");
    const { data, error } = await write(live, "production_batches", "insert", {
      design_id: design.id, size: f.size, color: f.color || colors[0] || null, quantity: q, priority: f.priority, due_date: f.due || null, product_variant_id: f.variant || null, order_id: f.order || null, notes: f.notes || null,
    });
    if (error) return toast(error, "danger");
    toast("Draft batch created");
    onDone(data && !Array.isArray(data) ? String((data as Row).id) : undefined);
  };

  if (!approved.length) return <Empty title="No approved designs" body="Only approved designs can go into production. Approve a design in the Design Studio first." />;
  return (
    <div className="space-y-4">
      <Field label="Approved design"><Select value={f.design} onChange={(v) => setF({ ...f, design: v, color: "" })} options={approved.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` }))} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Size"><Select value={f.size} onChange={(v) => setF({ ...f, size: v })} options={STANDARD_SIZES.map((s) => ({ value: s, label: s }))} /></Field>
        <Field label="Colour"><Select value={f.color || colors[0] || ""} onChange={(v) => setF({ ...f, color: v })} options={colors.map((c) => ({ value: c, label: c }))} /></Field>
        <Field label="Quantity"><input type="number" min={1} value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} className={inputCls} /></Field>
        <Field label="Priority"><Select value={f.priority} onChange={(v) => setF({ ...f, priority: v })} options={PRIORITIES.map((p) => ({ value: p, label: p }))} /></Field>
        <Field label="Due date"><input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} className={inputCls} /></Field>
        <Field label="Finished stock variant" hint="Needed to receive stock"><Select value={f.variant} onChange={(v) => setF({ ...f, variant: v })} options={[{ value: "", label: "Link later" }, ...variants.rows.map((v) => ({ value: v.id, label: String(v.sku) }))]} /></Field>
      </div>
      <Field label="For customer order (optional)"><Select value={f.order} onChange={(v) => setF({ ...f, order: v })} options={[{ value: "", label: "Stock batch" }, ...orders.rows.map((o) => ({ value: o.id, label: `${String(o.order_number ?? o.id).slice(0, 18)} · ${label(o.status)}` }))]} /></Field>
      <Field label="Notes"><textarea rows={2} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className={inputCls} /></Field>
      <Notice tone="info">Batches start as drafts. Approval checks that the design, size chart and every pattern piece for this size are approved, then generates cutting, stitching and finishing job cards.</Notice>
      <button onClick={save} className={`${btnGold} w-full`}>Create draft batch</button>
    </div>
  );
}

function BatchDetail({ batch, live }: { batch: Batch; live: boolean }) {
  const tasks = useRows<Task>("production_tasks", "*", live, { filter: { column: "batch_id", value: batch.id }, order: "created_at", asc: true });
  const assignments = useRows("worker_assignments", "id,task_id,team_member_id", live);
  const team = useRows<Member>("team_members", "id,name,role,atelier_role,active", live, { order: "name", asc: true });
  const consumption = useRows("material_consumption", "*", live, { filter: { column: "batch_id", value: batch.id }, order: "created_at" });
  const materials = useRows("materials", "id,name,unit", live);
  const qc = useRows("quality_inspections", "*", live, { filter: { column: "batch_id", value: batch.id }, order: "inspected_at" });
  const notes = useRows("production_task_notes", "*", live, { order: "created_at" });
  const variants = useRows("product_variants", "id,sku", live, { order: "sku", asc: true });
  const [busy, setBusy] = useState(false);
  const idx = BATCH_STATUSES.indexOf(batch.status);
  const next = NEXT[batch.status];
  const taskIds = new Set(tasks.rows.map((t) => t.id));

  const go = async () => {
    if (!next) return;
    setBusy(true);
    const { data, error } = await rpc(live, next.fn, { p_batch: batch.id }, ["production_batches", "production_tasks", "material_consumption", "materials"]);
    setBusy(false);
    if (error) return toast(error, "danger");
    if (next.fn === "atelier_receive_stock") toast(`${String(data)} pieces added to finished inventory`);
    else toast(`${next.label} — done`);
  };

  const assign = async (taskId: string, memberId: string) => {
    if (!memberId) return;
    const { error } = await write(live, "worker_assignments", "insert", { task_id: taskId, team_member_id: memberId });
    if (error) toast(error.includes("duplicate") ? "Already assigned" : error, "danger");
  };
  const unassign = async (id: string) => {
    const { error } = await write(live, "worker_assignments", "delete", null, id);
    if (error) toast(error, "danger");
  };
  const linkVariant = async (v: string) => {
    const { error } = await write(live, "production_batches", "update", { product_variant_id: v || null }, batch.id);
    if (error) toast(error, "danger");
  };
  const removeDraft = async () => {
    const { error } = await write(live, "production_batches", "delete", null, batch.id);
    if (error) toast(error, "danger");
  };

  const printCard = (t: Task) => {
    const w = window.open("", "_blank");
    if (!w) return toast("Allow pop-ups to print", "danger");
    const who = assignments.rows.filter((a) => a.task_id === t.id).map((a) => team.rows.find((m) => m.id === a.team_member_id)?.name).filter(Boolean).join(", ");
    const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string);
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Job card ${esc(batch.batch_no)}</title><style>body{font-family:Helvetica,Arial;padding:24px;color:#000}h1{font-size:20px;margin:0 0 4px}table{border-collapse:collapse;width:100%;margin-top:12px}td,th{border:1px solid #999;padding:6px;text-align:left;font-size:12px}.box{border:1px solid #000;height:60px;margin-top:6px}</style>
<h1>SAVLINO · Job card</h1><p>${esc(batch.batch_no)} · ${esc(t.stage.toUpperCase())} · Size ${esc(batch.size)} · ${esc(batch.color ?? "")} · Qty ${t.quantity} · Due ${esc(batch.due_date ?? "—")} · Priority ${esc(batch.priority)}</p>
<p><b>${esc(t.title)}</b></p><p>${esc(t.instructions)}</p><p>Assigned: ${esc(who || "—")}</p>
<table><tr><th>Material</th><th>Per piece</th><th>Unit</th></tr>${(t.materials ?? []).map((m) => `<tr><td>${esc(m.material)}</td><td>${esc(m.item === "main_fabric" || m.item === "lining" ? "per verified marker" : m.per_piece)}</td><td>${esc(m.unit)}</td></tr>`).join("")}</table>
<p>Started ________ Completed ________ Worker sign ________ Supervisor sign ________</p><div class="box"></div><script>window.onload=()=>window.print()<\/script>`);
    w.document.close();
  };

  return (
    <div className="space-y-5">
      <ol className="flex flex-wrap gap-1">
        {BATCH_STATUSES.map((s, i) => (
          <li key={s} className={`flex items-center gap-1 px-2 py-1 text-[0.5rem] uppercase tracking-[0.15em] ${i < idx ? "text-emerald-200" : i === idx ? "bg-gold text-noir" : "text-ivory/35"}`}>
            {i < idx ? "✓" : i + 1} {BATCH_LABEL[s]}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        {next && <button onClick={go} disabled={busy} className={btnGold}>{busy ? "Working…" : next.label}</button>}
        {batch.status === "quality_check" && <Link href="/admin/quality-control" className={btnLine}>Open Quality Control</Link>}
        {batch.status === "draft" && <button onClick={removeDraft} className={btnDanger}>Delete draft</button>}
      </div>
      {batch.status === "completed" && !batch.product_variant_id && <Notice tone="danger">Link a finished-stock variant before receiving stock.</Notice>}
      {(batch.status === "completed" || batch.status === "draft" || batch.status === "approved") && (
        <Field label="Finished stock variant">
          <Select value={batch.product_variant_id ?? ""} onChange={linkVariant} options={[{ value: "", label: "Not linked" }, ...variants.rows.map((v) => ({ value: v.id, label: String(v.sku) }))]} />
        </Field>
      )}

      <Section title="Job cards">
        {tasks.rows.length ? (
          <ul className="space-y-3">
            {tasks.rows.map((t) => {
              const asg = assignments.rows.filter((a) => a.task_id === t.id);
              return (
                <li key={t.id} className="border border-gold/10 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-ivory"><span className="mr-2 text-[0.55rem] uppercase tracking-[0.2em] text-gold">{t.stage}</span>{t.title}</p>
                    <span className="flex items-center gap-2"><StatusBadge value={t.status} /><button onClick={() => printCard(t)} className={btnGhost}>Print</button></span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {asg.map((a) => (
                      <span key={a.id} className="inline-flex items-center gap-1.5 border border-gold/25 px-2 py-0.5 text-xs text-ivory/80">
                        {team.rows.find((m) => m.id === a.team_member_id)?.name ?? "Worker"}
                        {t.status !== "done" && <button onClick={() => unassign(a.id)} aria-label="Unassign" className="text-ivory/40 hover:text-red-200">×</button>}
                      </span>
                    ))}
                    {t.status !== "done" && (
                      <Select ariaLabel="Assign worker" value="" onChange={(v) => assign(t.id, v)} options={[{ value: "", label: "+ Assign worker…" }, ...team.rows.filter((m) => m.active !== false && !asg.some((a) => a.team_member_id === m.id)).map((m) => ({ value: m.id, label: `${m.name}${m.atelier_role ? ` · ${label(m.atelier_role)}` : ""}` }))]} />
                    )}
                  </div>
                  <p className="mt-2 text-[0.65rem] text-ivory/40">{t.minutes_worked ? `${t.minutes_worked} min worked · ` : ""}{t.completed_at ? `Completed ${fmtDateTime(t.completed_at)}` : t.started_at ? `Started ${fmtDateTime(t.started_at)}` : "Not started"}</p>
                  {t.completion_photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.completion_photo} alt="Completion photo" className="mt-2 h-24 border border-gold/20 object-cover" />
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-ivory/45">Job cards are generated when the batch is approved.</p>
        )}
      </Section>

      {notes.rows.filter((n) => taskIds.has(String(n.task_id))).length > 0 && (
        <Section title="Worker messages">
          <ul className="space-y-2">
            {notes.rows.filter((n) => taskIds.has(String(n.task_id))).map((n) => (
              <li key={n.id} className="border-l-2 border-gold/40 pl-3 text-sm text-ivory/80"><span className="mr-2 text-[0.55rem] uppercase tracking-[0.2em] text-gold">{label(n.kind)}</span>{String(n.message)}<span className="block text-[0.6rem] text-ivory/40">{fmtDateTime(n.created_at)}</span></li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Materials">
        {consumption.rows.length ? (
          <table className="w-full text-xs">
            <tbody>
              {consumption.rows.map((c) => (
                <tr key={c.id} className="border-t border-gold/[0.07]"><td className="py-1.5 capitalize text-ivory/70">{label(c.kind)}</td><td className="text-ivory">{String(materials.rows.find((m) => m.id === c.material_id)?.name ?? "—")}</td><td className="tabular-nums">{String(c.quantity)} {String(c.unit ?? "")}</td><td className="text-ivory/45">{c.basis ? label(c.basis) : ""}</td></tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-ivory/45">Reserved from stock after approval, using verified markers for fabric.</p>
        )}
      </Section>

      {qc.rows.length > 0 && (
        <Section title="Quality inspections">
          {qc.rows.map((q) => (
            <p key={q.id} className="flex items-center justify-between border-t border-gold/[0.07] py-2 text-sm"><span>Approved {String(q.approved_quantity)} · Rejected {String(q.rejected_quantity)}{q.notes ? ` · ${String(q.notes)}` : ""}</span><StatusBadge value={String(q.result)} /></p>
          ))}
        </Section>
      )}
      <p className="text-[0.6rem] text-ivory/35">Created {fmtDateTime(batch.created_at)} · design version {batch.design_version ?? "set on approval"}</p>
    </div>
  );
}
