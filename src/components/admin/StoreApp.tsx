"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "@/lib/admin/store";
import { COLOR_PRESETS, ORDER_STATUSES, SIZE_OPTIONS, imageUrl, inr, type OrderStatus, type StoreColor, type StoreOrder, type StoreProduct } from "@/lib/store/types";
import { Card, NumberField, TextField, Toggle } from "./fields";
import { EASE, Icon } from "./ui";

type Category = { slug: string; title: string; enabled: boolean };
type Session = { admin: boolean; passwordSet: boolean; database: boolean };

const DEFAULT_FEATURES = ["Premium Fabric", "Fine Stitching", "Perfect Fit"];

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export function StoreApp({ categories }: { categories: Category[] }) {
  const [session, setSession] = useState<Session | null>(null);
  const [tab, setTab] = useState<"products" | "orders">("products");

  const refreshSession = useCallback(() => {
    api<Session>("/api/store/admin/session")
      .then(setSession)
      .catch(() => setSession({ admin: false, passwordSet: false, database: false }));
  }, []);
  useEffect(refreshSession, [refreshSession]);

  return (
    <div className="pb-24">
      <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.4em] text-gold">Website · Neon</p>
          <h1 className="mt-2 font-display text-4xl text-ivory md:text-5xl">Store</h1>
          <p className="mt-2 font-serif text-lg text-ivory/60">List products with photos, colours and sizes — and handle the orders customers place.</p>
        </div>
        {session?.admin && (
          <div className="flex items-center gap-3">
            <LayoutGroup id="store-tabs">
              <div className="flex border border-gold/20 p-0.5">
                {(["products", "orders"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTab(t)} className={`relative px-4 py-2 text-[0.6rem] uppercase tracking-[0.22em] ${tab === t ? "text-noir" : "text-ivory/55 hover:text-gold"}`}>
                    {tab === t && <motion.span layoutId="store-tab" className="absolute inset-0 bg-gold" />}
                    <span className="relative">{t}</span>
                  </button>
                ))}
              </div>
            </LayoutGroup>
            <button
              type="button"
              onClick={() => api("/api/store/admin/session", { method: "DELETE" }).then(refreshSession)}
              className="text-[0.58rem] uppercase tracking-[0.22em] text-ivory/45 hover:text-gold"
            >
              Sign out
            </button>
          </div>
        )}
      </motion.header>

      <div className="mt-8">
        {!session ? (
          <div className="h-60 animate-pulse border border-gold/10 bg-noir-soft/40" />
        ) : !session.database ? (
          <Notice title="Store database not connected">The Neon database isn’t linked to this deployment yet.</Notice>
        ) : !session.admin ? (
          <Login passwordSet={session.passwordSet} onDone={refreshSession} />
        ) : tab === "products" ? (
          <Products categories={categories} />
        ) : (
          <Orders />
        )}
      </div>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-xl">
      <Card title={title}>
        <p className="text-sm leading-relaxed text-ivory/60">{children}</p>
      </Card>
    </div>
  );
}

function Login({ passwordSet, onDone }: { passwordSet: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  if (!passwordSet) return <Notice title="Store password not set">Add STORE_ADMIN_PASSWORD (8+ characters) in Vercel → Settings → Environment Variables, then redeploy.</Notice>;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/store/admin/session", { method: "POST", body: JSON.stringify({ password: new FormData(e.currentTarget).get("password") }) });
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not sign in", "danger");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="max-w-md">
      <Card title="Store admin" description="Enter the store password to manage products and orders.">
        <label className="block">
          <span className="text-[0.58rem] uppercase tracking-[0.25em] text-ivory/50">Password</span>
          <input name="password" type="password" autoComplete="current-password" required className="mt-1.5 w-full border border-gold/20 bg-noir/60 px-3 py-2.5 text-sm text-ivory outline-none focus:border-gold" />
        </label>
        <button type="submit" disabled={busy} className="w-full bg-gold py-3 text-[0.62rem] font-medium uppercase tracking-[0.25em] text-noir hover:bg-gold-light disabled:opacity-60">
          {busy ? "Checking…" : "Sign in"}
        </button>
      </Card>
    </form>
  );
}

/* ───────────────────────── Products ───────────────────────── */

type Draft = {
  id: string | null;
  name: string;
  slug: string;
  category: string;
  subtitle: string;
  description: string;
  price: number;
  compare_at_price: number;
  colors: StoreColor[];
  sizes: string[];
  features: string;
  is_active: boolean;
  sort_order: number;
  images: StoreProduct["images"];
};

const toDraft = (p: StoreProduct): Draft => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  category: p.category,
  subtitle: p.subtitle,
  description: p.description,
  price: p.price,
  compare_at_price: p.compare_at_price ?? 0,
  colors: p.colors,
  sizes: p.sizes,
  features: p.features.join(", "),
  is_active: p.is_active,
  sort_order: p.sort_order,
  images: p.images,
});

function Products({ categories }: { categories: Category[] }) {
  const [products, setProducts] = useState<StoreProduct[] | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const titleOf = (slug: string) => categories.find((c) => c.slug === slug)?.title ?? slug;

  const load = useCallback(async () => {
    try {
      setProducts((await api<{ products: StoreProduct[] }>("/api/store/admin/products")).products);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not load products", "danger");
      setProducts([]);
    }
  }, []);
  useEffect(() => void load(), [load]);

  const blank = (): Draft => ({
    id: null,
    name: "",
    slug: "",
    category: categories.find((c) => c.enabled)?.slug ?? categories[0]?.slug ?? "designer-blouses",
    subtitle: "",
    description: "",
    price: 0,
    compare_at_price: 0,
    colors: [],
    sizes: ["S", "M", "L", "XL", "XXL"],
    features: DEFAULT_FEATURES.join(", "),
    is_active: false,
    sort_order: 0,
    images: [],
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ivory/55">
          {products ? `${products.length} products · ${products.filter((p) => p.is_active).length} live on the website` : "Loading…"}
        </p>
        <button type="button" onClick={() => setEditing(blank())} className="bg-gold px-5 py-2.5 text-[0.62rem] font-medium uppercase tracking-[0.22em] text-noir hover:bg-gold-light">
          + Add product
        </button>
      </div>

      {products && products.length === 0 && <Notice title="No products yet">Add your first product — photos, colours and sizes — then publish it.</Notice>}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products?.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => setEditing(toDraft(p))} className="group flex w-full gap-4 border border-gold/15 bg-noir-soft/50 p-3 text-left transition-colors hover:border-gold/50">
              <span className="relative h-28 w-24 shrink-0 overflow-hidden bg-noir">
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl(p.images[0].id)} alt="" className="h-full w-full object-cover" style={{ objectPosition: "28% 50%" }} />
                ) : (
                  <span className="flex h-full items-center justify-center text-[0.6rem] uppercase tracking-[0.2em] text-ivory/30">No photo</span>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`inline-block rounded-full px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.2em] ${p.is_active ? "bg-gold text-noir" : "border border-ivory/20 text-ivory/50"}`}>
                  {p.is_active ? "Live" : "Draft"}
                </span>
                <span className="mt-2 block truncate font-display text-lg text-ivory group-hover:text-gold">{p.name}</span>
                <span className="block text-xs text-ivory/45">{titleOf(p.category)}</span>
                <span className="mt-2 block text-sm text-gold">{p.price > 0 ? inr(p.price) : "No price yet"}</span>
                <span className="mt-1 block text-[0.68rem] text-ivory/40">
                  {p.images.length} photos · {p.colors.length} colours · {p.sizes.length} sizes
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {editing && (
          <Editor
            key={editing.id ?? "new"}
            initial={editing}
            categories={categories}
            onClose={() => setEditing(null)}
            onSaved={(d) => {
              setEditing(d);
              void load();
            }}
            onDeleted={() => {
              setEditing(null);
              void load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

async function toUploadable(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  const encode = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  let blob = await encode("image/webp", 0.84);
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.86);
  if (!blob) throw new Error("Could not read this photo");
  const data = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(",")[1] ?? "");
    fr.onerror = () => reject(new Error("Could not read this photo"));
    fr.readAsDataURL(blob as Blob);
  });
  return { mime: blob.type, data, width, height };
}

function Editor({
  initial,
  categories,
  onClose,
  onSaved,
  onDeleted,
}: {
  initial: Draft;
  categories: Category[];
  onClose: () => void;
  onSaved: (d: Draft) => void;
  onDeleted: () => void;
}) {
  const [d, setD] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [custom, setCustom] = useState({ name: "", hex: "#C9A13B" });
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));

  const payload = (publish?: boolean) => ({
    name: d.name,
    slug: d.slug,
    category: d.category,
    subtitle: d.subtitle,
    description: d.description,
    price: d.price,
    compare_at_price: d.compare_at_price || null,
    colors: d.colors,
    sizes: d.sizes,
    features: d.features.split(",").map((s) => s.trim()).filter(Boolean),
    is_active: publish ?? d.is_active,
    sort_order: d.sort_order,
  });

  async function save(publish?: boolean) {
    setSaving(true);
    try {
      let id = d.id;
      if (id) await api(`/api/store/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(payload(publish)) });
      else id = (await api<{ id: string }>("/api/store/admin/products", { method: "POST", body: JSON.stringify(payload(publish)) })).id;
      const fresh = (await api<{ products: StoreProduct[] }>("/api/store/admin/products")).products.find((p) => p.id === id);
      if (fresh) {
        setD(toDraft(fresh));
        onSaved(toDraft(fresh));
      }
      toast(publish === true ? "Published — live on the website" : publish === false ? "Moved to drafts" : "Saved");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function upload(files: FileList | null) {
    if (!files || !d.id) return;
    const list = [...files].slice(0, 12);
    setUploading(list.length);
    for (const f of list) {
      try {
        const img = await toUploadable(f);
        await api(`/api/store/admin/products/${d.id}/images`, { method: "POST", body: JSON.stringify(img) });
      } catch (e) {
        toast(`${f.name}: ${e instanceof Error ? e.message : "upload failed"}`, "danger");
      }
      setUploading((n) => n - 1);
    }
    await refreshImages();
  }

  async function refreshImages() {
    const fresh = (await api<{ products: StoreProduct[] }>("/api/store/admin/products")).products.find((p) => p.id === d.id);
    if (fresh) {
      setD((x) => ({ ...x, images: fresh.images }));
      onSaved({ ...d, images: fresh.images });
    }
  }

  async function makeCover(imageId: string) {
    if (!d.id) return;
    const ids = [imageId, ...d.images.map((i) => i.id).filter((i) => i !== imageId)];
    await api(`/api/store/admin/products/${d.id}/images`, { method: "PUT", body: JSON.stringify({ ids }) }).catch(() => toast("Could not reorder", "danger"));
    await refreshImages();
  }

  async function removeImage(imageId: string) {
    if (!window.confirm("Delete this photo?")) return;
    await api(`/api/store/admin/images/${imageId}`, { method: "DELETE" }).catch(() => toast("Could not delete", "danger"));
    await refreshImages();
  }

  async function removeProduct() {
    if (!d.id || !window.confirm(`Delete “${d.name}” and its photos? This can’t be undone.`)) return;
    try {
      await api(`/api/store/admin/products/${d.id}`, { method: "DELETE" });
      toast("Product deleted");
      onDeleted();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not delete", "danger");
    }
  }

  const toggleColor = (c: StoreColor) =>
    set({ colors: d.colors.some((x) => x.name === c.name) ? d.colors.filter((x) => x.name !== c.name) : [...d.colors, c] });
  const toggleSize = (s: string) =>
    set({ sizes: d.sizes.includes(s) ? d.sizes.filter((x) => x !== s) : SIZE_OPTIONS.filter((o) => o === s || d.sizes.includes(o)) });

  return (
    <div className="fixed inset-0 z-[60]">
      <motion.button type="button" aria-label="Close" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" />
      <motion.aside
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.45, ease: EASE }}
        className="absolute inset-y-0 right-0 w-full max-w-2xl overflow-y-auto border-l border-gold/20 bg-noir p-6 md:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.58rem] uppercase tracking-[0.3em] text-gold">{d.id ? (d.is_active ? "Live product" : "Draft") : "New product"}</p>
            <h2 className="mt-1 font-display text-3xl text-ivory">{d.name || "Untitled product"}</h2>
          </div>
          <button type="button" onClick={onClose} className="text-ivory/50 hover:text-gold" aria-label="Close editor">
            <Icon d="M6 6l12 12M18 6 6 18" className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <Card title="Photos" description={d.id ? "The first photo is the cover. Upload several angles — front, back, sleeves, details." : "Save the product first, then add photos."}>
            {d.id && (
              <>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {d.images.map((im, i) => (
                    <li key={im.id} className="group relative aspect-square overflow-hidden border border-gold/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl(im.id)} alt="" className="h-full w-full object-cover" />
                      {i === 0 && <span className="absolute left-1 top-1 bg-gold px-1.5 py-0.5 text-[0.5rem] uppercase tracking-[0.15em] text-noir">Cover</span>}
                      <span className="absolute inset-x-0 bottom-0 flex justify-between bg-black/70 px-1.5 py-1 text-[0.55rem] uppercase tracking-[0.12em] opacity-0 transition-opacity group-hover:opacity-100">
                        {i > 0 ? (
                          <button type="button" onClick={() => void makeCover(im.id)} className="text-gold">
                            Make cover
                          </button>
                        ) : (
                          <span />
                        )}
                        <button type="button" onClick={() => void removeImage(im.id)} className="text-red-300">
                          Delete
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-gold/40 py-5 text-[0.62rem] uppercase tracking-[0.22em] text-gold hover:bg-gold/5">
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void upload(e.target.files)} disabled={uploading > 0} />
                  {uploading > 0 ? `Uploading ${uploading}…` : "+ Upload photos"}
                </label>
              </>
            )}
          </Card>

          <Card title="Details">
            <TextField label="Product name" value={d.name} onChange={(v) => set({ name: v })} placeholder="Rani Pink Pearl Scallop Blouse" />
            <TextField label="Short line under the name" value={d.subtitle} onChange={(v) => set({ subtitle: v })} placeholder="Designer blouse with pearl-scallop sleeves" />
            <TextField label="Description" value={d.description} onChange={(v) => set({ description: v })} multiline />
            <label className="block">
              <span className="text-[0.58rem] uppercase tracking-[0.25em] text-ivory/50">Category</span>
              <select value={d.category} onChange={(e) => set({ category: e.target.value })} className="mt-1.5 w-full border border-gold/20 bg-noir/60 px-3 py-2.5 text-sm text-ivory outline-none focus:border-gold">
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title}
                    {c.enabled ? "" : " (hidden category)"}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Price" value={d.price} onChange={(v) => set({ price: v })} suffix="₹" />
              <NumberField label="MRP (optional, for % off)" value={d.compare_at_price} onChange={(v) => set({ compare_at_price: v })} suffix="₹" />
            </div>
            <TextField label="Features (comma separated)" value={d.features} onChange={(v) => set({ features: v })} placeholder="Premium Fabric, Mirror Work, Fine Stitching, Perfect Fit" />
            <TextField label="Web address" value={d.slug} onChange={(v) => set({ slug: v })} placeholder="Made from the name" />
          </Card>

          <Card title="Colours" description="Tap to add or remove. Customers pick one when ordering.">
            <div className="flex flex-wrap gap-2">
              {[...COLOR_PRESETS, ...d.colors.filter((c) => !COLOR_PRESETS.some((p) => p.name === c.name))].map((c) => {
                const on = d.colors.some((x) => x.name === c.name);
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => toggleColor(c)}
                    className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs ${on ? "border-gold text-ivory" : "border-gold/15 text-ivory/50 hover:border-gold/40"}`}
                  >
                    <span className="h-4 w-4 rounded-full ring-1 ring-ivory/20" style={{ background: c.hex }} />
                    {c.name}
                  </button>
                );
              })}
            </div>
            <div className="flex items-end gap-2">
              <label className="flex-1">
                <span className="text-[0.58rem] uppercase tracking-[0.25em] text-ivory/50">Custom colour</span>
                <input value={custom.name} onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. Wine" className="mt-1.5 w-full border border-gold/20 bg-noir/60 px-3 py-2.5 text-sm text-ivory outline-none focus:border-gold" />
              </label>
              <input type="color" value={custom.hex} onChange={(e) => setCustom((c) => ({ ...c, hex: e.target.value }))} className="h-11 w-12 cursor-pointer border border-gold/20 bg-transparent" aria-label="Pick colour" />
              <button
                type="button"
                onClick={() => {
                  const name = custom.name.trim();
                  if (!name || d.colors.some((x) => x.name === name)) return;
                  set({ colors: [...d.colors, { name, hex: custom.hex.toUpperCase() }] });
                  setCustom({ name: "", hex: custom.hex });
                }}
                className="h-11 border border-gold/40 px-4 text-[0.6rem] uppercase tracking-[0.2em] text-gold hover:bg-gold hover:text-noir"
              >
                Add
              </button>
            </div>
          </Card>

          <Card title="Sizes">
            <div className="flex flex-wrap gap-2">
              {SIZE_OPTIONS.map((s) => {
                const on = d.sizes.includes(s);
                return (
                  <button key={s} type="button" onClick={() => toggleSize(s)} className={`min-w-11 rounded-full border px-3 py-1.5 text-xs ${on ? "border-gold bg-gold text-noir" : "border-gold/20 text-ivory/55 hover:border-gold/50"}`}>
                    {s}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="Visibility">
            <Toggle label="Live on the website" hint="Needs a price. Drafts stay hidden from customers." checked={d.is_active} onChange={(v) => set({ is_active: v })} />
            <NumberField label="Display order (lower shows first)" value={d.sort_order} onChange={(v) => set({ sort_order: v })} />
          </Card>
        </div>

        <div className="sticky bottom-0 -mx-6 mt-6 flex flex-wrap items-center gap-3 border-t border-gold/15 bg-noir/95 px-6 py-4 backdrop-blur md:-mx-8 md:px-8">
          <button type="button" disabled={saving} onClick={() => void save()} className="bg-gold px-5 py-3 text-[0.62rem] font-medium uppercase tracking-[0.22em] text-noir hover:bg-gold-light disabled:opacity-60">
            {saving ? "Saving…" : d.id ? "Save changes" : "Save & add photos"}
          </button>
          {d.id && !d.is_active && (
            <button type="button" disabled={saving} onClick={() => void save(true)} className="border border-gold/50 px-5 py-3 text-[0.62rem] uppercase tracking-[0.22em] text-gold hover:bg-gold hover:text-noir disabled:opacity-60">
              Publish
            </button>
          )}
          {d.id && d.is_active && (
            <a href={`/shop/${d.slug}`} target="_blank" rel="noreferrer" className="px-2 text-[0.6rem] uppercase tracking-[0.22em] text-gold hover:underline">
              View on site ↗
            </a>
          )}
          {d.id && (
            <button type="button" onClick={() => void removeProduct()} className="ml-auto text-[0.6rem] uppercase tracking-[0.22em] text-red-400/80 hover:text-red-400">
              Delete
            </button>
          )}
        </div>
      </motion.aside>
    </div>
  );
}

/* ───────────────────────── Orders ───────────────────────── */

const STATUS_STYLE: Record<OrderStatus, string> = {
  new: "bg-gold text-noir",
  confirmed: "border border-gold text-gold",
  shipped: "border border-ivory/40 text-ivory",
  delivered: "bg-emerald-700/70 text-ivory",
  cancelled: "border border-red-400/50 text-red-300",
};

function Orders() {
  const [orders, setOrders] = useState<StoreOrder[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "all">("all");

  const load = useCallback(async () => {
    try {
      setOrders((await api<{ orders: StoreOrder[] }>("/api/store/admin/orders")).orders);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not load orders", "danger");
      setOrders([]);
    }
  }, []);
  useEffect(() => void load(), [load]);

  async function setStatus(id: string, status: OrderStatus) {
    setOrders((list) => list?.map((o) => (o.id === id ? { ...o, status } : o)) ?? null);
    await api(`/api/store/admin/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }).catch(() => {
      toast("Could not update", "danger");
      void load();
    });
  }

  const shown = orders?.filter((o) => filter === "all" || o.status === filter) ?? [];
  const fmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(["all", ...ORDER_STATUSES] as const).map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)} className={`rounded-full border px-3.5 py-1.5 text-[0.6rem] uppercase tracking-[0.2em] ${filter === s ? "border-gold bg-gold text-noir" : "border-gold/20 text-ivory/55 hover:border-gold/50"}`}>
            {s} {orders && `(${s === "all" ? orders.length : orders.filter((o) => o.status === s).length})`}
          </button>
        ))}
        <button type="button" onClick={() => void load()} className="ml-auto text-[0.6rem] uppercase tracking-[0.22em] text-ivory/45 hover:text-gold">
          Refresh
        </button>
      </div>

      {orders && shown.length === 0 && <Notice title="No orders here yet">Orders placed on the website appear here instantly.</Notice>}

      <ul className="space-y-2">
        {shown.map((o) => (
          <li key={o.id} className="border border-gold/15 bg-noir-soft/50">
            <button type="button" onClick={() => setOpen((x) => (x === o.id ? null : o.id))} className="flex w-full flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 text-left">
              <span className="font-mono text-sm text-gold">{o.order_no}</span>
              <span className="text-sm text-ivory">{o.customer_name}</span>
              <span className="text-xs text-ivory/45">{fmt.format(new Date(o.created_at))}</span>
              <span className="text-xs text-ivory/45">{o.payment_method === "cod" ? "Cash on delivery" : "UPI / transfer"}</span>
              <span className="ml-auto text-sm text-ivory">{inr(o.total)}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-[0.55rem] uppercase tracking-[0.18em] ${STATUS_STYLE[o.status]}`}>{o.status}</span>
            </button>
            {open === o.id && (
              <div className="grid gap-6 border-t border-gold/10 px-4 py-4 md:grid-cols-2">
                <div className="space-y-1 text-sm text-ivory/70">
                  <p className="text-ivory">{o.customer_name}</p>
                  <p>
                    <a href={`tel:${o.phone}`} className="text-gold hover:underline">
                      {o.phone}
                    </a>
                    {" · "}
                    <a href={`https://wa.me/${o.phone.replace(/[^\d]/g, "").replace(/^(\d{10})$/, "91$1")}`} target="_blank" rel="noreferrer" className="text-gold hover:underline">
                      WhatsApp
                    </a>
                  </p>
                  {o.email && <p>{o.email}</p>}
                  <p className="pt-2">
                    {o.address}, {o.city}, {o.state} – {o.pincode}
                  </p>
                  {o.notes && <p className="pt-2 italic text-ivory/50">“{o.notes}”</p>}
                </div>
                <div>
                  <ul className="space-y-1.5 text-sm">
                    {o.items.map((it, i) => (
                      <li key={i} className="flex justify-between gap-3 text-ivory/75">
                        <span>
                          {it.name} <span className="text-ivory/45">· {[it.color, it.size].filter(Boolean).join(" · ")} × {it.qty}</span>
                        </span>
                        <span>{inr(it.price * it.qty)}</span>
                      </li>
                    ))}
                    <li className="flex justify-between border-t border-gold/10 pt-1.5 text-ivory/55">
                      <span>Shipping</span>
                      <span>{o.shipping ? inr(o.shipping) : "Free"}</span>
                    </li>
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {ORDER_STATUSES.map((s) => (
                      <button key={s} type="button" onClick={() => void setStatus(o.id, s)} className={`rounded-full border px-3 py-1 text-[0.55rem] uppercase tracking-[0.18em] ${o.status === s ? "border-gold bg-gold text-noir" : "border-gold/20 text-ivory/55 hover:border-gold/50"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
