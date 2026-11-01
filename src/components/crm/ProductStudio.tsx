"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { COLOR_PRESETS, SIZE_OPTIONS, inr, slugify, type Category, type Color, type CreativeSettings, type Product, type ProductImage } from "@/lib/data/types";
import { CreativeDesign, CreativeFraming, CreativeGallery, buildSources, useBitmaps, useCreativePreviews, type Faces } from "./CreativePanel";
import { canvasBlob, defaultSettings, loadCreativeFonts, mergeSettings, renderAll } from "./creative";
import { db, dominantColor, fetchCategories, fetchProduct, must, nearestColor, removeMedia, revalidateSite, uploadBlob, uploadMedia, useLoad } from "./data";
import { Area, Badge, EASE, Field, ICONS, Icon, PageHeader, Panel, Select, Skeleton, Tabs, toast } from "./ui";

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

type Step = "photos" | "details" | "design" | "framing";
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
    (product?.images ?? [])
      .filter((im) => im.kind !== "creative")
      .sort((a, b) => a.position - b.position)
      .map((im) => ({ key: im.id, id: im.id, url: im.url, path: im.storage_path ?? null, width: im.width, height: im.height })),
  );
  const [saved, setSaved] = useState<Photo[]>(photos);
  const [creatives, setCreatives] = useState<ProductImage[]>(() => (product?.images ?? []).filter((im) => im.kind === "creative"));
  const initialCat = categories.find((c) => c.id === (product?.category_id ?? defaultCat));
  const [cs, setCs] = useState<CreativeSettings>(() => mergeSettings(product?.creative, defaultSettings(initialCat?.slug, initialCat?.name)));
  const [faces, setFaces] = useState<Faces>({});
  const bitmaps = useBitmaps();
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
  const [progress, setProgress] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [custom, setCustom] = useState({ name: "", hex: "#C9A13B" });
  const set = (p: Partial<Details>) => setD((x) => ({ ...x, ...p }));
  const category = categories.find((c) => c.id === d.category_id);

  useEffect(() => () => photos.forEach((p) => p.file && URL.revokeObjectURL(p.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [tab, setTab] = useState<Step>(product ? "details" : "photos");
  const [framePhoto, setFramePhoto] = useState<string | null>(null);
  const { previews, rendering, detecting } = useCreativePreviews({ photos, settings: cs, faces, setFaces, colors: d.colors, sizes: d.sizes, getBitmap: bitmaps.get });

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
        features: cs.features.slice(0, 6),
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
      // Temporary keys of new photos become their ids — carry framing, faces and decoded bitmaps over.
      const renamed: Record<string, string> = {};
      photos.forEach((p, i) => {
        if (p.key !== final[i].key) renamed[p.key] = final[i].key;
      });
      Object.entries(renamed).forEach(([from, to]) => bitmaps.rename(from, to));
      const framing = Object.fromEntries(Object.entries(cs.framing).filter(([k]) => final.some((p) => p.key === (renamed[k] ?? k))).map(([k, v]) => [renamed[k] ?? k, v]));
      const skip = cs.skip.map((x) => (x.startsWith("single:") && renamed[x.slice(7)] ? `single:${renamed[x.slice(7)]}` : x));
      const nextCs: CreativeSettings = { ...cs, framing, skip };
      const nextFaces: Faces = Object.fromEntries(Object.entries(faces).map(([k, v]) => [renamed[k] ?? k, v]));

      // Branded creatives: render full size, replace the previous set.
      setProgress("Generating creatives…");
      const made: ProductImage[] = [];
      const fresh = final.map((p) => ({ key: p.key, url: p.url, file: undefined as File | undefined }));
      if (final.length && (nextCs.combo || nextCs.singles)) {
        await loadCreativeFonts();
        const sources = await buildSources(fresh, nextCs, nextFaces, bitmaps.get);
        const items = renderAll({ sources, settings: nextCs, colors: d.colors, sizes: d.sizes }).filter((r) => !nextCs.skip.includes(r.id));
        for (const [i, r] of items.entries()) {
          const blob = await canvasBlob(r.canvas);
          const up = await uploadBlob(`products/${pid}/creatives`, blob, r.canvas.width, r.canvas.height);
          const ins = must(
            await client
              .from("product_images")
              .insert({ product_id: pid, url: up.url, storage_path: up.path, position: 100 + i, width: up.width, height: up.height, kind: "creative" })
              .select("id")
              .single(),
          ) as { id: string };
          made.push({ id: ins.id, url: up.url, storage_path: up.path, position: 100 + i, width: up.width, height: up.height, kind: "creative" });
        }
      }
      if (creatives.length) {
        must(await client.from("product_images").delete().in("id", creatives.map((c) => c.id)).select("id"));
        await removeMedia(creatives.map((c) => c.storage_path ?? "").filter(Boolean));
      }
      must(await client.from("products").update({ creative: nextCs }).eq("id", pid).select("id"));
      setCreatives(made);
      setCs(nextCs);
      setFaces(nextFaces);

      photos.forEach((p) => p.file && URL.revokeObjectURL(p.url));
      setPhotos(final);
      setSaved(final);
      setStatus(target);
      set({ slug: row.slug });
      await revalidateSite();
      const n = made.length;
      toast(target === "live" ? `Published — live on the website${n ? ` with ${n} creative${n > 1 ? "s" : ""}` : ""}` : `Saved as draft${n ? ` · ${n} creative${n > 1 ? "s" : ""} ready` : ""}`);
      if (!id && pid) {
        setId(pid);
        window.history.replaceState(null, "", `/admin/studio?id=${pid}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not save";
      toast(msg.includes("products_slug_key") ? "Another product already uses this web address — change it in Details" : msg, "error");
    } finally {
      setBusy(null);
      setProgress("");
    }
  }

  async function remove() {
    if (!id || !window.confirm(`Delete “${d.name}” and all its photos? This can’t be undone.`)) return;
    setBusy("delete");
    try {
      await removeMedia([...saved.map((p) => p.path ?? ""), ...creatives.map((c) => c.storage_path ?? "")].filter(Boolean));
      must(await db().from("products").delete().eq("id", id).select("id"));
      await revalidateSite();
      toast("Product deleted");
      router.push("/admin/products");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not delete", "error");
      setBusy(null);
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const done: Record<Step, boolean> = { photos: photos.length > 0, details: Boolean(d.name && d.price > 0), design: previews.length > 0, framing: false };
  const STEP_LIST: { value: Step; label: string; icon: string }[] = [
    { value: "photos", label: "1 · Photos", icon: ICONS.upload },
    { value: "details", label: "2 · Details", icon: ICONS.draft },
    { value: "design", label: "3 · Design", icon: ICONS.sparkle },
    { value: "framing", label: "4 · Framing", icon: ICONS.image },
  ];
  const next = (t: Step, label: string) => (
    <button type="button" onClick={() => setTab(t)} className="crm-btn mt-5 w-full justify-center">
      {label} <Icon d={ICONS.arrow} />
    </button>
  );

  const photosStep = (
    <>
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
        className="flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed px-5 py-5 transition-colors"
        style={{ borderColor: dragOver ? "var(--crm-accent)" : "var(--crm-border)", background: dragOver ? "color-mix(in srgb, var(--crm-accent) 8%, transparent)" : undefined }}
      >
        <motion.span animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 2.4 }} className="crm-accent">
          <Icon d={ICONS.upload} className="h-8 w-8" />
        </motion.span>
        <span>
          <span className="crm-serif block text-lg">Drop raw photos or click</span>
          <span className="block text-xs crm-muted">Main (back view) first · then side angles · then close-ups</span>
        </span>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
      </div>

      {photos.length > 0 && (
        <ul className="mt-4 grid grid-cols-4 gap-2">
          <AnimatePresence>
            {photos.map((p, i) => (
              <motion.li key={p.key} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className={`group relative overflow-hidden rounded-xl ${i === 0 ? "col-span-2 row-span-2" : ""}`} style={{ boxShadow: `0 0 0 ${i === 0 ? 2 : 1}px var(--crm-accent)` }}>
                <div className="aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt="" className="h-full w-full object-cover" />
                </div>
                <span className="absolute left-1 top-1 rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold uppercase" style={{ background: i === 0 ? "var(--crm-accent)" : "rgba(0,0,0,.65)", color: i === 0 ? "var(--crm-accent-ink)" : "#fff" }}>
                  {ROLE(i)}
                </span>
                <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/75 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button type="button" title="Move left" onClick={() => move(i, i - 1)} className="px-1 text-white">
                    ←
                  </button>
                  {i > 0 && (
                    <button type="button" onClick={() => move(i, 0)} className="text-[0.55rem] font-semibold text-[#f0d38a]">
                      Main
                    </button>
                  )}
                  <button type="button" title="Remove" onClick={() => setPhotos((l) => l.filter((x) => x.key !== p.key))} className="px-1 text-[#ff9b9b]">
                    ✕
                  </button>
                  <button type="button" title="Move right" onClick={() => move(i, i + 1)} className="px-1 text-white">
                    →
                  </button>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {photos.length > 0 && (
        <div className="crm-panel-soft mt-4 flex items-center justify-between gap-3 p-3 text-sm">
          {analysis ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full" style={{ background: analysis.color.hex }} /> Colour detected: <b>{analysis.color.name}</b>
            </span>
          ) : (
            <span className="crm-muted">Name and colour are suggested automatically.</span>
          )}
          <button type="button" onClick={() => void analyze(photos, true)} className="crm-chip">
            <Icon d={ICONS.sparkle} className="h-3.5 w-3.5" /> {analysis ? "Redo" : "Analyze"}
          </button>
        </div>
      )}
      {photos.length > 0 && next("details", "Next: details")}
    </>
  );

  const detailsStep = (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Product name *" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Rani Pink Pearl Scallop Blouse" className="sm:col-span-2" />
        <Field label="Price (₹) *" type="number" min={0} value={d.price || ""} onChange={(e) => set({ price: Number(e.target.value) })} placeholder="1999" />
        <Field label="MRP (₹) · shows % off" type="number" min={0} value={d.compare_at_price || ""} onChange={(e) => set({ compare_at_price: Number(e.target.value) })} placeholder="2499" />
        <Select
          label="Category *"
          value={d.category_id}
          onChange={(e) => {
            set({ category_id: e.target.value });
            const c = categories.find((x) => x.id === e.target.value);
            const def = defaultSettings(c?.slug, c?.name);
            setCs((x) => ({ ...x, brandLine: def.brandLine, titleTop: def.titleTop, titleBottom: def.titleBottom, tagline: def.tagline, features: def.features }));
          }}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.is_visible ? "" : " (hidden)"}
            </option>
          ))}
        </Select>
        <Field label="Stock" type="number" min={0} value={d.stock || ""} onChange={(e) => set({ stock: Number(e.target.value) })} placeholder="0" />
        <Field label="Short line" value={d.subtitle} onChange={(e) => set({ subtitle: e.target.value })} className="sm:col-span-2" placeholder="Designer blouse with pearl-scallop sleeves" />
        <Area label="Description" rows={3} value={d.description} onChange={(e) => set({ description: e.target.value })} className="sm:col-span-2" />
      </div>

      <div className="mt-4">
        <span className="crm-label">Colours {d.colors.length > 0 && <span className="crm-muted normal-case">· {d.colors.map((c) => c.name).join(", ")}</span>}</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {[...COLOR_PRESETS, ...d.colors.filter((c) => !COLOR_PRESETS.some((p) => p.name === c.name))].map((c) => {
            const on = d.colors.some((x) => x.name === c.name);
            return (
              <button
                key={c.name}
                type="button"
                title={c.name}
                aria-pressed={on}
                onClick={() => set({ colors: on ? d.colors.filter((x) => x.name !== c.name) : [...d.colors, c] })}
                className="relative h-8 w-8 rounded-full transition-transform hover:scale-110"
                style={{ background: c.hex, boxShadow: on ? "0 0 0 2px var(--crm-panel), 0 0 0 4px var(--crm-accent)" : "inset 0 0 0 1px rgba(255,255,255,.2)" }}
              >
                {on && <Icon d={ICONS.check} className="absolute inset-0 m-auto h-4 w-4 text-white mix-blend-difference" />}
              </button>
            );
          })}
          <span className="flex items-center gap-1">
            <input type="color" value={custom.hex} onChange={(e) => setCustom((x) => ({ ...x, hex: e.target.value }))} className="h-8 w-8 cursor-pointer rounded-full border-0 bg-transparent" aria-label="Pick colour" />
            <input value={custom.name} onChange={(e) => setCustom((x) => ({ ...x, name: e.target.value }))} placeholder="Own colour" className="crm-input h-8 w-28 py-1 text-xs" />
            <button
              type="button"
              className="crm-chip"
              onClick={() => {
                const name = custom.name.trim();
                if (!name || d.colors.some((x) => x.name === name)) return;
                set({ colors: [...d.colors, { name, hex: custom.hex.toUpperCase() }] });
                setCustom((x) => ({ ...x, name: "" }));
              }}
            >
              +
            </button>
          </span>
        </div>
      </div>

      <div className="mt-4">
        <span className="crm-label">Sizes</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SIZE_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              data-on={d.sizes.includes(s)}
              onClick={() => set({ sizes: d.sizes.includes(s) ? d.sizes.filter((x) => x !== s) : SIZE_OPTIONS.filter((o) => o === s || d.sizes.includes(o)) })}
              className="crm-chip min-w-10 justify-center"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm crm-accent">SKU & web address</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="SKU" value={d.sku} onChange={(e) => set({ sku: e.target.value })} placeholder="SV-BL-001" />
          <Field label="Web address" value={d.slug} onChange={(e) => set({ slug: e.target.value })} placeholder="made from the name" />
        </div>
      </details>
      {next("design", "Next: creative design")}
    </>
  );

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        section="Product Studio"
        subtitle={id ? `Editing · ${d.name}` : "Raw photos → shop-ready product in 4 steps"}
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

      <Tabs
        value={tab}
        onChange={setTab}
        options={STEP_LIST.map((x) => ({
          value: x.value,
          icon: done[x.value] ? ICONS.check : x.icon,
          label: x.label,
        }))}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(340px,440px)_minmax(0,1fr)]">
        <AnimatePresence mode="wait">
          <motion.section key={tab} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.3, ease: EASE }} className="crm-panel min-w-0 p-5">
            {tab === "photos" && photosStep}
            {tab === "details" && detailsStep}
            {tab === "design" && (
              <>
                <CreativeDesign settings={cs} onChange={setCs} />
                {next("framing", "Next: photo framing")}
              </>
            )}
            {tab === "framing" && <CreativeFraming photos={photos} settings={cs} onChange={setCs} faces={faces} active={framePhoto} setActive={setFramePhoto} />}
          </motion.section>
        </AnimatePresence>

        <div className="min-w-0 lg:sticky lg:top-[88px]">
          <CreativeGallery
            previews={previews}
            settings={cs}
            onChange={setCs}
            rendering={rendering}
            detecting={detecting}
            hasPhotos={photos.length > 0}
            onPickPhoto={(k) => {
              setFramePhoto(k);
              setTab("framing");
            }}
          />
        </div>
      </div>

      {/* Approve & publish */}
      <div className="crm-panel sticky bottom-4 z-20 flex flex-wrap items-center gap-3 p-3">
        <span className="hidden text-sm crm-muted md:block">
          {d.name || "Untitled"} · {d.price > 0 ? inr(d.price) : "no price yet"} · {photos.length} photos · {previews.filter((p) => !cs.skip.includes(p.id)).length} creatives
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          {id && (
            <button type="button" onClick={() => void remove()} disabled={Boolean(busy)} className="crm-btn crm-btn-danger">
              <Icon d={ICONS.trash} /> Delete
            </button>
          )}
          <button type="button" onClick={() => void save("draft")} disabled={Boolean(busy)} className="crm-btn">
            <Icon d={ICONS.draft} /> {busy === "draft" ? progress || "Saving…" : status === "live" ? "Unpublish (draft)" : "Save draft"}
          </button>
          <button type="button" onClick={() => void save("live")} disabled={Boolean(busy)} className="crm-btn crm-btn-wine">
            <Icon d={ICONS.check} /> {busy === "live" ? progress || "Publishing…" : status === "live" ? "Update live product" : "Approve & publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
