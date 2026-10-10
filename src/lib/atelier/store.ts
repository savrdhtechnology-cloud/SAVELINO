"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/lib/admin/store";
import type { Row } from "@/lib/admin/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { friendlyError, QC_CHECKS } from "./constants";
import { seedAtelierDemo } from "./demo";

type Result = { data: unknown; error: { message: string } | null };
type Query = PromiseLike<Result> & {
  order(c: string, o: { ascending: boolean }): Query;
  limit(n: number): Query;
  eq(c: string, v: unknown): Query;
  in(c: string, v: unknown[]): Query;
  select(c?: string): Query;
  single(): Query;
};
type Table = {
  select(c: string): Query;
  insert(v: Record<string, unknown> | Record<string, unknown>[]): Query;
  update(v: Record<string, unknown>): Query;
  delete(): Query;
};
type Client = { from(t: string): Table; rpc(fn: string, args: Record<string, unknown>): PromiseLike<Result> };

const client = () => createSupabaseBrowserClient() as unknown as Client | null;

// ───────── Demo database (preview only) ─────────
let demoDb: Record<string, Row[]> | null = null;
const db = () => (demoDb ??= seedAtelierDemo());
const uid = () => `demo-${Math.random().toString(36).slice(2, 10)}`;
const DEMO_NOTE = "Preview mode — changes are not saved";

function emit(tables: string[]) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("atelier:changed", { detail: tables }));
}

export type Filter = { column: string; value: unknown };

/** Reads one table with the admin's (or worker's) own session; RLS decides what comes back. */
export function useRows<T extends Row = Row>(table: string, select: string, live: boolean, opts: { order?: string; asc?: boolean; filter?: Filter; limit?: number } = {}) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { order, asc, filter, limit } = opts;
  const fk = filter ? `${filter.column}=${String(filter.value)}` : "";

  const load = useCallback(async () => {
    if (!live) {
      let r = [...(db()[table] ?? [])];
      if (filter) r = r.filter((x) => x[filter.column] === filter.value);
      if (order) r.sort((a, b) => String(a[order] ?? "").localeCompare(String(b[order] ?? "")) * (asc ? 1 : -1));
      setRows(r as T[]);
      setLoading(false);
      return;
    }
    const sb = client();
    if (!sb) return;
    let q = sb.from(table).select(select);
    if (filter) q = q.eq(filter.column, filter.value);
    if (order) q = q.order(order, { ascending: !!asc });
    const { data, error: err } = await q.limit(limit ?? 1000);
    if (err) setError(err.message);
    else setError(null);
    setRows(((data as T[] | null) ?? []) as T[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, live, order, asc, fk, limit]);

  useEffect(() => {
    void load();
    const on = (e: Event) => {
      const t = (e as CustomEvent<string[]>).detail;
      if (!t || t.includes(table) || t.includes("*")) void load();
    };
    window.addEventListener("atelier:changed", on);
    return () => window.removeEventListener("atelier:changed", on);
  }, [load, table]);

  return { rows, loading, error, reload: load, setRows };
}

/** Insert / update / delete with RLS (admin) or the preview store. */
export async function write(live: boolean, table: string, op: "insert" | "update" | "delete", values: Record<string, unknown> | Record<string, unknown>[] | null, id?: string) {
  if (!live) {
    const t = (db()[table] ??= []);
    let created: Row | Row[] | null = null;
    if (op === "insert") {
      const list = (Array.isArray(values) ? values : [values]).map((v) => ({ id: uid(), created_at: new Date().toISOString(), ...(v as object) }) as Row);
      t.unshift(...list);
      created = Array.isArray(values) ? list : list[0];
    } else if (op === "update" && id) {
      const i = t.findIndex((r) => r.id === id);
      if (i >= 0) t[i] = { ...t[i], ...(values as object), updated_at: new Date().toISOString() };
      if (table === "garment_designs" && values && "spec" in values) {
        t[i].current_version = Number(t[i].current_version ?? 1) + 1;
        db().design_versions.unshift({ id: uid(), design_id: id, version: t[i].current_version, name: t[i].name, status: t[i].status, spec: t[i].spec, created_at: new Date().toISOString() });
        emit(["design_versions"]);
      }
      created = t[i] ?? null;
    } else if (op === "delete" && id) {
      db()[table] = t.filter((r) => r.id !== id);
    }
    toast(DEMO_NOTE);
    emit([table]);
    return { data: created, error: null as string | null };
  }
  const sb = client();
  if (!sb) return { data: null, error: "Database not connected" };
  const tb = sb.from(table);
  let res: Result;
  if (op === "insert") res = await tb.insert(values as Record<string, unknown>).select();
  else if (op === "update") res = await tb.update(values as Record<string, unknown>).eq("id", id).select();
  else res = await tb.delete().eq("id", id);
  if (res.error) return { data: null, error: friendlyError(res.error.message) };
  emit([table]);
  const d = res.data as Row[] | null;
  return { data: Array.isArray(d) && !Array.isArray(values) ? d[0] ?? null : d, error: null as string | null };
}

/** Calls a checked workflow function. Errors come back in plain language. */
export async function rpc<T = unknown>(live: boolean, fn: string, args: Record<string, unknown>, touches: string[] = ["*"]): Promise<{ data: T | null; error: string | null }> {
  if (!live) {
    try {
      const data = demoRpc(fn, args) as T;
      toast(DEMO_NOTE);
      emit(touches);
      return { data, error: null };
    } catch (e) {
      return { data: null, error: friendlyError((e as Error).message) };
    }
  }
  const sb = client();
  if (!sb) return { data: null, error: "Database not connected" };
  const { data, error } = await sb.rpc(fn, args);
  if (error) return { data: null, error: friendlyError(error.message) };
  emit(touches);
  return { data: data as T, error: null };
}

// ───────── Preview workflow (mirrors the database rules closely enough to explore the UI) ─────────
function demoRpc(fn: string, a: Record<string, unknown>): unknown {
  const d = db();
  const find = (t: string, id: unknown) => {
    const r = d[t].find((x) => x.id === id);
    if (!r) throw new Error("not_found");
    return r;
  };
  switch (fn) {
    case "atelier_set_design_status": {
      const r = find("garment_designs", a.p_design);
      r.status = a.p_status;
      d.design_approvals.unshift({ id: uid(), subject: "design", design_id: r.id, design_version: r.current_version, decision: a.p_status === "approved" ? "approved" : "changes_requested", comment: a.p_comment ?? null, decided_at: new Date().toISOString() });
      return null;
    }
    case "atelier_approve_size_chart": {
      const r = find("size_charts", a.p_chart);
      d.size_charts.forEach((c) => c.category === r.category && c.status === "approved" && (c.status = "archived"));
      r.status = "approved";
      return null;
    }
    case "atelier_clone_size_chart": {
      const r = find("size_charts", a.p_chart);
      const id = uid();
      const version = Math.max(...d.size_charts.map((c) => Number(c.version))) + 1;
      d.size_charts.unshift({ ...r, id, version, status: "draft" });
      d.size_measurements.push(...d.size_measurements.filter((m) => m.size_chart_id === r.id).map((m) => ({ ...m, id: uid(), size_chart_id: id })));
      return id;
    }
    case "atelier_submit_pattern":
      find("pattern_pieces", a.p_piece).status = "in_review";
      return null;
    case "atelier_review_pattern": {
      const r = find("pattern_pieces", a.p_piece);
      if (a.p_decision === "approved") {
        d.pattern_pieces.forEach((p) => p.design_id === r.design_id && p.size === r.size && p.piece_type === r.piece_type && p.status === "approved" && (p.status = "superseded"));
        r.status = "approved";
      } else r.status = a.p_decision === "rejected" ? "rejected" : "draft";
      return null;
    }
    case "atelier_verify_marker":
      find("cutting_layouts", a.p_layout).status = "verified";
      return null;
    case "atelier_approve_batch": {
      const b = find("production_batches", a.p_batch);
      const des = find("garment_designs", b.design_id);
      if (des.status !== "approved") throw new Error("design_not_approved");
      const ok = d.pattern_pieces.filter((p) => p.design_id === b.design_id && p.size === b.size && p.status === "approved").map((p) => p.piece_type);
      const need = ["front", "back", "neck_facing"].concat((des.spec as { sleeve?: string }).sleeve === "sleeveless" ? [] : ["sleeve"]);
      const missing = need.filter((n) => !ok.includes(n));
      if (missing.length) throw new Error(`patterns_not_approved:${missing.join(",")}`);
      b.status = "approved";
      for (const stage of ["cutting", "stitching", "finishing"]) {
        d.production_tasks.push({ id: uid(), batch_id: b.id, stage, title: `${stage[0].toUpperCase()}${stage.slice(1)} ${des.name} · size ${b.size}`, instructions: "Follow the approved specification.", quantity: b.quantity, status: "todo", materials: [], minutes_worked: 0 });
      }
      return null;
    }
    case "atelier_reserve_materials": {
      const b = find("production_batches", a.p_batch);
      const lines = d.design_bom.filter((x) => x.design_id === b.design_id);
      if (!lines.length) throw new Error("bom_missing");
      for (const l of lines) {
        if (["main_fabric", "lining"].includes(String(l.item_type))) {
          const role = l.item_type === "main_fabric" ? "main" : "lining";
          if (!d.cutting_layouts.some((c) => c.design_id === b.design_id && c.size === b.size && c.fabric_role === role && c.status === "verified")) throw new Error(`marker_not_verified:${l.item_type}`);
        }
        if (!l.material_id) throw new Error(`bom_material_not_linked:${l.item_type}`);
      }
      b.status = "material_reserved";
      return [];
    }
    case "atelier_advance_batch": {
      const b = find("production_batches", a.p_batch);
      const next: Record<string, string> = { material_reserved: "cutting", cutting: "stitching", stitching: "finishing", finishing: "quality_check" };
      if (!next[String(b.status)]) throw new Error(`cannot_advance_from:${b.status}`);
      if (d.production_tasks.some((t) => t.batch_id === b.id && t.stage === b.status && t.status !== "done")) throw new Error(`stage_tasks_open:${b.status}`);
      b.status = next[String(b.status)];
      return b.status;
    }
    case "atelier_record_qc": {
      const b = find("production_batches", a.p_batch);
      if (b.status !== "quality_check") throw new Error("batch_not_in_qc");
      d.quality_inspections.unshift({ id: uid(), batch_id: b.id, result: a.p_result, approved_quantity: a.p_result === "approved" ? a.p_approved : 0, rejected_quantity: a.p_rejected, checklist: a.p_checklist ?? Object.fromEntries(QC_CHECKS.map((c) => [c.key, true])), notes: a.p_notes, inspected_at: new Date().toISOString() });
      b.status = a.p_result === "approved" ? "completed" : a.p_result === "rework_required" ? "stitching" : b.status;
      return null;
    }
    case "atelier_receive_stock": {
      const b = find("production_batches", a.p_batch);
      if (b.status !== "completed") throw new Error("batch_not_completed");
      if (!b.product_variant_id) throw new Error("variant_required");
      b.status = "stock_received";
      return d.quality_inspections.find((q) => q.batch_id === b.id && q.result === "approved")?.approved_quantity ?? 0;
    }
    case "atelier_worker_task": {
      const t = find("production_tasks", a.p_task);
      const to: Record<string, string> = { start: "in_progress", pause: "paused", complete: "done" };
      t.status = to[String(a.p_action)];
      if (a.p_photo) t.completion_photo = a.p_photo;
      return a.p_action;
    }
    case "atelier_worker_report": {
      d.production_task_notes.unshift({ id: uid(), task_id: a.p_task, kind: a.p_kind, message: a.p_message, quantity: a.p_quantity ?? null, resolved: false, created_at: new Date().toISOString() });
      if (a.p_kind === "shortage") {
        const t = find("production_tasks", a.p_task);
        if (["todo", "paused"].includes(String(t.status))) t.status = "blocked";
      }
      return null;
    }
    default:
      throw new Error(`Unknown action ${fn}`);
  }
}
