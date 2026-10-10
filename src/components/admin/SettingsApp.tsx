"use client";

import { LayoutGroup, motion } from "motion/react";
import { useState } from "react";
import { ACCENTS, WALLPAPERS, usePrefs, type CrmPrefs } from "@/lib/admin/prefs";
import { useSiteSettings } from "@/lib/admin/site-settings-client";
import type { SiteSettings } from "@/lib/settings";
import { Card, NumberField, SaveBar, TextField, Toggle } from "./fields";
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
  const [prefs, setPrefs] = usePrefs();

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
              <Card title="Accent colour" description="Saved in this browser for your account.">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(Object.keys(ACCENTS) as CrmPrefs["accent"][]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPrefs({ accent: k })}
                      className={`flex items-center gap-3 border px-3 py-2.5 text-left text-xs transition-colors ${
                        prefs.accent === k ? "border-gold text-ivory" : "border-gold/15 text-ivory/60 hover:border-gold/40"
                      }`}
                    >
                      <span className="h-5 w-5 rounded-full" style={{ background: `linear-gradient(135deg, ${ACCENTS[k].deep}, ${ACCENTS[k].light})` }} />
                      {ACCENTS[k].label}
                    </button>
                  ))}
                </div>
              </Card>
              <Card title="Wallpaper">
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(WALLPAPERS) as CrmPrefs["wallpaper"][]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPrefs({ wallpaper: k })}
                      className={`h-20 border bg-noir text-[0.6rem] uppercase tracking-[0.2em] ${prefs.wallpaper === k ? "border-gold text-gold" : "border-gold/15 text-ivory/50"}`}
                      style={{ backgroundImage: WALLPAPERS[k].css }}
                    >
                      {WALLPAPERS[k].label}
                    </button>
                  ))}
                </div>
              </Card>
              <Card title="Layout">
                <Toggle label="Expanded dock" hint="Show app names next to icons." checked={prefs.dockExpanded} onChange={(v) => setPrefs({ dockExpanded: v })} />
                <Toggle label="Compact density" hint="Fit more on screen." checked={prefs.density === "compact"} onChange={(v) => setPrefs({ density: v ? "compact" : "comfortable" })} />
                <Toggle label="Reduce motion" hint="Turn off CRM animations." checked={prefs.motion === "reduced"} onChange={(v) => setPrefs({ motion: v ? "reduced" : "full" })} />
              </Card>
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
