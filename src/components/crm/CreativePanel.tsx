"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Color, CreativeLayout, CreativeSettings, Framing } from "@/lib/data/types";
import { DEFAULT_FRAMING, DEFAULT_LAYOUT, FEATURE_PRESETS, ICON_PATHS, iconFor, loadBitmap, loadCreativeFonts, renderAll, type Source } from "./creative";
import { findFaceBottom } from "./faces";
import { EASE, Field, ICONS, Icon, Toggle, toast } from "./ui";

export type StudioPhoto = { key: string; url: string; file?: File };
export type Faces = Record<string, number | null>;
export type Preview = { id: string; label: string; url: string };

/** Caches decoded photos so previews and publishing never decode the same photo twice. */
export function useBitmaps() {
  const cache = useRef(new Map<string, Promise<ImageBitmap>>());
  const get = useCallback((p: StudioPhoto) => {
    let hit = cache.current.get(p.key);
    if (!hit) {
      hit = loadBitmap(p.file, p.url);
      hit.catch(() => cache.current.delete(p.key));
      cache.current.set(p.key, hit);
    }
    return hit;
  }, []);
  /** After saving, a new photo's temporary key becomes its database id. */
  const rename = useCallback((from: string, to: string) => {
    const hit = cache.current.get(from);
    if (hit) cache.current.set(to, hit);
  }, []);
  return { get, rename };
}

export async function buildSources(photos: StudioPhoto[], settings: CreativeSettings, faces: Faces, get: (p: StudioPhoto) => Promise<ImageBitmap>): Promise<Source[]> {
  const bitmaps = await Promise.all(photos.map((p) => get(p)));
  return photos.map((p, i) => ({ key: p.key, bitmap: bitmaps[i], framing: { ...DEFAULT_FRAMING, ...settings.framing[p.key] }, face: faces[p.key] }));
}

/** Face detection + debounced half-size previews of every creative. */
export function useCreativePreviews({
  photos,
  settings,
  faces,
  setFaces,
  colors,
  sizes,
  getBitmap,
}: {
  photos: StudioPhoto[];
  settings: CreativeSettings;
  faces: Faces;
  setFaces: (fn: (f: Faces) => Faces) => void;
  colors: Color[];
  sizes: string[];
  getBitmap: (p: StudioPhoto) => Promise<ImageBitmap>;
}) {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [rendering, setRendering] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const pending = settings.hideFaces ? photos.filter((p) => !(p.key in faces)) : [];
  const pendingKeys = pending.map((p) => p.key).join(",");
  useEffect(() => {
    if (!pending.length) return;
    let cancelled = false;
    (async () => {
      setDetecting(true);
      for (const p of pending) {
        if (cancelled) break;
        let face: number | null = null;
        try {
          face = await findFaceBottom(await getBitmap(p));
        } catch {
          if (!cancelled) toast("Face detection could not load — use “Crop from top” in Framing", "error");
          setFaces((f) => Object.fromEntries([...Object.entries(f), ...pending.map((x) => [x.key, null] as const)]));
          break;
        }
        if (!cancelled) setFaces((f) => ({ ...f, [p.key]: face }));
      }
      if (!cancelled) setDetecting(false);
    })();
    return () => {
      cancelled = true;
      setDetecting(false);
    };
  }, [pendingKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  const sig = JSON.stringify({ k: photos.map((p) => p.key), settings: { ...settings, skip: [] }, faces, colors, sizes });
  useEffect(() => {
    if (!photos.length) {
      setPreviews([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setRendering(true);
      try {
        await loadCreativeFonts();
        const sources = await buildSources(photos, settings, faces, getBitmap);
        if (cancelled) return;
        const out = renderAll({ sources, settings, colors, sizes }, 0.5).map((r) => ({ id: r.id, label: r.label, url: r.canvas.toDataURL("image/jpeg", 0.85) }));
        if (!cancelled) setPreviews(out);
      } catch {
        if (!cancelled) toast("Could not read one of the photos for the creative", "error");
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  return { previews, rendering, detecting };
}

// ───────────────────────── Left side: design options ─────────────────────────

export function CreativeDesign({ settings, onChange }: { settings: CreativeSettings; onChange: (s: CreativeSettings) => void }) {
  const [custom, setCustom] = useState("");
  const [more, setMore] = useState(false);
  const set = (p: Partial<CreativeSettings>) => onChange({ ...settings, ...p });
  const toggleFeature = (f: string) => {
    if (settings.features.includes(f)) return set({ features: settings.features.filter((x) => x !== f) });
    if (settings.features.length >= 4) return toast("Up to 4 features fit on a creative", "error");
    set({ features: [...settings.features, f] });
  };
  const allFeatures = [...FEATURE_PRESETS.map((f) => f.label), ...settings.features.filter((f) => !FEATURE_PRESETS.some((p) => p.label === f))];

  return (
    <div className="space-y-5">
      <div>
        <span className="crm-label">What to create</span>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Choice on={settings.combo} onClick={() => set({ combo: !settings.combo })} title="Combined" note="All photos in one image" />
          <Choice on={settings.singles} onClick={() => set({ singles: !settings.singles })} title="Per photo" note="One image for every photo" />
        </div>
      </div>

      <div>
        <span className="crm-label">Per-photo style</span>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(
            [
              ["classic", "Classic", "Icons + title band"],
              ["elegant", "Elegant", "Gold border, tagline"],
              ["mix", "Mix", "Both, alternating"],
            ] as const
          ).map(([v, t, n]) => (
            <Choice key={v} on={settings.singleStyle === v} onClick={() => set({ singleStyle: v })} title={t} note={n} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Title (white)" value={settings.titleTop} onChange={(e) => set({ titleTop: e.target.value })} maxLength={16} />
        <Field label="Title (gold)" value={settings.titleBottom} onChange={(e) => set({ titleBottom: e.target.value })} maxLength={14} />
        <Field label="Collection line" value={settings.brandLine} onChange={(e) => set({ brandLine: e.target.value })} maxLength={36} className="col-span-2" />
        <Field label="Tagline (elegant style)" value={settings.tagline} onChange={(e) => set({ tagline: e.target.value })} maxLength={60} className="col-span-2" />
      </div>

      <div>
        <span className="crm-label">Feature icons · up to 4</span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {allFeatures.map((f) => {
            const on = settings.features.includes(f);
            return (
              <button key={f} type="button" data-on={on} onClick={() => toggleFeature(f)} className="crm-chip text-[0.72rem]!">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                  <path d={ICON_PATHS[iconFor(f)]} />
                </svg>
                {f}
                {on && <span className="text-[0.6rem] opacity-70">{settings.features.indexOf(f) + 1}</span>}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <input className="crm-input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Own feature, e.g. Zari Border" maxLength={22} />
          <button
            type="button"
            className="crm-btn"
            onClick={() => {
              const v = custom.trim();
              if (!v) return;
              if (!settings.features.includes(v)) toggleFeature(v);
              setCustom("");
            }}
          >
            Add
          </button>
        </div>
      </div>

      <LayoutControls settings={settings} onChange={onChange} />

      <div className="crm-panel-soft space-y-3 p-3.5">
        <Toggle checked={settings.showColors} onChange={(v) => set({ showColors: v })} label="Show colours" />
        <Toggle checked={settings.showSizes} onChange={(v) => set({ showSizes: v })} label="Show sizes" />
        <Toggle checked={settings.showShopNow} onChange={(v) => set({ showShopNow: v })} label="Shop Now button" />
      </div>

      <button type="button" onClick={() => setMore((x) => !x)} className="flex w-full items-center justify-between text-sm crm-accent">
        Background colour & website options
        <span className={`transition-transform ${more ? "rotate-180" : ""}`}>▾</span>
      </button>
      <AnimatePresence initial={false}>
        {more && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
            <div className="crm-panel-soft space-y-3 p-3.5">
              <Toggle checked={settings.backgroundAuto ?? true} onChange={(v) => set({ backgroundAuto: v })} label="Background glow from photo colour" />
              {!(settings.backgroundAuto ?? true) && (
                <div className="flex items-center gap-3">
                  <input type="color" value={settings.backgroundColor || "#A66F7C"} onChange={(e) => set({ backgroundColor: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-white/20 bg-transparent" aria-label="Glow colour" />
                  <span className="font-mono text-xs crm-muted">{settings.backgroundColor || "#A66F7C"}</span>
                </div>
              )}
              <Range label="Glow strength" value={settings.backgroundOpacity ?? 0.36} min={0} max={1} step={0.05} show={(v) => `${Math.round(v * 100)}%`} onChange={(v) => set({ backgroundOpacity: v })} />
              <Range label="Glow size" value={settings.backgroundSize ?? 1} min={0.4} max={2.5} step={0.1} show={(v) => `${v.toFixed(1)}×`} onChange={(v) => set({ backgroundSize: v })} />
              <Toggle checked={settings.showRaw} onChange={(v) => set({ showRaw: v })} label="Also show raw photos on the website" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Move and resize the SAVLINO logo and the feature icons on every creative. */
function LayoutControls({ settings, onChange }: { settings: CreativeSettings; onChange: (s: CreativeSettings) => void }) {
  const [open, setOpen] = useState(true);
  const L: CreativeLayout = { ...DEFAULT_LAYOUT, ...(settings.layout ?? {}) };
  const set = (p: Partial<CreativeLayout>) => onChange({ ...settings, layout: { ...L, ...p } });
  const px = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v)}`;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <div className="crm-panel-soft p-3.5">
      <button type="button" onClick={() => setOpen((x) => !x)} className="flex w-full items-center justify-between text-sm">
        <span className="crm-accent">Logo & icons — size and position</span>
        <span className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: EASE }} className="overflow-hidden">
            <div className="mt-3 space-y-3">
              <Toggle checked={L.showLogo} onChange={(v) => set({ showLogo: v })} label="Show SAVLINO logo" />
              {L.showLogo && (
                <>
                  <Range label="Logo size" value={L.logoScale} min={0.5} max={1.6} step={0.05} show={pct} onChange={(v) => set({ logoScale: v })} />
                  <Range label="Logo left ↔ right" value={L.logoX} min={-150} max={300} step={2} show={px} onChange={(v) => set({ logoX: v })} />
                  <Range label="Logo up ↔ down" value={L.logoY} min={-40} max={300} step={2} show={px} onChange={(v) => set({ logoY: v })} />
                </>
              )}
              <div className="h-px" style={{ background: "var(--crm-border-soft)" }} />
              <Toggle checked={L.showIcons} onChange={(v) => set({ showIcons: v })} label="Show feature icons" />
              {L.showIcons && (
                <>
                  <Range label="Icon size" value={L.iconScale} min={0.5} max={1.6} step={0.05} show={pct} onChange={(v) => set({ iconScale: v })} />
                  <Range label="Space between icons" value={L.iconGap} min={0.6} max={1.6} step={0.05} show={pct} onChange={(v) => set({ iconGap: v })} />
                  <Range label="Icons left ↔ right" value={L.iconsX} min={-80} max={300} step={2} show={px} onChange={(v) => set({ iconsX: v })} />
                  <Range label="Icons up ↔ down" value={L.iconsY} min={-250} max={250} step={2} show={px} onChange={(v) => set({ iconsY: v })} />
                </>
              )}
              <button type="button" className="crm-btn w-full justify-center" onClick={() => onChange({ ...settings, layout: { ...DEFAULT_LAYOUT } })}>
                Reset logo & icons
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ───────────────────────── Left side: framing ─────────────────────────

export function CreativeFraming({
  photos,
  settings,
  onChange,
  faces,
  active,
  setActive,
}: {
  photos: StudioPhoto[];
  settings: CreativeSettings;
  onChange: (s: CreativeSettings) => void;
  faces: Faces;
  active: string | null;
  setActive: (k: string) => void;
}) {
  const set = (p: Partial<CreativeSettings>) => onChange({ ...settings, ...p });
  const selKey = photos.some((p) => p.key === active) ? (active as string) : (photos[0]?.key ?? null);
  const framing: Framing = { ...DEFAULT_FRAMING, ...(selKey ? settings.framing[selKey] : null) };
  const setFraming = (p: Partial<Framing>) => selKey && set({ framing: { ...settings.framing, [selKey]: { ...framing, ...p } } });
  const face = selKey ? faces[selKey] : undefined;
  if (!photos.length) return <p className="py-8 text-center text-sm crm-muted">Add photos first.</p>;
  return (
    <div className="space-y-4">
      <Toggle checked={settings.hideFaces} onChange={(v) => set({ hideFaces: v })} label="Hide faces automatically" hint="Frames start below the chin when a face is found" />
      <div>
        <span className="crm-label">Choose a photo</span>
        <div className="mt-2 flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <button key={p.key} type="button" onClick={() => setActive(p.key)} className="relative h-16 w-16 overflow-hidden rounded-lg" style={{ boxShadow: `0 0 0 ${p.key === selKey ? 2 : 1}px var(--crm-accent)`, opacity: p.key === selKey ? 1 : 0.55 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[0.55rem] text-white">{i + 1}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[0.72rem] crm-muted">
          {!settings.hideFaces ? "Face hiding is off." : face === undefined ? "Checking for a face…" : face === null ? "No face found — use “Crop from top” if needed." : `Face found — frame starts ${Math.round(face * 100)}% down.`}
        </p>
      </div>
      <div className="crm-panel-soft space-y-3 p-3.5">
        <Range label="Crop from top" value={framing.top} min={0} max={0.6} step={0.01} show={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setFraming({ top: v })} />
        <Range label="Zoom" value={framing.zoom} min={1} max={2.5} step={0.05} show={(v) => `${v.toFixed(2)}×`} onChange={(v) => setFraming({ zoom: v })} />
        <Range label="Up ↔ down" value={framing.y} min={0} max={1} step={0.01} show={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setFraming({ y: v })} />
        <Range label="Left ↔ right" value={framing.x} min={0} max={1} step={0.01} show={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setFraming({ x: v })} />
        <button type="button" className="crm-btn w-full justify-center" onClick={() => selKey && set({ framing: Object.fromEntries(Object.entries(settings.framing).filter(([k]) => k !== selKey)) })}>
          Reset this photo
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Right side: preview ─────────────────────────

export function CreativeGallery({
  previews,
  settings,
  onChange,
  rendering,
  detecting,
  hasPhotos,
  onPickPhoto,
}: {
  previews: Preview[];
  settings: CreativeSettings;
  onChange: (s: CreativeSettings) => void;
  rendering: boolean;
  detecting: boolean;
  hasPhotos: boolean;
  onPickPhoto: (key: string) => void;
}) {
  const [sel, setSel] = useState<string>("combo");
  const [zoom, setZoom] = useState(false);
  const current = previews.find((p) => p.id === sel) ?? previews[0];
  const toggleSkip = (id: string) => onChange({ ...settings, skip: settings.skip.includes(id) ? settings.skip.filter((x) => x !== id) : [...settings.skip, id] });
  const included = previews.filter((p) => !settings.skip.includes(p.id)).length;

  return (
    <div className="crm-panel flex flex-col p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="crm-serif flex items-center gap-2 text-[1.25rem]">
          <Icon d={ICONS.image} className="h-5 w-5 crm-accent" /> Creative preview
        </h2>
        <span className="flex items-center gap-2 text-xs crm-muted">
          {(rendering || detecting) && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          {detecting ? "Finding faces…" : rendering ? "Generating…" : previews.length ? `${included} of ${previews.length} will go live` : ""}
        </span>
      </div>

      {!current ? (
        <div className="flex h-[min(56vh,520px)] flex-col items-center justify-center gap-2 rounded-xl text-center crm-panel-soft">
          <Icon d={ICONS.image} className="h-8 w-8 crm-muted" />
          <p className="text-sm crm-muted">{hasPhotos ? (rendering ? "Generating creatives…" : "Turn on Combined or Per photo in Design.") : "Upload raw photos — creatives appear here."}</p>
        </div>
      ) : (
        <>
          <div className="relative flex h-[min(56vh,560px)] items-center justify-center overflow-hidden rounded-xl" style={{ background: "var(--crm-panel-2)" }}>
            <AnimatePresence mode="wait">
              <motion.img
                key={current.url}
                src={current.url}
                alt={current.label}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: settings.skip.includes(current.id) ? 0.4 : 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="max-h-full max-w-full cursor-zoom-in rounded-lg object-contain shadow-2xl"
                onClick={() => setZoom(true)}
              />
            </AnimatePresence>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={!settings.skip.includes(current.id)} onChange={() => toggleSkip(current.id)} className="h-4 w-4 accent-[#D8B25A]" />
              Publish “{current.label}”
            </label>
            {current.id.startsWith("single:") && (
              <button type="button" onClick={() => onPickPhoto(current.id.slice(7))} className="crm-chip">
                Adjust framing
              </button>
            )}
          </div>
          <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {previews.map((p) => {
              const on = !settings.skip.includes(p.id);
              return (
                <li key={p.id} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setSel(p.id)}
                    className={`block overflow-hidden rounded-lg ${p.id === "combo" ? "h-16 w-24" : "h-16 w-[3.2rem]"}`}
                    style={{ boxShadow: `0 0 0 ${p.id === current.id ? 2 : 1}px ${p.id === current.id ? "var(--crm-accent)" : "var(--crm-border-soft)"}`, opacity: on ? 1 : 0.35 }}
                    title={p.label}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.label} className="h-full w-full object-cover" />
                  </button>
                  <input type="checkbox" checked={on} onChange={() => toggleSkip(p.id)} aria-label={`Publish ${p.label}`} className="absolute right-1 top-1 h-3.5 w-3.5 accent-[#D8B25A]" />
                </li>
              );
            })}
          </ul>
        </>
      )}

      <AnimatePresence>
        {zoom && current && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setZoom(false)}>
            <motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} src={current.url} alt={current.label} className="max-h-[92vh] max-w-full rounded-xl shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Choice({ on, onClick, title, note }: { on: boolean; onClick: () => void; title: string; note: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} className="crm-panel-soft p-2.5 text-left transition-transform hover:-translate-y-0.5" style={on ? { borderColor: "var(--crm-accent)", boxShadow: "0 0 0 1px var(--crm-accent)" } : undefined}>
      <span className={`block text-sm ${on ? "crm-accent" : ""}`}>{title}</span>
      <span className="block text-[0.66rem] crm-muted">{note}</span>
    </button>
  );
}

function Range({ label, value, min, max, step, show, onChange }: { label: string; value: number; min: number; max: number; step: number; show: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs">
        <span className="crm-muted">{label}</span>
        <span className="crm-accent">{show(value)}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[#D8B25A]" />
    </label>
  );
}

