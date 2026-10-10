"use client";

import { LayoutGroup, motion } from "motion/react";
import { useId, useState } from "react";
import { ACCENTS, HEADING_FONTS, WALLPAPERS, usePrefs, type AccentKey, type CrmPrefs, type WallpaperKey } from "@/lib/admin/prefs";
import { useSiteSettings } from "@/lib/admin/site-settings-client";
import type { SiteSettings } from "@/lib/settings";
import { Card, ColorField, NumberField, SaveBar, TextField, Toggle } from "./fields";
import { EASE } from "./ui";

const TABS = [
  { id: "business", label: "Business" },
  { id: "commerce", label: "Commerce" },
  { id: "appearance", label: "CRM appearance" },
  { id: "system", label: "System" },
] as const;

export function SettingsApp({ live }: { live: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("business");
  const { settings, setSettings, save, saving, dirty, reset, loading } = useSiteSettings(live);
  const [prefs, setPrefs, resetPrefs] = usePrefs();
  const setCrm = (patch: Partial<SiteSettings["crm"]>) => setSettings((s) => ({ ...s, crm: { ...s.crm, ...patch } }));

  const setBrand = (patch: Partial<SiteSettings["brand"]>) => setSettings((s) => ({ ...s, brand: { ...s.brand, ...patch } }));
  const setCommerce = (patch: Partial<SiteSettings["commerce"]>) => setSettings((s) => ({ ...s, commerce: { ...s.commerce, ...patch } }));

  return (
    <div className="pb-24">
      <motion.header initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
        <p className="text-[0.6rem] uppercase tracking-[0.4em] text-gold">SAVLINO OS</p>
        <h1 className="mt-2 font-display text-4xl text-ivory md:text-5xl">Settings</h1>
        <p className="mt-2 font-serif text-lg text-ivory/60">Business details, commerce rules and how your CRM looks.</p>
      </motion.header>

      <LayoutGroup id="settings-tabs">
        <div className="no-scrollbar mt-8 flex gap-1 overflow-x-auto border-b border-gold/12">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative whitespace-nowrap px-4 py-3 text-[0.62rem] uppercase tracking-[0.25em] ${tab === t.id ? "text-gold" : "text-ivory/50 hover:text-ivory"}`}
            >
              {tab === t.id && <motion.span layoutId="settings-tab" className="absolute inset-x-0 -bottom-px h-px bg-gold" />}
              {t.label}
            </button>
          ))}
        </div>
      </LayoutGroup>

      {loading ? (
        <div className="mt-8 h-64 animate-pulse border border-gold/10 bg-noir-soft/40" />
      ) : (
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="mt-8 grid gap-5 xl:grid-cols-2">
          {tab === "business" && (
            <>
              <Card title="Brand" description="Shown across the website.">
                <TextField label="Brand name" value={settings.brand.name} onChange={(v) => setBrand({ name: v })} />
                <TextField label="Tagline" value={settings.brand.tagline} onChange={(v) => setBrand({ tagline: v })} />
              </Card>
              <Card title="Contact" description="Appears on the Contact page when filled in.">
                <TextField label="Email" value={settings.brand.contactEmail} onChange={(v) => setBrand({ contactEmail: v })} placeholder="hello@savlino.com" />
                <TextField label="Phone" value={settings.brand.phone} onChange={(v) => setBrand({ phone: v })} placeholder="+91 …" />
                <TextField label="WhatsApp" value={settings.brand.whatsapp} onChange={(v) => setBrand({ whatsapp: v })} placeholder="+91 …" />
                <TextField label="Studio address" value={settings.brand.address} onChange={(v) => setBrand({ address: v })} multiline />
              </Card>
              <Card title="Social">
                <TextField label="Instagram URL" value={settings.brand.instagram} onChange={(v) => setBrand({ instagram: v })} />
                <TextField label="Facebook URL" value={settings.brand.facebook} onChange={(v) => setBrand({ facebook: v })} />
                <TextField label="YouTube URL" value={settings.brand.youtube} onChange={(v) => setBrand({ youtube: v })} />
              </Card>
            </>
          )}

          {tab === "commerce" && (
            <>
              <Card title="Shipping" description="Used at checkout once ordering opens.">
                <NumberField label="Shipping fee" suffix="₹" value={settings.commerce.shippingFee} onChange={(v) => setCommerce({ shippingFee: v })} />
                <NumberField label="Free shipping above" suffix="₹" value={settings.commerce.freeShippingAbove} onChange={(v) => setCommerce({ freeShippingAbove: v })} />
                <Toggle label="Cash on delivery" checked={settings.commerce.codEnabled} onChange={(v) => setCommerce({ codEnabled: v })} />
              </Card>
              <Card title="Orders & tax">
                <TextField label="Order number prefix" value={settings.commerce.orderPrefix} onChange={(v) => setCommerce({ orderPrefix: v.toUpperCase().slice(0, 6) })} />
                <NumberField label="Tax (GST)" suffix="%" value={settings.commerce.taxPercent} onChange={(v) => setCommerce({ taxPercent: v })} />
                <NumberField label="Return window" suffix="days" value={settings.commerce.returnWindowDays} onChange={(v) => setCommerce({ returnWindowDays: v })} />
              </Card>
            </>
          )}

          {tab === "appearance" && (
            <>
              <Card title="My appearance" description="Only for you, in this browser. “House” follows the defaults for all admins.">
                <Segmented
                  label="Theme"
                  value={prefs.mode}
                  options={[
                    ["house", "House"],
                    ["dark", "Dark"],
                    ["light", "Light"],
                    ["system", "System"],
                  ]}
                  onChange={(v) => setPrefs({ mode: v as CrmPrefs["mode"] })}
                />
                <div>
                  <p className="text-[0.58rem] uppercase tracking-[0.25em] text-ivory/50">Accent</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <Swatch active={prefs.accent === "house"} onClick={() => setPrefs({ accent: "house" })} label="House" colors={["var(--color-gold-deep)", "var(--color-gold-light)"]} />
                    {(Object.keys(ACCENTS) as AccentKey[]).map((k) => (
                      <Swatch key={k} active={prefs.accent === k} onClick={() => setPrefs({ accent: k })} label={ACCENTS[k].label} colors={[ACCENTS[k].dark[2], ACCENTS[k].dark[1]]} />
                    ))}
                    <Swatch active={prefs.accent === "custom"} onClick={() => setPrefs({ accent: "custom" })} label="Custom" colors={[prefs.customAccent, prefs.customAccent]} />
                  </div>
                  {prefs.accent === "custom" && (
                    <div className="mt-3">
                      <ColorField label="Custom accent" value={prefs.customAccent} onChange={(v) => setPrefs({ customAccent: v })} />
                    </div>
                  )}
                </div>
                <Segmented
                  label="Wallpaper"
                  value={prefs.wallpaper}
                  options={[["house", "House"], ...(Object.keys(WALLPAPERS) as WallpaperKey[]).map((k) => [k, WALLPAPERS[k].label] as [string, string])]}
                  onChange={(v) => setPrefs({ wallpaper: v as CrmPrefs["wallpaper"] })}
                />
                <Segmented
                  label="Corners"
                  value={prefs.radius}
                  options={[
                    ["house", "House"],
                    ["sharp", "Sharp"],
                    ["soft", "Rounded"],
                  ]}
                  onChange={(v) => setPrefs({ radius: v as CrmPrefs["radius"] })}
                />
                <Segmented
                  label="Headings"
                  value={prefs.headingFont}
                  options={(Object.keys(HEADING_FONTS) as CrmPrefs["headingFont"][]).map((k) => [k, HEADING_FONTS[k].label] as [string, string])}
                  onChange={(v) => setPrefs({ headingFont: v as CrmPrefs["headingFont"] })}
                />
              </Card>

              <div className="space-y-5">
                <Card title="House defaults" description="Applies to every admin who hasn’t chosen their own. Publish to save.">
                  <Segmented
                    label="CRM theme"
                    value={settings.crm.mode}
                    options={[
                      ["dark", "Royal Noir · dark"],
                      ["light", "Ivory Atelier · light"],
                    ]}
                    onChange={(v) => setCrm({ mode: v as SiteSettings["crm"]["mode"] })}
                  />
                  <Segmented
                    label="Accent"
                    value={settings.crm.accent}
                    options={(Object.keys(ACCENTS) as AccentKey[]).map((k) => [k, ACCENTS[k].label] as [string, string])}
                    onChange={(v) => setCrm({ accent: v })}
                  />
                  <Segmented
                    label="Wallpaper"
                    value={settings.crm.wallpaper}
                    options={(Object.keys(WALLPAPERS) as WallpaperKey[]).map((k) => [k, WALLPAPERS[k].label] as [string, string])}
                    onChange={(v) => setCrm({ wallpaper: v })}
                  />
                  <Segmented
                    label="Corners"
                    value={settings.crm.radius}
                    options={[
                      ["sharp", "Sharp"],
                      ["soft", "Rounded"],
                    ]}
                    onChange={(v) => setCrm({ radius: v as SiteSettings["crm"]["radius"] })}
                  />
                </Card>
                <Card title="Layout">
                  <Toggle label="Expanded dock" hint="Show app names next to icons." checked={prefs.dockExpanded} onChange={(v) => setPrefs({ dockExpanded: v })} />
                  <Toggle label="Compact density" hint="Fit more on screen." checked={prefs.density === "compact"} onChange={(v) => setPrefs({ density: v ? "compact" : "comfortable" })} />
                  <Toggle label="Reduce motion" hint="Turn off CRM animations." checked={prefs.motion === "reduced"} onChange={(v) => setPrefs({ motion: v ? "reduced" : "full" })} />
                  <button type="button" onClick={resetPrefs} className="text-[0.6rem] uppercase tracking-[0.25em] text-ivory/45 hover:text-gold">
                    Reset my appearance
                  </button>
                </Card>
              </div>
            </>
          )}

          {tab === "system" && (
            <>
              <Card title="Database">
                <div className="flex items-center gap-3 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-full ${live ? "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.8)]" : "bg-gold"}`} />
                  <span className="text-ivory">{live ? "Connected to Supabase" : "Not connected — demo mode"}</span>
                </div>
                <p className="text-xs leading-relaxed text-ivory/50">
                  {live
                    ? "All apps read and write your live database. Every table is protected so only administrators can manage business data."
                    : "Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local and restart to go live."}
                </p>
              </Card>
              <Card title="Keyboard">
                <p className="text-sm text-ivory/70">
                  Press <kbd className="border border-gold/30 px-1.5 text-xs">⌘K</kbd> / <kbd className="border border-gold/30 px-1.5 text-xs">Ctrl K</kbd> anywhere to search apps or run an action.
                </p>
              </Card>
            </>
          )}
        </motion.div>
      )}

      <SaveBar dirty={dirty} saving={saving} live={live} onSave={() => void save()} onReset={reset} />
    </div>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  const uid = useId();
  return (
    <div>
      <p className="text-[0.58rem] uppercase tracking-[0.25em] text-ivory/50">{label}</p>
      <LayoutGroup id={`seg-${uid}`}>
        <div className="mt-2 flex flex-wrap gap-1 border border-gold/15 p-0.5">
          {options.map(([v, l]) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className={`relative flex-1 whitespace-nowrap px-3 py-2 text-[0.62rem] uppercase tracking-[0.15em] ${value === v ? "text-noir" : "text-ivory/60 hover:text-gold"}`}
            >
              {value === v && <motion.span layoutId={`seg-pill-${uid}`} className="absolute inset-0 bg-gold" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="relative">{l}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>
    </div>
  );
}

function Swatch({ active, onClick, label, colors }: { active: boolean; onClick: () => void; label: string; colors: [string, string] }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 border px-3 py-2.5 text-left text-xs transition-colors ${
        active ? "border-gold text-ivory" : "border-gold/15 text-ivory/60 hover:border-gold/40"
      }`}
    >
      <span className="h-5 w-5 shrink-0 rounded-full" style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }} />
      {label}
    </button>
  );
}
