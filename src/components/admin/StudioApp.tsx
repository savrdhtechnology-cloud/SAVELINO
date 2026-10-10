"use client";

import { LayoutGroup, Reorder, motion, useDragControls } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSiteSettings } from "@/lib/admin/site-settings-client";
import { DEFAULT_SETTINGS, SECTION_LABELS, type SiteSettings } from "@/lib/settings";
import { Card, ColorField, SaveBar, TextField, Toggle } from "./fields";
import { EASE, Icon } from "./ui";

const PANELS = [
  { id: "theme", label: "Theme" },
  { id: "hero", label: "Hero" },
  { id: "sections", label: "Sections" },
  { id: "announcement", label: "Announcement" },
] as const;

const DEVICES = [
  { id: "desktop", label: "Desktop", width: "100%" },
  { id: "tablet", label: "Tablet", width: "820px" },
  { id: "mobile", label: "Mobile", width: "390px" },
] as const;

const PRESETS: { name: string; theme: Partial<SiteSettings["theme"]> }[] = [
  { name: "Royal Noir", theme: { gold: "#D4AF37", noir: "#0B0B0B", ivory: "#F8F5EB", burgundy: "#6B0F1A" } },
  { name: "Rose Gold", theme: { gold: "#C98B72", noir: "#100B0B", ivory: "#FBF3EE", burgundy: "#5E1A2A" } },
  { name: "Champagne", theme: { gold: "#D8C39A", noir: "#0E0D0B", ivory: "#FAF6EC", burgundy: "#4A1C24" } },
  { name: "Emerald Court", theme: { gold: "#D4AF37", noir: "#06100C", ivory: "#F4F1E6", burgundy: "#0F4D3A" } },
];

export function StudioApp({ live }: { live: boolean }) {
  const { settings, setSettings, save, saving, dirty, reset, loading } = useSiteSettings(live);
  const [panel, setPanel] = useState<(typeof PANELS)[number]["id"]>("theme");
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const [frameKey, setFrameKey] = useState(0);
  const frame = useRef<HTMLIFrameElement>(null);

  const post = useCallback((msg: object) => {
    frame.current?.contentWindow?.postMessage(msg, window.location.origin);
  }, []);

  const pushPreview = useCallback(() => {
    const t = settings.theme;
    post({
      type: "savlino:studio:vars",
      vars: {
        "--color-gold": t.gold,
        "--color-noir": t.noir,
        "--color-ivory": t.ivory,
        "--color-burgundy": t.burgundy,
        "--font-display": t.displayFont === "cormorant" ? "var(--font-cormorant), Garamond, serif" : "var(--font-bodoni), Didot, serif",
      },
    });
    post({ type: "savlino:studio:text", key: "hero-eyebrow", value: settings.hero.eyebrow });
    post({ type: "savlino:studio:text", key: "hero-title", value: settings.hero.title });
    post({ type: "savlino:studio:text", key: "hero-subtitle", value: settings.hero.subtitle });
    post({ type: "savlino:studio:text", key: "announcement", value: settings.announcement.text });
  }, [post, settings]);

  useEffect(() => {
    pushPreview();
  }, [pushPreview]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin === window.location.origin && (e.data as { type?: string })?.type === "savlino:studio:ready") pushPreview();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [pushPreview]);

  const setTheme = (patch: Partial<SiteSettings["theme"]>) => setSettings((s) => ({ ...s, theme: { ...s.theme, ...patch } }));
  const setHero = (patch: Partial<SiteSettings["hero"]>) => setSettings((s) => ({ ...s, hero: { ...s.hero, ...patch } }));
  const setAnn = (patch: Partial<SiteSettings["announcement"]>) => setSettings((s) => ({ ...s, announcement: { ...s.announcement, ...patch } }));

  async function publish() {
    const ok = await save();
    if (ok) setFrameKey((k) => k + 1);
  }

  return (
    <div className="pb-24">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="flex flex-col justify-between gap-4 md:flex-row md:items-end"
      >
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.4em] text-gold">SAVLINO OS</p>
          <h1 className="mt-2 font-display text-4xl text-ivory md:text-5xl">Studio</h1>
          <p className="mt-2 font-serif text-lg text-ivory/60">Design the website — changes preview live, publish when ready.</p>
        </div>
        <LayoutGroup id="studio-devices">
          <div className="flex self-start border border-gold/20 p-0.5 md:self-auto">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDevice(d.id)}
                className={`relative px-3.5 py-2 text-[0.6rem] uppercase tracking-[0.22em] ${device === d.id ? "text-noir" : "text-ivory/55 hover:text-gold"}`}
              >
                {device === d.id && <motion.span layoutId="device-pill" className="absolute inset-0 bg-gold" />}
                <span className="relative">{d.label}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>
      </motion.header>

      <div className="mt-8 grid gap-6 xl:grid-cols-[380px_1fr]">
        <aside className="space-y-4">
          <LayoutGroup id="studio-panels">
            <div className="grid grid-cols-4 border border-gold/15 p-0.5">
              {PANELS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPanel(p.id)}
                  className={`relative py-2 text-[0.55rem] uppercase tracking-[0.18em] ${panel === p.id ? "text-noir" : "text-ivory/55 hover:text-gold"}`}
                >
                  {panel === p.id && <motion.span layoutId="studio-panel" className="absolute inset-0 bg-gold" />}
                  <span className="relative">{p.label}</span>
                </button>
              ))}
            </div>
          </LayoutGroup>

          {loading ? (
            <div className="h-72 animate-pulse border border-gold/10 bg-noir-soft/40" />
          ) : (
            <motion.div key={panel} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, ease: EASE }} className="space-y-4">
              {panel === "theme" && (
                <>
                  <Card title="Presets">
                    <div className="grid grid-cols-2 gap-2">
                      {PRESETS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => setTheme(p.theme)}
                          className="group border border-gold/15 p-2.5 text-left text-xs text-ivory/70 transition-colors hover:border-gold/50"
                        >
                          <span className="flex gap-1">
                            {[p.theme.noir, p.theme.gold, p.theme.ivory, p.theme.burgundy].map((c, i) => (
                              <span key={i} className="h-5 flex-1 border border-white/10" style={{ background: c }} />
                            ))}
                          </span>
                          <span className="mt-2 block group-hover:text-gold">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </Card>
                  <Card title="Colours">
                    <ColorField label="Antique gold" value={settings.theme.gold} onChange={(v) => setTheme({ gold: v })} />
                    <ColorField label="Royal noir" value={settings.theme.noir} onChange={(v) => setTheme({ noir: v })} />
                    <ColorField label="Ivory" value={settings.theme.ivory} onChange={(v) => setTheme({ ivory: v })} />
                    <ColorField label="Burgundy" value={settings.theme.burgundy} onChange={(v) => setTheme({ burgundy: v })} />
                    <button type="button" onClick={() => setTheme(DEFAULT_SETTINGS.theme)} className="text-[0.6rem] uppercase tracking-[0.25em] text-ivory/45 hover:text-gold">
                      Reset to brand colours
                    </button>
                  </Card>
                  <Card title="Headline typeface">
                    <div className="grid grid-cols-2 gap-2">
                      {(["bodoni", "cormorant"] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setTheme({ displayFont: f })}
                          className={`border px-3 py-4 text-2xl ${settings.theme.displayFont === f ? "border-gold text-gold" : "border-gold/15 text-ivory/70"}`}
                          style={{ fontFamily: f === "bodoni" ? "var(--font-bodoni)" : "var(--font-cormorant)" }}
                        >
                          {f === "bodoni" ? "Bodoni" : "Cormorant"}
                        </button>
                      ))}
                    </div>
                  </Card>
                </>
              )}

              {panel === "hero" && (
                <Card title="Hero" description="The first thing visitors see.">
                  <TextField label="Eyebrow" value={settings.hero.eyebrow} onChange={(v) => setHero({ eyebrow: v })} />
                  <TextField label="Headline" value={settings.hero.title} onChange={(v) => setHero({ title: v })} />
                  <TextField label="Subtitle" value={settings.hero.subtitle} onChange={(v) => setHero({ subtitle: v })} multiline />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField label="Primary button" value={settings.hero.primaryLabel} onChange={(v) => setHero({ primaryLabel: v })} />
                    <TextField label="Links to" value={settings.hero.primaryHref} onChange={(v) => setHero({ primaryHref: v })} />
                    <TextField label="Second button" value={settings.hero.secondaryLabel} onChange={(v) => setHero({ secondaryLabel: v })} />
                    <TextField label="Links to" value={settings.hero.secondaryHref} onChange={(v) => setHero({ secondaryHref: v })} />
                  </div>
                </Card>
              )}

              {panel === "sections" && (
                <Card title="Homepage sections" description="Drag to reorder, switch off to hide.">
                  <Reorder.Group
                    axis="y"
                    values={settings.sections}
                    onReorder={(next) => setSettings((s) => ({ ...s, sections: next }))}
                    className="space-y-2"
                  >
                    {settings.sections.map((sec) => (
                      <SectionRow
                        key={sec.id}
                        item={sec}
                        onToggle={() =>
                          setSettings((s) => ({ ...s, sections: s.sections.map((x) => (x.id === sec.id ? { ...x, visible: !x.visible } : x)) }))
                        }
                      />
                    ))}
                  </Reorder.Group>
                  <p className="text-xs text-ivory/40">Section order applies to the preview after publishing.</p>
                </Card>
              )}

              {panel === "announcement" && (
                <Card title="Announcement bar" description="A gold strip above the site header.">
                  <Toggle label="Show announcement" checked={settings.announcement.enabled} onChange={(v) => setAnn({ enabled: v })} />
                  <TextField label="Message" value={settings.announcement.text} onChange={(v) => setAnn({ text: v })} placeholder="Festive edit — now open for custom orders" />
                  <TextField label="Link (optional)" value={settings.announcement.href} onChange={(v) => setAnn({ href: v })} placeholder="/custom-stitching" />
                </Card>
              )}
            </motion.div>
          )}
        </aside>

        <section className="min-w-0">
          <div className="flex items-center justify-between border border-b-0 border-gold/15 bg-noir-soft/70 px-4 py-2.5">
            <div className="flex gap-1.5">
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <span key={c} className="h-2.5 w-2.5 rounded-full" style={{ background: c, opacity: 0.7 }} />
              ))}
            </div>
            <span className="text-[0.62rem] tracking-[0.15em] text-ivory/40">savlino · live preview</span>
            <button type="button" onClick={() => setFrameKey((k) => k + 1)} className="text-ivory/50 hover:text-gold" aria-label="Reload preview">
              <Icon d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" className="h-4 w-4" />
            </button>
          </div>
          <div className="flex justify-center overflow-hidden border border-gold/15 bg-[repeating-linear-gradient(45deg,rgba(212,175,55,0.03)_0_10px,transparent_10px_20px)]">
            <motion.div
              animate={{ width: DEVICES.find((d) => d.id === device)?.width }}
              transition={{ type: "spring", stiffness: 220, damping: 30 }}
              className="h-[72vh] max-w-full bg-noir shadow-[0_0_60px_-20px_rgba(0,0,0,0.9)]"
            >
              <iframe key={frameKey} ref={frame} src="/" title="Website preview" className="h-full w-full" onLoad={pushPreview} />
            </motion.div>
          </div>
        </section>
      </div>

      <SaveBar dirty={dirty} saving={saving} live={live} onSave={() => void publish()} onReset={reset} />
    </div>
  );
}

function SectionRow({ item, onToggle }: { item: SiteSettings["sections"][number]; onToggle: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      whileDrag={{ scale: 1.02, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.8)" }}
      className="flex items-center gap-3 border border-gold/15 bg-noir/80 px-3 py-2.5"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        className="cursor-grab touch-none text-ivory/35 hover:text-gold active:cursor-grabbing"
        aria-label={`Drag ${SECTION_LABELS[item.id]}`}
      >
        <Icon d="M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01" className="h-4 w-4" />
      </button>
      <span className={`flex-1 text-sm ${item.visible ? "text-ivory" : "text-ivory/35 line-through"}`}>{SECTION_LABELS[item.id]}</span>
      <button
        type="button"
        role="switch"
        aria-checked={item.visible}
        aria-label={`Show ${SECTION_LABELS[item.id]}`}
        onClick={onToggle}
        className={`relative h-5 w-9 rounded-full transition-colors ${item.visible ? "bg-gold" : "bg-ivory/15"}`}
      >
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-noir transition-all ${item.visible ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </Reorder.Item>
  );
}

