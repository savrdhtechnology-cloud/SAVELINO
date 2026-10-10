"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { imageToDataUrl } from "@/components/atelier/image";
import { toast } from "@/lib/admin/store";
import { BACK_NECKS, CLOSURES, CUTS, DEFAULT_SPEC, DESIGN_CATEGORIES, NECKLINES, SLEEVES, type DesignSpec } from "@/lib/atelier/constants";
import { write } from "@/lib/atelier/store";
import { AppHeader, Field, Notice, Section, Select, btnGold, btnGhost, btnLine, inputCls, panel } from "./ui";

type Draft = { name: string; category: string; spec: DesignSpec; uncertainty: string[]; confidence: string; warning: string };
type View = "front" | "back" | "side";
type Photo = { name: string; view: View; data: string };

/** Keeps each photo small so up to four fit in one request (Vercel caps request bodies at ~4.5 MB). */
const MAX_EDGE = 1024;
const MAX_CHARS = 700_000;

/** Preview-mode example so the flow can be explored without an AI key. Never offered on the live CRM. */
const PREVIEW_SAMPLE: Draft = {
  name: "Ruby shimmer sleeveless princess blouse",
  category: "designer-blouses",
  spec: {
    ...DEFAULT_SPEC,
    neckline: "u",
    backNeck: "round",
    sleeve: "sleeveless",
    cut: "princess",
    darts: ["waist"],
    closure: "back-hooks",
    fabric: "Metallic shimmer (visual estimate)",
    lining: "To verify",
    embroidery: "None visible",
    accessories: [],
    colors: ["Ruby red"],
    instructions: "Wide scoop neckline, broad shoulder straps and princess panel seams. Verify back, closure, stretch and measurements before drafting patterns.",
    notes: "PREVIEW EXAMPLE — front view only; back neckline and closure are placeholders.",
  },
  uncertainty: ["Back view is missing", "Back neckline and closure not visible", "No size or fabric consumption can be derived from a photo"],
  confidence: "Front style only",
  warning: "Preview example — no AI request was made. Nothing here is verified.",
};

const opts = (list: readonly { value: string; label: string }[]) => list.map((o) => ({ value: o.value, label: o.label }));

export function PhotoTemplateStudio({ live }: { live: boolean }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [busy, setBusy] = useState<"" | "reading" | "analysing" | "saving">("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  const onFiles = async (incoming: FileList | null) => {
    const files = Array.from(incoming ?? []).slice(0, 4);
    if (!files.length) return;
    setBusy("reading");
    setError("");
    setDraft(null);
    setSavedId(null);
    try {
      const prepared: Photo[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        prepared.push({ name: f.name.slice(0, 65), view: i === 0 ? "front" : i === 1 ? "back" : "side", data: await imageToDataUrl(f, MAX_EDGE, MAX_CHARS) });
      }
      setPhotos(prepared);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const analyze = async () => {
    if (!photos.length) return;
    setBusy("analysing");
    setError("");
    setDraft(null);
    try {
      const res = await fetch("/api/admin/photo-template/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: photos.map((p) => p.data), views: photos.map((p) => p.view) }),
      });
      const json = (await res.json().catch(() => ({}))) as Partial<Draft> & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Analysis failed. Please try again.");
      setDraft({ ...(json as Draft), spec: { ...DEFAULT_SPEC, ...(json.spec ?? {}) } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const save = async () => {
    if (!draft) return;
    setBusy("saving");
    setError("");
    const sketches = photos.map((p) => ({ name: `${p.view}: ${p.name}`, view: p.view === "back" ? "back" : "front", kind: "reference", data: p.data }));
    const notes = [draft.spec.notes, draft.uncertainty.length ? `PHOTO ANALYSIS (UNVERIFIED): ${draft.uncertainty.join("; ")}` : ""].filter(Boolean).join("\n");
    const { data, error: err } = await write(live, "garment_designs", "insert", { name: draft.name.trim() || "Photo reference design", category: draft.category, spec: { ...draft.spec, notes }, sketches });
    setBusy("");
    if (err) return setError(err);
    setSavedId(data && !Array.isArray(data) ? String((data as { id: string }).id) : "saved");
    toast("Saved as a draft in Design Studio");
  };

  const set = <K extends keyof DesignSpec>(k: K, v: DesignSpec[K]) => draft && setDraft({ ...draft, spec: { ...draft.spec, [k]: v } });

  return (
    <div className="space-y-6">
      <AppHeader
        live={live}
        eyebrow="Atelier · Photo to Template"
        title="Photo to Template"
        description="Upload front, back and side photos of a garment. AI proposes editable style details; you review them and save a Design Studio draft. Photos guide style only — sizes, patterns and cutting always go through their verified workflows."
      />

      <Section title="Reference photographs (1–4)">
        <div className="space-y-4">
          <label className={`${btnLine} cursor-pointer`}>
            {busy === "reading" ? "Preparing photos…" : photos.length ? "Choose different photos" : "Choose photos"}
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Select garment images" onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />
          </label>
          {photos.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((p, i) => (
                <li key={i} className={`${panel} p-2`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.data} alt={p.name} className="aspect-[3/4] w-full object-cover" />
                  <p className="mt-2 truncate text-[0.65rem] text-ivory/55">{p.name}</p>
                  <Select ariaLabel={`View for ${p.name}`} value={p.view} onChange={(v) => setPhotos((list) => list.map((x, j) => (j === i ? { ...x, view: v as View } : x)))} options={[{ value: "front", label: "Front" }, { value: "back", label: "Back" }, { value: "side", label: "Side" }]} />
                </li>
              ))}
            </ul>
          )}
          <p className="text-[0.65rem] text-ivory/45">Photos are resized in your browser (max {MAX_EDGE}px) and sent to the configured image-analysis provider for this request only. They are stored only if you save the draft, as private references on the design.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={analyze} disabled={!!busy || !photos.length} className={btnGold}>{busy === "analysing" ? "Analysing…" : "Analyse photos & propose draft"}</button>
            {!live && <button onClick={() => { setDraft(PREVIEW_SAMPLE); setSavedId(null); setError(""); }} className={btnGhost}>Load preview example</button>}
          </div>
        </div>
      </Section>

      {error && <Notice tone="danger">{error}</Notice>}

      <AnimatePresence>
        {draft && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Section title="Editable design proposal">
              <div className="space-y-5">
                <Notice>{draft.warning}{draft.confidence ? ` · Confidence: ${draft.confidence}` : ""}</Notice>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Design name"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} /></Field>
                  <Field label="Category"><Select value={draft.category} onChange={(v) => setDraft({ ...draft, category: v })} options={DESIGN_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))} /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Field label="Front neckline"><Select value={draft.spec.neckline} onChange={(v) => set("neckline", v)} options={opts(NECKLINES)} /></Field>
                  <Field label="Back neckline"><Select value={draft.spec.backNeck} onChange={(v) => set("backNeck", v)} options={opts(BACK_NECKS)} /></Field>
                  <Field label="Sleeve"><Select value={draft.spec.sleeve} onChange={(v) => set("sleeve", v)} options={opts(SLEEVES)} /></Field>
                  <Field label="Cut"><Select value={draft.spec.cut} onChange={(v) => set("cut", v)} options={opts(CUTS)} /></Field>
                  <Field label="Closure"><Select value={draft.spec.closure} onChange={(v) => set("closure", v)} options={opts(CLOSURES)} /></Field>
                  <Field label="Fabric (visual estimate)"><input value={draft.spec.fabric} onChange={(e) => set("fabric", e.target.value)} className={inputCls} /></Field>
                  <Field label="Lining"><input value={draft.spec.lining} onChange={(e) => set("lining", e.target.value)} className={inputCls} /></Field>
                  <Field label="Embroidery"><input value={draft.spec.embroidery} onChange={(e) => set("embroidery", e.target.value)} className={inputCls} /></Field>
                </div>
                <Field label="Construction notes"><textarea rows={3} value={draft.spec.instructions} onChange={(e) => set("instructions", e.target.value)} className={inputCls} /></Field>
                <Field label="Notes"><textarea rows={2} value={draft.spec.notes} onChange={(e) => set("notes", e.target.value)} className={inputCls} /></Field>
                {draft.uncertainty.length > 0 && (
                  <div>
                    <p className="text-[0.6rem] uppercase tracking-[0.25em] text-gold">Check before production</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ivory/70">{draft.uncertainty.map((x, i) => <li key={i}>{x}</li>)}</ul>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={save} disabled={!!busy || !!savedId} className={btnGold}>{busy === "saving" ? "Saving…" : savedId ? "Draft saved" : "Save draft to Design Studio"}</button>
                  {savedId && <Link href="/admin/design-studio" className={btnLine}>Open Design Studio →</Link>}
                </div>
                <p className="text-[0.65rem] text-ivory/45">Saved as a draft only. Approval, size charts, patterns, markers, batches and QC remain separate verified steps.</p>
              </div>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
