"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, Reorder, motion, useDragControls } from "motion/react";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
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
  MOTION_STYLES,
  MOTION_STYLE_LABELS,
  type MotionStyle,
  SITE_THEMES,
  SITE_THEME_LABELS,
  type SiteThemeId,
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
  { id: "desktop", label: "Desktop", width: 1440 },
  { id: "tablet", label: "Tablet", width: 820 },
  { id: "mobile", label: "Mobile", width: 390 },
] as const;

type Tab = "theme" | "hero" | "home" | "design" | "crm" | "seo";
const TABS: { value: Tab; label: string; icon: string }[] = [
  { value: "theme", label: "Website themes", icon: ICONS.layers },
  { value: "hero", label: "Hero themes", icon: ICONS.image },
  { value: "design", label: "Colours & fonts", icon: ICONS.palette },
  { value: "home", label: "Homepage", icon: ICONS.layers },
  { value: "crm", label: "CRM look", icon: ICONS.dashboard },
  { value: "seo", label: "SEO", icon: ICONS.search },
];
const PAGES = [
  ["Home", "/"],
  ["Shop", "/shop"],
  ["Collections", "/collections"],
  ["Checkout", "/checkout"],
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
  const [tab, setTab] = useState<Tab>("theme");
  const [page, setPage] = useState("/");
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
    post({ type: "savlino:studio:motion", motion: s.effects.motion });
    post({ type: "savlino:studio:theme", theme: s.layout.theme });
    post({ type: "savlino:studio:hero", hero: { preset: s.hero.preset, height: s.hero.height, spotlight: s.hero.spotlight } });
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

  const theme = (
    <>
      <Panel title="Website theme" icon={ICONS.layers} subtitle="A full site look — header, homepage layout, card styling. Pick one, publish to go live.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SITE_THEMES.map((id) => (
            <SiteThemeThumb key={id} id={id} selected={s.layout.theme === id} live={saved.layout.theme === id} onPick={() => patch("layout", { theme: id })} />
          ))}
          <div className="crm-panel-soft flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center" style={{ borderColor: "var(--crm-border-soft)" }}>
            <Icon d={ICONS.sparkle} className="h-5 w-5 crm-muted" />
            <span className="text-xs crm-muted">More website themes land here as they&apos;re added — pick any one and publish to switch the whole site to it.</span>
          </div>
        </div>
      </Panel>
    </>
  );

  const hero = (
    <>
      <Panel title="Hero theme" icon={ICONS.image} subtitle="Live thumbnails from your website — click to preview, publish to keep">
        <div className="grid grid-cols-2 gap-3">
          {HERO_PRESETS.map((id) => (
            <HeroThumb key={id} id={id} selected={s.hero.preset === id} live={saved.hero.preset === id} onPick={() => patch("hero", { preset: id })} />
          ))}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Range label="Hero height" value={s.hero.height} min={65} max={110} unit="vh" onChange={(v) => patch("hero", { height: v })} />
          <Range label="Background light" value={s.hero.spotlight} min={0} max={100} unit="%" onChange={(v) => patch("hero", { spotlight: v })} />
        </div>
      </Panel>
      <Panel title="Hero text & buttons" icon={ICONS.edit}>
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
    </>
  );

  const home = (
    <>
      <Panel title="Announcement bar" icon={ICONS.bell}>
        <div className="space-y-3">
          <Toggle label="Show the announcement bar" checked={s.announcement.enabled} onChange={(v) => patch("announcement", { enabled: v })} />
          <Field label="Message" value={s.announcement.text} onChange={(e) => patch("announcement", { text: e.target.value })} placeholder="New Arrivals: Designer Blouses — up to 20% off ✨" />
          <Field label="Link (optional)" value={s.announcement.href} onChange={(e) => patch("announcement", { href: e.target.value })} placeholder="/shop" />
        </div>
      </Panel>
      <Panel title="Section order" icon={ICONS.drag} subtitle="Drag to reorder the homepage, toggle to show or hide">
        <Reorder.Group axis="y" values={s.sections} onReorder={(next) => setS((x) => ({ ...x, sections: next }))} className="space-y-2">
          {s.sections.map((sec) => (
            <SectionRow key={sec.id} item={sec} onToggle={() => setS((x) => ({ ...x, sections: x.sections.map((y) => (y.id === sec.id ? { ...y, visible: !y.visible } : y)) }))} />
          ))}
        </Reorder.Group>
      </Panel>
      <Panel title="Collections on the website" icon={ICONS.layers} subtitle="Saved instantly · toggle = visible · ★ = on the homepage">
        <ul className="space-y-2">
          {cats.map((c) => (
            <li key={c.id} className="crm-panel-soft flex items-center gap-3 p-2.5">
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg" style={{ background: "var(--crm-wash)" }}>
                {c.image_url && <Image src={c.image_url} alt="" fill sizes="40px" className="object-cover" />}
              </span>
              <span className={`min-w-0 flex-1 truncate text-sm ${c.is_visible ? "" : "crm-muted line-through"}`}>{c.name}</span>
              <button type="button" onClick={() => void setCat(c, { is_featured: !c.is_featured })} title={c.is_featured ? "Featured on the homepage" : "Feature on the homepage"} className={`text-lg ${c.is_featured ? "crm-accent" : "crm-muted"}`}>
                {c.is_featured ? "★" : "☆"}
              </button>
              <Toggle checked={c.is_visible} onChange={(v) => void setCat(c, { is_visible: v })} />
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );

  const design = (
    <>
      <Panel title="Website mode" icon={ICONS.palette}>
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
              <span className="flex h-14 items-end gap-1 p-2" style={{ background: s.theme[m].noir }}>
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

      <Panel title={`${THEME_LABELS[editMode]} colours`} icon={ICONS.palette}>
        <div className="mb-3 flex flex-wrap gap-1">
          {THEME_MODES.map((m) => (
            <button key={m} type="button" data-on={editMode === m} onClick={() => setEditMode(m)} className="crm-chip">
              {THEME_LABELS[m]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
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
        <div className="mt-4 grid grid-cols-2 gap-2">
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
        <p className="crm-label">Page animation theme</p>
        <p className="mb-2 text-xs crm-muted">Controls the scroll text reveals and the card hover lift/tilt/glow across the whole site. Default for every visitor.</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {MOTION_STYLES.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => patch("effects", { motion: k as MotionStyle })}
              className="crm-panel-soft rounded-xl border p-3 text-left transition-transform hover:-translate-y-0.5"
              style={{ borderColor: s.effects.motion === k ? "var(--crm-accent)" : "var(--crm-border-soft)", boxShadow: s.effects.motion === k ? "0 0 0 1px var(--crm-accent)" : undefined }}
            >
              <span className="flex items-center justify-between">
                <span className="text-sm font-medium">{MOTION_STYLE_LABELS[k].split(" — ")[0]}</span>
                {s.effects.motion === k && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "var(--crm-accent)" }}>
                    <Icon d={ICONS.check} className="h-3 w-3 text-black" />
                  </span>
                )}
              </span>
              <span className="mt-1 block text-[0.72rem] crm-muted">{MOTION_STYLE_LABELS[k].split(" — ")[1] ?? ""}</span>
            </button>
          ))}
        </div>
        <p className="mt-5 crm-label">Background &amp; pointer</p>
        <EffectGrid options={BG_EFFECTS.map((k) => [k, BG_EFFECT_LABELS[k]] as const)} value={s.effects.background} onChange={(v) => patch("effects", { background: v as BgEffect })} />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm crm-muted">Intensity</span>
          {EFFECT_INTENSITIES.map((k) => (
            <button key={k} type="button" data-on={s.effects.intensity === k} onClick={() => patch("effects", { intensity: k as EffectIntensity })} className="crm-chip capitalize">
              {k}
            </button>
          ))}
        </div>
        <div className="mt-3">
          <Toggle label="Effects on phones" checked={s.effects.mobile} onChange={(v) => patch("effects", { mobile: v })} />
        </div>
        <p className="mt-4 crm-label">Mouse effect</p>
        <div className="mt-2">
          <EffectGrid options={CURSOR_EFFECTS.map((k) => [k, CURSOR_EFFECT_LABELS[k]] as const)} value={s.effects.cursor} onChange={(v) => patch("effects", { cursor: v as CursorEffect })} />
        </div>
      </Panel>
    </>
  );

  const crm = (
    <Panel title="CRM appearance" icon={ICONS.dashboard} subtitle="Shows on this CRM right away — publish to keep it">
      <div className="grid grid-cols-3 gap-2">
        {CRM_THEMES.map((t) => (
          <button key={t} type="button" onClick={() => patch("crm", { theme: t })} className="overflow-hidden rounded-xl border text-left transition-transform hover:-translate-y-0.5" style={{ borderColor: s.crm.theme === t ? "var(--crm-accent)" : "var(--crm-border-soft)", boxShadow: s.crm.theme === t ? "0 0 0 1px var(--crm-accent)" : undefined }}>
            <span className="relative flex h-16 items-end p-2" style={{ background: `linear-gradient(135deg, ${CRM_SWATCH[t][0]}, ${CRM_SWATCH[t][1]})` }}>
              <span className="h-2 w-10 rounded" style={{ background: CRM_SWATCH[t][2] }} />
              {s.crm.theme === t && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: CRM_SWATCH[t][2] }}>
                  <Icon d={ICONS.check} className="h-3 w-3 text-black" />
                </span>
              )}
            </span>
            <span className="block px-2.5 py-2 text-xs">{CRM_THEME_LABELS[t]}</span>
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
  );

  const seo = (
    <Panel title="SEO snippet" icon={ICONS.search} subtitle="How the homepage appears on Google">
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
  );

  return (
    <div className="space-y-5 pb-24">
      <PageHeader
        section="Appearance Studio"
        subtitle="Change the look, watch the real website update, then publish"
        actions={
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <span className="crm-chip">
              <span className="h-2 w-2 rounded-full bg-[var(--crm-success)]" /> Site live
            </span>
            <span className="crm-chip">{cats.filter((c) => c.is_visible).length} collections visible</span>
            <span className="crm-chip">{savedAt ? `Published ${fmtDateTime(savedAt)}` : dirty ? "Unpublished changes" : "Up to date"}</span>
          </span>
        }
      />

      <Tabs value={tab} onChange={setTab} options={TABS} />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(340px,440px)_minmax(0,1fr)]">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.3, ease: EASE }} className="min-w-0 space-y-5">
            {{ theme, hero, home, design, crm, seo }[tab]}
          </motion.div>
        </AnimatePresence>

        <div className="min-w-0 lg:sticky lg:top-[88px]">
          <Panel
            title="Live website"
            icon={ICONS.eye}
            subtitle={dirty ? "Showing your unpublished changes" : "Exactly what visitors see"}
            action={
              <div className="flex flex-wrap gap-1">
                {DEVICES.map((d) => (
                  <button key={d.id} type="button" data-on={device === d.id} onClick={() => setDevice(d.id)} className="crm-chip">
                    {d.label}
                  </button>
                ))}
              </div>
            }
          >
            <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
              {PAGES.map(([l, h]) => (
                <button key={h} type="button" data-on={page === h} onClick={() => setPage(h)} className="crm-chip">
                  {l}
                </button>
              ))}
              <button type="button" onClick={() => setFrameKey((k) => k + 1)} className="crm-chip" title="Reload preview">
                ↻ Reload
              </button>
              <a href={page} target="_blank" rel="noreferrer" className="crm-chip ml-auto">
                <Icon d={ICONS.external} className="h-3 w-3" /> Open
              </a>
            </div>
            <ScaledFrame key={`${frameKey}-${page}`} ref={frame} src={page === "/" && s.layout.theme !== saved.layout.theme ? `/?theme=${s.layout.theme}` : page} deviceWidth={DEVICES.find((d) => d.id === device)?.width ?? 1440} onLoad={push} />
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

/** Renders a page at real device width and scales it down to fit, so the preview looks like the real site. */
const ScaledFrame = forwardRef<HTMLIFrameElement, { src: string; deviceWidth: number; onLoad: () => void }>(function ScaledFrame({ src, deviceWidth, onLoad }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = size.w ? Math.min(1, size.w / deviceWidth) : 1;
  const width = Math.min(deviceWidth, size.w / scale || deviceWidth);
  return (
    <div ref={box} className="relative h-[calc(100vh-260px)] min-h-[460px] overflow-hidden rounded-xl" style={{ background: "repeating-linear-gradient(45deg, var(--crm-panel-2) 0 10px, transparent 10px 20px)", boxShadow: "0 0 0 1px var(--crm-border)" }}>
      {size.w > 0 && (
        <motion.div
          initial={false}
          animate={{ width: width * scale }}
          transition={{ type: "spring", stiffness: 220, damping: 30 }}
          className="absolute inset-y-0 left-1/2 -translate-x-1/2 overflow-hidden"
        >
          <iframe
            ref={ref}
            src={src}
            title="Website preview"
            onLoad={onLoad}
            className="origin-top-left border-0 bg-black"
            style={{ width, height: size.h / scale, transform: `scale(${scale})` }}
          />
        </motion.div>
      )}
    </div>
  );
});

/** A website theme card with a real, scaled-down render of the actual homepage. */
function SiteThemeThumb({ id, selected, live, onPick }: { id: SiteThemeId; selected: boolean; live: boolean; onPick: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = w / 1280;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className="group overflow-hidden rounded-xl border text-left transition-transform hover:-translate-y-0.5"
      style={{ borderColor: selected ? "var(--crm-accent)" : "var(--crm-border-soft)", boxShadow: selected ? "0 0 0 1px var(--crm-accent), 0 12px 30px -16px var(--crm-accent)" : undefined }}
    >
      <div ref={box} className="relative aspect-[4/3] overflow-hidden bg-black">
        {w > 0 && (
          <iframe
            src={`/?theme=${id}`}
            title={SITE_THEME_LABELS[id].label}
            loading="lazy"
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
            style={{ width: 1280, height: 960, transform: `scale(${scale})` }}
          />
        )}
        {selected && (
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "var(--crm-accent)" }}>
            <Icon d={ICONS.check} className="h-3 w-3 text-black" />
          </span>
        )}
      </div>
      <span className="flex items-center justify-between gap-2 px-2.5 py-2">
        <span className="min-w-0">
          <span className={`block truncate text-xs ${selected ? "crm-accent" : ""}`}>{SITE_THEME_LABELS[id].label}</span>
          <span className="block truncate text-[0.68rem] crm-muted">{SITE_THEME_LABELS[id].note}</span>
        </span>
        {live && <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold uppercase" style={{ background: "color-mix(in srgb, var(--crm-success) 25%, transparent)", color: "var(--crm-success)" }}>Live</span>}
      </span>
    </button>
  );
}

/** A hero theme card with a real, scaled-down render of the website hero. */
function HeroThumb({ id, selected, live, onPick }: { id: HeroPreset; selected: boolean; live: boolean; onPick: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = w / 1280;
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className="group overflow-hidden rounded-xl border text-left transition-transform hover:-translate-y-0.5"
      style={{ borderColor: selected ? "var(--crm-accent)" : "var(--crm-border-soft)", boxShadow: selected ? "0 0 0 1px var(--crm-accent), 0 12px 30px -16px var(--crm-accent)" : undefined }}
    >
      <div ref={box} className="relative aspect-video overflow-hidden" style={{ background: HERO_PRESET_PALETTES[id].background }}>
        {w > 0 && (
          <iframe
            src={`/studio/hero?preset=${id}`}
            title={HERO_PRESET_LABELS[id]}
            loading="lazy"
            tabIndex={-1}
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
            style={{ width: 1280, height: 720, transform: `scale(${scale})` }}
          />
        )}
        {selected && (
          <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full" style={{ background: "var(--crm-accent)" }}>
            <Icon d={ICONS.check} className="h-3 w-3 text-black" />
          </span>
        )}
      </div>
      <span className="flex items-center justify-between gap-2 px-2.5 py-2">
        <span className={`truncate text-xs ${selected ? "crm-accent" : ""}`}>{HERO_PRESET_LABELS[id]}</span>
        {live && <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold uppercase" style={{ background: "color-mix(in srgb, var(--crm-success) 25%, transparent)", color: "var(--crm-success)" }}>Live</span>}
      </span>
    </button>
  );
}

function Range({ label, value, min, max, unit, onChange }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs">
        <span className="crm-muted">{label}</span>
        <span className="crm-accent">
          {value}
          {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full accent-[var(--crm-accent)]" />
    </label>
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
