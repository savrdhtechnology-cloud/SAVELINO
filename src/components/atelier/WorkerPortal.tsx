"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge, Toaster } from "@/components/admin/ui";
import { Logo } from "@/components/ui/Logo";
import { toast } from "@/lib/admin/store";
import type { Row } from "@/lib/admin/types";
import { DEFAULT_SPEC, type DesignSpec } from "@/lib/atelier/constants";
import type { PieceGeometry } from "@/lib/atelier/drafting";
import { rpc, useRows } from "@/lib/atelier/store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { imageToDataUrl } from "./image";
import { latestPieces, printPieces } from "./PatternLibrary";
import { PatternPiece } from "./PatternView";
import type { Batch, Task } from "./ProductionBatches";
import { QcForm } from "./QualityControl";
import { TechFlat } from "./TechFlat";
import { Empty, Notice, Segmented, btnDanger, btnGhost, btnGold, btnLine, fmtDate, fmtDateTime, inputCls, label, panel } from "./ui";
import { Viewport } from "./Viewport";

type Design = Row & { name: string; code: string; spec: Partial<DesignSpec>; current_version: number; status: string };
type Piece = Row & { design_id: string; size: string; piece_type: string; version: number; status: string; geometry: PieceGeometry; design_version: number; size_chart_id: string };

const EASE = [0.22, 1, 0.36, 1] as const;

export function WorkerPortal({ live, adminPreview, email }: { live: boolean; adminPreview: boolean; email: string | null }) {
  const me = useRows("team_members", "id,name,atelier_role", live, { limit: 1 });
  const mine = adminPreview ? undefined : me.rows[0];
  const role = String(mine?.atelier_role ?? "");
  const isPM = role === "pattern_master" || adminPreview;
  const isQC = role === "qc_inspector" || adminPreview;
  const [tab, setTab] = useState<"tasks" | "review" | "qc">("tasks");

  const signOut = async () => {
    await createSupabaseBrowserClient()?.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-5 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-gold/15 pb-4">
        <div className="flex items-center gap-4">
          <Logo height={34} />
          <span className="hidden h-8 w-px bg-gold/20 sm:block" />
          <div>
            <p className="text-[0.55rem] uppercase tracking-[0.3em] text-gold">Atelier · Worker Portal</p>
            <p className="text-sm text-ivory/80">{String(mine?.name ?? (adminPreview ? "Admin preview" : email ?? "Atelier team"))}{role ? ` · ${label(role)}` : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {adminPreview && <Link href="/admin/worker-tasks" className={btnGhost}>Back to CRM</Link>}
          {live && <button onClick={signOut} className={btnLine}>Sign out</button>}
        </div>
      </header>
      {!live && <p className="mt-4 border border-gold/40 bg-gold/10 px-3 py-2 text-[0.6rem] uppercase tracking-[0.22em] text-gold">Preview data — not saved</p>}
      {adminPreview && live && <div className="mt-4"><Notice tone="info">Admin preview — you see every task. Workers only see cards assigned to them.</Notice></div>}

      {(isPM || isQC) && (
        <div className="mt-5">
          <Segmented
            id="worker-tab"
            value={tab}
            onChange={setTab}
            options={[{ value: "tasks", label: "My tasks" }, ...(isPM ? [{ value: "review" as const, label: "Pattern review" }] : []), ...(isQC ? [{ value: "qc" as const, label: "Quality check" }] : [])]}
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE }} className="mt-6">
          {tab === "tasks" && <MyTasks live={live} />}
          {tab === "review" && isPM && <PatternReview live={live} />}
          {tab === "qc" && isQC && <QcQueue live={live} />}
        </motion.div>
      </AnimatePresence>
      <Toaster />
    </div>
  );
}

function MyTasks({ live }: { live: boolean }) {
  const tasks = useRows<Task>("production_tasks", "*", live, { order: "created_at", asc: true });
  const batches = useRows<Batch>("production_batches", "id,batch_no,design_id,design_version,size,color,quantity,priority,due_date,status", live);
  const designs = useRows<Design>("garment_designs", "id,name,code,spec,current_version,status", live);
  const [openId, setOpenId] = useState<string | null>(null);
  const active = tasks.rows.filter((t) => t.status !== "done");
  const done = tasks.rows.filter((t) => t.status === "done");
  const open = tasks.rows.find((t) => t.id === openId) ?? null;
  const batchOf = (t: Task) => batches.rows.find((b) => b.id === t.batch_id);

  if (open) {
    const b = batchOf(open);
    return <TaskDetail task={open} batch={b} design={designs.rows.find((d) => d.id === b?.design_id)} live={live} onBack={() => setOpenId(null)} />;
  }
  if (!tasks.loading && !tasks.rows.length) return <Empty title="No tasks assigned" body="When your supervisor assigns a job card to you, it appears here." />;

  const card = (t: Task, i: number) => {
    const b = batchOf(t);
    const d = designs.rows.find((x) => x.id === b?.design_id);
    return (
      <motion.li key={t.id} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, ease: EASE }}>
        <button onClick={() => setOpenId(t.id)} className={`${panel} block w-full p-4 text-left transition-colors hover:border-gold/50`}>
          <span className="flex items-center justify-between gap-2">
            <span className="text-[0.55rem] uppercase tracking-[0.22em] text-gold">{t.stage} · {b?.batch_no}</span>
            <StatusBadge value={t.status} />
          </span>
          <span className="mt-2 block font-serif text-xl text-ivory">{d?.name ?? t.title}</span>
          <span className="mt-1 block text-sm text-ivory/60">Size {b?.size}{b?.color ? ` · ${b.color}` : ""} · {t.quantity} pcs</span>
          <span className="mt-2 flex items-center justify-between text-[0.65rem] text-ivory/45">
            <span>{b?.due_date ? `Due ${fmtDate(b.due_date)}` : "No due date"}</span>
            <span className="uppercase tracking-[0.18em]">{b?.priority}</span>
          </span>
        </button>
      </motion.li>
    );
  };

  return (
    <div className="space-y-8">
      <section>
        <p className="mb-3 text-[0.6rem] uppercase tracking-[0.28em] text-ivory/55">Assigned to me · {active.length}</p>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{active.map(card)}</ul>
      </section>
      {done.length > 0 && (
        <section>
          <p className="mb-3 text-[0.6rem] uppercase tracking-[0.28em] text-ivory/55">Completed · {done.length}</p>
          <ul className="grid gap-3 opacity-70 sm:grid-cols-2 lg:grid-cols-3">{done.map(card)}</ul>
        </section>
      )}
    </div>
  );
}

function TaskDetail({ task, batch, design, live, onBack }: { task: Task; batch?: Batch; design?: Design; live: boolean; onBack: () => void }) {
  const [view, setView] = useState<"instructions" | "design" | "pattern" | "materials" | "messages">("instructions");
  const [flat, setFlat] = useState<"front" | "back">("front");
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [kind, setKind] = useState<"clarification" | "shortage">("clarification");
  const [shortQty, setShortQty] = useState("");
  const [shortItem, setShortItem] = useState("");
  const photoRef = useRef<HTMLInputElement>(null);
  const pieces = useRows<Piece>("pattern_pieces", "id,design_id,size,piece_type,version,status,geometry,design_version,size_chart_id", live, { filter: { column: "design_id", value: batch?.design_id ?? "-" } });
  const notes = useRows("production_task_notes", "*", live, { filter: { column: "task_id", value: task.id }, order: "created_at", asc: true });
  const approved = useMemo(() => latestPieces(pieces.rows.filter((p) => p.size === batch?.size && p.status === "approved")), [pieces.rows, batch?.size]);
  const [pieceId, setPieceId] = useState<string | null>(null);
  const piece = approved.find((p) => p.id === pieceId) ?? approved[0];
  const spec: DesignSpec = { ...DEFAULT_SPEC, ...(design?.spec ?? {}) };
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (task.status !== "in_progress") return;
    const t = setInterval(() => setElapsed((e) => e + 1), 60000);
    return () => clearInterval(t);
  }, [task.status]);

  const act = async (action: "start" | "pause" | "complete") => {
    setBusy(true);
    const { error } = await rpc(live, "atelier_worker_task", { p_task: task.id, p_action: action, p_photo: action === "complete" ? photo : null }, ["production_tasks"]);
    setBusy(false);
    if (error) toast(error, "danger");
    else toast(action === "start" ? "Started — good work" : action === "pause" ? "Paused" : "Completed — thank you");
  };

  const send = async () => {
    if (!msg.trim()) return;
    const text = kind === "shortage" ? `${shortItem ? `${shortItem}: ` : ""}${msg.trim()}` : msg.trim();
    const { error } = await rpc(live, "atelier_worker_report", { p_task: task.id, p_kind: kind, p_message: text, p_material: null, p_quantity: shortQty ? Number(shortQty) : null }, ["production_task_notes", "production_tasks"]);
    if (error) return toast(error, "danger");
    setMsg("");
    setShortQty("");
    toast(kind === "shortage" ? "Shortage reported to the supervisor" : "Question sent to the supervisor");
  };

  return (
    <div className="space-y-5">
      <button onClick={onBack} className={btnGhost}>← All tasks</button>
      <div className={`${panel} p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[0.55rem] uppercase tracking-[0.25em] text-gold">{task.stage} · {batch?.batch_no}</p>
            <h1 className="mt-2 font-display text-3xl italic text-ivory">{design?.name ?? task.title}</h1>
            <p className="mt-1 text-sm text-ivory/60">Size {batch?.size}{batch?.color ? ` · ${batch.color}` : ""} · {task.quantity} pcs{batch?.due_date ? ` · due ${fmtDate(batch.due_date)}` : ""}</p>
          </div>
          <div className="text-right">
            <StatusBadge value={task.status} />
            <p className="mt-2 text-[0.65rem] text-ivory/45">{task.minutes_worked + (task.status === "in_progress" ? elapsed : 0)} min logged</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {(task.status === "todo" || task.status === "blocked") && <button onClick={() => act("start")} disabled={busy} className={btnGold}>Start task</button>}
          {task.status === "paused" && <button onClick={() => act("start")} disabled={busy} className={btnGold}>Resume</button>}
          {task.status === "in_progress" && (
            <>
              <button onClick={() => act("pause")} disabled={busy} className={btnLine}>Pause</button>
              <button onClick={() => photoRef.current?.click()} className={btnLine}>{photo ? "Retake photo" : "Add completion photo"}</button>
              <button onClick={() => act("complete")} disabled={busy} className={btnGold}>Mark complete</button>
              <input
                ref={photoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="sr-only"
                aria-label="Completion photo"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  try {
                    setPhoto(await imageToDataUrl(f, 1200, 1_400_000));
                  } catch (err) {
                    toast((err as Error).message, "danger");
                  }
                }}
              />
            </>
          )}
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="Completion preview" className="h-12 w-12 border border-gold/30 object-cover" />
          )}
          {task.status === "done" && <p className="text-sm text-emerald-200">Completed {fmtDateTime(task.completed_at)}</p>}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Segmented
          id="task-view"
          value={view}
          onChange={setView}
          options={[{ value: "instructions", label: "Instructions" }, { value: "design", label: "Design" }, { value: "pattern", label: "Cutting pattern" }, { value: "materials", label: "Materials" }, { value: "messages", label: "Messages" }]}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          {view === "instructions" && (
            <div className={`${panel} space-y-4 p-5`}>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ivory/85">{task.instructions || "Follow the approved design specification."}</p>
              {design && (
                <dl className="grid grid-cols-2 gap-3 border-t border-gold/10 pt-4 text-sm sm:grid-cols-4">
                  {([["Neckline", spec.neckline], ["Back", spec.backNeck], ["Sleeve", spec.sleeve], ["Cut", spec.cut], ["Closure", spec.closure], ["Fabric", spec.fabric], ["Lining", spec.lining], ["Embroidery", spec.embroidery]] as const).map(([k, v]) => (
                    <div key={k}><dt className="text-[0.55rem] uppercase tracking-[0.2em] text-ivory/45">{k}</dt><dd className="capitalize text-ivory">{label(v)}</dd></div>
                  ))}
                </dl>
              )}
              <p className="text-[0.65rem] text-ivory/40">Read-only. The approved design (v{batch?.design_version ?? design?.current_version}) cannot be changed from the workshop — ask your supervisor if something looks wrong.</p>
            </div>
          )}
          {view === "design" && (
            <div className={`${panel} p-3`}>
              <div className="mb-3"><Segmented id="worker-flat" value={flat} onChange={setFlat} options={[{ value: "front", label: "Front" }, { value: "back", label: "Back" }]} /></div>
              {design ? (
                <Viewport content={{ x: 0, y: 0, w: 200, h: 222 }} className="h-[460px] text-ivory" label={`${design.name} ${flat} view`}>
                  <TechFlat spec={spec} view={flat} color={batch?.color ?? undefined} />
                </Viewport>
              ) : (
                <p className="p-4 text-sm text-ivory/50">The approved design isn’t available.</p>
              )}
            </div>
          )}
          {view === "pattern" && (
            <div className="space-y-3">
              {approved.length ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    {approved.map((p) => (
                      <button key={p.id} onClick={() => setPieceId(p.id)} className={`border px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.2em] ${piece?.id === p.id ? "border-gold bg-gold text-noir" : "border-gold/20 text-ivory/70"}`}>{p.geometry.label}</button>
                    ))}
                    <button onClick={() => printPieces(approved.map((p) => ({ g: p.geometry, meta: { design: design?.name ?? "", size: p.size, status: p.status, version: p.version } })))} className={btnLine}>Print true scale</button>
                  </div>
                  {piece && (
                    <Viewport key={piece.id} content={{ x: piece.geometry.bounds.minX - 2, y: piece.geometry.bounds.minY - 3, w: piece.geometry.bounds.maxX - piece.geometry.bounds.minX + 6, h: piece.geometry.bounds.maxY - piece.geometry.bounds.minY + 5 }} grid={1} className="h-[480px]" label={`${piece.geometry.label} cutting pattern`}>
                      <PatternPiece g={piece.geometry} />
                    </Viewport>
                  )}
                  <p className="text-[0.65rem] text-ivory/45">Approved pattern · read-only. Cut on the verified marker only; check grainline and notches.</p>
                </>
              ) : (
                <Empty title="No approved pattern visible" body="Approved patterns for this batch appear here once the Pattern Master releases them." />
              )}
            </div>
          )}
          {view === "materials" && (
            <div className={`${panel} p-5`}>
              {task.materials?.length ? (
                <table className="w-full text-sm">
                  <thead><tr className="text-left text-[0.55rem] uppercase tracking-[0.2em] text-ivory/45"><th className="py-2 font-normal">Material</th><th className="font-normal">Per piece</th><th className="font-normal">For {task.quantity} pcs</th></tr></thead>
                  <tbody>
                    {task.materials.map((m, i) => {
                      const fabric = m.item === "main_fabric" || m.item === "lining";
                      return (
                        <tr key={i} className="border-t border-gold/[0.07]">
                          <td className="py-2 text-ivory">{m.material ?? label(m.item)}</td>
                          <td className="text-ivory/70">{fabric ? "verified marker" : `${m.per_piece} ${m.unit}`}</td>
                          <td className="tabular-nums text-ivory/80">{fabric ? "issued by supervisor" : `${Math.ceil(Number(m.per_piece) * task.quantity * 100) / 100} ${m.unit}`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-ivory/50">Your supervisor will issue materials for this task.</p>
              )}
            </div>
          )}
          {view === "messages" && (
            <div className={`${panel} space-y-4 p-5`}>
              <ul className="space-y-3">
                {notes.rows.map((n) => (
                  <li key={n.id} className={`max-w-[85%] border px-3 py-2 text-sm ${n.kind === "reply" ? "ml-auto border-gold/40 bg-gold/10" : n.kind === "shortage" ? "border-red-300/30" : "border-ivory/15"}`}>
                    <span className="block text-[0.55rem] uppercase tracking-[0.2em] text-gold">{n.kind === "reply" ? "Supervisor" : label(n.kind)}</span>
                    {String(n.message)}
                    <span className="mt-1 block text-[0.6rem] text-ivory/40">{fmtDateTime(n.created_at)}</span>
                  </li>
                ))}
                {!notes.rows.length && <li className="text-sm text-ivory/45">No messages yet.</li>}
              </ul>
              <div className="space-y-3 border-t border-gold/10 pt-4">
                <Segmented id="msg-kind" value={kind} onChange={setKind} options={[{ value: "clarification", label: "Ask a question" }, { value: "shortage", label: "Report shortage" }]} />
                {kind === "shortage" && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select aria-label="Material" value={shortItem} onChange={(e) => setShortItem(e.target.value)} className={inputCls}>
                      <option value="" className="bg-noir">Which material?</option>
                      {(task.materials ?? []).map((m, i) => <option key={i} value={m.material ?? m.item} className="bg-noir">{m.material ?? label(m.item)}</option>)}
                    </select>
                    <input type="number" min={0} step={0.1} value={shortQty} onChange={(e) => setShortQty(e.target.value)} placeholder="Quantity short" aria-label="Quantity short" className={inputCls} />
                  </div>
                )}
                <textarea rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={kind === "shortage" ? "What is missing?" : "What do you need to know?"} aria-label="Message" className={inputCls} />
                <button onClick={send} className={kind === "shortage" ? btnDanger : btnGold}>{kind === "shortage" ? "Report shortage" : "Send question"}</button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function PatternReview({ live }: { live: boolean }) {
  const pieces = useRows<Piece>("pattern_pieces", "id,design_id,size,piece_type,version,status,geometry,design_version,size_chart_id", live, { filter: { column: "status", value: "in_review" }, order: "created_at", asc: true });
  const designs = useRows<Design>("garment_designs", "id,name,code,spec,current_version,status", live);
  const [sel, setSel] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const piece = pieces.rows.find((p) => p.id === sel) ?? pieces.rows[0];
  const decide = async (decision: "approved" | "changes_requested" | "rejected") => {
    if (!piece) return;
    const { error } = await rpc(live, "atelier_review_pattern", { p_piece: piece.id, p_decision: decision, p_comment: comment || null }, ["pattern_pieces"]);
    if (error) toast(error, "danger");
    else {
      setComment("");
      setSel(null);
      toast(decision === "approved" ? "Approved for production" : "Decision recorded");
    }
  };
  if (!pieces.rows.length) return <Empty title="Nothing to review" body="Pattern pieces submitted for review appear here." />;
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <ul className={`${panel} max-h-[600px] space-y-1 overflow-y-auto p-2`}>
        {pieces.rows.map((p) => (
          <li key={p.id}>
            <button onClick={() => setSel(p.id)} className={`w-full px-3 py-2.5 text-left text-sm ${piece?.id === p.id ? "border border-gold/50 bg-gold/10 text-ivory" : "text-ivory/65"}`}>
              {p.geometry.label} · size {p.size}
              <span className="block text-[0.6rem] text-ivory/45">{designs.rows.find((d) => d.id === p.design_id)?.name} · v{p.version}</span>
            </button>
          </li>
        ))}
      </ul>
      {piece && (
        <div className="space-y-3">
          <Viewport key={piece.id} content={{ x: piece.geometry.bounds.minX - 2, y: piece.geometry.bounds.minY - 3, w: piece.geometry.bounds.maxX - piece.geometry.bounds.minX + 6, h: piece.geometry.bounds.maxY - piece.geometry.bounds.minY + 5 }} grid={1} className="h-[460px]" label={`${piece.geometry.label} for review`}>
            <PatternPiece g={piece.geometry} />
          </Viewport>
          <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Review notes (fit sample results, corrections)…" aria-label="Review notes" className={inputCls} />
          <div className="flex flex-wrap gap-2">
            <button onClick={() => decide("approved")} className={btnGold}>Approve for production</button>
            <button onClick={() => decide("changes_requested")} className={btnLine}>Request changes</button>
            <button onClick={() => decide("rejected")} className={btnDanger}>Reject</button>
          </div>
        </div>
      )}
    </div>
  );
}

function QcQueue({ live }: { live: boolean }) {
  const batches = useRows<Batch>("production_batches", "*", live, { filter: { column: "status", value: "quality_check" } });
  const designs = useRows<Design>("garment_designs", "id,name,code,spec,current_version,status", live);
  const [sel, setSel] = useState<string | null>(null);
  const b = batches.rows.find((x) => x.id === sel) ?? batches.rows[0];
  if (!batches.rows.length) return <Empty title="No batches waiting" body="Batches ready for inspection appear here. You can’t inspect batches you worked on." />;
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <ul className={`${panel} space-y-1 p-2`}>
        {batches.rows.map((x) => (
          <li key={x.id}>
            <button onClick={() => setSel(x.id)} className={`w-full px-3 py-2.5 text-left text-sm ${b?.id === x.id ? "border border-gold/50 bg-gold/10 text-ivory" : "text-ivory/65"}`}>{x.batch_no}<span className="block text-[0.6rem] text-ivory/45">size {x.size} · {x.quantity} pcs</span></button>
          </li>
        ))}
      </ul>
      {b && <div className={`${panel} p-5`}><QcForm key={b.id} batch={b} live={live} designName={designs.rows.find((d) => d.id === b.design_id)?.name} /></div>}
    </div>
  );
}
