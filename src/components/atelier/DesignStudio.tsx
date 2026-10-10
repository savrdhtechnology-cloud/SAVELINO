"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge } from "@/components/admin/ui";
import { toast } from "@/lib/admin/store";
import type { Row } from "@/lib/admin/types";
import {
  ACCESSORIES, BACK_NECKS, CLOSURES, CUTS, DARTS, DEFAULT_SPEC, DESIGN_CATEGORIES, EMBROIDERY, FABRICS, LININGS, NECKLINES, SLEEVES, type DesignSpec,
} from "@/lib/atelier/constants";
import { rpc, useRows, write } from "@/lib/atelier/store";
import { imageToDataUrl } from "./image";
import { TechFlat, colorHex } from "./TechFlat";
import { AppHeader, Chips, Empty, Field, Notice, Section, Segmented, Select, btnDanger, btnGhost, btnGold, btnLine, fmtDateTime, inputCls, label, panel } from "./ui";
import { Viewport } from "./Viewport";

type Sketch = { name: string; data: string; view: "front" | "back"; kind: "sketch" | "reference" };
type Design = Row & { code: string; name: string; category: string; status: string; spec: Partial<DesignSpec>; sketches: Sketch[]; current_version: number; product_id?: string | null; updated_at?: string };

const opts = (list: readonly { value: string; label: string }[]) => list.map((o) => ({ value: o.value, label: o.label }));
const strOpts = (list: readonly string[]) => list.map((o) => ({ value: o, label: o === "none" ? "No lining" : o }));

export function DesignStudio({ live }: { live: boolean }) {
  const designs = useRows<Design>("garment_designs", "id,code,name,category,status,spec,sketches,current_version,product_id,updated_at,created_at", live, { order: "updated_at" });
  const products = useRows("products", "id,name", live, { order: "name", asc: true });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const selected = designs.rows.find((d) => d.id === selectedId) ?? designs.rows[0];

  useEffect(() => {
    if (!selectedId && designs.rows[0]) setSelectedId(designs.rows[0].id);
  }, [designs.rows, selectedId]);

  const list = designs.rows.filter((d) => `${d.name} ${d.code}`.toLowerCase().includes(query.toLowerCase()));

  const create = async () => {
    const { data, error } = await write(live, "garment_designs", "insert", { name: "Untitled blouse", category: "designer-blouses", spec: DEFAULT_SPEC });
    if (error) return toast(error, "danger");
    if (data && !Array.isArray(data)) setSelectedId(String((data as Row).id));
  };

  return (
    <div className="space-y-6">
      <AppHeader
        live={live}
        eyebrow="Atelier · Design Studio"
        title="Design Studio"
        description="Create garment designs, technical flats and specifications. Approved designs are locked and versioned before they reach pattern making and production."
        actions={<button onClick={create} className={btnGold}>+ New design</button>}
      />
      <div className="grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)_330px]">
        <aside className={`${panel} flex max-h-[760px] flex-col`}>
          <div className="border-b border-gold/10 p-3">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search designs…" aria-label="Search designs" className={inputCls} />
          </div>
          <ul className="flex-1 overflow-y-auto p-2">
            {list.map((d) => (
              <li key={d.id}>
                <button onClick={() => setSelectedId(d.id)} className={`relative mb-1 w-full px-3 py-3 text-left transition-colors ${selected?.id === d.id ? "text-ivory" : "text-ivory/70 hover:bg-gold/5"}`}>
                  {selected?.id === d.id && <motion.span layoutId="design-active" className="absolute inset-0 border border-gold/50 bg-gold/10" />}
                  <span className="relative flex items-center gap-3">
                    <span className="h-8 w-8 shrink-0 border border-gold/30" style={{ background: colorHex(d.spec?.colors?.[0]) }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{d.name}</span>
                      <span className="mt-0.5 block text-[0.6rem] uppercase tracking-[0.18em] text-ivory/40">{d.code} · v{d.current_version}</span>
                    </span>
                  </span>
                  <span className="relative mt-2 block"><StatusBadge value={d.status} /></span>
                </button>
              </li>
            ))}
            {!list.length && <li className="p-4 text-center text-xs text-ivory/40">{designs.loading ? "Loading…" : "No designs yet."}</li>}
          </ul>
        </aside>

        {selected ? (
          <Editor key={selected.id} design={selected} live={live} products={products.rows as (Row & { name: string })[]} />
        ) : (
          <div className="xl:col-span-2">
            <Empty title="Start your first design" body="Designs begin as drafts. Add a technical specification, sketches and references, then send for approval." action={<button onClick={create} className={btnGold}>+ New design</button>} />
          </div>
        )}
      </div>
    </div>
  );
}

function Editor({ design, live, products }: { design: Design; live: boolean; products: (Row & { name: string })[] }) {
  const [name, setName] = useState(design.name);
  const [category, setCategory] = useState(design.category);
  const [productId, setProductId] = useState(design.product_id ?? "");
  const [spec, setSpec] = useState<DesignSpec>({ ...DEFAULT_SPEC, ...design.spec });
  const [view, setView] = useState<"front" | "back">("front");
  const [displayMode,setDisplayMode] = useState<"photo"|"flat"|"compare">("photo");
  const [color, setColor] = useState(spec.colors[0]);
  const [overlay, setOverlay] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newColor, setNewColor] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const versions = useRows("design_versions", "id,version,name,status,spec,note,created_at", live, { filter: { column: "design_id", value: design.id }, order: "version" });
  const approvals = useRows("design_approvals", "id,subject,decision,comment,design_version,decided_at", live, { filter: { column: "design_id", value: design.id }, order: "decided_at" });

  const locked = design.status === "approved";
  const original = JSON.stringify({ n: design.name, c: design.category, p: design.product_id ?? "", s: { ...DEFAULT_SPEC, ...design.spec } });
  const dirty = JSON.stringify({ n: name, c: category, p: productId, s: spec }) !== original;
  const set = <K extends keyof DesignSpec>(k: K, v: DesignSpec[K]) => setSpec((s) => ({ ...s, [k]: v }));
  const sketches = (design.sketches ?? []) as Sketch[];
  const viewSketch = overlay ? sketches.find((s) => s.view === view && s.kind === "sketch")?.data : null;
  const reference = sketches.find(s => s.kind === "reference" && s.view === view && !s.name.toLowerCase().startsWith("side:"));
  const sideReferences = sketches.filter(s => s.kind === "reference" && s.name.toLowerCase().startsWith("side:"));
  const [showSide,setShowSide]=useState(false);
  const shownReference = showSide ? sideReferences[0] : reference;

  const save = async () => {
    setSaving(true);
    const { error } = await write(live, "garment_designs", "update", { name: name.trim() || "Untitled", category, product_id: productId || null, spec }, design.id);
    setSaving(false);
    if (error) toast(error, "danger");
    else toast(`Saved as version ${design.current_version + 1}`);
  };

  const setStatus = async (status: string, msg: string) => {
    if (dirty) return toast("Save your changes first", "danger");
    const { error } = await rpc(live, "atelier_set_design_status", { p_design: design.id, p_status: status, p_comment: null }, ["garment_designs", "design_approvals", "design_versions"]);
    if (error) toast(error, "danger");
    else toast(msg);
  };

  const upload = async (files: FileList | null, kind: Sketch["kind"]) => {
    if (!files?.length) return;
    try {
      const added: Sketch[] = [];
      for (const f of Array.from(files).slice(0, 8 - sketches.length)) added.push({ name: f.name.slice(0, 80), data: await imageToDataUrl(f), view, kind });
      const { error } = await write(live, "garment_designs", "update", { sketches: [...sketches, ...added] }, design.id);
      if (error) toast(error, "danger");
    } catch (e) {
      toast((e as Error).message, "danger");
    }
  };

  const removeSketch = async (i: number) => {
    const { error } = await write(live, "garment_designs", "update", { sketches: sketches.filter((_, j) => j !== i) }, design.id);
    if (error) toast(error, "danger");
  };

  const catReady = DESIGN_CATEGORIES.find((c) => c.value === category)?.ready;

  return (
    <>
      <div className="min-w-0 space-y-4">
        <div className={`${panel} p-3`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Segmented id="flat-view" value={view} onChange={(v)=>{setView(v);setShowSide(false)}} options={[{ value: "front", label: "Front" }, { value: "back", label: "Back" }]} />
              {sideReferences.length>0 && <button onClick={()=>setShowSide(true)} className={btnGhost}>Side photo</button>}
              <Segmented id="reference-view" value={displayMode} onChange={setDisplayMode} options={[{value:"photo",label:"Photo"},{value:"flat",label:"Flat"},{value:"compare",label:"Compare"}]} />
              <div className="flex items-center gap-1.5" aria-label="Colourway">
                {spec.colors.map((c) => (
                  <button key={c} title={c} aria-label={`Show ${c}`} onClick={() => setColor(c)} className={`h-6 w-6 border ${color === c ? "border-gold ring-1 ring-gold" : "border-ivory/20"}`} style={{ background: colorHex(c) }} />
                ))}
              </div>
              {sketches.some((s) => s.kind === "sketch") && (
                <label className="flex items-center gap-2 text-[0.6rem] uppercase tracking-[0.2em] text-ivory/60">
                  <input type="checkbox" checked={overlay} onChange={(e) => setOverlay(e.target.checked)} className="accent-[#d4af37]" /> Sketch overlay
                </label>
              )}
            </div>
            <span className="text-[0.6rem] uppercase tracking-[0.2em] text-ivory/45">{design.code} · version {design.current_version}{dirty ? " · unsaved changes" : ""}</span>
          </div>
          {displayMode === "photo" ? (<div className="flex h-[520px] items-center justify-center overflow-hidden bg-black/30">
              {shownReference ? <img src={shownReference.data} alt={shownReference.name} className="max-h-full max-w-full object-contain" /> : <p className="px-5 text-center text-sm text-ivory/50">No ${showSide ? 'side' : view} reference uploaded. Add a photo below to view it here.</p>}
            </div>) : displayMode === "flat" ? (
            <Viewport content={{ x: 0, y: 0, w: 200, h: 222 }} className="h-[520px] text-ivory" label={`${name} technical flat, ${view} view`}>
            <AnimatePresence mode="wait">
              <motion.g key={`${view}-${color}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <TechFlat spec={spec} view={view} color={color} sketch={viewSketch} />
              </motion.g>
            </AnimatePresence>
          </Viewport>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              <div><p className="mb-2 text-xs uppercase tracking-widest text-gold">Original reference</p><div className="flex h-[520px] items-center justify-center overflow-hidden bg-black/30">
              {shownReference ? <img src={shownReference.data} alt={shownReference.name} className="max-h-full max-w-full object-contain" /> : <p className="px-5 text-center text-sm text-ivory/50">No ${showSide ? 'side' : view} reference uploaded. Add a photo below to view it here.</p>}
            </div></div>
              <div><p className="mb-2 text-xs uppercase tracking-widest text-gold">Technical illustration</p><Viewport content={{ x: 0, y: 0, w: 200, h: 222 }} className="h-[520px] text-ivory" label={`${name} technical flat, ${view} view`}>
            <AnimatePresence mode="wait">
              <motion.g key={`${view}-${color}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
                <TechFlat spec={spec} view={view} color={color} sketch={viewSketch} />
              </motion.g>
            </AnimatePresence>
          </Viewport></div>
            </div>
          )}
          <p className="mt-2 text-[0.65rem] text-ivory/40">Technical flat generated from the specification — an illustration for the team, not a cutting pattern. Patterns are drafted from approved size charts in the Pattern Library.</p>
        </div>

        <Section
          title="Sketches & reference photos"
          aside={
            <div className="flex gap-2">
              <button disabled={locked || sketches.length >= 8} onClick={() => { fileRef.current?.setAttribute("data-kind", "sketch"); fileRef.current?.click(); }} className={btnLine}>Upload sketch ({view})</button>
              <button disabled={locked || sketches.length >= 8} onClick={() => { fileRef.current?.setAttribute("data-kind", "reference"); fileRef.current?.click(); }} className={btnGhost}>Add reference</button>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" aria-label="Upload images" onChange={(e) => { void upload(e.target.files, (e.target.getAttribute("data-kind") as Sketch["kind"]) ?? "sketch"); e.target.value = ""; }} />
            </div>
          }
        >
          {sketches.length ? (
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {sketches.map((s, i) => (
                <li key={i} className="group relative border border-gold/15">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.data} alt={s.name} className="aspect-square w-full object-cover" />
                  <span className="absolute left-1 top-1 bg-noir/80 px-1.5 py-0.5 text-[0.5rem] uppercase tracking-[0.18em] text-gold">{s.kind} · {s.view}</span>
                  {!locked && <button onClick={() => removeSketch(i)} aria-label={`Remove ${s.name}`} className="absolute right-1 top-1 hidden h-6 w-6 bg-noir/80 text-ivory group-hover:block">×</button>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ivory/45">No original image saved for this design. Restore archived design if needed, then use Add reference to upload the original front/back photos. Images do not establish exact cutting measurements.</p>
          )}
        </Section>

        <Section title="Production readiness · next steps">
          <div className="space-y-3 text-sm text-ivory/75">
            <p>Design status: <strong>{design.status}</strong>. Design approval alone does not approve measurements, patterns or production: these are separate safety gates.</p>
            <ol className="space-y-2">
              <li>1. Reference photos — {sketches.some(s=>s.kind==="reference") ? "attached" : "missing: upload the original photo above"}</li>
              <li>2. Design approval — {design.status === "approved" ? "complete" : design.status === "archived" ? "archived: restore and approve before production" : "pending"}</li>
              <li>3. Size Charts — verify measurements and approve the size chart</li>
              <li>4. Pattern Library — draft size-wise pieces and request pattern master approval</li>
              <li>5. Bill of Materials & Fabric Calculator — validate materials and marker estimates</li>
              <li>6. Production Batches — create a batch after approvals, then assign Worker Tasks</li>
              <li>7. Quality Control — inspect finished work through the QC workflow</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <Link className={btnLine} href="/admin/size-charts">Size Charts →</Link>
              <Link className={btnLine} href="/admin/pattern-library">Pattern Library →</Link>
              <Link className={btnLine} href="/admin/bill-of-materials">BOM →</Link>
              <Link className={btnLine} href="/admin/production-batches">Production Batches →</Link>
              <Link className={btnLine} href="/admin/worker-tasks">Worker Tasks →</Link>
            </div>
          </div>
        </Section>
        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Version history">
            <ol className="max-h-64 space-y-2 overflow-y-auto">
              {versions.rows.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-3 border-b border-gold/10 pb-2 text-sm">
                  <span>
                    <span className="text-ivory">v{String(v.version)}</span>
                    <span className="ml-2 text-[0.65rem] text-ivory/45">{fmtDateTime(v.created_at)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge value={String(v.status)} />
                    {!locked && Number(v.version) !== design.current_version && (
                      <button onClick={() => setSpec({ ...DEFAULT_SPEC, ...(v.spec as Partial<DesignSpec>) })} className="text-[0.55rem] uppercase tracking-[0.2em] text-gold hover:underline">Restore</button>
                    )}
                  </span>
                </li>
              ))}
              {!versions.rows.length && <li className="text-sm text-ivory/45">Versions appear each time you save.</li>}
            </ol>
          </Section>
          <Section title="Approvals">
            <ol className="max-h-64 space-y-2 overflow-y-auto">
              {approvals.rows.map((a) => (
                <li key={a.id} className="border-b border-gold/10 pb-2 text-sm">
                  <span className="flex items-center justify-between gap-2"><span className="capitalize text-ivory">{label(a.subject)} · v{String(a.design_version ?? "—")}</span><StatusBadge value={String(a.decision)} /></span>
                  {a.comment ? <span className="mt-1 block text-xs text-ivory/55">{String(a.comment)}</span> : null}
                  <span className="text-[0.65rem] text-ivory/40">{fmtDateTime(a.decided_at)}</span>
                </li>
              ))}
              {!approvals.rows.length && <li className="text-sm text-ivory/45">No decisions yet.</li>}
            </ol>
          </Section>
        </div>
      </div>

      <aside className={`${panel} max-h-none space-y-4 p-4 xl:max-h-[1100px] xl:overflow-y-auto`}>
        <div className="flex items-center justify-between">
          <p className="text-[0.6rem] uppercase tracking-[0.28em] text-ivory/60">Properties</p>
          <StatusBadge value={design.status} />
        </div>
        {locked && <Notice>Approved designs are locked so production always matches what was signed off. Reopen as a new draft version to make changes.</Notice>}
        {!catReady && <Notice tone="info">{DESIGN_CATEGORIES.find((c) => c.value === category)?.label} is future-ready: you can record the design now; pattern drafting currently supports blouses.</Notice>}
        <fieldset disabled={locked} className="space-y-4 disabled:opacity-70">
          <Field label="Design name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category"><Select value={category} onChange={setCategory} options={DESIGN_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} /></Field>
            <Field label="Catalogue product"><Select value={productId} onChange={setProductId} options={[{ value: "", label: "Not linked" }, ...products.map((p) => ({ value: p.id, label: p.name }))]} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Front neckline"><Select value={spec.neckline} onChange={(v) => set("neckline", v)} options={opts(NECKLINES)} /></Field>
            <Field label="Back neckline"><Select value={spec.backNeck} onChange={(v) => set("backNeck", v)} options={opts(BACK_NECKS)} /></Field>
            <Field label="Sleeve"><Select value={spec.sleeve} onChange={(v) => set("sleeve", v)} options={opts(SLEEVES)} /></Field>
            <Field label="Cut"><Select value={spec.cut} onChange={(v) => set("cut", v)} options={opts(CUTS)} /></Field>
          </div>
          <Field label="Darts"><Chips values={spec.darts} options={DARTS} onChange={(v) => set("darts", v)} disabled={locked} /></Field>
          <Field label="Closure"><Select value={spec.closure} onChange={(v) => set("closure", v)} options={opts(CLOSURES)} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Main fabric"><Select value={spec.fabric} onChange={(v) => set("fabric", v)} options={strOpts(FABRICS)} /></Field>
            <Field label="Lining"><Select value={spec.lining} onChange={(v) => set("lining", v)} options={strOpts(LININGS)} /></Field>
          </div>
          <Field label="Embroidery"><Select value={spec.embroidery} onChange={(v) => set("embroidery", v)} options={strOpts(EMBROIDERY)} /></Field>
          <Field label="Accessories"><Chips values={spec.accessories} options={ACCESSORIES} onChange={(v) => set("accessories", v)} disabled={locked} /></Field>
          <Field label="Colourways">
            <div className="flex flex-wrap gap-1.5">
              {spec.colors.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 border border-ivory/15 px-2 py-1 text-xs text-ivory/80">
                  <span className="h-3 w-3" style={{ background: colorHex(c) }} />{c}
                  {!locked && spec.colors.length > 1 && <button type="button" aria-label={`Remove ${c}`} onClick={() => set("colors", spec.colors.filter((x) => x !== c))} className="text-ivory/40 hover:text-red-200">×</button>}
                </span>
              ))}
              {!locked && (
                <form onSubmit={(e) => { e.preventDefault(); if (newColor.trim()) { set("colors", [...spec.colors, newColor.trim()]); setNewColor(""); } }} className="flex">
                  <input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="Add colour" aria-label="Add colour" className="w-24 border border-gold/20 bg-transparent px-2 py-1 text-xs text-ivory outline-none focus:border-gold" />
                </form>
              )}
            </div>
          </Field>
          <Field label="Stitching instructions"><textarea rows={3} value={spec.instructions} onChange={(e) => set("instructions", e.target.value)} className={inputCls} placeholder="Seam finishes, embroidery placement, pressing…" /></Field>
          <Field label="Design notes"><textarea rows={2} value={spec.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} /></Field>
        </fieldset>

        <div className="sticky bottom-0 -mx-4 space-y-2 border-t border-gold/15 bg-noir-soft/95 p-4 backdrop-blur">
          {!locked && <button onClick={save} disabled={!dirty || saving} className={`${btnGold} w-full`}>{saving ? "Saving…" : dirty ? `Save as v${design.current_version + 1}` : "Saved"}</button>}
          <div className="grid grid-cols-2 gap-2">
            {design.status === "draft" && <button onClick={() => setStatus("sample", "Marked as sample")} className={btnLine}>Mark sample</button>}
            {(design.status === "draft" || design.status === "sample") && <button onClick={() => setStatus("approved", "Design approved and locked")} className={btnLine}>Approve design</button>}
            {design.status === "approved" && <button onClick={() => setStatus("draft", "Reopened as a new draft")} className={btnLine}>Reopen as draft</button>}
            {design.status !== "archived" && <button onClick={() => setStatus("archived", "Archived")} className={btnDanger}>Archive</button>}
            {design.status === "archived" && <button onClick={() => setStatus("draft", "Restored")} className={btnLine}>Restore</button>}
          </div>
          <p className="text-[0.6rem] text-ivory/40">Only administrators can approve. Approval records the version and locks the specification.</p>
        </div>
      </aside>
    </>
  );
}

export function useDesigns(live: boolean) {
  const d = useRows<Design>("garment_designs", "id,code,name,category,status,spec,current_version", live, { order: "updated_at" });
  return useMemo(() => ({ ...d, approved: d.rows.filter((x) => x.status === "approved") }), [d]);
}
export type { Design };
