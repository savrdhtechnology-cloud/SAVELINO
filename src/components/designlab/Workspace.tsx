"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { PageHeader, Panel, Field, Area, Select, Tabs, Skeleton, Empty, ICONS, Icon, toast, fmtDateTime } from "@/components/crm/ui";
import { db, must, removeMedia, revalidateSite, uploadMedia, useLoad } from "@/components/crm/data";
import { sha256 } from "@/lib/designlab/zip";
import { ANGLES, DESIGN_STATUS, errMsg, fetchApprovals, fetchDesign, rpc, sortImages, type Angle, type DlDesign, type DlImage } from "./data";
import { DesignLabNav, DesignPill, ErrorBox, Lightbox, Photo, angleLabel } from "./shared";
import { PatternTab } from "./PatternTab";
import { JobCardTab, HistoryTab } from "./JobCardTab";

type Tab = "details" | "measurements" | "pattern" | "jobcard" | "history";

export function Workspace({ designKey }: { designKey: string }) {
  const { data: design, loading, error, reload, setData } = useLoad(() => fetchDesign(designKey), [designKey]);
  const [tab, setTab] = useState<Tab>("details");
  const [viewer, setViewer] = useState<number | null>(null);
  const [sel, setSel] = useState(0);

  const patch = useCallback((p: Partial<DlDesign>) => setData((d) => (d ? { ...d, ...p } : d)), [setData]);

  if (loading && !design) return <div className="space-y-6"><PageHeader section="DesignLab" subtitle="Design Workspace" /><Skeleton className="h-[34rem]" /></div>;
  if (error) return <div className="space-y-6"><PageHeader section="DesignLab" subtitle="Design Workspace" /><ErrorBox message={error} retry={reload} /></div>;
  if (!design) return (
    <div className="space-y-6">
      <PageHeader section="DesignLab" subtitle="Design Workspace" />
      <Panel><Empty icon={ICONS.warn} title="Design not found">It may have been removed. <Link href="/admin/designlab/library" className="crm-accent underline">Back to the library</Link></Empty></Panel>
    </div>
  );

  const imgs = sortImages(design.designlab_images);
  const cur = imgs[Math.min(sel, imgs.length - 1)];

  return (
    <div className="space-y-6">
      <PageHeader
        section={`${design.design_code} · ${design.name}`}
        subtitle="Design Workspace"
        actions={<Link href="/admin/designlab/library" className="crm-btn">← Library</Link>}
      />
      <DesignLabNav />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* LEFT — images */}
        <ImagesPanel design={design} imgs={imgs} cur={cur} sel={sel} setSel={setSel} onZoom={(i) => setViewer(i)} onChanged={reload} />

        {/* RIGHT — details + tabs */}
        <div className="space-y-5">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] crm-muted">Design ID</p>
                <p className="crm-serif text-3xl crm-accent">{design.design_code}</p>
              </div>
              <DesignPill status={design.status} />
            </div>
            <p className="mt-2 text-sm crm-muted">{[design.category, design.color].filter(Boolean).join(" · ") || "Add category and colour in Design Details"}</p>
          </Panel>

          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            options={[
              { value: "details", label: "Design Details" },
              { value: "measurements", label: "Measurements" },
              { value: "pattern", label: "Pattern & Cutting" },
              { value: "jobcard", label: "Tailor Job Card" },
              { value: "history", label: "Production History" },
            ]}
          />
          {tab === "details" && <DetailsTab design={design} onPatch={patch} />}
          {(tab === "measurements" || tab === "pattern") && <PatternTab key="pattern-tab" design={design} part={tab} />}
          {tab === "jobcard" && <JobCardTab design={design} />}
          {tab === "history" && <HistoryTab design={design} />}
        </div>
      </div>

      {viewer !== null && <Lightbox images={imgs.map((i) => ({ url: i.url, label: `${design.design_code} · ${angleLabel(i.angle)}` }))} index={viewer} onIndex={setViewer} onClose={() => setViewer(null)} />}
    </div>
  );
}

/* ───────────────────────── Images ───────────────────────── */

function ImagesPanel({ design, imgs, cur, sel, setSel, onZoom, onChanged }: {
  design: DlDesign; imgs: DlImage[]; cur: DlImage | undefined; sel: number; setSel: (i: number) => void; onZoom: (i: number) => void; onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);
  const replRef = useRef<HTMLInputElement>(null);
  const wrap = async (job: () => Promise<void>, ok: string) => {
    setBusy(true);
    try { await job(); toast(ok); onChanged(); } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  };

  const add = (files: FileList | null) => {
    if (!files?.length) return;
    void wrap(async () => {
      let pos = (imgs[imgs.length - 1]?.position ?? -1) + 1;
      const errors: string[] = [];
      for (const f of Array.from(files)) {
        try {
          if (!/^image\/(jpeg|png|webp|avif)$/.test(f.type)) throw new Error("Only JPG, PNG, WebP or AVIF pictures");
          if (f.size > 25 * 1024 * 1024) throw new Error("Larger than 25 MB");
          const hash = await sha256(new Uint8Array(await f.arrayBuffer()));
          const up = await uploadMedia(`designlab/${design.design_code}`, f);
          const ins = await db().from("designlab_images").insert({ design_id: design.id, url: up.url, storage_path: up.path, position: pos++, angle: "unlabeled", width: up.width, height: up.height, file_name: f.name, content_hash: hash, size_bytes: f.size });
          if (ins.error) { await removeMedia([up.path]); throw new Error(ins.error.code === "23505" ? "This picture is already in this design" : ins.error.message); }
        } catch (e) { errors.push(`${f.name}: ${errMsg(e)}`); }
      }
      if (errors.length) throw new Error(errors.join(" · "));
    }, "Images added");
  };

  const replace = (file: File | undefined) => {
    if (!file || !cur) return;
    void wrap(async () => {
      if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) throw new Error("Only JPG, PNG, WebP or AVIF pictures");
      const hash = await sha256(new Uint8Array(await file.arrayBuffer()));
      const up = await uploadMedia(`designlab/${design.design_code}`, file);
      const upd = await db().from("designlab_images").update({ url: up.url, storage_path: up.path, width: up.width, height: up.height, file_name: file.name, content_hash: hash, size_bytes: file.size }).eq("id", cur.id);
      if (upd.error) { await removeMedia([up.path]); throw new Error(upd.error.code === "23505" ? "This picture is already in this design" : upd.error.message); }
      if (cur.storage_path) await removeMedia([cur.storage_path]).catch(() => undefined);
    }, "Image replaced");
  };

  const setAngle = (id: string, angle: Angle) => wrap(async () => { must(await db().from("designlab_images").update({ angle }).eq("id", id)); }, "Angle saved");
  const remove = (i: DlImage) => {
    if (!window.confirm("Remove this picture from the design? The file is deleted too.")) return;
    void wrap(async () => {
      must(await db().from("designlab_images").delete().eq("id", i.id));
      if (i.storage_path) await removeMedia([i.storage_path]).catch(() => undefined);
      setSel(0);
    }, "Image removed");
  };
  const makeCover = (i: DlImage) => wrap(async () => {
    const first = imgs[0];
    if (!first || first.id === i.id) return;
    must(await db().from("designlab_images").update({ position: first.position - 1 }).eq("id", i.id));
    setSel(0);
  }, "Main image changed");

  return (
    <Panel title="Images" icon={ICONS.image} subtitle={`${imgs.length} picture${imgs.length === 1 ? "" : "s"}`}
      action={<div className="flex gap-2"><button className="crm-btn" disabled={busy} onClick={() => addRef.current?.click()}><Icon d={ICONS.plus} /> Add</button></div>}>
      {imgs.length === 0 ? (
        <Empty icon={ICONS.image} title="No pictures yet">Add photos of this design.</Empty>
      ) : (
        <div className="space-y-4">
          <button type="button" onClick={() => onZoom(Math.min(sel, imgs.length - 1))} className="relative block aspect-[4/5] w-full cursor-zoom-in overflow-hidden rounded-2xl border" style={{ borderColor: "var(--crm-border)" }} aria-label="Zoom image">
            <Photo src={cur?.url ?? null} alt={`${design.name} — ${angleLabel(cur?.angle ?? "unlabeled")}`} className="h-full w-full object-contain" />
            <span className="absolute bottom-3 right-3 rounded-full px-3 py-1 text-xs" style={{ background: "rgba(20,6,10,.78)", color: "var(--crm-text)" }}>Click to zoom</span>
          </button>
          <div className="grid grid-cols-5 gap-2">
            {imgs.map((i, n) => (
              <button key={i.id} onClick={() => setSel(n)} className="aspect-[4/5] overflow-hidden rounded-lg border-2" style={{ borderColor: n === sel ? "var(--crm-accent)" : "var(--crm-border-soft)" }} aria-label={`Image ${n + 1}: ${angleLabel(i.angle)}`}>
                <Photo src={i.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          {cur && (
            <div className="flex flex-wrap items-end gap-2">
              <Select label="This picture shows" value={cur.angle} disabled={busy} onChange={(e) => setAngle(cur.id, e.target.value as Angle)} className="min-w-40 flex-1">
                {ANGLES.map((a) => <option key={a} value={a}>{angleLabel(a)}</option>)}
              </Select>
              <button className="crm-btn" disabled={busy || sel === 0} onClick={() => makeCover(cur)}>Make main</button>
              <button className="crm-btn" disabled={busy} onClick={() => replRef.current?.click()}>Replace</button>
              <button className="crm-btn" disabled={busy} onClick={() => remove(cur)}><Icon d={ICONS.trash} /></button>
            </div>
          )}
          {cur && <p className="text-xs crm-muted">{cur.file_name}{cur.width ? ` · ${cur.width}×${cur.height}px` : ""}{cur.width && Math.max(cur.width, cur.height ?? 0) < 700 ? " · low resolution" : ""}</p>}
        </div>
      )}
      <input ref={addRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
      <input ref={replRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={(e) => { replace(e.target.files?.[0]); e.target.value = ""; }} />
    </Panel>
  );
}

/* ───────────────────────── Details + approval ───────────────────────── */

function DetailsTab({ design, onPatch }: { design: DlDesign; onPatch: (p: Partial<DlDesign>) => void }) {
  const [f, setF] = useState({ name: design.name, category: design.category, color: design.color, fabric: design.fabric, neckline: design.neckline, sleeve: design.sleeve, closure: design.closure, lining: design.lining, stitching_notes: design.stitching_notes });
  const [busy, setBusy] = useState(false);
  const approvals = useLoad(() => fetchApprovals(design.id), [design.id]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const dirty = (Object.keys(f) as (keyof typeof f)[]).some((k) => f[k] !== design[k]);

  const save = async () => {
    if (!f.name.trim()) return toast("Give the design a name", "error");
    setBusy(true);
    try {
      const p = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()]));
      must(await db().from("designlab_designs").update(p).eq("id", design.id));
      onPatch(p as unknown as Partial<DlDesign>);
      toast("Design saved");
    } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  };
  const setStatus = async (to: "new" | "in_review" | "approved", note = "") => {
    setBusy(true);
    try {
      await rpc("designlab_set_design_status", { p_design: design.id, p_status: to, p_note: note });
      onPatch({ status: to });
      toast(`Status: ${DESIGN_STATUS[to].label}`);
      void approvals.reload();
    } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  };
  const toProduct = async () => {
    setBusy(true);
    try {
      const id = await rpc<string>("designlab_create_product_draft", { p_design: design.id });
      onPatch({ product_id: id });
      toast("Product Studio draft created — not published, no stock");
      void approvals.reload();
    } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  };

  const locked = design.status === "in_production";
  return (
    <div className="space-y-5">
      <Panel title="Design details" icon={ICONS.edit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Design name" value={f.name} maxLength={120} onChange={set("name")} className="sm:col-span-2" />
          <Field label="Category" value={f.category} onChange={set("category")} />
          <Field label="Colour" value={f.color} onChange={set("color")} />
          <Field label="Fabric" value={f.fabric} onChange={set("fabric")} placeholder="e.g. Raw silk" />
          <Field label="Lining" value={f.lining} onChange={set("lining")} placeholder="e.g. Cotton lining" />
          <Field label="Neckline style" value={f.neckline} onChange={set("neckline")} />
          <Field label="Sleeve style" value={f.sleeve} onChange={set("sleeve")} />
          <Field label="Closure type" value={f.closure} onChange={set("closure")} placeholder="Hooks / zip / back ties" className="sm:col-span-2" />
          <Area label="Stitching notes" value={f.stitching_notes} onChange={set("stitching_notes")} className="sm:col-span-2" rows={4} />
        </div>
        <div className="mt-4 flex justify-end"><button className="crm-btn crm-btn-gold" disabled={busy || !dirty} onClick={save}>{busy ? "Saving…" : "Save details"}</button></div>
      </Panel>

      <Panel title="Approval" icon={ICONS.shield} subtitle="Approving a design never changes stock.">
        <div className="flex flex-wrap items-center gap-3">
          <DesignPill status={design.status} />
          {design.status === "new" && <button className="crm-btn" disabled={busy} onClick={() => setStatus("in_review")}>Send for review</button>}
          {(design.status === "new" || design.status === "in_review") && <button className="crm-btn crm-btn-gold" disabled={busy} onClick={() => setStatus("approved")}>Approve design (admin)</button>}
          {(design.status === "approved" || design.status === "completed" || design.status === "in_review") && !locked && <button className="crm-btn" disabled={busy} onClick={() => window.confirm("Reopen this design for review?") && setStatus("in_review", "Reopened")}>Reopen</button>}
        </div>
        {locked && <p className="mt-2 text-xs crm-muted">In production — its status follows its tailor orders.</p>}
        <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--crm-border-soft)" }}>
          <p className="text-sm">Product listing is separate from the design and from stock.</p>
          {design.product_id ? (
            <p className="mt-2 text-sm"><Link className="crm-accent underline" href="/admin/studio">Product Studio draft exists</Link> <span className="crm-muted">— publish it there when ready.</span></p>
          ) : (
            <button className="crm-btn mt-2" disabled={busy || !["approved", "in_production", "completed"].includes(design.status)} onClick={toProduct}>Create Product Studio draft</button>
          )}
          {!design.product_id && !["approved", "in_production", "completed"].includes(design.status) && <p className="mt-1 text-xs crm-muted">Available after the design is approved.</p>}
        </div>
      </Panel>

      <ListingPanel design={design} onPatch={onPatch} onLogged={() => void approvals.reload()} />

      <Panel title="Approval log" icon={ICONS.clock}>
        {approvals.data?.length === 0 && <p className="text-sm crm-muted">Nothing yet.</p>}
        <ul className="space-y-2 text-sm">
          {(approvals.data ?? []).map((a) => (
            <li key={a.id} className="flex flex-wrap justify-between gap-2"><span>{a.action}{a.note ? <span className="crm-muted"> — {a.note}</span> : null}</span><span className="text-xs crm-muted">{a.by_name} · {fmtDateTime(a.created_at)}</span></li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ───────────────────────── Website listing (Upcoming / Live) ───────────────────────── */

type Listing = { id: string; slug: string; status: string; price: number; expected_at: string | null; stock: number; preorder_qty: number };

function ListingPanel({ design, onPatch, onLogged }: { design: DlDesign; onPatch: (p: Partial<DlDesign>) => void; onLogged: () => void }) {
  const prod = useLoad<Listing | null>(async () => {
    if (!design.product_id) return null;
    const rows = must(await db().from("products").select("id, slug, status, price, expected_at, stock, preorder_qty").eq("id", design.product_id).limit(1)) as Listing[];
    return rows[0] ?? null;
  }, [design.product_id, design.status]);
  const [price, setPrice] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const p = prod.data;
  const priceVal = price !== "" ? price : p?.price ? String(p.price) : "";
  const dateVal = date !== "" ? date : p?.expected_at ?? "";
  const status = p?.status ?? "none";

  const run = async (mode: "upcoming" | "live" | "off", ok: string) => {
    setBusy(true);
    try {
      const res = await rpc<{ product_id?: string }>("designlab_set_listing", { p_design: design.id, p_mode: mode, p_price: priceVal ? Math.round(Number(priceVal)) : null, p_expected: dateVal || null });
      if (res.product_id && !design.product_id) onPatch({ product_id: res.product_id });
      await revalidateSite().catch(() => undefined);
      toast(ok);
      await prod.reload();
      onLogged();
    } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  };

  const approved = ["approved", "in_production", "completed"].includes(design.status);
  return (
    <Panel title="Website listing" icon={ICONS.globe} subtitle="Upcoming pieces show on the home page and shop, and customers can pre-order them (no stock is used).">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span>Status: <b style={{ color: status === "live" ? "#58c48a" : status === "upcoming" ? "#e0a83a" : "var(--crm-muted)" }}>{status === "none" ? "not listed" : status === "draft" ? "off the website" : status}</b></span>
        {p && <span className="crm-muted">Stock {p.stock} · pre-ordered, waiting {p.preorder_qty}</span>}
        {p && (status === "live" || status === "upcoming") && <a className="crm-accent underline" href={`/shop/${p.slug}`} target="_blank" rel="noreferrer">View on website</a>}
      </div>
      {!approved && <p className="mt-2 text-xs crm-muted">Approve the design first (above).</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Selling price (₹)" type="number" min={1} value={priceVal} onChange={(e) => setPrice(e.target.value)} />
        <Field label="Expected date (upcoming)" type="date" value={dateVal} onChange={(e) => setDate(e.target.value)} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="crm-btn crm-btn-gold" disabled={busy || !approved || !priceVal} onClick={() => run("upcoming", "Listed as Upcoming — pre-orders are open")}>{status === "upcoming" ? "Update upcoming listing" : "List as Upcoming (pre-order)"}</button>
        <button className="crm-btn" disabled={busy || !approved || !priceVal || status === "live"} onClick={() => run("live", "Moved to the live shop")}>Move to live shop</button>
        <button className="crm-btn" disabled={busy || status === "none" || status === "draft"} onClick={() => window.confirm("Take this design off the website?") && run("off", "Taken off the website")}>Take off website</button>
      </div>
      <p className="mt-2 text-xs crm-muted">“Move to live shop” needs finished stock (post QC-accepted pieces from the Production Tracker first). Pre-orders already taken are served first from the finished pieces.</p>
    </Panel>
  );
}
