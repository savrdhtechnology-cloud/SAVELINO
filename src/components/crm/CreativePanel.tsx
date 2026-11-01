"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Color, CreativeSettings, Framing } from "@/lib/data/types";
import { DEFAULT_FRAMING, FEATURE_PRESETS, ICON_PATHS, iconFor, loadBitmap, loadCreativeFonts, renderAll, type Source } from "./creative";
import { findFaceBottom } from "./faces";
import { EASE, Field, ICONS, Icon, Panel, Select, Toggle, toast } from "./ui";

export type StudioPhoto = { key: string; url: string; file?: File };
export type Faces = Record<string, number | null>;

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

type Preview = { id: string; label: string; url: string };

export function CreativePanel({
  photos,
  settings,
  onChange,
  faces,
  setFaces,
  colors,
  sizes,
  getBitmap,
}: {
  photos: StudioPhoto[];
  settings: CreativeSettings;
  onChange: (s: CreativeSettings) => void;
  faces: Faces;
  setFaces: (fn: (f: Faces) => Faces) => void;
  colors: Color[];
  sizes: string[];
  getBitmap: (p: StudioPhoto) => Promise<ImageBitmap>;
}) {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [rendering, setRendering] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState<Preview | null>(null);
  const [custom, setCustom] = useState("");
  const set = (p: Partial<CreativeSettings>) => onChange({ ...settings, ...p });
  const selKey = photos.some((p) => p.key === active) ? (active as string) : (photos[0]?.key ?? null);
  const framing: Framing = { ...DEFAULT_FRAMING, ...(selKey ? settings.framing[selKey] : null) };
  const setFraming = (p: Partial<Framing>) => selKey && set({ framing: { ...settings.framing, [selKey]: { ...framing, ...p } } });

  // Face detection for photos not checked yet.
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
          if (!cancelled) toast("Face detection could not load — use “Crop from top” to hide faces", "error");
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

  // Live previews (debounced, half size).
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
        const out = renderAll({ sources, settings, colors, sizes }, 0.45).map((r) => ({ id: r.id, label: r.label, url: r.canvas.toDataURL("image/jpeg", 0.84) }));
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

  const toggleSkip = (id: string) => set({ skip: settings.skip.includes(id) ? settings.skip.filter((x) => x !== id) : [...settings.skip, id] });
  const toggleFeature = (f: string) => {
    if (settings.features.includes(f)) return set({ features: settings.features.filter((x) => x !== f) });
    if (settings.features.length >= 4) return toast("Up to 4 features fit on a creative", "error");
    set({ features: [...settings.features, f] });
  };
  const allFeatures = [...FEATURE_PRESETS.map((f) => f.label), ...settings.features.filter((f) => !FEATURE_PRESETS.some((p) => p.label === f))];
  const included = previews.filter((p) => !settings.skip.includes(p.id)).length;
  const face = selKey ? faces[selKey] : undefined;

  return (
    <Panel
      title="Creative Studio"
      icon={ICONS.image}
      subtitle="Raw photos → SAVLINO creatives · choose what goes live"
      delay={0.2}
      action={
        <span className="flex items-center gap-2 text-xs crm-muted">
          {(rendering || detecting) && <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />}
          {detecting ? "Finding faces…" : rendering ? "Generating…" : photos.length ? `${included} of ${previews.length} selected for the website` : ""}
        </span>
      }
    >
      {photos.length === 0 ? (
        <p className="py-10 text-center crm-muted">Upload raw photos above — the combined creative and one creative per photo appear here.</p>
      ) : (
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,380px)_1fr]">
          {/* Content & options */}
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
              <Field label="Collection line" value={settings.brandLine} onChange={(e) => set({ brandLine: e.target.value })} maxLength={36} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Title (white)" value={settings.titleTop} onChange={(e) => set({ titleTop: e.target.value })} maxLength={16} />
                <Field label="Title (gold)" value={settings.titleBottom} onChange={(e) => set({ titleBottom: e.target.value })} maxLength={14} />
              </div>
              <Field label="Tagline (elegant style)" value={settings.tagline} onChange={(e) => set({ tagline: e.target.value })} maxLength={60} className="sm:col-span-2 2xl:col-span-1" />
            </div>

            <div>
              <span className="crm-label">Feature icons · pick up to 4 (in order)</span>
              <div className="mt-2 flex flex-wrap gap-2">
                {allFeatures.map((f) => {
                  const on = settings.features.includes(f);
                  return (
                    <button key={f} type="button" data-on={on} onClick={() => toggleFeature(f)} className="crm-chip">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
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

            <div className="crm-panel-soft space-y-3 p-4">
              <Toggle checked={settings.combo} onChange={(v) => set({ combo: v })} label="Combined creative" hint="All photos arranged in one image (main website image)" />
              <Toggle checked={settings.singles} onChange={(v) => set({ singles: v })} label="Separate creative per photo" hint="Same background & style for every photo" />
              <Select label="Separate creative style" value={settings.singleStyle} onChange={(e) => set({ singleStyle: e.target.value as CreativeSettings["singleStyle"] })}>
                <option value="classic">Classic — icons, framed photo, wine title band</option>
                <option value="elegant">Elegant — gold border, title, tagline, icon row</option>
                <option value="mix">Mix — alternate both styles</option>
              </Select>
              <Toggle checked={settings.hideFaces} onChange={(v) => set({ hideFaces: v })} label="Hide faces" hint="Auto-detects faces and starts every frame below the chin" />
              <Toggle checked={settings.showColors} onChange={(v) => set({ showColors: v })} label="Show colours" />
              <Toggle checked={settings.showSizes} onChange={(v) => set({ showSizes: v })} label="Show sizes" />
              <Toggle checked={settings.showShopNow} onChange={(v) => set({ showShopNow: v })} label="Shop Now button" />
              <Toggle checked={settings.showRaw} onChange={(v) => set({ showRaw: v })} label="Also show raw photos on the website" hint="After the creatives, in the product gallery" />
            </div>

            {/* Background colour controls shared by preview and published images. */}
            <div className="crm-panel-soft space-y-3 p-4">
              <span className="crm-label">Creative background colour</span>
              <Toggle checked={settings.backgroundAuto ?? true} onChange={(v) => set({ backgroundAuto: v })} label="Auto colour from photo" hint="Samples vibrant garment colours for a matching background glow" />
              <div className="flex items-center gap-3">
                <label htmlFor="creative-bg-picker" className="text-xs crm-muted">Manual colour</label>
                <input id="creative-bg-picker" type="color" value={settings.backgroundColor || "#A66F7C"}
                  disabled={settings.backgroundAuto ?? true}
                  onChange={(e) => set({ backgroundColor: e.target.value })}
                  className="h-9 w-14 cursor-pointer rounded border border-white/20 bg-transparent disabled:opacity-40" />
                <input aria-label="Background hex colour" className="crm-input w-28"
                  value={settings.backgroundColor || "#A66F7C"} disabled={settings.backgroundAuto ?? true}
                  onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && set({ backgroundColor: e.target.value })}
                  maxLength={7} />
              </div>
              <Range label="Colour opacity" value={settings.backgroundOpacity ?? 0.36} min={0} max={1} step={0.05}
                show={(v) => `${Math.round(v*100)}%`} onChange={(v) => set({ backgroundOpacity: v })} />
              <Range label="Colour spread / size" value={settings.backgroundSize ?? 1} min={0.4} max={2.5} step={0.1}
                show={(v) => `${v.toFixed(1)}×`} onChange={(v) => set({ backgroundSize: v })} />
              <button type="button" className="crm-btn" onClick={() => set({ backgroundAuto: true, backgroundColor: "#A66F7C", backgroundOpacity: 0.36, backgroundSize: 1 })}>Reset background</button>
            </div>

            {/* Framing for one photo */}
            <div className="crm-panel-soft p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="crm-label">Photo framing</span>
                <button type="button" className="text-xs crm-accent" onClick={() => selKey && set({ framing: Object.fromEntries(Object.entries(settings.framing).filter(([k]) => k !== selKey)) })}>
                  Reset
                </button>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {photos.map((p, i) => (
                  <button key={p.key} type="button" onClick={() => setActive(p.key)} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg" style={{ boxShadow: `0 0 0 ${p.key === selKey ? 2 : 1}px var(--crm-accent)`, opacity: p.key === selKey ? 1 : 0.6 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[0.72rem] crm-muted">
                {!settings.hideFaces ? "Face hiding is off." : face === undefined ? "Checking for a face…" : face === null ? "No face found in this photo." : `Face found — frames start ${Math.round(face * 100)}% down.`}
              </p>
              <div className="mt-3 space-y-3">
                <Range label="Crop from top" value={framing.top} min={0} max={0.6} step={0.01} show={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setFraming({ top: v })} />
                <Range label="Zoom" value={framing.zoom} min={1} max={2.5} step={0.05} show={(v) => `${v.toFixed(2)}×`} onChange={(v) => setFraming({ zoom: v })} />
                <Range label="Up ↔ down" value={framing.y} min={0} max={1} step={0.01} show={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setFraming({ y: v })} />
                <Range label="Left ↔ right" value={framing.x} min={0} max={1} step={0.01} show={(v) => `${Math.round(v * 100)}%`} onChange={(v) => setFraming({ x: v })} />
              </div>
            </div>
          </div>

          {/* Previews */}
          <div>
            {previews.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-2xl crm-panel-soft crm-muted">{rendering ? "Generating creatives…" : "Turn on at least one creative type."}</div>
            ) : (
              <ul className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <AnimatePresence initial={false}>
                  {previews.map((p) => {
                    const on = !settings.skip.includes(p.id);
                    const isCombo = p.id === "combo";
                    const key = p.id.startsWith("single:") ? p.id.slice(7) : null;
                    return (
                      <motion.li
                        key={p.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.45, ease: EASE }}
                        className={isCombo ? "col-span-2 lg:col-span-3" : ""}
                      >
                        <div className="group relative overflow-hidden rounded-2xl" style={{ boxShadow: `0 0 0 ${on ? 2 : 1}px ${on ? "var(--crm-accent)" : "var(--crm-border-soft)"}`, opacity: on ? 1 : 0.45 }}>
                          <button type="button" className="block w-full" onClick={() => (key ? setActive(key) : setZoomed(p))} title={key ? "Adjust this photo's framing" : "View large"}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={p.url} alt={p.label} className="block h-auto w-full" />
                          </button>
                          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent p-2">
                            <label className="flex cursor-pointer items-center gap-2 rounded-full bg-black/55 px-2.5 py-1 text-[0.7rem] font-semibold text-white">
                              <input type="checkbox" checked={on} onChange={() => toggleSkip(p.id)} className="accent-[#D8B25A]" />
                              {on ? "Publish" : "Skip"} · {p.label}
                            </label>
                            <button type="button" onClick={() => setZoomed(p)} className="rounded-full bg-black/55 p-1.5 text-white" aria-label="View large">
                              <Icon d={ICONS.eye} className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {key === selKey && <span className="absolute bottom-2 left-2 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase" style={{ background: "var(--crm-accent)", color: "var(--crm-accent-ink)" }}>Framing</span>}
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            )}
            <p className="mt-3 text-[0.72rem] crm-muted">Previews are half size — publishing renders full quality (combined 1800×1200, singles 1080×1350). Click a separate creative to adjust that photo&apos;s framing.</p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {zoomed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setZoomed(null)}>
            <motion.img initial={{ scale: 0.95 }} animate={{ scale: 1 }} src={zoomed.url} alt={zoomed.label} className="max-h-[92vh] max-w-full rounded-xl shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
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
