"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { inr, type Product } from "@/lib/data/types";
import { HistoryTable } from "./PriceManager";
import { db, fetchCategories, fetchCosts, fetchHistory, fetchProducts, inBatches, must, revalidateSite, useLoad } from "./data";
import { Badge, Empty, ICONS, Icon, Kpi, PageHeader, Panel, Select, Skeleton, Tabs, toast } from "./ui";

type Edit = { stock?: number; low?: number };
type State = "all" | "in" | "low" | "out";

export function Inventory() {
  const { data, loading, reload } = useLoad(async () => {
    const [products, categories, costs] = await Promise.all([fetchProducts(), fetchCategories(), fetchCosts()]);
    return { products, categories, costs };
  });
  const [tab, setTab] = useState<"stock" | "moves">("stock");
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [state, setState] = useState<State>("all");
  const [status, setStatus] = useState("all");
  const [bulkMode, setBulkMode] = useState<"add" | "remove" | "set" | "alert">("add");
  const [bulkValue, setBulkValue] = useState(5);
  const [busy, setBusy] = useState(false);

  const lowAt = (p: Product) => edits[p.id]?.low ?? p.low_stock_at ?? 3;
  const stockOf = (p: Product) => edits[p.id]?.stock ?? p.stock;
  const stateOf = (p: Product): State => (stockOf(p) <= 0 ? "out" : stockOf(p) <= lowAt(p) ? "low" : "in");

  const filtered = useMemo(() => {
    if (!data) return [];
    const t = q.trim().toLowerCase();
    return data.products.filter(
      (p) =>
        (cat === "all" || p.category_id === cat) &&
        (status === "all" || p.status === status) &&
        (state === "all" || stateOf(p) === state) &&
        (!t || p.name.toLowerCase().includes(t) || (p.sku ?? "").toLowerCase().includes(t)),
    );
  }, [data, q, cat, state, status, edits]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader section="Inventory" subtitle="Stock for every product" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-[560px]" />
      </div>
    );
  }

  const { products, categories, costs } = data;
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";
  const units = products.reduce((a, p) => a + stockOf(p), 0);
  const value = products.reduce((a, p) => a + stockOf(p) * p.price, 0);
  const costValue = products.reduce((a, p) => a + stockOf(p) * (costs[p.id] ?? 0), 0);
  const low = products.filter((p) => stateOf(p) === "low").length;
  const out = products.filter((p) => stateOf(p) === "out").length;

  const setEdit = (p: Product, e: Edit) =>
    setEdits((all) => {
      const next: Edit = { ...all[p.id], ...e };
      if (next.stock !== undefined) next.stock = Math.max(0, Math.round(next.stock));
      if (next.low !== undefined) next.low = Math.max(0, Math.round(next.low));
      if (next.stock === p.stock) delete next.stock;
      if (next.low === (p.low_stock_at ?? 3)) delete next.low;
      const outAll = { ...all, [p.id]: next };
      if (!Object.keys(next).length) delete outAll[p.id];
      return outAll;
    });
  const changed = Object.keys(edits).length;

  function bulk() {
    const list = products.filter((p) => sel.has(p.id));
    if (!list.length) return toast("Select products in the table first", "error");
    list.forEach((p) => {
      if (bulkMode === "alert") setEdit(p, { low: bulkValue });
      else setEdit(p, { stock: bulkMode === "add" ? stockOf(p) + bulkValue : bulkMode === "remove" ? stockOf(p) - bulkValue : bulkValue });
    });
    toast(`${list.length} product${list.length > 1 ? "s" : ""} updated in the table — Save to keep`);
  }

  async function save() {
    setBusy(true);
    try {
      const client = db();
      await inBatches(Object.keys(edits), 6, async (id) => {
        const e = edits[id];
        const row: Record<string, number> = {};
        if (e.stock !== undefined) row.stock = e.stock;
        if (e.low !== undefined) row.low_stock_at = e.low;
        must(await client.from("products").update(row).eq("id", id).select("id"));
      });
      await revalidateSite();
      toast(`Stock saved for ${changed} product${changed > 1 ? "s" : ""}`);
      setEdits({});
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save", "error");
    } finally {
      setBusy(false);
    }
  }

  const allOn = filtered.length > 0 && filtered.every((p) => sel.has(p.id));

  return (
    <div className="space-y-5 pb-28">
      <PageHeader
        section="Inventory"
        subtitle="Stock goes down on every order and comes back if an order is cancelled"
        actions={
          <Link href="/admin/products/pricing" className="crm-btn">
            <Icon d={ICONS.rupee} /> Price Manager
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Units in stock" value={units} icon={ICONS.products} note={`${products.length} products`} onClick={() => setState("all")} />
        <Kpi label="Stock value" value={value} format={(n) => inr(n)} icon={ICONS.rupee} note={costValue ? `Cost value ${inr(costValue)}` : "At selling price"} delay={0.05} />
        <Kpi label="Low stock" value={low} icon={ICONS.warn} note="At or below alert level" delay={0.1} onClick={() => setState("low")} />
        <Kpi label="Out of stock" value={out} icon={ICONS.x} note="Can't be ordered" tone="wine" delay={0.15} onClick={() => setState("out")} />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "stock", label: "Stock", icon: ICONS.products },
          { value: "moves", label: "Stock movements", icon: ICONS.clock },
        ]}
      />

      {tab === "moves" ? (
        <Moves />
      ) : (
        <Panel>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="relative min-w-[200px] flex-1">
              <Icon d={ICONS.search} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 crm-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or SKU" className="crm-input pl-9" />
            </label>
            <Select label="Category" value={cat} onChange={(e) => setCat(e.target.value)} className="w-44">
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-32">
              <option value="all">All</option>
              <option value="live">Live</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </Select>
            <div className="flex gap-1">
              {(
                [
                  ["all", "All"],
                  ["in", "In stock"],
                  ["low", `Low (${low})`],
                  ["out", `Out (${out})`],
                ] as const
              ).map(([v, l]) => (
                <button key={v} type="button" data-on={state === v} onClick={() => setState(v)} className="crm-chip">
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="crm-panel-soft mb-4 flex flex-wrap items-end gap-3 p-3">
            <span className="self-center text-sm">
              <b>{sel.size}</b> selected
            </span>
            <Select label="Bulk action" value={bulkMode} onChange={(e) => setBulkMode(e.target.value as typeof bulkMode)} className="w-48">
              <option value="add">Add stock (+)</option>
              <option value="remove">Remove stock (−)</option>
              <option value="set">Set stock to</option>
              <option value="alert">Set low-stock alert at</option>
            </Select>
            <label className="block w-28">
              <span className="crm-label">Quantity</span>
              <input type="number" min={0} value={bulkValue} onChange={(e) => setBulkValue(Number(e.target.value))} className="crm-input" />
            </label>
            <button type="button" onClick={bulk} className="crm-btn crm-btn-gold" disabled={!sel.size}>
              Apply to selected
            </button>
          </div>

          {filtered.length === 0 ? (
            <Empty icon={ICONS.products} title="No products match">
              Try another filter.
            </Empty>
          ) : (
            <div className="crm-scroll overflow-x-auto">
              <table className="crm-table w-full min-w-[860px]">
                <thead>
                  <tr>
                    <th className="w-10">
                      <input type="checkbox" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(filtered.map((p) => p.id)))} className="h-4 w-4 accent-[#D8B25A]" aria-label="Select all" />
                    </th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Level</th>
                    <th className="w-28">Alert at</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const s = stockOf(p);
                    const st = stateOf(p);
                    const dirty = Boolean(edits[p.id]);
                    const img = p.images.find((i) => i.kind !== "creative") ?? p.images[0];
                    const color = st === "out" ? "#ef6b6b" : st === "low" ? "#e0a83a" : "var(--crm-success)";
                    const pct = Math.min(100, (s / Math.max(1, lowAt(p) * 4)) * 100);
                    return (
                      <tr key={p.id} style={dirty ? { background: "color-mix(in srgb, var(--crm-accent) 7%, transparent)" } : undefined}>
                        <td>
                          <input
                            type="checkbox"
                            checked={sel.has(p.id)}
                            onChange={() =>
                              setSel((x) => {
                                const n = new Set(x);
                                if (n.has(p.id)) n.delete(p.id);
                                else n.add(p.id);
                                return n;
                              })
                            }
                            className="h-4 w-4 accent-[#D8B25A]"
                            aria-label={`Select ${p.name}`}
                          />
                        </td>
                        <td>
                          <Link href={`/admin/studio?id=${p.id}`} className="flex items-center gap-3">
                            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg" style={{ background: "var(--crm-panel-2)" }}>
                              {img && <Image src={img.url} alt="" fill sizes="44px" className="object-cover" />}
                            </span>
                            <span className="min-w-0">
                              <span className="block max-w-[240px] truncate text-sm">{p.name}</span>
                              <span className="flex items-center gap-2 text-[0.7rem] crm-muted">
                                {p.sku || "No SKU"} <Badge status={p.status} />
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="text-sm crm-muted">{catName(p.category_id)}</td>
                        <td>
                          <span className="flex items-center gap-1">
                            <button type="button" onClick={() => setEdit(p, { stock: s - 1 })} className="flex h-8 w-8 items-center justify-center rounded-lg crm-panel-soft" aria-label="One less">
                              −
                            </button>
                            <input
                              type="number"
                              min={0}
                              value={s}
                              onChange={(e) => setEdit(p, { stock: Number(e.target.value) })}
                              className="crm-input h-8 w-20 py-1 text-center text-sm font-semibold"
                              style={edits[p.id]?.stock !== undefined ? { borderColor: "var(--crm-accent)", boxShadow: "0 0 0 1px var(--crm-accent)" } : undefined}
                            />
                            <button type="button" onClick={() => setEdit(p, { stock: s + 1 })} className="flex h-8 w-8 items-center justify-center rounded-lg crm-panel-soft" aria-label="One more">
                              +
                            </button>
                          </span>
                          {edits[p.id]?.stock !== undefined && <span className="mt-0.5 block text-[0.65rem] crm-muted">was {p.stock}</span>}
                        </td>
                        <td className="w-40">
                          <span className="block h-1.5 overflow-hidden rounded-full" style={{ background: "var(--crm-panel-2)" }}>
                            <motion.span className="block h-full rounded-full" initial={false} animate={{ width: `${pct}%` }} style={{ background: color }} />
                          </span>
                          <span className="mt-1 block text-[0.7rem]" style={{ color }}>
                            {st === "out" ? "Out of stock" : st === "low" ? "Low stock" : "In stock"}
                          </span>
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            value={lowAt(p)}
                            onChange={(e) => setEdit(p, { low: Number(e.target.value) })}
                            className="crm-input h-8 w-20 py-1 text-center text-sm"
                            style={edits[p.id]?.low !== undefined ? { borderColor: "var(--crm-accent)" } : undefined}
                          />
                        </td>
                        <td className="whitespace-nowrap text-sm">{p.price ? inr(s * p.price) : <span className="crm-muted">no price</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      <AnimatePresence>
        {changed > 0 && tab === "stock" && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="crm-panel fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-3 px-5 py-3 lg:ml-[132px]">
            <Icon d={ICONS.edit} className="h-4 w-4 crm-accent" />
            <span className="text-sm">
              {changed} product{changed > 1 ? "s" : ""} changed · not saved yet
            </span>
            <button type="button" onClick={() => setEdits({})} className="crm-btn" disabled={busy}>
              Reset
            </button>
            <button type="button" onClick={() => void save()} className="crm-btn crm-btn-wine" disabled={busy}>
              <Icon d={ICONS.check} /> {busy ? "Saving…" : "Save stock"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Moves() {
  const { data, loading } = useLoad(() => fetchHistory(["stock"], 300));
  return (
    <Panel title="Stock movements" icon={ICONS.clock} subtitle="Manual changes, orders and cancellations — newest first">
      {loading || !data ? <Skeleton className="h-64" /> : <HistoryTable rows={data} money={false} />}
    </Panel>
  );
}
