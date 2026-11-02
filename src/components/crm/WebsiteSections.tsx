"use client";

import Image from "next/image";
import { useState } from "react";
import type { SignatureTileLink, SiteSettings } from "@/lib/settings";
import type { Category, Product } from "@/lib/data/types";
import { ShowcaseImageStudio } from "./ShowcaseImageStudio";
import { SignatureGalleryStudio } from "./SignatureGalleryStudio";
import { fetchCategories, fetchProducts, fetchSettings, saveSettings, uploadMedia, useLoad } from "./data";
import { Field, Icon, ICONS, PageHeader, Panel, Select, Skeleton, toast } from "./ui";

/** One management page for every homepage section that shows a product or photo: which product, which
 * images. Everything else about the website's look still lives in Appearance Studio. */
export function WebsiteSections() {
  const { data, loading } = useLoad(async () => {
    const [settings, categories, products] = await Promise.all([fetchSettings(), fetchCategories(), fetchProducts()]);
    return { settings, categories, products };
  });
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader section="Website Sections" subtitle="Manage which products and photos each homepage section shows" />
        <Skeleton className="h-[640px]" />
      </div>
    );
  }
  return <Editor initial={data.settings} categories={data.categories} products={data.products} />;
}

function Editor({ initial, categories, products }: { initial: SiteSettings; categories: Category[]; products: Product[] }) {
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);

  const liveProducts = products.filter((p) => p.status === "live");
  const byCategory = (slug: string) => {
    const id = categories.find((c) => c.slug === slug)?.id;
    return id ? liveProducts.filter((p) => p.category_id === id) : [];
  };
  const designerBlouses = byCategory("designer-blouses");
  const readyMade = byCategory("ready-made-blouses");

  async function publish(next: SiteSettings) {
    setS(next);
    setBusy(true);
    try {
      await saveSettings(next);
      setSaved(next);
      toast("Published — the website is updated");
    } catch (e) {
      toast(e instanceof Error ? (e.message.includes("row-level security") ? "Only an admin can publish website changes" : e.message) : "Could not publish", "error");
    } finally {
      setBusy(false);
    }
  }

  const setSignatureLink = (index: number, patch: Partial<SignatureTileLink>) =>
    setS((x) => ({ ...x, signatureLinks: x.signatureLinks.map((link, i) => (i === index ? { ...link, ...patch } : link)) }));

  const [uploadingExtra, setUploadingExtra] = useState<string | null>(null);
  async function uploadExtraImage(cardIndex: number, slot: number, file: File) {
    if (!file.type.startsWith("image/")) { toast("Choose an image file", "error"); return; }
    if (file.size > 15 * 1024 * 1024) { toast("Maximum file size is 15 MB", "error"); return; }
    const key = `${cardIndex}-${slot}`;
    setUploadingExtra(key);
    try {
      const result = await uploadMedia("signature-gallery", file);
      const current = s.signatureLinks[cardIndex].images ?? [];
      const next = [...current];
      next[slot] = result.url;
      setSignatureLink(cardIndex, { images: next });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Image upload failed", "error");
    } finally {
      setUploadingExtra(null);
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader section="Website Sections" subtitle="Manage which products and photos each homepage section shows, and where its “Buy” click goes" />

      <Panel title="Designer Blouses story" icon={ICONS.products} subtitle="The homepage section that tells the Designer Blouses story">
        <p className="mb-3 text-xs crm-muted">Pin one product — its photo, name and price lead this section. Leave on “Auto” to always show the newest live Designer Blouses product.</p>
        <Select label="Featured product" value={s.designerBlousesProductId} onChange={(e) => void publish({ ...s, designerBlousesProductId: e.target.value })}>
          <option value="">— Auto (first live product) —</option>
          {designerBlouses.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        {designerBlouses.length === 0 && <p className="mt-2 text-[0.7rem] text-burgundy">No live Designer Blouses products yet — publish one from Products to feature it here.</p>}
      </Panel>

      <Panel title="Ready-Made Blouses story" icon={ICONS.products} subtitle="The homepage section that tells the Ready-Made Blouses story">
        <p className="mb-3 text-xs crm-muted">Pin one product — its photo, name and price lead this section. Leave on “Auto” to always show the newest live Ready-Made product.</p>
        <Select label="Featured product" value={s.readyMadeProductId} onChange={(e) => void publish({ ...s, readyMadeProductId: e.target.value })}>
          <option value="">— Auto (first live product) —</option>
          {readyMade.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        {readyMade.length === 0 && <p className="mt-2 text-[0.7rem] text-burgundy">No live Ready-Made Blouses products yet — publish one from Products to feature it here.</p>}
      </Panel>

      <ShowcaseImageStudio images={s.showcaseImages} onChange={(showcaseImages) => void publish({ ...s, showcaseImages })} />

      <Panel title="Featured Products — Homepage Listing" icon={ICONS.products} subtitle="Choose products to show in the separate Featured Products section. Move them up or down to control the order.">
        <p className="mb-3 text-xs crm-muted">Only selected live or Coming soon products appear here. Signature Gallery stays independent.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {products.filter((p) => p.status === "live" || p.status === "upcoming").map((p) => {
            const at = s.featuredProductIds.indexOf(p.id);
            const selected = at >= 0;
            return <div key={p.id} className="crm-panel-soft flex items-center justify-between gap-2 rounded-lg p-2">
              <label className="flex min-w-0 items-center gap-2 text-sm">
                <input type="checkbox" checked={selected} onChange={() => {
                  setS((x) => ({ ...x, featuredProductIds: selected ? x.featuredProductIds.filter((id) => id !== p.id) : [...x.featuredProductIds, p.id].slice(0, 12) }));
                }} />
                <span className="truncate">{p.name}</span>
              </label>
              {selected && <div className="flex shrink-0 gap-1">
                <button type="button" className="crm-chip" disabled={at === 0} aria-label={`Move ${p.name} up`} onClick={() => setS((x) => { const a = [...x.featuredProductIds]; const i = a.indexOf(p.id); if (i > 0) [a[i-1], a[i]] = [a[i], a[i-1]]; return { ...x, featuredProductIds: a }; })}>↑</button>
                <button type="button" className="crm-chip" disabled={at === s.featuredProductIds.length - 1} aria-label={`Move ${p.name} down`} onClick={() => setS((x) => { const a = [...x.featuredProductIds]; const i = a.indexOf(p.id); if (i >= 0 && i < a.length - 1) [a[i+1], a[i]] = [a[i], a[i+1]]; return { ...x, featuredProductIds: a }; })}>↓</button>
              </div>}
            </div>;
          })}
        </div>
        <p className="mt-3 text-xs crm-muted">Selected: {s.featuredProductIds.length}/12</p>
        <button type="button" disabled={busy || !dirty} onClick={() => void publish(s)} className="crm-btn crm-btn-gold mt-3">{busy ? "Publishing…" : "Publish Featured Products"}</button>
      </Panel>

      <SignatureGalleryStudio images={s.signatureImages} onChange={(signatureImages) => void publish({ ...s, signatureImages })} />

      <Panel title="Memories — product links" icon={ICONS.products} subtitle="Link each Memories card to a real product so it shows live price, and “Shop this piece” goes straight to checkout">
        <p className="mb-3 text-xs crm-muted">
          Pick a product for a card to turn it into a live spotlight — its catalogue photo, name, price and link take over automatically (unless you type your own title/caption below). Leave “No product” to keep the card as a plain collection photo.
        </p>
        <div className="space-y-4">
          {s.signatureLinks.map((link, i) => {
            const product = liveProducts.find((p) => p.id === link.productId);
            return (
              <div key={i} className="crm-panel-soft rounded-xl border p-3" style={{ borderColor: "var(--crm-border-soft)" }}>
                <span className="text-xs font-medium crm-muted">Card {i + 1}</span>
                <Select label="Product" value={link.productId} onChange={(e) => setSignatureLink(i, { productId: e.target.value })} className="mt-2">
                  <option value="">— No product (static collection photo) —</option>
                  {liveProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                {link.productId && (
                  <>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Field label="Title (optional)" placeholder={product?.name ?? ""} value={link.title} onChange={(e) => setSignatureLink(i, { title: e.target.value })} />
                      <Field label="Caption (optional)" placeholder={product?.subtitle || "From the catalogue"} value={link.note} onChange={(e) => setSignatureLink(i, { note: e.target.value })} />
                    </div>
                    <div className="mt-3">
                      <span className="text-[0.7rem] crm-muted">Up to 3 photos — add 2 or more and the card gently cross-fades between them on the website</span>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {Array.from({ length: 3 }, (_, slot) => (link.images ?? [])[slot] || "").map((url, slot) => {
                          const key = `${i}-${slot}`;
                          return (
                            <div key={slot} className="rounded-lg border p-1.5" style={{ borderColor: "var(--crm-border-soft)" }}>
                              <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-black/20">
                                {url ? (
                                  <Image src={url} alt={`Photo ${slot + 1}`} fill sizes="150px" unoptimized className="object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-center text-[0.6rem] opacity-60">Empty</div>
                                )}
                              </div>
                              <label className="crm-chip mt-1.5 block cursor-pointer text-center text-[0.65rem]">
                                {uploadingExtra === key ? "Uploading…" : url ? "Replace" : "Add"}
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  className="sr-only"
                                  disabled={uploadingExtra !== null}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = "";
                                    if (file) void uploadExtraImage(i, slot, file);
                                  }}
                                />
                              </label>
                              {url && (
                                <button
                                  type="button"
                                  className="crm-chip mt-1 block w-full text-center text-[0.65rem]"
                                  onClick={() => {
                                    const next = [...(link.images ?? [])];
                                    next[slot] = "";
                                    setSignatureLink(i, { images: next });
                                  }}
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <button type="button" disabled={busy || !dirty} className="crm-btn crm-btn-gold" onClick={() => void publish(s)}>
            <Icon d={ICONS.check} /> {busy ? "Publishing…" : "Publish product links"}
          </button>
        </div>
      </Panel>
    </div>
  );
}
