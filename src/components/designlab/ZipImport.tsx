"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { PageHeader, Panel, Field, Empty, ICONS, Icon, toast, fmtDateTime } from "@/components/crm/ui";
import { db, inBatches, must, uploadMedia, useLoad } from "@/components/crm/data";
import { listZip, readZipEntry, sha256, sniffImage, ZIP_LIMITS, ZipError, type ZipEntry } from "@/lib/designlab/zip";
import { parseCatalogCsv, suggestGroups, type CatalogRow, type SuggestedGroup } from "@/lib/designlab/group";
import { ANGLES, errMsg, fetchBatches, type Angle } from "./data";
import { DesignLabNav, ErrorBox, Pill, angleLabel } from "./shared";

type Img = { id: string; path: string; angle: Angle; hash: string; size: number; ok: boolean; problem?: string; existsIn?: string; dupInZip?: boolean; keep: boolean };
type Grp = { key: string; name: string; category: string; color: string; sku: string | null; basis: SuggestedGroup["basis"]; needsReview: boolean; include: boolean; existingSku?: string; images: Img[] };
type Failure = { groupKey: string; imageId: string; path: string; reason: string };

const mb = (n: number) => `${(n / 1048576).toFixed(1)} MB`;
const base = (p: string) => p.slice(p.lastIndexOf("/") + 1);

export function ZipImport() {
  const history = useLoad(fetchBatches, []);
  const [file, setFile] = useState<File | null>(null);
  const [entries, setEntries] = useState<ZipEntry[]>([]);
  const [groups, setGroups] = useState<Grp[]>([]);
  const [ignored, setIgnored] = useState<{ path: string; reason: string }[]>([]);
  const [stage, setStage] = useState<"idle" | "scanning" | "review" | "importing" | "done">("idle");
  const [scan, setScan] = useState({ done: 0, total: 0 });
  const [prog, setProg] = useState({ done: 0, total: 0, current: "" });
  const [failures, setFailures] = useState<Failure[]>([]);
  const [created, setCreated] = useState<{ key: string; id: string; code: string }[]>([]);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => { setFile(null); setEntries([]); setGroups([]); setIgnored([]); setStage("idle"); setFailures([]); setCreated([]); setBatchId(null); setProblem(null); };

  /* ───── 1. read + validate + group ───── */
  const open = useCallback(async (f: File) => {
    setProblem(null);
    if (!/\.zip$/i.test(f.name)) return setProblem("Please choose a .zip file.");
    setStage("scanning");
    try {
      const list = await listZip(f);
      const imagePaths = list.entries.map((e) => e.path);
      let catalog: CatalogRow[] = [];
      const csv = list.entries.find((e) => /(^|\/)product_catalog\.csv$/i.test(e.path));
      if (csv && csv.size < 2_000_000) catalog = parseCatalogCsv(new TextDecoder().decode(await readZipEntry(f, csv)));
      const sug = suggestGroups(imagePaths, catalog);
      if (sug.groups.length === 0) throw new ZipError("No JPG, PNG, WebP or AVIF pictures were found in this ZIP.");

      const byPath = new Map(list.entries.map((e) => [e.path, e]));
      const total = sug.groups.reduce((n, g) => n + g.images.length, 0);
      setScan({ done: 0, total });
      const seen = new Map<string, string>(); // hash → first path
      const out: Grp[] = [];
      let done = 0;
      for (const g of sug.groups) {
        const imgs: Img[] = [];
        for (const im of g.images) {
          const e = byPath.get(im.path)!;
          let hash = "", ok = true, problemText: string | undefined;
          try {
            const bytes = await readZipEntry(f, e);
            if (!sniffImage(bytes)) { ok = false; problemText = "Not a real picture (content does not match its extension)"; }
            hash = await sha256(bytes);
          } catch (err) { ok = false; problemText = errMsg(err); hash = `bad-${im.path}`; }
          const dup = seen.has(hash) && ok;
          if (ok) seen.set(hash, im.path);
          imgs.push({ id: crypto.randomUUID(), path: im.path, angle: im.angle, hash, size: e.size, ok, problem: problemText, dupInZip: dup, keep: ok && !dup });
          setScan({ done: ++done, total });
        }
        out.push({ key: g.key, name: g.name, category: g.category, color: g.color, sku: g.sku, basis: g.basis, needsReview: g.needsReview, include: true, images: imgs });
      }

      // Duplicate detection against what is already saved.
      const hashes = [...new Set(out.flatMap((g) => g.images.filter((i) => i.ok).map((i) => i.hash)))];
      const have = new Map<string, string>();
      for (let i = 0; i < hashes.length; i += 80) {
        const rows = must(await db().from("designlab_images").select("content_hash, designlab_designs(design_code)").in("content_hash", hashes.slice(i, i + 80))) as unknown as { content_hash: string; designlab_designs: { design_code: string } | null }[];
        rows.forEach((r) => r.content_hash && have.set(r.content_hash, r.designlab_designs?.design_code ?? "?"));
      }
      const skus = out.map((g) => g.sku).filter(Boolean) as string[];
      const haveSku = new Map<string, string>();
      if (skus.length) {
        const rows = must(await db().from("designlab_designs").select("source_sku, design_code").in("source_sku", skus)) as { source_sku: string; design_code: string }[];
        rows.forEach((r) => haveSku.set(r.source_sku, r.design_code));
      }
      for (const g of out) {
        g.images.forEach((i) => { const c = have.get(i.hash); if (c) { i.existsIn = c; i.keep = false; } });
        if (g.sku && haveSku.has(g.sku)) { g.existingSku = haveSku.get(g.sku); g.include = false; }
        else if (g.images.every((i) => !i.keep)) g.include = false;
      }
      setFile(f); setEntries(list.entries); setGroups(out);
      setIgnored([...sug.ignored, ...list.skipped]);
      setStage("review");
    } catch (e) {
      setProblem(e instanceof ZipError ? e.message : `Could not read this ZIP: ${errMsg(e)}`);
      setStage("idle");
    }
  }, []);

  /* ───── 2. manual review helpers ───── */
  const upd = (key: string, p: Partial<Grp>) => setGroups((gs) => gs.map((g) => (g.key === key ? { ...g, ...p } : g)));
  const updImg = (key: string, id: string, p: Partial<Img>) => setGroups((gs) => gs.map((g) => (g.key === key ? { ...g, images: g.images.map((i) => (i.id === id ? { ...i, ...p } : i)) } : g)));
  const move = (fromKey: string, imgId: string, toKey: string) =>
    setGroups((gs) => {
      const src = gs.find((g) => g.key === fromKey);
      const im = src?.images.find((i) => i.id === imgId);
      if (!src || !im) return gs;
      let next = gs.map((g) => (g.key === fromKey ? { ...g, images: g.images.filter((i) => i.id !== imgId) } : g));
      if (toKey === "__new") next = [...next, { key: `manual-${crypto.randomUUID()}`, name: "New design", category: src.category, color: "", sku: null, basis: "loose", needsReview: true, include: true, images: [im] }];
      else next = next.map((g) => (g.key === toKey ? { ...g, images: [...g.images, im] } : g));
      return next.filter((g) => g.images.length > 0);
    });
  const merge = (fromKey: string, toKey: string) => {
    if (!toKey || fromKey === toKey) return;
    setGroups((gs) => {
      const src = gs.find((g) => g.key === fromKey);
      if (!src) return gs;
      return gs.filter((g) => g.key !== fromKey).map((g) => (g.key === toKey ? { ...g, images: [...g.images, ...src.images] } : g));
    });
  };

  const plan = useMemo(() => {
    const inc = groups.filter((g) => g.include && g.images.some((i) => i.keep));
    return { groups: inc.length, images: inc.reduce((n, g) => n + g.images.filter((i) => i.keep).length, 0) };
  }, [groups]);
  const blockers = groups.filter((g) => g.include && g.images.some((i) => i.keep) && !g.name.trim());

  /* ───── 3. import ───── */
  const uploadOne = async (zip: File, designId: string, code: string, img: Img, position: number) => {
    const entry = entries.find((e) => e.path === img.path);
    if (!entry) throw new Error("File not found in the ZIP");
    const bytes = await readZipEntry(zip, entry);
    const mime = sniffImage(bytes);
    if (!mime) throw new Error("Not a real picture");
    const f = new File([bytes as BlobPart], base(img.path), { type: mime });
    const up = await uploadMedia(`designlab/${code}`, f);
    const ins = await db().from("designlab_images").insert({ design_id: designId, url: up.url, storage_path: up.path, position, angle: img.angle, width: up.width, height: up.height, file_name: base(img.path), content_hash: img.hash, size_bytes: img.size, batch_id: batchId });
    if (ins.error) {
      await db().storage.from("media").remove([up.path]); // don't leave an orphan file behind
      throw new Error(ins.error.message);
    }
  };

  const run = async (retryOnly: boolean) => {
    if (!file) return;
    setStage("importing");
    const zip = file;
    let bid = batchId;
    try {
      if (!bid) {
        const b = must(await db().from("designlab_import_batches").insert({ file_name: zip.name, file_size: zip.size }).select("id").single()) as { id: string };
        bid = b.id; setBatchId(bid);
      }
      const todo = groups.filter((g) => g.include && g.images.some((i) => i.keep));
      const failedIds = new Set(failures.map((f) => f.imageId));
      const work = retryOnly ? todo.map((g) => ({ ...g, images: g.images.filter((i) => failedIds.has(i.id)) })).filter((g) => g.images.length) : todo;
      const total = work.reduce((n, g) => n + g.images.filter((i) => i.keep).length, 0);
      setProg({ done: 0, total, current: "" });
      const nextFail: Failure[] = [];
      const made = [...created];
      let done = 0;
      for (const g of work) {
        let rec = made.find((c) => c.key === g.key);
        if (!rec) {
          try {
            const d = must(await db().from("designlab_designs").insert({ name: g.name.trim(), category: g.category.trim(), color: g.color.trim(), source_sku: g.sku, batch_id: bid }).select("id, design_code").single()) as { id: string; design_code: string };
            rec = { key: g.key, id: d.id, code: d.design_code };
            made.push(rec);
          } catch (e) {
            g.images.filter((i) => i.keep).forEach((i) => nextFail.push({ groupKey: g.key, imageId: i.id, path: i.path, reason: `Design not created: ${errMsg(e)}` }));
            done += g.images.filter((i) => i.keep).length;
            setProg({ done, total, current: g.name });
            continue;
          }
        }
        const r = rec as { key: string; id: string; code: string };
        const kept = g.images.filter((i) => i.keep);
        const start = retryOnly ? 1000 : 0;
        await inBatches(kept.map((img, idx) => ({ img, idx })), 3, async ({ img, idx }) => {
          try {
            await uploadOne(zip, r.id, r.code, img, start + idx);
          } catch (e) {
            nextFail.push({ groupKey: g.key, imageId: img.id, path: img.path, reason: errMsg(e) });
          } finally {
            setProg({ done: ++done, total, current: `${r.code} · ${g.name}` });
          }
        });
      }
      setCreated(made);
      setFailures(nextFail);
      // Finish the history row with the real number of saved pictures (counts retries too).
      const saved = await db().from("designlab_images").select("id", { count: "exact", head: true }).eq("batch_id", bid);
      const allImgs = groups.flatMap((g) => g.images);
      const skipped = allImgs.filter((i) => !i.keep).map((i) => ({ path: i.path, reason: i.problem ?? (i.existsIn ? `Already saved in ${i.existsIn}` : i.dupInZip ? "Duplicate inside this ZIP" : "Left out in review") })).concat(ignored);
      const okCount = saved.count ?? total - nextFail.length;
      const status = nextFail.length === 0 ? "done" : okCount > 0 ? "partial" : "failed";
      must(await db().from("designlab_import_batches").update({ status, designs_created: made.length, images_uploaded: okCount, images_failed: nextFail.length, images_skipped: skipped.length, report: { failed: nextFail.map((f) => ({ path: f.path, reason: f.reason })), skipped }, finished_at: new Date().toISOString() }).eq("id", bid));
      setStage("done");
      void history.reload();
      toast(nextFail.length ? `Imported with ${nextFail.length} failed file(s) — you can retry them` : `${made.length} design(s) imported`, nextFail.length ? "error" : "ok");
    } catch (e) {
      setStage("review");
      toast(errMsg(e), "error");
    }
  };

  const onDrop = (ev: DragEvent) => { ev.preventDefault(); setDrag(false); const f = ev.dataTransfer.files?.[0]; if (f) void open(f); };

  return (
    <div className="space-y-6">
      <PageHeader section="DesignLab" subtitle="ZIP Import" />
      <DesignLabNav />

      {problem && <ErrorBox message={problem} />}

      {(stage === "idle" || stage === "scanning") && (
        <Panel title="Upload a ZIP of blouse photos" icon={ICONS.upload} subtitle={`JPG · JPEG · PNG · WebP (AVIF also accepted) · folders allowed · up to ${ZIP_LIMITS.maxArchiveBytes / 1048576} MB`}>
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            onClick={() => stage === "idle" && inputRef.current?.click()}
            role="button" tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-16 text-center transition-colors"
            style={{ borderColor: drag ? "var(--crm-accent)" : "var(--crm-border)", background: drag ? "var(--crm-border-soft)" : "transparent" }}
          >
            <Icon d={ICONS.upload} className="h-10 w-10 crm-accent" />
            {stage === "scanning" ? (
              <>
                <p className="crm-serif text-xl">Checking pictures… {scan.done}/{scan.total || "?"}</p>
                <Bar value={scan.total ? scan.done / scan.total : 0} />
              </>
            ) : (
              <>
                <p className="crm-serif text-xl">Drop your ZIP here, or click to choose</p>
                <p className="max-w-xl text-sm crm-muted">Folders become designs. Nothing is saved until you review the suggested groups and press Import. Pictures are validated, and duplicates are detected automatically.</p>
              </>
            )}
            <input ref={inputRef} type="file" accept=".zip,application/zip" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void open(f); }} />
          </div>
        </Panel>
      )}

      {stage === "review" && file && (
        <>
          <Panel title="Review suggested designs" icon={ICONS.layers} subtitle={`${file.name} · ${mb(file.size)} · ${groups.length} suggested design(s)`}
            action={<div className="flex gap-2"><button className="crm-btn" onClick={reset}>Cancel</button><button className="crm-btn crm-btn-gold" disabled={plan.groups === 0 || blockers.length > 0} onClick={() => run(false)}>Import {plan.groups} design{plan.groups === 1 ? "" : "s"} · {plan.images} photo{plan.images === 1 ? "" : "s"}</button></div>}>
            <p className="text-sm crm-muted">One folder = one design. Groups come from folder names and file names only — colour alone never merges anything. Fix a group by renaming, moving a photo, or merging two groups. {blockers.length > 0 && <span style={{ color: "#ef6b6b" }}>A selected design has no name.</span>}</p>
            {ignored.length > 0 && <p className="mt-2 text-xs crm-muted">Left out automatically: {ignored.length} file(s) (size guides, unsafe or unsupported files). They are listed in the history after import.</p>}
          </Panel>
          <div className="grid gap-5 lg:grid-cols-2">
            {groups.map((g) => (
              <GroupCard key={g.key} g={g} zip={file} entries={entries} others={groups.filter((x) => x.key !== g.key)} onChange={(p) => upd(g.key, p)} onImg={(id, p) => updImg(g.key, id, p)} onMove={(id, to) => move(g.key, id, to)} onMerge={(to) => merge(g.key, to)} />
            ))}
          </div>
        </>
      )}

      {stage === "importing" && (
        <Panel title="Importing…" icon={ICONS.upload}>
          <div className="space-y-3 py-6">
            <p className="crm-serif text-xl">{prog.done} / {prog.total} photos</p>
            <Bar value={prog.total ? prog.done / prog.total : 0} />
            <p className="text-sm crm-muted">{prog.current || "Starting…"}</p>
            <p className="text-xs crm-muted">Keep this tab open until it finishes.</p>
          </div>
        </Panel>
      )}

      {stage === "done" && (
        <Panel title={failures.length ? "Imported — some files failed" : "Import complete"} icon={failures.length ? ICONS.warn : ICONS.check}>
          <div className="space-y-4">
            <p className="text-sm">{created.length} design(s) saved with unique Design IDs: <span className="crm-accent">{created.map((c) => c.code).join(", ")}</span></p>
            {failures.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm" style={{ color: "#ef6b6b" }}>{failures.length} file(s) failed:</p>
                <ul className="max-h-48 overflow-auto rounded-xl border p-3 text-xs" style={{ borderColor: "var(--crm-border)" }}>
                  {failures.map((f) => <li key={f.imageId} className="py-0.5"><b>{base(f.path)}</b> — {f.reason}</li>)}
                </ul>
                <button className="crm-btn crm-btn-gold" onClick={() => run(true)}>Retry failed files</button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <a href="/admin/designlab/library" className="crm-btn crm-btn-gold">Open Design Library</a>
              <button className="crm-btn" onClick={reset}>Import another ZIP</button>
            </div>
          </div>
        </Panel>
      )}

      <Panel title="Upload history" icon={ICONS.clock}>
        {history.error && <ErrorBox message={history.error} retry={history.reload} />}
        {history.data && history.data.length === 0 && <Empty icon={ICONS.archive} title="No imports yet" />}
        <ul className="divide-y" style={{ borderColor: "var(--crm-border-soft)" }}>
          {(history.data ?? []).map((b) => (
            <li key={b.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p><b>{b.file_name}</b> <span className="crm-muted">· {mb(b.file_size)} · {fmtDateTime(b.created_at)}</span></p>
                <Pill color={b.status === "done" ? "#58c48a" : b.status === "partial" ? "#e0a83a" : b.status === "running" ? "#5aa0e8" : "#ef6b6b"}>{b.status}</Pill>
              </div>
              <p className="mt-1 text-xs crm-muted">{b.designs_created} design(s) · {b.images_uploaded} uploaded · {b.images_failed} failed · {b.images_skipped} skipped</p>
              {(b.report?.failed?.length ?? 0) > 0 && (
                <details className="mt-1 text-xs"><summary className="cursor-pointer crm-accent">Failed files</summary>
                  <ul className="mt-1 space-y-0.5">{b.report.failed!.map((f, i) => <li key={i}>{f.path} — {f.reason}</li>)}</ul>
                  <p className="mt-1 crm-muted">To retry later, upload the same ZIP again: photos already saved are detected as duplicates and skipped.</p>
                </details>
              )}
              {(b.report?.skipped?.length ?? 0) > 0 && (
                <details className="mt-1 text-xs"><summary className="cursor-pointer crm-muted">Skipped files ({b.report.skipped!.length})</summary>
                  <ul className="mt-1 space-y-0.5">{b.report.skipped!.map((f, i) => <li key={i}>{f.path} — {f.reason}</li>)}</ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full max-w-md overflow-hidden rounded-full" style={{ background: "var(--crm-border-soft)" }} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(value * 100)}%`, background: "linear-gradient(90deg, var(--crm-accent-2), var(--crm-accent))" }} />
    </div>
  );
}

function Thumb({ zip, entry, alt }: { zip: File; entry: ZipEntry | undefined; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true, u: string | null = null;
    (async () => {
      if (!entry) return;
      try {
        const bytes = await readZipEntry(zip, entry);
        const mime = sniffImage(bytes);
        if (!mime || !live) return;
        u = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mime }));
        setUrl(u);
      } catch { /* shown as empty */ }
    })();
    return () => { live = false; if (u) URL.revokeObjectURL(u); };
  }, [zip, entry]);
  // eslint-disable-next-line @next/next/no-img-element
  return url ? <img src={url} alt={alt} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-[0.65rem] crm-muted">…</div>;
}

function GroupCard({ g, zip, entries, others, onChange, onImg, onMove, onMerge }: {
  g: Grp; zip: File; entries: ZipEntry[]; others: Grp[];
  onChange: (p: Partial<Grp>) => void; onImg: (id: string, p: Partial<Img>) => void; onMove: (id: string, to: string) => void; onMerge: (to: string) => void;
}) {
  const byPath = useMemo(() => new Map(entries.map((e) => [e.path, e])), [entries]);
  const kept = g.images.filter((i) => i.keep).length;
  return (
    <section className="crm-panel p-4" style={{ opacity: g.include ? 1 : 0.6 }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={g.include} onChange={(e) => onChange({ include: e.target.checked })} />
          <span className="font-medium">Import this design</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {g.needsReview && <Pill color="#e0a83a">Needs review</Pill>}
          {g.existingSku && <Pill color="#ef6b6b">SKU already saved as {g.existingSku}</Pill>}
          <Pill color="#8a8a8a">{g.basis === "catalog" ? "From catalog CSV" : g.basis === "folder" ? "From folder" : g.basis === "filename" ? "From file names" : "Loose photo"}</Pill>
        </div>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Field label="Design name" value={g.name} maxLength={120} onChange={(e) => onChange({ name: e.target.value })} className="sm:col-span-3" />
        <Field label="Category" value={g.category} onChange={(e) => onChange({ category: e.target.value })} />
        <Field label="Colour" value={g.color} onChange={(e) => onChange({ color: e.target.value })} />
        <Field label="Catalog SKU" value={g.sku ?? ""} onChange={(e) => onChange({ sku: e.target.value.trim().toUpperCase() || null })} />
      </div>
      <p className="mt-3 text-xs crm-muted">{kept} of {g.images.length} photo(s) will be imported</p>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {g.images.map((im) => (
          <figure key={im.id} className="space-y-1.5" style={{ opacity: im.keep ? 1 : 0.5 }}>
            <div className="aspect-[4/5] overflow-hidden rounded-xl border" style={{ borderColor: "var(--crm-border)" }}>
              <Thumb zip={zip} entry={byPath.get(im.path)} alt={base(im.path)} />
            </div>
            <figcaption className="space-y-1 text-[0.7rem]">
              <p className="truncate" title={im.path}>{base(im.path)}</p>
              {!im.ok && <p style={{ color: "#ef6b6b" }}>{im.problem}</p>}
              {im.existsIn && <p style={{ color: "#e0a83a" }}>Already saved in {im.existsIn}</p>}
              {im.dupInZip && <p style={{ color: "#e0a83a" }}>Duplicate inside this ZIP</p>}
              <select aria-label="Angle" className="crm-input !py-1 !text-xs" value={im.angle} onChange={(e) => onImg(im.id, { angle: e.target.value as Angle })}>
                {ANGLES.map((a) => <option key={a} value={a}>{angleLabel(a)}</option>)}
              </select>
              <select aria-label="Move photo" className="crm-input !py-1 !text-xs" value="" onChange={(e) => e.target.value && onMove(im.id, e.target.value)}>
                <option value="">Move to…</option>
                <option value="__new">+ New design</option>
                {others.map((o) => <option key={o.key} value={o.key}>{o.name || o.key}</option>)}
              </select>
              {im.ok && <label className="flex items-center gap-1.5"><input type="checkbox" checked={im.keep} onChange={(e) => onImg(im.id, { keep: e.target.checked })} /> Import</label>}
            </figcaption>
          </figure>
        ))}
      </div>
      {others.length > 0 && (
        <div className="mt-3">
          <select aria-label="Merge this whole design into another" className="crm-input !text-xs" value="" onChange={(e) => e.target.value && window.confirm(`Merge all photos of “${g.name}” into the chosen design?`) && onMerge(e.target.value)}>
            <option value="">Merge this whole group into…</option>
            {others.map((o) => <option key={o.key} value={o.key}>{o.name || o.key}</option>)}
          </select>
        </div>
      )}
    </section>
  );
}
