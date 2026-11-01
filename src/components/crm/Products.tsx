"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { inr, slugify, type Category, type Product, type ProductStatus } from "@/lib/data/types";
import { db, fetchCategories, fetchProducts, must, removeMedia, revalidateSite, useLoad } from "./data";
import { Badge, EASE, Empty, ICONS, Icon, Kpi, PageHeader, Panel, Select, Skeleton, Toggle, toast } from "./ui";

const PAGE = 12;
type Sort = "newest" | "price-asc" | "price-desc" | "name";

export function Products({ initialQuery = "", initialStatus = "all" }: { initialQuery?: string; initialStatus?: string }) {
  const router = useRouter();
  const { data, setData, loading, reload } = useLoad(async () => {
    const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);
    return { products, categories };
  });
  const [q, setQ] = useState(initialQuery);
  const [status, setStatus] = useState<ProductStatus | "all">((["live", "draft", "archived"].includes(initialStatus) ? initialStatus : "all") as ProductStatus | "all");
  const [cat, setCat] = useState("all");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!data) return [];
    const t = q.trim().toLowerCase();
    const list = data.products.filter(
      (p) =>
        (status === "all" || p.status === status) &&
        (cat === "all" || p.category_id === cat) &&
        (!min || p.price >= Number(min)) &&
        (!max || p.price <= Number(max)) &&
        (!t || p.name.toLowerCase().includes(t) || (p.sku ?? "").toLowerCase().includes(t) || p.slug.includes(t)),
    );
    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") sorted.sort((a, b) => b.price - a.price);
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    return sorted;
  }, [data, q, status, cat, min, max, sort]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader section="Products" subtitle="Manage your blouse catalogue and publishing across the shop" />
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  const { products, categories } = data;
  const count = (s: ProductStatus) => products.filter((p) => p.status === s).length;
  const low = products.filter((p) => p.status === "live" && p.stock < 5).length;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const shown = filtered.slice((Math.min(page, pages) - 1) * PAGE, Math.min(page, pages) * PAGE);
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "—";

  async function setStatusFor(ids: string[], to: ProductStatus) {
    const ok = to === "live" ? ids.filter((id) => (products.find((p) => p.id === id)?.price ?? 0) > 0) : ids;
    if (to === "live" && ok.length < ids.length) toast(`${ids.length - ok.length} without a price stayed in drafts`, "error");
    if (!ok.length) return;
    try {
      must(await db().from("products").update({ status: to }).in("id", ok).select("id"));
      setData((x) => (x ? { ...x, products: x.products.map((p) => (ok.includes(p.id) ? { ...p, status: to } : p)) } : x));
      setSel(new Set());
      await revalidateSite();
      toast(to === "live" ? "Published" : to === "draft" ? "Moved to drafts" : "Archived");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not update", "error");
    }
  }

  async function removeProducts(ids: string[]) {
    if (!window.confirm(`Delete ${ids.length} product${ids.length > 1 ? "s" : ""} and their photos? This can’t be undone.`)) return;
    try {
      const paths = products.filter((p) => ids.includes(p.id)).flatMap((p) => p.images.map((i) => i.storage_path ?? "").filter(Boolean));
      must(await db().from("products").delete().in("id", ids).select("id"));
      await removeMedia(paths);
      setData((x) => (x ? { ...x, products: x.products.filter((p) => !ids.includes(p.id)) } : x));
      setSel(new Set());
      await revalidateSite();
      toast("Deleted");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not delete", "error");
    }
  }

  async function duplicate(p: Product) {
    try {
      const client = db();
      const copy = must(
        await client
          .from("products")
          .insert({
            name: `${p.name} (copy)`,
            slug: `${p.slug}-copy-${Math.random().toString(36).slice(2, 6)}`,
            category_id: p.category_id,
            subtitle: p.subtitle,
            description: p.description,
            price: p.price,
            compare_at_price: p.compare_at_price,
            colors: p.colors,
            sizes: p.sizes,
            features: p.features,
            stock: p.stock,
            status: "draft",
          })
          .select("id")
          .single(),
      ) as { id: string };
      if (p.images.length) {
        // The copy reuses the same files (no storage path, so deleting the copy never removes the originals' photos).
        must(await client.from("product_images").insert(p.images.map((im) => ({ product_id: copy.id, url: im.url, position: im.position, width: im.width, height: im.height }))).select("id"));
      }
      toast("Duplicated as a draft");
      router.push(`/admin/studio?id=${copy.id}`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not duplicate", "error");
    }
  }

  function exportCsv() {
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Name", "SKU", "Status", "Category", "Price", "MRP", "Stock", "Colours", "Sizes", "URL"],
      ...filtered.map((p) => [p.name, p.sku ?? "", p.status, catName(p.category_id), p.price, p.compare_at_price ?? "", p.stock, p.colors.map((c) => c.name).join("|"), p.sizes.join("|"), `/shop/${p.slug}`]),
    ];
    const blob = new Blob([rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `savlino-products-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const allOnPage = shown.length > 0 && shown.every((p) => sel.has(p.id));

  return (
    <div className="space-y-6">
      <PageHeader section="Products" subtitle="Manage your blouse catalogue and publishing across the shop" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Live Products" value={count("live")} icon={ICONS.products} onClick={() => setStatus("live")} />
        <Kpi label="Low Stock" value={low} icon={ICONS.warn} tone="wine" note="Live with fewer than 5 pieces" delay={0.08} />
        <Kpi label="Drafts" value={count("draft")} icon={ICONS.draft} onClick={() => setStatus("draft")} delay={0.16} />
        <Kpi label="Archived" value={count("archived")} icon={ICONS.archive} onClick={() => setStatus("archived")} delay={0.24} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Panel delay={0.1}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Icon d={ICONS.search} className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 crm-muted" />
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder='Search by name, SKU or style (e.g. "Pearl Scallop")'
                  className="crm-input !mt-0 pl-10"
                />
              </div>
              <Link href="/admin/studio" className="crm-btn crm-btn-gold">
                <Icon d={ICONS.plus} /> Add Product
              </Link>
              <button type="button" onClick={exportCsv} className="crm-btn">
                <Icon d={ICONS.upload} className="h-4 w-4 rotate-180" /> Export
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm crm-muted">Status:</span>
              {(["all", "live", "draft", "archived"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  data-on={status === s}
                  onClick={() => {
                    setStatus(s);
                    setPage(1);
                  }}
                  className="crm-chip capitalize"
                >
                  {s} ({s === "all" ? products.length : count(s)})
                </button>
              ))}
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
              <label className="block">
                <span className="crm-label">Price range (₹)</span>
                <span className="flex gap-2">
                  <input value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder="Min" className="crm-input" />
                  <input value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder="Max" className="crm-input" />
                </span>
              </label>
              <Select label="Sort by" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="newest">Newest first</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="name">Name A–Z</option>
              </Select>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setStatus("all");
                    setCat("all");
                    setMin("");
                    setMax("");
                    setSort("newest");
                  }}
                  className="crm-btn w-full"
                >
                  Clear filters
                </button>
              </div>
            </div>
          </Panel>

          <div className="crm-panel flex flex-wrap items-center gap-3 px-4 py-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allOnPage}
                onChange={() => setSel((s) => (allOnPage ? new Set([...s].filter((id) => !shown.some((p) => p.id === id))) : new Set([...s, ...shown.map((p) => p.id)])))}
                className="h-4 w-4 accent-[var(--crm-accent)]"
              />
              {sel.size} selected
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!sel.size} onClick={() => void setStatusFor([...sel], "live")} className="crm-btn">
                Publish
              </button>
              <button type="button" disabled={!sel.size} onClick={() => void setStatusFor([...sel], "draft")} className="crm-btn">
                Unpublish
              </button>
              <button type="button" disabled={!sel.size} onClick={() => void setStatusFor([...sel], "archived")} className="crm-btn">
                Archive
              </button>
              <button type="button" disabled={!sel.size} onClick={() => void removeProducts([...sel])} className="crm-btn crm-btn-danger">
                Delete
              </button>
            </div>
            <span className="ml-auto text-sm crm-muted">{filtered.length} products</span>
          </div>

          {shown.length === 0 ? (
            <Panel>
              <Empty icon={ICONS.products} title={products.length ? "Nothing matches these filters" : "No products yet"}>
                {products.length ? "Try clearing the filters." : (
                  <Link href="/admin/studio" className="crm-accent underline-offset-4 hover:underline">
                    Upload raw photos in Product Studio →
                  </Link>
                )}
              </Empty>
            </Panel>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              <AnimatePresence>
                {shown.map((p, i) => (
                  <motion.li key={p.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04, duration: 0.45, ease: EASE }} className="crm-panel group overflow-hidden">
                    <div className="relative aspect-[16/10] overflow-hidden" style={{ background: "var(--crm-wash)" }}>
                      {p.images[0] ? (
                        <Image src={p.images[0].url} alt={p.name} fill sizes="(min-width: 1536px) 22vw, (min-width: 640px) 40vw, 90vw" className="object-cover transition-transform duration-700 group-hover:scale-105" style={{ objectPosition: "30% 40%" }} />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-sm crm-muted">No photo</span>
                      )}
                      <input
                        type="checkbox"
                        checked={sel.has(p.id)}
                        onChange={() => setSel((s) => {
                          const n = new Set(s);
                          if (n.has(p.id)) n.delete(p.id);
                          else n.add(p.id);
                          return n;
                        })}
                        className="absolute left-3 top-3 h-5 w-5 accent-[var(--crm-accent)]"
                        aria-label={`Select ${p.name}`}
                      />
                      <span className="absolute right-3 top-3">
                        <Badge status={p.status} />
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="crm-serif truncate text-lg">{p.name}</p>
                      <p className="text-[0.72rem] crm-muted">
                        {p.sku ? `SKU: ${p.sku} · ` : ""}
                        {catName(p.category_id)}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-lg font-semibold crm-accent">{p.price > 0 ? inr(p.price) : "No price"}</span>
                        <span className={`text-xs ${p.stock < 5 ? "text-[var(--crm-danger)]" : "crm-muted"}`}>Stock: {p.stock}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span className="text-[0.7rem] crm-muted">Colours:</span>
                        {p.colors.slice(0, 6).map((c) => (
                          <span key={c.name} title={c.name} className="h-3.5 w-3.5 rounded-full ring-1 ring-white/20" style={{ background: c.hex }} />
                        ))}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <span className="text-[0.7rem] crm-muted">Sizes:</span>
                        {p.sizes.slice(0, 7).map((s) => (
                          <span key={s} className="rounded-full border px-1.5 text-[0.62rem]" style={{ borderColor: "var(--crm-border-soft)" }}>
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="relative mt-4 flex gap-1.5">
                        {p.status === "live" ? (
                          <a href={`/shop/${p.slug}`} target="_blank" rel="noreferrer" className="crm-btn flex-1 px-2 py-1.5 text-xs">
                            <Icon d={ICONS.eye} /> Preview
                          </a>
                        ) : (
                          <button type="button" onClick={() => void setStatusFor([p.id], "live")} className="crm-btn flex-1 px-2 py-1.5 text-xs">
                            <Icon d={ICONS.check} /> Publish
                          </button>
                        )}
                        <Link href={`/admin/studio?id=${p.id}`} className="crm-btn flex-1 px-2 py-1.5 text-xs">
                          <Icon d={ICONS.edit} /> Edit
                        </Link>
                        <button type="button" onClick={() => void duplicate(p)} className="crm-btn flex-1 px-2 py-1.5 text-xs">
                          <Icon d={ICONS.copy} /> Duplicate
                        </button>
                        <button type="button" onClick={() => setMenu(menu === p.id ? null : p.id)} className="crm-btn px-2 py-1.5 text-xs" aria-label="More">
                          ⋯
                        </button>
                        <AnimatePresence>
                          {menu === p.id && (
                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="crm-panel absolute bottom-10 right-0 z-10 w-44 p-1.5" onMouseLeave={() => setMenu(null)}>
                              {p.status === "live" && <MenuItem onClick={() => void setStatusFor([p.id], "draft")}>Unpublish</MenuItem>}
                              {p.status !== "archived" && <MenuItem onClick={() => void setStatusFor([p.id], "archived")}>Archive</MenuItem>}
                              {p.status === "archived" && <MenuItem onClick={() => void setStatusFor([p.id], "draft")}>Restore to drafts</MenuItem>}
                              <MenuItem danger onClick={() => void removeProducts([p.id])}>
                                Delete
                              </MenuItem>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          {pages > 1 && (
            <div className="flex items-center justify-center gap-1.5">
              <button type="button" className="crm-btn px-3" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ‹
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button key={n} type="button" onClick={() => setPage(n)} className={`crm-btn px-3 ${n === page ? "crm-btn-gold" : ""}`}>
                  {n}
                </button>
              ))}
              <button type="button" className="crm-btn px-3" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                ›
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Products Summary" icon={ICONS.chart} delay={0.15}>
            <dl className="space-y-2.5 text-sm">
              {[
                ["Live products", count("live")],
                ["Low stock (< 5)", low],
                ["Drafts", count("draft")],
                ["Archived", count("archived")],
                ["Total", products.length],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="crm-muted">{k}</dt>
                  <dd className="font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <CategoriesPanel categories={categories} products={products} onChange={() => void reload()} />
          <Panel title="Quick Actions" icon={ICONS.bolt} delay={0.25}>
            <div className="grid gap-2">
              <Link href="/admin/studio" className="crm-btn crm-btn-gold">
                <Icon d={ICONS.plus} /> Add Product
              </Link>
              <button type="button" onClick={exportCsv} className="crm-btn">
                Export product list (CSV)
              </button>
              <Link href="/shop" target="_blank" rel="noreferrer" className="crm-btn">
                <Icon d={ICONS.external} /> Preview shop
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--crm-panel-2)]" style={danger ? { color: "var(--crm-danger)" } : undefined}>
      {children}
    </button>
  );
}

function CategoriesPanel({ categories, products, onChange }: { categories: Category[]; products: Product[]; onChange: () => void }) {
  const [adding, setAdding] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");

  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      await revalidateSite();
      toast(ok);
      onChange();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save";
      toast(msg.includes("categories_slug_key") ? "A category with this name already exists" : msg, "error");
    }
  }

  const add = () => {
    const n = adding.trim();
    if (!n) return;
    void run(async () => {
      must(await db().from("categories").insert({ name: n, slug: slugify(n), sort_order: categories.length + 1, is_visible: true }).select("id"));
      setAdding("");
    }, "Category added and shown on the website");
  };

  return (
    <Panel title="Categories" icon={ICONS.layers} delay={0.2}>
      <ul className="space-y-1.5">
        {categories.map((c) => {
          const n = products.filter((p) => p.category_id === c.id).length;
          return (
            <li key={c.id} className="crm-panel-soft flex items-center gap-2 px-3 py-2">
              {editing === c.id ? (
                <form
                  className="flex flex-1 gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void run(async () => {
                      must(await db().from("categories").update({ name: name.trim() || c.name }).eq("id", c.id).select("id"));
                      setEditing(null);
                    }, "Renamed");
                  }}
                >
                  <input value={name} onChange={(e) => setName(e.target.value)} className="crm-input !mt-0 py-1.5" autoFocus />
                  <button type="submit" className="crm-btn px-2 py-1.5">
                    <Icon d={ICONS.check} />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    setEditing(c.id);
                    setName(c.name);
                  }}
                  title="Rename"
                >
                  <span className={`block truncate text-sm ${c.is_visible ? "" : "crm-muted line-through"}`}>{c.name}</span>
                  <span className="text-[0.66rem] crm-muted">
                    {n} products{c.is_featured ? " · featured" : ""}
                  </span>
                </button>
              )}
              <button
                type="button"
                title={c.is_featured ? "Featured on homepage" : "Feature on homepage"}
                onClick={() => void run(async () => must(await db().from("categories").update({ is_featured: !c.is_featured }).eq("id", c.id).select("id")), c.is_featured ? "Unfeatured" : "Featured")}
                className={c.is_featured ? "crm-accent" : "crm-muted"}
              >
                ★
              </button>
              <Toggle checked={c.is_visible} onChange={(v) => void run(async () => must(await db().from("categories").update({ is_visible: v }).eq("id", c.id).select("id")), v ? "Shown on the website" : "Hidden from the website")} />
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex gap-2">
        <input value={adding} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="New category, e.g. Lehengas" className="crm-input !mt-0" />
        <button type="button" onClick={add} className="crm-btn crm-btn-gold px-3">
          <Icon d={ICONS.plus} />
        </button>
      </div>
      <p className="mt-2 text-[0.7rem] crm-muted">Toggle = shown on the website · ★ = featured on the homepage · click a name to rename.</p>
    </Panel>
  );
}
