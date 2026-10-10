"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "@/lib/admin/store";
import type { Row } from "@/lib/admin/types";
import { TASK_STATUSES } from "@/lib/atelier/constants";
import { rpc, useRows, write } from "@/lib/atelier/store";
import type { Batch, Task } from "./ProductionBatches";
import { AppHeader, Notice, Section, Segmented, btnGhost, btnLine, fmtDateTime, inputCls, label, panel } from "./ui";

const COL_LABEL: Record<string, string> = { todo: "To do", in_progress: "In progress", paused: "Paused", blocked: "Blocked", done: "Done" };

export function WorkerTasks({ live }: { live: boolean }) {
  const tasks = useRows<Task>("production_tasks", "*", live, { order: "created_at" });
  const batches = useRows<Batch>("production_batches", "id,batch_no,size,color,status,due_date,priority,design_id", live);
  const assignments = useRows("worker_assignments", "id,task_id,team_member_id", live);
  const team = useRows("team_members", "id,name,atelier_role", live);
  const notes = useRows("production_task_notes", "*", live, { order: "created_at" });
  const [stage, setStage] = useState<"all" | "cutting" | "stitching" | "finishing" | "rework">("all");
  const [reply, setReply] = useState<Record<string, string>>({});

  const visible = tasks.rows.filter((t) => (stage === "all" || t.stage === stage) && batches.rows.find((b) => b.id === t.batch_id)?.status !== "stock_received");
  const who = (taskId: string) => assignments.rows.filter((a) => a.task_id === taskId).map((a) => String(team.rows.find((m) => m.id === a.team_member_id)?.name ?? "Worker"));
  const open = notes.rows.filter((n) => !n.resolved && n.kind !== "reply");

  const answer = async (n: Row) => {
    const text = reply[n.id]?.trim();
    if (!text) return;
    const { error } = await rpc(live, "atelier_worker_report", { p_task: n.task_id, p_kind: "reply", p_message: text }, ["production_task_notes"]);
    if (error) return toast(error, "danger");
    await write(live, "production_task_notes", "update", { resolved: true }, n.id);
    setReply((r) => ({ ...r, [n.id]: "" }));
    toast("Reply sent to the worker portal");
  };
  const resolve = async (n: Row) => {
    const { error } = await write(live, "production_task_notes", "update", { resolved: true }, n.id);
    if (error) toast(error, "danger");
  };

  return (
    <div className="space-y-6">
      <AppHeader
        live={live}
        eyebrow="Atelier · Worker Tasks"
        title="Worker Task Board"
        description="Every job card across active batches, who is on it and where it stands. Workers update their own cards from the Worker Portal; clarifications and shortages arrive here."
        actions={
          <>
            <Segmented id="task-stage" value={stage} onChange={setStage} options={[{ value: "all", label: "All" }, { value: "cutting", label: "Cutting" }, { value: "stitching", label: "Stitching" }, { value: "finishing", label: "Finishing" }, { value: "rework", label: "Rework" }]} />
            <Link href="/worker" className={btnLine}>Open worker portal</Link>
          </>
        }
      />

      {open.length > 0 && (
        <Section title={`Needs your attention · ${open.length}`}>
          <ul className="space-y-3">
            <AnimatePresence>
              {open.map((n) => {
                const t = tasks.rows.find((x) => x.id === n.task_id);
                return (
                  <motion.li key={n.id} layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className={`border-l-2 pl-3 ${n.kind === "shortage" ? "border-red-300/60" : "border-gold/60"}`}>
                    <p className="text-sm text-ivory"><span className={`mr-2 text-[0.55rem] uppercase tracking-[0.2em] ${n.kind === "shortage" ? "text-red-200" : "text-gold"}`}>{label(n.kind)}</span>{String(n.message)}</p>
                    <p className="text-[0.65rem] text-ivory/45">{t?.title ?? "Task"} · {fmtDateTime(n.created_at)}{n.quantity ? ` · qty ${String(n.quantity)}` : ""}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input value={reply[n.id] ?? ""} onChange={(e) => setReply((r) => ({ ...r, [n.id]: e.target.value }))} placeholder="Reply to worker…" aria-label="Reply" className={`${inputCls} max-w-md`} />
                      <button onClick={() => answer(n)} className={btnLine}>Reply & resolve</button>
                      <button onClick={() => resolve(n)} className={btnGhost}>Mark resolved</button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </Section>
      )}

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {TASK_STATUSES.map((s) => {
          const col = visible.filter((t) => t.status === s);
          return (
            <div key={s} className={`${panel} min-h-[240px]`}>
              <p className="flex items-center justify-between border-b border-gold/10 px-3 py-2.5 text-[0.55rem] uppercase tracking-[0.22em] text-ivory/60">{COL_LABEL[s]}<span className="text-gold">{col.length}</span></p>
              <div className="space-y-2 p-2">
                <AnimatePresence>
                  {col.map((t) => {
                    const b = batches.rows.find((x) => x.id === t.batch_id);
                    const names = who(t.id);
                    return (
                      <motion.div key={t.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="border border-gold/15 bg-noir/50 p-3">
                        <p className="text-[0.55rem] uppercase tracking-[0.2em] text-gold">{t.stage} · {b?.batch_no}</p>
                        <p className="mt-1 text-sm text-ivory">{t.title}</p>
                        <p className="mt-1 text-xs text-ivory/55">{t.quantity} pcs{b?.due_date ? ` · due ${String(b.due_date)}` : ""}</p>
                        <p className="mt-2 text-xs text-ivory/70">{names.length ? names.join(", ") : <span className="text-gold-light">Unassigned</span>}</p>
                        {t.minutes_worked > 0 && <p className="mt-1 text-[0.6rem] text-ivory/40">{t.minutes_worked} min logged</p>}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
      <Notice tone="info">Assign workers from a batch in Production Batches. Workers can only start, pause and complete cards assigned to them, and cannot change designs, patterns or sizes.</Notice>
    </div>
  );
}
