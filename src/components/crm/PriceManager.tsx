"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { inr, type Product, type ProductHistory } from "@/lib/data/types";
import { db, fetchCategories, fetchCosts, fetchHistory, fetchProducts, inBatches, must, revalidateSite, useLoad } from "./data";
import { Badge, EASE, Empty, ICONS, Icon, Kpi, PageHeader, Panel, Select, Skeleton, Tabs, fmtDateTime, toast } from "./ui";

type Field = "price" | "mrp" | "cost";
type Edit = Partial<Record<Field, number>>;
type Change = "inc_pct" | "dec_pct" | "inc_amt" | "dec_amt" | "set";
type Round = "none" | "10" | "50" | "9" | "99";

const FIELD_LABEL: Record<Field, string> = { price: "Selling price", mrp: "MRP", cost: "Cost price" };
const CHANGE_LABEL: Record<Change, string> = { inc_pct: "Increase by %", dec_pct: "Decrease by %", inc_amt: "Increase by ₹", dec_amt: "Decrease by ₹", set: "Set to ₹" };
const ROUND_LABEL: Record<Round, string> = { none: "No rounding", "10": "Nearest ₹10", "50": "Nearest ₹50", "9": "Ends in 9 (₹1,999)", "99": "Ends in 99 (₹2,099)" };

export function roundPrice(v: number, r: Round) {
  const n = Math.max(0, Math.round(v));
  if (r === "10") return Math.round(n / 10) * 10;
  if (r === "50") return Math.round(n / 50) * 50;
  if (r === "9") return Math.max(9, Math.round((n + 1) / 10) * 10 - 1);
  if (r === "99") return Math.max(99, Math.round((n + 1) / 100) * 100 - 1);
  return n;
}
const margin = (price: number, cost: number) => (price > 0 && cost > 0 ? ((price - cost) / price) * 100 : null);

export function PriceManager() {
  const { data, loading, reload } = useLoad(async () => {
    const [products, categories, costs] = await Promise.all([fetchProducts(), fetchCategories(), fetchCosts()]);
    return { products, categories, costs };
  });
  const [tab, setTab] = useState<"master" | "history">("master");
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [only, setOnly] = useState<"all" | "nocost" | "noprice" | "lowmargin">("all");
  // bulk
  const [scope, setScope] = useState<"selected" | "filtered" | "category">("filtered");
  const [scopeCat, setScopeCat] = useState("");
  const [field, setField] = useState<Field>("price");
  const [change, setChange] = useState<Change>("inc_pct");
  const [value, setValue] = useState(10);
  const [round, setRound] = useState<Round>("9");
  // smart
  const [target, setTarget] = useState(50);
  const [mrpUp, setMrpUp] = useState(25);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    if (!data) return [];
    const t = q.trim().toLowerCase();
    return data.products.filter((p) => {
      const cost = data.costs[p.id] ?? 0;
      const m = margin(p.price, cost);
      return (
        (cat === "all" || p.category_id === cat) &&
        (status === "all" || p.status === status) &&
        (!t || p.name.toLowerCase().includes(t) || (p.sku ?? "").toLowerCase().includes(t)) &&
        (only === "all" || (only === "nocost" && !cost) || (only === "noprice" && !p.price) || (only === "lowmargin" && m !== null && m < 30))
      );
    });
  }, [data, q, cat, status, only]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader section="Price Manager" subtitle="Bulk & smart pricing for every product" />
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
  const cur = (p: Product) => ({
    price: edits[p.id]?.price ?? p.price,
    mrp: edits[p.id]?.mrp ?? p.compare_at_price ?? 0,
    cost: edits[p.id]?.cost ?? costs[p.id] ?? 0,
  });
  const orig = (p: Product) => ({ price: p.price, mrp: p.compare_at_price ?? 0, cost: costs[p.id] ?? 0 });
  const setEdit = (id: string, f: Field, v: number) =>
    setEdits((e) => {
      const p = products.find((x) => x.id === id);
      if (!p) return e;
      const next = { ...e[id], [f]: Math.max(0, Math.round(v || 0)) };
      if (next[f] === orig(p)[f]) delete next[f];
      const out = { ...e, [id]: next };
      if (!Object.keys(next).length) delete out[id];
      return out;
    });
  const changed = Object.keys(edits).length;

  const live = products.filter((p) => p.status === "live" && p.price > 0);
  const withCost = products.filter((p) => p.price > 0 && costs[p.id]);
  const avgPrice = live.length ? live.reduce((a, p) => a + p.price, 0) / live.length : 0;
  const avgMargin = withCost.length ? withCost.reduce((a, p) => a + (margin(p.price, costs[p.id]) ?? 0), 0) / withCost.length : 0;
  const noCost = products.filter((p) => !costs[p.id]).length;

  const targets = (): Product[] =>
    scope === "selected" ? products.filter((p) => sel.has(p.id)) : scope === "category" ? products.filter((p) => p.category_id === scopeCat) : filtered;

  function applyBulk() {
    const list = targets();
    if (!list.length) return toast(scope === "selected" ? "Select products in the table first" : "No products match", "error");
    if (value < 0 || (change !== "set" && !value)) return toast("Enter a value", "error");
    const calc = (v: number) =>
      change === "inc_pct" ? v * (1 + value / 100) : change === "dec_pct" ? v * (1 - value / 100) : change === "inc_amt" ? v + value : change === "dec_amt" ? v - value : value;
    list.forEach((p) => setEdit(p.id, field, roundPrice(calc(cur(p)[field]), round)));
    toast(`${list.length} prices changed in the table — check, then Save`);
  }

  function suggest(ids: Product[]) {
    let n = 0;
    ids.forEach((p) => {
      const c = cur(p).cost;
      if (!c) return;
      const price = roundPrice(c / (1 - Math.min(90, target) / 100), round);
      setEdit(p.id, "price", price);
      if (mrpUp > 0) setEdit(p.id, "mrp", roundPrice(price * (1 + mrpUp / 100), round));
      n++;
    });
    toast(n ? `Suggested prices for ${n} product${n > 1 ? "s" : ""} — check, then Save` : "Add cost prices first — suggestions need cost", n ? "ok" : "error");
  }

  async function save() {
    const ids = Object.keys(edits);
    const bad = ids.filter((id) => {
      const p = products.find((x) => x.id === id);
      return p?.status === "live" && (edits[id].price ?? p.price) <= 0;
    });
    if (bad.length) return toast("A live product needs a price above ₹0", "error");
    setBusy(true);
    try {
      const client = db();
      await inBatches(ids, 6, async (id) => {
        const p = products.find((x) => x.id === id);
        if (!p) return;
        const e = edits[id];
        const price = e.price ?? p.price;
        const mrp = e.mrp ?? p.compare_at_price ?? 0;
        if (e.price !== undefined || e.mrp !== undefined) {
          must(await client.from("products").update({ price, compare_at_price: mrp > price ? mrp : null }).eq("id", id).select("id"));
        }
        if (e.cost !== undefined) must(await client.from("product_costs").upsert({ product_id: id, cost_price: e.cost }).select("product_id"));
      });
      await revalidateSite();
      toast(`Saved ${ids.length} product${ids.length > 1 ? "s" : ""} — website updated`);
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
        section="Price Manager"
        subtitle="Bulk & smart pricing for every product — preview, then save"
        actions={
          <Link href="/admin/products/inventory" className="crm-btn">
            <Icon d={ICONS.layers} /> Inventory
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Products" value={products.length} icon={ICONS.products} note={`${live.length} live with a price`} />
        <Kpi label="Avg. selling price" value={avgPrice} format={(n) => inr(n)} icon={ICONS.rupee} note="Live products" delay={0.05} />
        <Kpi label="Avg. margin" value={avgMargin} format={(n) => `${n.toFixed(1)}%`} icon={ICONS.chart} note={`${withCost.length} products with cost`} delay={0.1} />
        <Kpi label="Missing cost" value={noCost} icon={ICONS.warn} note="Add cost to see margin" tone="wine" delay={0.15} onClick={() => setOnly("nocost")} />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "master", label: "Price master", icon: ICONS.rupee },
          { value: "history", label: "Price history", icon: ICONS.clock },
        ]}
      />

      {tab === "history" ? (
        <History />
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Panel title="Bulk price update" icon={ICONS.layers} subtitle="Change many prices at once">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Select label="Apply to" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
                  <option value="filtered">Products shown below ({filtered.length})</option>
                  <option value="selected">Selected products ({sel.size})</option>
                  <option value="category">A category…</option>
                </Select>
                {scope === "category" ? (
                  <Select label="Category" value={scopeCat} onChange={(e) => setScopeCat(e.target.value)}>
                    <option value="">Choose…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({products.filter((p) => p.category_id === c.id).length})
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Select label="Price to change" value={field} onChange={(e) => setField(e.target.value as Field)}>
                    {(Object.keys(FIELD_LABEL) as Field[]).map((f) => (
                      <option key={f} value={f}>
                        {FIELD_LABEL[f]}
                      </option>
                    ))}
                  </Select>
                )}
                {scope === "category" && (
                  <Select label="Price to change" value={field} onChange={(e) => setField(e.target.value as Field)}>
                    {(Object.keys(FIELD_LABEL) as Field[]).map((f) => (
                      <option key={f} value={f}>
                        {FIELD_LABEL[f]}
                      </option>
                    ))}
                  </Select>
                )}
                <Select label="Change" value={change} onChange={(e) => setChange(e.target.value as Change)}>
                  {(Object.keys(CHANGE_LABEL) as Change[]).map((c) => (
                    <option key={c} value={c}>
                      {CHANGE_LABEL[c]}
                    </option>
                  ))}
                </Select>
                <label className="block">
                  <span className="crm-label">Value</span>
                  <span className="relative block">
                    <input type="number" min={0} value={value || ""} onChange={(e) => setValue(Number(e.target.value))} className="crm-input pr-9" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm crm-muted">{change.endsWith("pct") ? "%" : "₹"}</span>
                  </span>
                </label>
                <Select label="Round to" value={round} onChange={(e) => setRound(e.target.value as Round)}>
                  {(Object.keys(ROUND_LABEL) as Round[]).map((r) => (
                    <option key={r} value={r}>
                      {ROUND_LABEL[r]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <span className="mr-auto text-xs crm-muted">Changes show in the table first — nothing is saved until you press Save.</span>
                <button type="button" onClick={applyBulk} className="crm-btn crm-btn-gold">
                  Preview changes <Icon d={ICONS.arrow} />
                </button>
              </div>
            </Panel>

            <Panel title="Smart pricing" icon={ICONS.sparkle} subtitle="Price from cost + target margin">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="crm-label">Target margin</span>
                  <span className="relative block">
                    <input type="number" min={1} max={90} value={target} onChange={(e) => setTarget(Number(e.target.value))} className="crm-input pr-9" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm crm-muted">%</span>
                  </span>
                </label>
                <label className="block">
                  <span className="crm-label">MRP above price</span>
                  <span className="relative block">
                    <input type="number" min={0} max={200} value={mrpUp} onChange={(e) => setMrpUp(Number(e.target.value))} className="crm-input pr-9" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm crm-muted">%</span>
                  </span>
                </label>
              </div>
              <p className="mt-3 text-xs crm-muted">
                Price = cost ÷ (1 − {target}%), rounded “{ROUND_LABEL[round]}”. Example: cost ₹1,000 → {inr(roundPrice(1000 / (1 - Math.min(90, target) / 100), round))}
                {mrpUp > 0 ? `, MRP ${inr(roundPrice(roundPrice(1000 / (1 - Math.min(90, target) / 100), round) * (1 + mrpUp / 100), round))}` : ""}.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" className="crm-btn justify-center" onClick={() => suggest(products.filter((p) => sel.has(p.id)))} disabled={!sel.size}>
                  For selected ({sel.size})
                </button>
                <button type="button" className="crm-btn crm-btn-gold justify-center" onClick={() => suggest(filtered)}>
                  For all shown
                </button>
              </div>
            </Panel>
          </div>

          <Panel>
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <label className="relative min-w-[220px] flex-1">
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
              <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-36">
                <option value="all">All</option>
                <option value="live">Live</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </Select>
              <Select label="Show" value={only} onChange={(e) => setOnly(e.target.value as typeof only)} className="w-44">
                <option value="all">Everything</option>
                <option value="nocost">Missing cost</option>
                <option value="noprice">No price</option>
                <option value="lowmargin">Margin under 30%</option>
              </Select>
            </div>

            {filtered.length === 0 ? (
              <Empty icon={ICONS.rupee} title="No products match">
                Try another filter.
              </Empty>
            ) : (
              <div className="crm-scroll overflow-x-auto">
                <table className="crm-table w-full min-w-[900px]">
                  <thead>
                    <tr>
                      <th className="w-10">
                        <input type="checkbox" checked={allOn} onChange={() => setSel(allOn ? new Set() : new Set(filtered.map((p) => p.id)))} className="h-4 w-4 accent-[#D8B25A]" aria-label="Select all" />
                      </th>
                      <th>Product</th>
                      <th>Category</th>
                      <th className="w-32">Cost ₹</th>
                      <th className="w-32">MRP ₹</th>
                      <th className="w-32">Selling ₹</th>
                      <th>Margin</th>
                      <th>Off</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const v = cur(p);
                      const o = orig(p);
                      const m = margin(v.price, v.cost);
                      const off = v.mrp > v.price && v.price > 0 ? Math.round((1 - v.price / v.mrp) * 100) : 0;
                      const img = p.images.find((i) => i.kind !== "creative") ?? p.images[0];
                      return (
                        <tr key={p.id} style={edits[p.id] ? { background: "color-mix(in srgb, var(--crm-accent) 7%, transparent)" } : undefined}>
                          <td>
                            <input
                              type="checkbox"
                              checked={sel.has(p.id)}
                              onChange={() =>
                                setSel((s) => {
                                  const n = new Set(s);
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
                          <PriceCell value={v.cost} was={o.cost} onChange={(n) => setEdit(p.id, "cost", n)} />
                          <PriceCell value={v.mrp} was={o.mrp} onChange={(n) => setEdit(p.id, "mrp", n)} />
                          <PriceCell value={v.price} was={o.price} onChange={(n) => setEdit(p.id, "price", n)} strong />
                          <td>
                            {m === null ? (
                              <span className="text-xs crm-muted">—</span>
                            ) : (
                              <span className="text-sm font-semibold" style={{ color: m >= 40 ? "var(--crm-success)" : m >= 25 ? "#e0a83a" : "#ef6b6b" }}>
                                {m.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td className="text-sm">{off > 0 ? <span className="crm-accent">{off}%</span> : <span className="crm-muted">—</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}

      <AnimatePresence>
        {changed > 0 && tab === "master" && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="crm-panel fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-3 px-5 py-3 lg:ml-[132px]">
            <Icon d={ICONS.edit} className="h-4 w-4 crm-accent" />
            <span className="text-sm">
              {changed} product{changed > 1 ? "s" : ""} changed · not saved yet
            </span>
            <button type="button" onClick={() => setEdits({})} className="crm-btn" disabled={busy}>
              Reset
            </button>
            <button type="button" onClick={() => void save()} className="crm-btn crm-btn-wine" disabled={busy}>
              <Icon d={ICONS.check} /> {busy ? "Saving…" : "Save prices"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PriceCell({ value, was, onChange, strong }: { value: number; was: number; onChange: (n: number) => void; strong?: boolean }) {
  const dirty = value !== was;
  return (
    <td>
      <input
        type="number"
        min={0}
        value={value || ""}
        placeholder="0"
        onChange={(e) => onChange(Number(e.target.value))}
        className={`crm-input h-9 w-28 py-1 text-sm ${strong ? "font-semibold" : ""}`}
        style={dirty ? { borderColor: "var(--crm-accent)", boxShadow: "0 0 0 1px var(--crm-accent)" } : undefined}
      />
      {dirty && <span className="mt-0.5 block text-[0.65rem] crm-muted line-through">{was ? inr(was) : "—"}</span>}
    </td>
  );
}

const FIELD_NAME: Record<string, string> = { price: "Selling price", compare_at_price: "MRP", cost_price: "Cost", stock: "Stock" };

export function HistoryTable({ rows, money }: { rows: ProductHistory[]; money: boolean }) {
  if (!rows.length) return <Empty icon={ICONS.clock} title="No changes yet">Every change you save is recorded here.</Empty>;
  return (
    <div className="crm-scroll overflow-x-auto">
      <table className="crm-table w-full min-w-[640px]">
        <thead>
          <tr>
            <th>When</th>
            <th>Product</th>
            <th>What</th>
            <th>Change</th>
            <th>Why</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((h) => {
            const up = (h.new_value ?? 0) > (h.old_value ?? 0);
            const fmt = (v: number | null) => (v === null ? "—" : money && h.field !== "stock" ? inr(v) : String(v));
            return (
              <motion.tr key={h.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: EASE }}>
                <td className="whitespace-nowrap text-xs crm-muted">{fmtDateTime(h.created_at)}</td>
                <td className="text-sm">
                  {h.products?.name ?? "Deleted product"}
                  {h.products?.sku && <span className="block text-[0.7rem] crm-muted">{h.products.sku}</span>}
                </td>
                <td className="text-sm">{FIELD_NAME[h.field] ?? h.field}</td>
                <td className="whitespace-nowrap text-sm">
                  <span className="crm-muted">{fmt(h.old_value)}</span> → <b style={{ color: up ? "var(--crm-success)" : "#ef6b6b" }}>{fmt(h.new_value)}</b>
                </td>
                <td className="text-xs crm-muted">{h.reason}</td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function History() {
  const { data, loading } = useLoad(() => fetchHistory(["price", "compare_at_price", "cost_price"], 300));
  return <Panel title="Price history" icon={ICONS.clock} subtitle="Every price, MRP and cost change — newest first">{loading || !data ? <Skeleton className="h-64" /> : <HistoryTable rows={data} money />}</Panel>;
}

