"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ProductCreative } from "@/components/store/ProductCreative";
import { COLOR_PRESETS, SIZE_OPTIONS, inr, slugify, type Category, type Color, type Product } from "@/lib/data/types";
import { db, dominantColor, fetchCategories, fetchProduct, must, nearestColor, removeMedia, revalidateSite, uploadMedia, useLoad } from "./data";
import { Area, Badge, EASE, Field, ICONS, Icon, PageHeader, Panel, Select, Skeleton, toast } from "./ui";

type Photo = { key: string; url: string; file?: File; id?: string; path?: string | null; width: number | null; height: number | null };

type Details = {
  name: string;
  slug: string;
  sku: string;
  category_id: string;
  subtitle: string;
  description: string;
  price: number;
  compare_at_price: number;
  colors: Color[];
  sizes: string[];
  features: string;
  stock: number;
};

const STEPS = ["Raw Upload", "Auto Analyze", "Details", "Creative Preview", "Approve & Publish"];
const ROLE = (i: number) => (i === 0 ? "Main" : i < 3 ? "Side" : i < 7 ? "Detail" : "Extra");
const FEATURES_BY_CATEGORY: Record<string, string[]> = {
  "designer-blouses": ["Premium Fabric", "Fine Stitching", "Perfect Fit"],
  "ready-made-blouses": ["Premium Fabric", "Ready to Wear", "Perfect Fit"],
  sarees: ["Pure Weave", "Fall & Pico Ready", "Blouse Piece Included"],
};
const singular = (w: string) => (/ies$/i.test(w) ? `${w.slice(0, -3)}y` : /(ss|us)$/i.test(w) ? w : /s$/i.test(w) ? w.slice(0, -1) : w);

const blank = (categoryId: string): Details => ({
  name: "",
  slug: "",
  sku: "",
  category_id: categoryId,
  subtitle: "",
  description: "",
  price: 0,
  compare_at_price: 0,
  colors: [],
  sizes: ["S", "M", "L", "XL", "XXL"],
  features: "Premium Fabric, Fine Stitching, Perfect Fit",
  stock: 0,
});

export function ProductStudio({ productId }: { productId: string | null }) {
  const router = useRouter();
  const { data, loading } = useLoad(async () => {
    const [categories, product] = await Promise.all([fetchCategories(), productId ? fetchProduct(productId) : Promise.resolve(null)]);
    return { categories, product };
  }, [productId]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader section="Product Studio" subtitle="Turn raw blouse photos into shop-ready products" />
        <Skeleton className="h-[520px]" />
      </div>
    );
  }
  if (productId && !data.product) {
    return (
      <div className="space-y-6">
        <PageHeader section="Product Studio" />
        <Panel>
          <p className="crm-muted">This product no longer exists.</p>
          <button type="button" className="crm-btn mt-4" onClick={() => router.push("/admin/studio")}>
            Start a new product
          </button>
        </Panel>
      </div>
    );
  }
  return <Studio key={data.product?.id ?? "new"} categories={data.categories} product={data.product} />;
}

function Studio({ categories, product }: { categories: Category[]; product: Product | null }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const defaultCat = categories.find((c) => c.slug === "designer-blouses")?.id ?? categories[0]?.id ?? "";
  const [id, setId] = useState<string | null>(product?.id ?? null);
  const [status, setStatus] = useState(product?.status ?? "draft");
  const [photos, setPhotos] = useState<Photo[]>(() =>
    (product?.images ?? []).map((im) => ({ key: im.id, id: im.id, url: im.url, path: im.storage_path ?? null, width: im.width, height: im.height })),
  );
  const [saved, setSaved] = useState<Photo[]>(photos);
  const [d, setD] = useState<Details>(() =>
    product
      ? {
          name: product.name,
          slug: product.slug,
          sku: product.sku ?? "",
          category_id: product.category_id ?? defaultCat,
          subtitle: product.subtitle,
          description: product.description,
          price: product.price,
          compare_at_price: product.compare_at_price ?? 0,
          colors: product.colors,
          sizes: product.sizes,
          features: product.features.join(", "),
          stock: product.stock,
        }
      : blank(defaultCat),
  );
  const [analysis, setAnalysis] = useState<{ hex: string; color: Color } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [custom, setCustom] = useState({ name: "", hex: "#C9A13B" });
  const set = (p: Partial<Details>) => setD((x) => ({ ...x, ...p }));
  const category = categories.find((c) => c.id === d.category_id);

  useEffect(() => () => photos.forEach((p) => p.file && URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const step = useMemo(() => {
    if (status === "live") return 5;
    if (photos.length === 0) return 0;
    if (!analysis && !product) return 1;
    if (!d.name || d.price <= 0) return 2;
    return 4;
  }, [photos.length, analysis, d.name, d.price, status, product]);

  async function analyze(list: Photo[] = photos, force = false) {
    const main = list[0];
    if (!main) return;
    try {
      const blob = main.file ?? (await (await fetch(main.url)).blob());
      const hex = await dominantColor(blob);
      const color = nearestColor(hex, COLOR_PRESETS);
      setAnalysis({ hex, color });
      const catName = singular((category?.name ?? "Designer Blouses").split(" ").slice(-1)[0] ?? "Blouse");
      const catLead = (category?.name ?? "Designer Blouses").split(" ").slice(0, -1).join(" ");
      setD((x) => {
        const name = force || !x.name ? `${color.name} ${catLead ? `${catLead} ` : ""}${catName}`.replace(/\s+/g, " ").trim() : x.name;
        return {
          ...x,
          name,
          slug: force || !x.slug ? slugify(name) : x.slug,
          colors: x.colors.length && !force ? x.colors : [color],
          features: force || !x.features ? (FEATURES_BY_CATEGORY[category?.slug ?? ""] ?? ["Premium Fabric", "Fine Stitching", "Perfect Fit"]).join(", ") : x.features,
          subtitle: x.subtitle || `Handcrafted ${catName.toLowerCase()} in ${color.name.toLowerCase()}`,
        };
      });
    } catch {
      // analysis is a helper only
    }
  }

  function addFiles(files: FileList | File[] | null) {
    if (!files) return;
    const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, 12);
    if (!list.length) return;
    const added: Photo[] = list.map((f) => ({ key: crypto.randomUUID(), url: URL.createObjectURL(f), file: f, width: null, height: null }));
    const next = [...photos, ...added];
    setPhotos(next);
    if (!analysis && !d.name) void analyze(next);
    toast(`${added.length} photo${added.length > 1 ? "s" : ""} added — arrange them, then save`);
  }

  const move = (i: number, to: number) =>
    setPhotos((list) => {
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      const [x] = next.splice(i, 1);
      next.splice(to, 0, x);
      return next;
    });

  async function save(target: "draft" | "live") {
    if (!d.name.trim()) return toast("Give the product a name", "error");
    if (!d.category_id) return toast("Choose a category", "error");
    if (target === "live" && d.price <= 0) return toast("Set a price before publishing", "error");
    if (target === "live" && photos.length === 0) return toast("Add at least one photo before publishing", "error");
    setBusy(target);
    try {
      const client = db();
      const row = {
        name: d.name.trim(),
        slug: slugify(d.slug || d.name),
        sku: d.sku.trim() || null,
        category_id: d.category_id,
        subtitle: d.subtitle.trim(),
        description: d.description.trim(),
        price: Math.max(0, Math.round(d.price)),
        compare_at_price: d.compare_at_price > d.price ? Math.round(d.compare_at_price) : null,
        colors: d.colors,
        sizes: d.sizes,
        features: d.features.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6),
        stock: Math.max(0, Math.round(d.stock)),
        status: target,
      };
      let pid = id;
      if (pid) must(await client.from("products").update(row).eq("id", pid).select("id"));
      else pid = (must(await client.from("products").insert(row).select("id").single()) as { id: string }).id;

      // Photos: delete removed, upload new, store order.
      const keep = new Set(photos.filter((p) => p.id).map((p) => p.id));
      const removed = saved.filter((p) => p.id && !keep.has(p.id));
      if (removed.length) {
        must(await client.from("product_images").delete().in("id", removed.map((p) => p.id as string)).select("id"));
        await removeMedia(removed.map((p) => p.path ?? "").filter(Boolean));
      }
      const final: Photo[] = [];
      for (const [i, p] of photos.entries()) {
        if (p.file) {
          const up = await uploadMedia(`products/${pid}`, p.file);
          const ins = must(
            await client.from("product_images").insert({ product_id: pid, url: up.url, storage_path: up.path, position: i, width: up.width, height: up.height }).select("id").single(),
          ) as { id: string };
          final.push({ key: ins.id, id: ins.id, url: up.url, path: up.path, width: up.width, height: up.height });
        } else {
          must(await client.from("product_images").update({ position: i }).eq("id", p.id as string).select("id"));
          final.push(p);
        }
      }
      photos.forEach((p) => p.file && URL.revokeObjectURL(p.url));
      setPhotos(final);
      setSaved(final);
      setStatus(target);
      set({ slug: row.slug });
      await revalidateSite();
      toast(target === "live" ? "Published — live on the website" : "Saved as draft");
      if (!id && pid) {
        setId(pid);
        window.history.replaceState(null, "", `/admin/studio?id=${pid}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save";
      toast(msg.includes("products_slug_key") ? "Another product already uses this web address — change it in Details" : msg, "error");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!id || !window.confirm(`Delete “${d.name}” and all its photos? This can’t be undone.`)) return;
    setBusy("delete");
    try {
      await removeMedia(saved.map((p) => p.path ?? "").filter(Boolean));
      must(await db().from("products").delete().eq("id", id).select("id"));
      await revalidateSite();
      toast("Product deleted");
      router.push("/admin/products");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not delete", "error");
      setBusy(null);
    }
  }

  const preview: Product = {
    id: id ?? "preview",
    slug: d.slug || "preview",
    sku: d.sku || null,
    name: d.name || "Your product",
    category_id: d.category_id,
    subtitle: d.subtitle,
    description: d.description,
    price: d.price,
    compare_at_price: d.compare_at_price || null,
    colors: d.colors,
    sizes: d.sizes,
    features: d.features.split(",").map((s) => s.trim()).filter(Boolean),
    stock: d.stock,
    status,
    sort_order: 0,
    created_at: new Date().toISOString(),
    images: photos.map((p, i) => ({ id: p.key, url: p.url, position: i, width: p.width, height: p.height })),
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        section="Product Studio"
        subtitle={id ? `Editing · ${d.name}` : "Turn raw blouse photos into shop-ready products"}
        actions={
          <>
            <Badge status={status} />
            {id && status === "live" && (
              <a href={`/shop/${d.slug}`} target="_blank" rel="noreferrer" className="crm-btn">
                <Icon d={ICONS.external} /> View on site
              </a>
            )}
            {id && (
              <button type="button" onClick={() => router.push("/admin/studio")} className="crm-btn">
                <Icon d={ICONS.plus} /> New product
              </button>
            )}
          </>
        }
      />

      {/* Stepper */}
      <Panel delay={0.05}>
        <ol className="flex flex-wrap items-center justify-between gap-3">
          {STEPS.map((s, i) => {
            const done = step > i;
            const current = step === i;
            return (
              <li key={s} className="flex flex-1 items-center gap-3">
                <motion.span
                  animate={current ? { scale: [1, 1.08, 1] } : { scale: 1 }}
                  transition={current ? { repeat: Infinity, duration: 2 } : undefined}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold"
                  style={{
                    borderColor: "var(--crm-accent)",
                    background: done ? "linear-gradient(180deg, var(--crm-accent-2), var(--crm-accent))" : current ? "color-mix(in srgb, var(--crm-accent) 15%, transparent)" : "transparent",
                    color: done ? "var(--crm-accent-ink)" : "var(--crm-accent)",
                  }}
                >
                  {done ? <Icon d={ICONS.check} /> : i + 1}
                </motion.span>
                <span className={`text-sm ${current ? "font-semibold" : "crm-muted"}`}>{s}</span>
                {i < STEPS.length - 1 && <span className="hidden h-px flex-1 md:block" style={{ background: done ? "var(--crm-accent)" : "var(--crm-border-soft)" }} />}
              </li>
            );
          })}
        </ol>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
        {/* 1–2. Upload, arrange, analyze */}
        <Panel title="Raw photos" icon={ICONS.upload} subtitle="1 main (back view) · 2 side angles · up to 4 close-up details" delay={0.1}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors"
            style={{ borderColor: dragOver ? "var(--crm-accent)" : "var(--crm-border)", background: dragOver ? "color-mix(in srgb, var(--crm-accent) 8%, transparent)" : undefined }}
          >
            <motion.span animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 2.4 }} className="crm-accent">
              <Icon d={ICONS.upload} className="h-8 w-8" />
            </motion.span>
            <p className="crm-serif text-lg">Drop raw photos here or click to choose</p>
            <p className="text-xs crm-muted">JPG / PNG / WebP — resized in your browser before upload</p>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          </div>

          {photos.length > 0 && (
            <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
              <AnimatePresence>
                {photos.map((p, i) => (
                  <motion.li key={p.key} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className={`group relative overflow-hidden rounded-xl ${i === 0 ? "col-span-2 row-span-2" : ""}`} style={{ boxShadow: `0 0 0 ${i === 0 ? 2 : 1}px var(--crm-accent)` }}>
                    <div className="aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.url} alt="" className="h-full w-full object-cover" />
                    </div>
                    <span className="absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase" style={{ background: i === 0 ? "var(--crm-accent)" : "rgba(0,0,0,.65)", color: i === 0 ? "var(--crm-accent-ink)" : "#fff" }}>
                      {ROLE(i)}
                    </span>
                    {p.file && <span className="absolute right-1.5 top-1.5 rounded-full bg-black/65 px-1.5 py-0.5 text-[0.55rem] text-white">new</span>}
                    <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/70 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button type="button" title="Move left" onClick={() => move(i, i - 1)} className="px-1.5 text-white">
                        ←
                      </button>
                      {i > 0 && (
                        <button type="button" onClick={() => move(i, 0)} className="text-[0.6rem] font-semibold text-[#f0d38a]">
                          Make main
                        </button>
                      )}
                      <button type="button" title="Remove" onClick={() => setPhotos((l) => l.filter((x) => x.key !== p.key))} className="px-1.5 text-[#ff9b9b]">
                        ✕
                      </button>
                      <button type="button" title="Move right" onClick={() => move(i, i + 1)} className="px-1.5 text-white">
                        →
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}

          <div className="crm-panel-soft mt-4 flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="flex items-center gap-3 text-sm">
              <Icon d={ICONS.sparkle} className="h-5 w-5 crm-accent" />
              {analysis ? (
                <span>
                  Auto analyzed: main colour{" "}
                  <span className="inline-flex items-center gap-1.5 align-middle">
                    <span className="h-4 w-4 rounded-full ring-1 ring-white/20" style={{ background: analysis.hex }} /> → <span className="h-4 w-4 rounded-full" style={{ background: analysis.color.hex }} />
                    <b>{analysis.color.name}</b>
                  </span>
                </span>
              ) : (
                <span className="crm-muted">Upload photos — colour, name and features are suggested automatically.</span>
              )}
            </div>
            <button type="button" disabled={!photos.length} onClick={() => void analyze(photos, true)} className="crm-btn">
              <Icon d={ICONS.sparkle} /> {analysis ? "Regenerate" : "Analyze"}
            </button>
          </div>
        </Panel>

        {/* 3. Details */}
        <Panel title="Product details" icon={ICONS.draft} delay={0.15}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name *" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Rani Pink Pearl Scallop Blouse" className="sm:col-span-2" />
            <Field label="Price (₹) *" type="number" min={0} value={d.price || ""} onChange={(e) => set({ price: Number(e.target.value) })} placeholder="1999" />
            <Field label="MRP (₹) — shows % off" type="number" min={0} value={d.compare_at_price || ""} onChange={(e) => set({ compare_at_price: Number(e.target.value) })} placeholder="2499" />
            <Select label="Category *" value={d.category_id} onChange={(e) => set({ category_id: e.target.value })}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.is_visible ? "" : " (hidden)"}
                </option>
              ))}
            </Select>
            <Field label="Stock" type="number" min={0} value={d.stock || ""} onChange={(e) => set({ stock: Number(e.target.value) })} placeholder="0" />
            <Field label="Short line" value={d.subtitle} onChange={(e) => set({ subtitle: e.target.value })} className="sm:col-span-2" placeholder="Designer blouse with pearl-scallop sleeves" />
            <Area label="Description" value={d.description} onChange={(e) => set({ description: e.target.value })} className="sm:col-span-2" />
            <Field label="Features (comma separated)" value={d.features} onChange={(e) => set({ features: e.target.value })} className="sm:col-span-2" />
            <Field label="SKU" value={d.sku} onChange={(e) => set({ sku: e.target.value })} placeholder="SV-BL-001" />
            <Field label="Web address" value={d.slug} onChange={(e) => set({ slug: e.target.value })} placeholder="made from the name" />
          </div>

          <div className="mt-5">
            <span className="crm-label">Colours</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {[...COLOR_PRESETS, ...d.colors.filter((c) => !COLOR_PRESETS.some((p) => p.name === c.name))].map((c) => {
                const on = d.colors.some((x) => x.name === c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    data-on={on}
                    onClick={() => set({ colors: on ? d.colors.filter((x) => x.name !== c.name) : [...d.colors, c] })}
                    className="crm-chip"
                  >
                    <span className="h-4 w-4 rounded-full ring-1 ring-white/20" style={{ background: c.hex }} />
                    {c.name}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-end gap-2">
              <Field label="Custom colour" value={custom.name} onChange={(e) => setCustom((x) => ({ ...x, name: e.target.value }))} placeholder="Wine" className="flex-1" />
              <input type="color" value={custom.hex} onChange={(e) => setCustom((x) => ({ ...x, hex: e.target.value }))} className="h-[42px] w-12 cursor-pointer rounded-lg border bg-transparent" style={{ borderColor: "var(--crm-border-soft)" }} aria-label="Pick colour" />
              <button
                type="button"
                className="crm-btn h-[42px]"
                onClick={() => {
                  const name = custom.name.trim();
                  if (!name || d.colors.some((x) => x.name === name)) return;
                  set({ colors: [...d.colors, { name, hex: custom.hex.toUpperCase() }] });
                  setCustom((x) => ({ ...x, name: "" }));
                }}
              >
                Add
              </button>
            </div>
          </div>

          <div className="mt-5">
            <span className="crm-label">Sizes</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {SIZE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  data-on={d.sizes.includes(s)}
                  onClick={() => set({ sizes: d.sizes.includes(s) ? d.sizes.filter((x) => x !== s) : SIZE_OPTIONS.filter((o) => o === s || d.sizes.includes(o)) })}
                  className="crm-chip min-w-11 justify-center"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* 4. Creative preview */}
      <Panel title="Creative preview" icon={ICONS.image} subtitle="Exactly how the product page arranges your photos" delay={0.2}>
        {photos.length > 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: EASE }}>
            <ProductCreative product={preview} categoryTitle={category?.name ?? "Designer Blouses"} />
          </motion.div>
        ) : (
          <p className="py-10 text-center crm-muted">Add photos to see the creative.</p>
        )}
      </Panel>

      {/* 5. Approve & publish */}
      <div className="crm-panel sticky bottom-4 z-20 flex flex-wrap items-center gap-3 p-3">
        <span className="hidden text-sm crm-muted md:block">
          {d.price > 0 ? inr(d.price) : "No price yet"} · {photos.length} photos · {d.colors.length} colours · {d.sizes.length} sizes
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {id && (
            <button type="button" onClick={() => void remove()} disabled={Boolean(busy)} className="crm-btn crm-btn-danger">
              <Icon d={ICONS.trash} /> Delete
            </button>
          )}
          <button type="button" onClick={() => void save("draft")} disabled={Boolean(busy)} className="crm-btn">
            <Icon d={ICONS.draft} /> {busy === "draft" ? "Saving…" : status === "live" ? "Unpublish (draft)" : "Save draft"}
          </button>
          <button type="button" onClick={() => void save("live")} disabled={Boolean(busy)} className="crm-btn crm-btn-wine">
            <Icon d={ICONS.check} /> {busy === "live" ? "Publishing…" : status === "live" ? "Update live product" : "Approve & publish"}
          </button>
        </div>
      </div>
    </div>
  );
}

