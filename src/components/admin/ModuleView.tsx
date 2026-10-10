"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { getModule } from "@/lib/admin/modules";
import { useModuleRows } from "@/lib/admin/store";
import type { Action, Column, Field, ModuleConfig, Row } from "@/lib/admin/types";
import { Drawer, EASE, FormattedCell, Icon, cellValue } from "./ui";
import { KanbanBoard } from "./KanbanBoard";

const PAGE = 20;

export function ModuleView({ slug, live }: { slug: string; live: boolean }) {
  const cfg = getModule(slug);
  if (!cfg) return null;
  return <ModuleTable cfg={cfg} live={live} />;
}

function ModuleTable({ cfg, live }: { cfg: ModuleConfig; live: boolean }) {
  const slug = cfg.slug;
  const reduce = useReducedMotion();
  const { rows, loading, error, update, create, remove } = useModuleRows(cfg, live);
  const [status, setStatus] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [view, setView] = useState<"board" | "table">(cfg.kanban ? "board" : "table");

  // Command palette quick actions open the create form via ?new=1
  useEffect(() => {
    if (cfg.form && new URLSearchParams(window.location.search).get("new") === "1") setCreating(true);
  }, [cfg.form]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    if (cfg.statusKey) for (const r of rows) c[String(r[cfg.statusKey])] = (c[String(r[cfg.statusKey])] ?? 0) + 1;
    return c;
  }, [rows, cfg.statusKey]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = rows.filter((r) => (status === "all" || !cfg.statusKey ? true : String(r[cfg.statusKey]) === status));
    if (q)
      out = out.filter((r) =>
        cfg.searchKeys.some((k) => {
          const col = cfg.columns.find((c) => c.key === k);
          const v = col ? cellValue(r, col) : r[k];
          return String(v ?? "").toLowerCase().includes(q);
        }),
      );
    if (sort) {
      const col = cfg.columns.find((c) => c.key === sort.key);
      out = [...out].sort((a, b) => {
        const va = col ? cellValue(a, col) : a[sort.key];
        const vb = col ? cellValue(b, col) : b[sort.key];
        if (typeof va === "number" && typeof vb === "number") return (va - vb) * sort.dir;
        return String(va ?? "").localeCompare(String(vb ?? "")) * sort.dir;
      });
    }
    return out;
  }, [rows, status, query, sort, cfg]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const kb = cfg.kanban;
  const moveActions: Action[] =
    selected && kb
      ? kb.columns
          .filter((c) => c !== String(selected[kb.key]))
          .map((c) => ({ label: `→ ${c.replace(/_/g, " ")}`, patch: { [kb.key]: c } }))
      : [];

  return (
    <div>
      <motion.header
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.4em] text-gold">SAVLINO CRM</p>
          <h1 className="mt-2 font-display text-4xl text-ivory md:text-5xl">{cfg.title}</h1>
          <p className="mt-2 font-serif text-lg text-ivory/60">{cfg.description}</p>
        </div>
        <div className="flex items-center gap-3 self-start md:self-auto">
        {cfg.kanban && (
          <LayoutGroup id={`view-${slug}`}>
            <div className="flex border border-gold/20 p-0.5">
              {(["board", "table"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={`relative px-3.5 py-2 text-[0.6rem] uppercase tracking-[0.22em] ${view === v ? "text-noir" : "text-ivory/55 hover:text-gold"}`}
                >
                  {view === v && <motion.span layoutId="view-pill" className="absolute inset-0 bg-gold" transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
                  <span className="relative">{v}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>
        )}
        {cfg.form && (
          <motion.button
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 self-start bg-gradient-to-r from-gold to-gold-light px-5 py-3 text-[0.65rem] font-medium uppercase tracking-[0.28em] text-noir shadow-[0_12px_40px_-12px_rgba(212,175,55,0.7)] md:self-auto"
          >
            <span className="text-base leading-none">+</span> {cfg.createLabel ?? "Add"}
          </motion.button>
        )}
        </div>
      </motion.header>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {cfg.statuses ? (
          <LayoutGroup id={`tabs-${slug}`}>
            <div className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
              {["all", ...cfg.statuses].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setStatus(s);
                    setLimit(PAGE);
                  }}
                  className={`relative whitespace-nowrap px-3.5 py-2 text-[0.6rem] uppercase tracking-[0.22em] transition-colors ${
                    status === s ? "text-gold" : "text-ivory/50 hover:text-ivory"
                  }`}
                >
                  {status === s && (
                    <motion.span layoutId="tab-underline" className="absolute inset-x-2 -bottom-px h-px bg-gold" />
                  )}
                  {s.replace(/_/g, " ")}
                  <span className="ml-1.5 text-ivory/35">{counts[s] ?? 0}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>
        ) : (
          <p className="text-xs text-ivory/45">{rows.length} records</p>
        )}
        <div className="relative w-full lg:w-72">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ivory/40">
            <Icon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35" className="h-4 w-4" />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${cfg.title.toLowerCase()}`}
            className="h-10 w-full border border-gold/15 bg-noir-soft/60 pl-9 pr-3 text-sm text-ivory placeholder:text-ivory/30 outline-none focus:border-gold/60"
          />
        </div>
      </div>

      {cfg.kanban && view === "board" ? (
        <div className="mt-5">
          {error && <p className="mb-3 border border-red-300/30 bg-red-950/40 px-5 py-3 text-sm text-red-200">Could not load: {error}</p>}
          <KanbanBoard
            cfg={{ ...cfg, kanban: cfg.kanban }}
            rows={visible}
            onOpen={setSelectedId}
            onMove={(id, col) => {
              const row = rows.find((r) => r.id === id);
              if (row && cfg.kanban && String(row[cfg.kanban.key]) !== col) void update(id, { [cfg.kanban.key]: col });
            }}
          />
        </div>
      ) : (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
        className="mt-5 overflow-hidden border border-gold/15 bg-noir-soft/40 backdrop-blur"
      >
        {error && <p className="border-b border-red-300/30 bg-red-950/40 px-5 py-3 text-sm text-red-200">Could not load: {error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gold/15">
                {cfg.columns.map((c) => (
                  <th key={c.key} scope="col" className={`px-5 py-3.5 ${c.wide ? "hidden md:table-cell" : ""}`}>
                    <button
                      type="button"
                      onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: 1 }))}
                      className="inline-flex items-center gap-1.5 text-[0.58rem] font-medium uppercase tracking-[0.25em] text-gold/80 hover:text-gold"
                    >
                      {c.label}
                      <span className={`transition-transform ${sort?.key === c.key ? "opacity-100" : "opacity-0"} ${sort?.dir === -1 ? "rotate-180" : ""}`}>↑</span>
                    </button>
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-gold/8">
                    {cfg.columns.map((c) => (
                      <td key={c.key} className={`px-5 py-4 ${c.wide ? "hidden md:table-cell" : ""}`}>
                        <span className="block h-3 w-24 animate-pulse bg-ivory/10" />
                      </td>
                    ))}
                    <td />
                  </tr>
                ))}
              <AnimatePresence initial={false}>
                {!loading &&
                  visible.slice(0, limit).map((row, i) => (
                    <motion.tr
                      key={row.id}
                      layout={!reduce}
                      initial={reduce ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ duration: 0.45, delay: reduce ? 0 : Math.min(i, 12) * 0.03, ease: EASE }}
                      onClick={() => setSelectedId(row.id)}
                      className="group cursor-pointer border-b border-gold/8 transition-colors last:border-0 hover:bg-gold/[0.06]"
                    >
                      {cfg.columns.map((c, ci) => (
                        <td
                          key={c.key}
                          className={`px-5 py-3.5 ${ci === 0 ? "font-medium text-ivory" : "text-ivory/75"} ${c.wide ? "hidden md:table-cell" : ""}`}
                        >
                          <FormattedCell row={row} col={c} />
                        </td>
                      ))}
                      <td className="pr-4 text-right text-gold/0 transition-colors group-hover:text-gold">→</td>
                    </motion.tr>
                  ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        {!loading && visible.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 py-20 text-center">
            <p className="font-display text-2xl italic text-ivory/70">Nothing here yet</p>
            <p className="mt-2 text-sm text-ivory/45">{query ? "No records match your search." : "Records will appear here as they arrive."}</p>
          </motion.div>
        )}
      </motion.div>

      )}

      {view === "table" && visible.length > limit && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setLimit((l) => l + PAGE)}
            className="border border-gold/30 px-6 py-2.5 text-[0.6rem] uppercase tracking-[0.3em] text-gold hover:bg-gold hover:text-noir"
          >
            Show more · {visible.length - limit} left
          </button>
        </div>
      )}

      <Drawer open={Boolean(selected)} onClose={() => setSelectedId(null)} title={selected ? String(cellValue(selected, cfg.columns[0]) ?? "Record") : ""}>
        {selected && (
          <RecordDetail
            row={selected}
            actions={[
              ...(cfg.actions ?? []).filter((a) => !a.when || a.when(selected)),
              ...moveActions,
            ]}
            columns={cfg.columns}
            onAction={(a) => update(selected.id, a.patch)}
            onDelete={
              cfg.canDelete
                ? () => {
                    void remove(selected.id);
                    setSelectedId(null);
                  }
                : undefined
            }
          />
        )}
      </Drawer>

      <Drawer open={creating} onClose={() => setCreating(false)} title={cfg.createLabel ?? "Add"}>
        {cfg.form && (
          <CreateForm
            fields={cfg.form}
            onSubmit={async (values) => {
              await create(values);
              setCreating(false);
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

function RecordDetail({
  row,
  columns,
  actions,
  onAction,
  onDelete,
}: {
  row: Row;
  columns: Column[];
  actions: Action[];
  onAction: (a: Action) => void;
  onDelete?: () => void;
}) {
  return (
    <div>
      <dl className="space-y-0 divide-y divide-gold/10 border-y border-gold/10">
        {columns.map((c, i) => (
          <motion.div
            key={c.key}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.04, duration: 0.4, ease: EASE }}
            className="flex items-center justify-between gap-6 py-3.5"
          >
            <dt className="text-[0.58rem] uppercase tracking-[0.25em] text-ivory/45">{c.label}</dt>
            <dd className="text-right text-sm text-ivory">
              <FormattedCell row={row} col={c} />
            </dd>
          </motion.div>
        ))}
      </dl>

      {actions.length > 0 && (
        <div className="mt-8">
          <p className="text-[0.58rem] uppercase tracking-[0.3em] text-gold">Actions</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.map((a) => (
              <motion.button
                key={a.label}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onAction(a)}
                className={`px-4 py-2.5 text-[0.62rem] uppercase tracking-[0.22em] ${
                  a.tone === "danger"
                    ? "border border-red-300/40 text-red-200 hover:bg-red-400/10"
                    : "bg-gold text-noir hover:bg-gold-light"
                }`}
              >
                {a.label}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {onDelete && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Delete this record permanently?")) onDelete();
          }}
          className="mt-10 text-[0.6rem] uppercase tracking-[0.3em] text-red-300/80 hover:text-red-200"
        >
          Delete record
        </button>
      )}
    </div>
  );
}

function CreateForm({
  fields,
  onSubmit,
}: {
  fields: Field[];
  onSubmit: (values: Record<string, unknown>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const input =
    "mt-2 w-full border border-gold/25 bg-transparent px-3.5 py-3 text-sm text-ivory placeholder:text-ivory/30 outline-none transition-colors focus:border-gold";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const values: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === "checkbox") values[f.key] = data.get(f.key) === "on";
      else if (f.type === "number") {
        const raw = String(data.get(f.key) ?? "");
        if (raw !== "") values[f.key] = Number(raw);
      } else {
        const raw = String(data.get(f.key) ?? "").trim();
        if (raw !== "") values[f.key] = raw;
      }
    }
    setBusy(true);
    await onSubmit(values);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {fields.map((f, i) => (
        <motion.div key={f.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
          {f.type === "checkbox" ? (
            <label className="flex items-center gap-3 text-sm text-ivory/80">
              <input type="checkbox" name={f.key} defaultChecked className="h-4 w-4 accent-[#d4af37]" />
              {f.label}
            </label>
          ) : (
            <label className="block">
              <span className="text-[0.58rem] uppercase tracking-[0.25em] text-ivory/55">{f.label}</span>
              {f.type === "textarea" ? (
                <textarea name={f.key} rows={4} required={f.required} placeholder={f.placeholder} className={input} />
              ) : f.type === "select" ? (
                <select name={f.key} required={f.required} className={`${input} bg-noir`}>
                  {f.options?.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  name={f.key}
                  type={f.type}
                  required={f.required}
                  placeholder={f.placeholder}
                  min={f.type === "number" ? 0 : undefined}
                  className={input}
                />
              )}
            </label>
          )}
        </motion.div>
      ))}
      <motion.button
        type="submit"
        disabled={busy}
        whileTap={{ scale: 0.98 }}
        className="w-full bg-gradient-to-r from-gold to-gold-light py-3.5 text-[0.65rem] font-medium uppercase tracking-[0.3em] text-noir disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save"}
      </motion.button>
    </form>
  );
}
