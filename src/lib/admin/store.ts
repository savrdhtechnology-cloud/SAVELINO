"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ModuleConfig, Row } from "./types";

type Result = { data: unknown; error: { message: string } | null };
type Query = PromiseLike<Result> & {
  order(column: string, options: { ascending: boolean }): Query;
  limit(count: number): Query;
  eq(column: string, value: unknown): Query;
  select(columns?: string): Query;
};
type Table = {
  select(columns: string): Query;
  update(values: Record<string, unknown>): Query;
  insert(values: Record<string, unknown>): Query;
  delete(): Query;
};

function tableOf(name: string): Table | null {
  const sb = createSupabaseBrowserClient();
  return sb ? (sb.from(name) as unknown as Table) : null;
}

/** Simple global toast bus so any CRM component can notify. */
export function toast(message: string, tone: "gold" | "danger" = "gold") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("savlino:toast", { detail: { message, tone } }));
}

const DEMO_NOTE = "Demo mode — change shown here only, not saved";

/**
 * Rows for one CRM module. With Supabase configured the admin's own session reads and
 * writes the table (RLS: admins only). Without it, clearly-labelled sample data is used.
 */
export function useModuleRows(cfg: ModuleConfig, live: boolean) {
  const [rows, setRows] = useState<Row[]>(() => (live ? [] : cfg.demo()));
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!live) return;
    const t = tableOf(cfg.table);
    if (!t) return;
    setLoading(true);
    let q = t.select(cfg.select);
    if (cfg.orderBy) q = q.order(cfg.orderBy, { ascending: false });
    const { data, error: err } = await q.limit(500);
    if (err) setError(err.message);
    else {
      setError(null);
      setRows(((data as Row[] | null) ?? []).map((r) => ({ ...r, id: String(r.id) })));
    }
    setLoading(false);
  }, [cfg, live]);

  useEffect(() => {
    void load();
  }, [load]);

  const update = useCallback(
    async (id: string, patch: Record<string, unknown>) => {
      const before = rows;
      setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      if (!live) return toast(DEMO_NOTE);
      const t = tableOf(cfg.writeTable ?? cfg.table);
      const { error: err } = (await t?.update(patch).eq("id", id)) ?? { error: null };
      if (err) {
        setRows(before);
        toast(err.message, "danger");
      } else toast("Saved");
    },
    [cfg, live, rows],
  );

  const create = useCallback(
    async (values: Record<string, unknown>) => {
      if (!live) {
        setRows((rs) => [{ ...values, id: `new-${Date.now()}`, created_at: new Date().toISOString() }, ...rs]);
        return toast(DEMO_NOTE);
      }
      const t = tableOf(cfg.writeTable ?? cfg.table);
      const { error: err } = (await t?.insert(values)) ?? { error: null };
      if (err) toast(err.message, "danger");
      else {
        toast("Created");
        void load();
      }
    },
    [cfg, live, load],
  );

  const remove = useCallback(
    async (id: string) => {
      const before = rows;
      setRows((rs) => rs.filter((r) => r.id !== id));
      if (!live) return toast(DEMO_NOTE);
      const t = tableOf(cfg.writeTable ?? cfg.table);
      const { error: err } = (await t?.delete().eq("id", id)) ?? { error: null };
      if (err) {
        setRows(before);
        toast(err.message, "danger");
      } else toast("Deleted");
    },
    [cfg, live, rows],
  );

  return { rows, loading, error, update, create, remove, reload: load };
}
