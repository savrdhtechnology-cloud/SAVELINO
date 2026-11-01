"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, Reorder, motion, useDragControls } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BODY_FONTS, FONT_PRESETS, HEADING_FONTS } from "@/lib/fonts";
import {
  BG_EFFECTS,
  HERO_PRESETS,
  HERO_PRESET_LABELS,
  HERO_PRESET_PALETTES,
  type HeroPreset,
  BG_EFFECT_LABELS,
  CRM_THEMES,
  CRM_THEME_LABELS,
  CURSOR_EFFECTS,
  CURSOR_EFFECT_LABELS,
  DEFAULT_PALETTES,
  EFFECT_INTENSITIES,
  SECTION_LABELS,
  THEME_LABELS,
  THEME_MODES,
  type BgEffect,
  type CursorEffect,
  type EffectIntensity,
  type Palette,
  type SiteSettings,
  type ThemeMode,
} from "@/lib/settings";
import type { Category } from "@/lib/data/types";
import { CRM_PREVIEW_EVENT } from "./CrmShell";
import { db, fetchCategories, fetchSettings, must, revalidateSite, saveSettings, useLoad } from "./data";
import { CRM_SWATCH } from "./theme";
import { EASE, Field, ICONS, Icon, PageHeader, Panel, Skeleton, Tabs, Toggle, fmtDateTime, toast } from "./ui";

const PALETTE_PRESETS: Record<ThemeMode, { name: string; palette: Palette }[]> = {
  dark: [
    { name: "Royal Noir", palette: DEFAULT_PALETTES.dark },
    { name: "Maroon Silk", palette: { gold: "#D4AF37", noir: "#14070A", ivory: "#FBF1E6", burgundy: "#7A1F2B" } },
    { name: "Rose Gold Night", palette: { gold: "#C98B72", noir: "#100B0B", ivory: "#FBF3EE", burgundy: "#5E1A2A" } },
    { name: "Emerald Court", palette: { gold: "#D4AF37", noir: "#06100C", ivory: "#F4F1E6", burgundy: "#0F4D3A" } },
  ],
  light: [
    { name: "Ivory Atelier", palette: DEFAULT_PALETTES.light },
    { name: "Pearl & Rose", palette: { gold: "#A86A55", noir: "#FBF6F3", ivory: "#2A1D1A", burgundy: "#F0DAD3" } },
    { name: "Champagne Day", palette: { gold: "#8C7440", noir: "#FAF7EF", ivory: "#221D16", burgundy: "#EFE3CC" } },
    { name: "Sage Linen", palette: { gold: "#7A6A2E", noir: "#F4F3EC", ivory: "#1B211C", burgundy: "#DCE6DC" } },
  ],
  porcelain: [
    { name: "Porcelain", palette: DEFAULT_PALETTES.porcelain },
    { name: "Snow & Gold", palette: { gold: "#9A7724", noir: "#FAFAFA", ivory: "#0F0F0F", burgundy: "#F5ECE6" } },
    { name: "Stone", palette: { gold: "#6E5A2B", noir: "#ECEBE7", ivory: "#151515", burgundy: "#E8E2DA" } },
    { name: "Blush", palette: { gold: "#9B5C4A", noir: "#F7F2F1", ivory: "#1A1414", burgundy: "#F3E1DC" } },
  ],
};

const DEVICES = [
  { id: "desktop", label: "Desktop", width: "100%" },
  { id: "tablet", label: "Tablet", width: "820px" },
  { id: "mobile", label: "Mobile", width: "390px" },
] as const;

export function Website() {
  const { data, loading } = useLoad(async () => {
    const [settings, categories] = await Promise.all([fetchSettings(), fetchCategories()]);
    return { settings, categories };
  });
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader section="Appearance Studio" subtitle="Choose a premium look for your storefront" />
        <Skeleton className="h-[640px]" />
      </div>
    );
  }
  return <Editor initial={data.settings} initialCategories={data.categories} />;
}

function Editor({ initial, initialCategories }: { initial: SiteSettings; initialCategories: Category[] }) {
  const [s, setS] = useState<SiteSettings>(initial);
  const [saved, setSaved] = useState<SiteSettings>(initial);
  const [cats, setCats] = useState(initialCategories);
  const [tab, setTab] = useState<"manager" | "theme">("manager");
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const [editMode, setEditMode] = useState<ThemeMode>(initial.theme.mode);
  const [frameKey, setFrameKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);

  const patch = <K extends keyof SiteSettings>(k: K, v: Partial<SiteSettings[K]>) => setS((x) => ({ ...x, [k]: { ...(x[k] as object), ...v } }) as SiteSettings);
  const setPalette = (mode: ThemeMode, p: Partial<Palette>) =>
    setS((x) => {
      const theme = { ...x.theme };
      theme[mode] = { ...x.theme[mode], ...p };
      return { ...x, theme };
    });

  // Live preview inside the website frame (StudioBridge listens for these).
  const push = useCallback(() => {
    const w = frame.current?.contentWindow;
    if (!w) return;
    const post = (m: object) => w.postMessage(m, window.location.origin);
    const p = s.theme[editMode];
    post({ type: "savlino:studio:mode", mode: editMode });
    post({
      type: "savlino:studio:vars",
      vars: {
        "--color-gold": p.gold,
        "--color-gold-light": `color-mix(in srgb, ${p.gold} 72%, white)`,
        "--color-gold-deep": `color-mix(in srgb, ${p.gold} 72%, black)`,
        "--color-noir": p.noir,
        "--color-noir-soft": `color-mix(in srgb, ${p.noir} 93%, ${p.ivory})`,
        "--color-ivory": p.ivory,
        "--color-burgundy": p.burgundy,
        "--color-burgundy-deep": `color-mix(in srgb, ${p.burgundy} 55%, ${p.noir})`,
        "--font-display": HEADING_FONTS[s.theme.displayFont].css,
        "--font-sans": BODY_FONTS[s.theme.bodyFont].css,
      },
    });
    post({ type: "savlino:studio:effects", effects: s.effects });
    post({ type: "savlino:studio:text", key: "hero-eyebrow", value: s.hero.eyebrow });
    post({ type: "savlino:studio:text", key: "hero-title", value: s.hero.title });
    post({ type: "savlino:studio:text", key: "hero-subtitle", value: s.hero.subtitle });
    post({ type: "savlino:studio:text", key: "announcement", value: s.announcement.text });
  }, [s, editMode]);

  useEffect(() => {
    push();
  }, [push]);
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.origin === window.location.origin && (e.data as { type?: string })?.type === "savlino:studio:ready") push();
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, [push]);

  // CRM appearance previews instantly on this CRM; leaving the page restores the saved look.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(CRM_PREVIEW_EVENT, { detail: s.crm }));
  }, [s.crm]);
  useEffect(() => () => void window.dispatchEvent(new CustomEvent(CRM_PREVIEW_EVENT, { detail: null })), []);

  async function publish() {
    setBusy(true);
    try {
      await saveSettings(s);
      setSaved(s);
      setSavedAt(new Date().toISOString());
      setFrameKey((k) => k + 1);
      toast("Published — the website is updated");
    } catch (e) {
      toast(e instanceof Error ? (e.message.includes("row-level security") ? "Only an admin can publish website changes" : e.message) : "Could not publish", "error");
    } finally {
      setBusy(false);
    }
  }

  async function setCat(c: Category, p: Partial<Category>) {
    setCats((l) => l.map((x) => (x.id === c.id ? { ...x, ...p } : x)));
    try {
      must(await db().from("categories").update(p).eq("id", c.id).select("id"));
      await revalidateSite();
    } catch (e) {
      setCats((l) => l.map((x) => (x.id === c.id ? c : x)));
      toast(e instanceof Error ? e.message : "Could not update", "error");
    }
  }

  return (
    <div className="space-y-6 pb-24">
      <PageHeader section="Appearance Studio" subtitle="Select a theme, customise the hero and preview before publishing" />

      <div className="grid gap-4 md:grid-cols-3">
        <Stat icon={ICONS.globe} label="Site status" value={<span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[var(--crm-success)]" /> Live</span>} />
        <Stat icon={ICONS.clock} label="Last published" value={savedAt ? fmtDateTime(savedAt) : "This session: not yet"} />
        <Stat icon={ICONS.layers} label="Visible categories" value={`${cats.filter((c) => c.is_visible).length} of ${cats.length}`} />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "manager", label: "Homepage & Hero", icon: ICONS.layers },
          { value: "theme", label: "Themes & Design", icon: ICONS.palette },
        ]}
      />

      <div className="grid gap-6 2xl:grid-cols-[1fr_minmax(0,1.05fr)]">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-6">
            {tab === "manager" ? (
              <>
                <Panel title="Announcement Bar" icon={ICONS.bell}>
                  <div className="space-y-3">
                    <Toggle label="Show the announcement bar" checked={s.announcement.enabled} onChange={(v) => patch("announcement", { enabled: v })} />
                    <Field label="Message" value={s.announcement.text} onChange={(e) => patch("announcement", { text: e.target.value })} placeholder="New Arrivals: Designer Blouses — up to 20% off ✨" />
                    <Field label="Link (optional)" value={s.announcement.href} onChange={(e) => patch("announcement", { href: e.target.value })} placeholder="/shop" />
                  </div>
                </Panel>

                <Panel title="Cinematic Hero Studio" icon={ICONS.image}>
                  <p className="mb-3 text-xs crm-muted">Eight luxury visual presets · choose one as the website default when you publish.</p>
                  <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {HERO_PRESETS.map((id) => {
                      const p = HERO_PRESET_PALETTES[id];
                      const selected = (s.hero.preset || "classic-3d") === id;
                      return <button type="button" key={id} onClick={() => patch("hero",{preset:id})}
                        aria-pressed={selected}
                        className="rounded-xl border p-2 text-left transition hover:scale-[1.02]"
                        style={{borderColor:selected?"var(--crm-accent)":"var(--crm-border-soft)",boxShadow:selected?"0 0 0 1px var(--crm-accent)":undefined}}>
                        <div className="relative h-20 overflow-hidden rounded-lg"
                          style={{background:`radial-gradient(circle at 75% 40%, ${p.accent}80, transparent 45%),linear-gradient(120deg,${p.background},${p.shade})`}}>
                          <div className="absolute bottom-3 left-2 text-[10px] font-serif italic text-white">SAVLINO</div>
                        </div>
                        <div className="mt-2 text-xs">{HERO_PRESET_LABELS[id]}</div>
                        <span className="text-[10px] crm-muted">{selected?"Selected default":"Select theme"}</span>
                      </button>;
                    })}
                  </div>
                  <div className="mb-5 grid gap-4 sm:grid-cols-2">
                    <label className="text-xs crm-muted">Hero height · {s.hero.height ?? 100}vh
                      <input className="mt-2 w-full accent-[#D4AF37]" type="range" min="65" max="110" value={s.hero.height ?? 100}
                        onChange={(e)=>patch("hero",{height:Number(e.target.value)})}/>
                    </label>
                    <label className="text-xs crm-muted">Background light · {s.hero.spotlight ?? 70}%
                      <input className="mt-2 w-full accent-[#D4AF37]" type="range" min="0" max="100" value={s.hero.spotlight ?? 70}
                        onChange={(e)=>patch("hero",{spotlight:Number(e.target.value)})}/>
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Small line" value={s.hero.eyebrow} onChange={(e) => patch("hero", { eyebrow: e.target.value })} />
                    <Field label="Title" value={s.hero.title} onChange={(e) => patch("hero", { title: e.target.value })} />
                    <Field label="Subtitle" value={s.hero.subtitle} onChange={(e) => patch("hero", { subtitle: e.target.value })} className="sm:col-span-2" />
                    <Field label="Main button" value={s.hero.primaryLabel} onChange={(e) => patch("hero", { primaryLabel: e.target.value })} />
                    <Field label="Links to" value={s.hero.primaryHref} onChange={(e) => patch("hero", { primaryHref: e.target.value })} />
                    <Field label="Second button" value={s.hero.secondaryLabel} onChange={(e) => patch("hero", { secondaryLabel: e.target.value })} />
                    <Field label="Links to" value={s.hero.secondaryHref} onChange={(e) => patch("hero", { secondaryHref: e.target.value })} />
                  </div>
                </Panel>

                <Panel title="Featured Collections" icon={ICONS.layers} subtitle="Saved instantly — show on the website and feature on the homepage">
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {cats.map((c) => (
                      <li key={c.id} className="crm-panel-soft flex items-center gap-3 p-3">
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg" style={{ background: "var(--crm-wash)" }}>
                          {c.image_url && <Image src={c.image_url} alt="" fill sizes="48px" className="object-cover" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{c.name}</span>
                          <button type="button" onClick={() => void setCat(c, { is_featured: !c.is_featured })} className={`text-[0.7rem] ${c.is_featured ? "crm-accent" : "crm-muted"}`}>
                            {c.is_featured ? "★ Featured" : "☆ Feature"}
                          </button>
                        </span>
                        <Toggle checked={c.is_visible} onChange={(v) => void setCat(c, { is_visible: v })} />
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="Section Arrangement" icon={ICONS.drag} subtitle="Drag to reorder the homepage, toggle to show or hide">
                  <Reorder.Group axis="y" values={s.sections} onReorder={(next) => setS((x) => ({ ...x, sections: next }))} className="space-y-2">
                    {s.sections.map((sec) => (
                      <SectionRow key={sec.id} item={sec} onToggle={() => setS((x) => ({ ...x, sections: x.sections.map((y) => (y.id === sec.id ? { ...y, visible: !y.visible } : y)) }))} />
                    ))}
                  </Reorder.Group>
                </Panel>

                <Panel title="SEO Snippets" icon={ICONS.search} subtitle="How the homepage appears on Google">
                  <div className="space-y-3">
                    <Field label={`SEO title (${s.seo.title.length}/60)`} maxLength={70} value={s.seo.title} onChange={(e) => patch("seo", { title: e.target.value })} />
                    <label className="block">
                      <span className="crm-label">Meta description ({s.seo.description.length}/160)</span>
                      <textarea rows={3} maxLength={200} value={s.seo.description} onChange={(e) => patch("seo", { description: e.target.value })} className="crm-input" />
                    </label>
                    <div className="rounded-xl bg-white p-4 text-left">
                      <p className="text-[0.75rem] text-[#202124]">savlino · Home</p>
                      <p className="mt-0.5 truncate text-lg text-[#1a0dab]">{s.seo.title || "SAVLINO"}</p>
                      <p className="line-clamp-2 text-sm text-[#4d5156]">{s.seo.description}</p>
                    </div>
                  </div>
                </Panel>
              </>
            ) : (
              <>
                <Panel title="Website theme" icon={ICONS.palette}>
                  <div className="grid grid-cols-3 gap-2">
                    {THEME_MODES.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          patch("theme", { mode: m });
                          setEditMode(m);
                        }}
                        className="overflow-hidden rounded-xl border text-left transition-transform hover:-translate-y-0.5"
                        style={{ borderColor: s.theme.mode === m ? "var(--crm-accent)" : "var(--crm-border-soft)", boxShadow: s.theme.mode === m ? "0 0 0 1px var(--crm-accent)" : undefined }}
                      >
                        <span className="flex h-16 items-end gap-1 p-2" style={{ background: s.theme[m].noir }}>
                          <span className="h-2 w-8 rounded" style={{ background: s.theme[m].gold }} />
                          <span className="h-1.5 w-10 rounded opacity-70" style={{ background: s.theme[m].ivory }} />
                        </span>
                        <span className="block px-2.5 py-2 text-xs">{THEME_LABELS[m]}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Toggle label="Let visitors switch light / dark" checked={s.theme.allowToggle} onChange={(v) => patch("theme", { allowToggle: v })} />
                  </div>
                </Panel>

                <Panel title={`${THEME_LABELS[editMode]} colours`} icon={ICONS.palette} action={<div className="flex gap-1">{THEME_MODES.map((m) => <button key={m} type="button" data-on={editMode === m} onClick={() => setEditMode(m)} className="crm-chip">{THEME_LABELS[m]}</button>)}</div>}>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PALETTE_PRESETS[editMode].map((p) => (
                      <button key={p.name} type="button" onClick={() => setPalette(editMode, p.palette)} className="crm-panel-soft p-2.5 text-left text-xs transition-transform hover:-translate-y-0.5">
                        <span className="flex gap-1">
                          {[p.palette.noir, p.palette.burgundy, p.palette.gold, p.palette.ivory].map((c, i) => (
                            <span key={i} className="h-6 flex-1 rounded" style={{ background: c, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.1)" }} />
                          ))}
                        </span>
                        <span className="mt-2 block">{p.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {(["noir", "burgundy", "gold", "ivory"] as const).map((k) => (
                      <label key={k} className="crm-panel-soft flex items-center gap-2 p-2.5">
                        <input type="color" value={s.theme[editMode][k]} onChange={(e) => setPalette(editMode, { [k]: e.target.value })} className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent" />
                        <span className="text-xs">
                          {{ noir: "Background", burgundy: "Highlight", gold: "Accent", ivory: "Text" }[k]}
                          <span className="block font-mono text-[0.65rem] crm-muted">{s.theme[editMode][k]}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </Panel>

                <Panel title="Typography" icon={ICONS.edit} subtitle="Website font pairing">
                  <FontPresets heading={s.theme.displayFont} body={s.theme.bodyFont} onPick={(h, b) => patch("theme", { displayFont: h, bodyFont: b })} />
                </Panel>

                <Panel title="Motion & mouse" icon={ICONS.sparkle} subtitle="Website background motion and pointer effect">
                  <EffectGrid options={BG_EFFECTS.map((k) => [k, BG_EFFECT_LABELS[k]] as const)} value={s.effects.background} onChange={(v) => patch("effects", { background: v as BgEffect })} />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm crm-muted">Intensity</span>
                    {EFFECT_INTENSITIES.map((k) => (
                      <button key={k} type="button" data-on={s.effects.intensity === k} onClick={() => patch("effects", { intensity: k as EffectIntensity })} className="crm-chip capitalize">
                        {k}
                      </button>
                    ))}
                    <span className="ml-auto">
                      <Toggle label="On phones" checked={s.effects.mobile} onChange={(v) => patch("effects", { mobile: v })} />
                    </span>
                  </div>
                  <p className="mt-4 crm-label">Mouse effect</p>
                  <div className="mt-2">
                    <EffectGrid options={CURSOR_EFFECTS.map((k) => [k, CURSOR_EFFECT_LABELS[k]] as const)} value={s.effects.cursor} onChange={(v) => patch("effects", { cursor: v as CursorEffect })} />
                  </div>
                </Panel>

                <Panel title="CRM appearance" icon={ICONS.dashboard} subtitle="Changes show on this CRM right away — publish to keep them">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {CRM_THEMES.map((t) => (
                      <button key={t} type="button" onClick={() => patch("crm", { theme: t })} className="overflow-hidden rounded-xl border text-left transition-transform hover:-translate-y-0.5" style={{ borderColor: s.crm.theme === t ? "var(--crm-accent)" : "var(--crm-border-soft)", boxShadow: s.crm.theme === t ? "0 0 0 1px var(--crm-accent)" : undefined }}>
                        <span className="relative flex h-20 items-end p-2" style={{ background: `linear-gradient(135deg, ${CRM_SWATCH[t][0]}, ${CRM_SWATCH[t][1]})` }}>
                          <span className="h-2 w-12 rounded" style={{ background: CRM_SWATCH[t][2] }} />
                          {s.crm.theme === t && (
                            <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: CRM_SWATCH[t][2] }}>
                              <Icon d={ICONS.check} className="h-3 w-3 text-black" />
                            </span>
                          )}
                        </span>
                        <span className="block px-3 py-2 text-sm">{CRM_THEME_LABELS[t]}</span>
                      </button>
                    ))}
                  </div>
                  <p className="mb-2 mt-5 crm-label">CRM fonts</p>
                  <FontPresets heading={s.crm.headingFont} body={s.crm.bodyFont} onPick={(h, b) => patch("crm", { headingFont: h, bodyFont: b })} />
                  <p className="mb-2 mt-5 crm-label">CRM motion</p>
                  <EffectGrid options={BG_EFFECTS.map((k) => [k, BG_EFFECT_LABELS[k]] as const)} value={s.crm.background} onChange={(v) => patch("crm", { background: v as BgEffect })} />
                  <p className="mb-2 mt-4 crm-label">CRM mouse effect</p>
                  <EffectGrid options={CURSOR_EFFECTS.map((k) => [k, CURSOR_EFFECT_LABELS[k]] as const)} value={s.crm.cursor} onChange={(v) => patch("crm", { cursor: v as CursorEffect })} />
                </Panel>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="2xl:sticky 2xl:top-[96px] 2xl:self-start">
          <Panel
            title="Live Preview"
            icon={ICONS.eye}
            action={
              <div className="flex gap-1">
                {DEVICES.map((d) => (
                  <button key={d.id} type="button" data-on={device === d.id} onClick={() => setDevice(d.id)} className="crm-chip">
                    {d.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="flex justify-center overflow-hidden rounded-xl" style={{ background: "repeating-linear-gradient(45deg, var(--crm-panel-2) 0 10px, transparent 10px 20px)" }}>
              <motion.div animate={{ width: DEVICES.find((d) => d.id === device)?.width }} transition={{ type: "spring", stiffness: 220, damping: 30 }} className="h-[70vh] max-w-full overflow-hidden rounded-lg" style={{ boxShadow: "0 0 0 1px var(--crm-border)" }}>
                <iframe key={frameKey} ref={frame} src="/" title="Website preview" className="h-full w-full" onLoad={push} />
              </motion.div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {[
                ["Home", "/"],
                ["Shop", "/shop"],
                ["Collections", "/collections"],
                ["Checkout", "/checkout"],
              ].map(([l, h]) => (
                <a key={h} href={h} target="_blank" rel="noreferrer" className="crm-chip">
                  <Icon d={ICONS.external} className="h-3 w-3" /> {l}
                </a>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <AnimatePresence>
        {dirty && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} transition={{ type: "spring", stiffness: 320, damping: 30 }} className="crm-panel fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-wrap items-center gap-3 px-5 py-3 lg:ml-[132px]">
            <span className="text-sm">Unpublished changes</span>
            <button type="button" onClick={() => setS(saved)} className="crm-btn">
              Discard
            </button>
            <Link href="/" target="_blank" rel="noreferrer" className="crm-btn">
              <Icon d={ICONS.eye} /> Preview live
            </Link>
            <button type="button" disabled={busy} onClick={() => void publish()} className="crm-btn crm-btn-wine">
              <Icon d={ICONS.upload} /> {busy ? "Publishing…" : "Publish site"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="crm-panel flex items-center gap-4 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl border crm-accent" style={{ borderColor: "var(--crm-border)" }}>
        <Icon d={icon} className="h-5 w-5" />
      </span>
      <span>
        <span className="block text-xs crm-muted">{label}</span>
        <span className="crm-serif block text-lg">{value}</span>
      </span>
    </motion.div>
  );
}

function SectionRow({ item, onToggle }: { item: SiteSettings["sections"][number]; onToggle: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={item} dragListener={false} dragControls={controls} whileDrag={{ scale: 1.02 }} className="crm-panel-soft flex items-center gap-3 px-3 py-2.5">
      <button type="button" onPointerDown={(e) => controls.start(e)} className="cursor-grab touch-none crm-muted active:cursor-grabbing" aria-label="Drag">
        <Icon d={ICONS.drag} />
      </button>
      <span className={`flex-1 text-sm ${item.visible ? "" : "crm-muted line-through"}`}>{SECTION_LABELS[item.id]}</span>
      <Toggle checked={item.visible} onChange={onToggle} />
    </Reorder.Item>
  );
}

function FontPresets({ heading, body, onPick }: { heading: string; body: string; onPick: (h: (typeof FONT_PRESETS)[number]["heading"], b: (typeof FONT_PRESETS)[number]["body"]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {FONT_PRESETS.map((p) => {
        const on = p.heading === heading && p.body === body;
        return (
          <button key={p.id} type="button" onClick={() => onPick(p.heading, p.body)} className="crm-panel-soft p-3 text-left transition-transform hover:-translate-y-0.5" style={on ? { borderColor: "var(--crm-accent)", boxShadow: "0 0 0 1px var(--crm-accent)" } : undefined}>
            <span className="block truncate text-xl" style={{ fontFamily: HEADING_FONTS[p.heading].css }}>
              {p.label}
            </span>
            <span className="mt-1 block text-[0.68rem] crm-muted" style={{ fontFamily: BODY_FONTS[p.body].css }}>
              {p.note}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function EffectGrid({ options, value, onChange }: { options: readonly (readonly [string, { label: string; note: string }])[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
      {options.map(([k, o]) => (
        <button key={k} type="button" onClick={() => onChange(k)} className="crm-panel-soft p-3 text-left transition-transform hover:-translate-y-0.5" style={value === k ? { borderColor: "var(--crm-accent)", boxShadow: "0 0 0 1px var(--crm-accent)" } : undefined}>
          <span className={`block text-sm ${value === k ? "crm-accent" : ""}`}>{o.label}</span>
          <span className="mt-0.5 block text-[0.68rem] crm-muted">{o.note}</span>
        </button>
      ))}
    </div>
  );
}
