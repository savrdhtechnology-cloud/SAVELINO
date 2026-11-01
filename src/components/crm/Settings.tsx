"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { SiteSettings } from "@/lib/settings";
import type { Profile } from "@/lib/data/types";
import { db, fetchProfiles, fetchSettings, must, saveSettings, useLoad } from "./data";
import { Badge, EASE, Field, ICONS, Icon, PageHeader, Panel, Skeleton, Tabs, Toggle, fmtDate, toast } from "./ui";

type Tab = "store" | "payments" | "shipping" | "team";

export function Settings({ me }: { me: { id: string; role: string } }) {
  const { data, loading, reload } = useLoad(async () => {
    const [settings, profiles] = await Promise.all([fetchSettings(), fetchProfiles()]);
    return { settings, profiles };
  });
  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader section="Settings" subtitle="Control center" />
        <Skeleton className="h-[560px]" />
      </div>
    );
  }
  return <Editor initial={data.settings} profiles={data.profiles} me={me} onTeamChange={() => void reload()} />;
}

function Editor({ initial, profiles, me, onTeamChange }: { initial: SiteSettings; profiles: Profile[]; me: { id: string; role: string }; onTeamChange: () => void }) {
  const [s, setS] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [tab, setTab] = useState<Tab>("store");
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(s) !== JSON.stringify(saved);
  const brand = (p: Partial<SiteSettings["brand"]>) => setS((x) => ({ ...x, brand: { ...x.brand, ...p } }));
  const commerce = (p: Partial<SiteSettings["commerce"]>) => setS((x) => ({ ...x, commerce: { ...x.commerce, ...p } }));
  const isAdmin = me.role === "admin";

  async function save() {
    setBusy(true);
    try {
      await saveSettings(s);
      setSaved(s);
      toast("Settings saved");
    } catch (e) {
      toast(e instanceof Error ? (e.message.includes("row-level security") ? "Only an admin can change settings" : e.message) : "Could not save", "error");
    } finally {
      setBusy(false);
    }
  }

  async function setRole(p: Profile, role: Profile["role"]) {
    if (p.id === me.id && role !== "admin" && !window.confirm("Remove your own admin access?")) return;
    try {
      must(await db().from("profiles").update({ role }).eq("id", p.id).select("id"));
      toast(role === "none" ? "Access removed" : `Now ${role}`);
      onTeamChange();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not update", "error");
    }
  }

  const upiOk = !s.commerce.upiId || /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(s.commerce.upiId);

  return (
    <div className="space-y-6 pb-24">
      <PageHeader section="Settings" subtitle="Control center — store, payments, shipping and team" />
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "store", label: "Store Profile", icon: ICONS.website },
          { value: "payments", label: "Payment Configuration", icon: ICONS.payments },
          { value: "shipping", label: "Shipping & Tax", icon: ICONS.truck },
          { value: "team", label: "Team & Access", icon: ICONS.user },
        ]}
      />

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
          {tab === "store" && (
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="Store Profile" icon={ICONS.website} subtitle="Shown on the website and in messages">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Store name" value={s.brand.name} onChange={(e) => brand({ name: e.target.value })} />
                  <Field label="Tagline" value={s.brand.tagline} onChange={(e) => brand({ tagline: e.target.value })} />
                  <Field label="Business email" type="email" value={s.brand.contactEmail} onChange={(e) => brand({ contactEmail: e.target.value })} />
                  <Field label="Phone" value={s.brand.phone} onChange={(e) => brand({ phone: e.target.value })} placeholder="+91 98765 43210" />
                  <Field label="WhatsApp number" value={s.brand.whatsapp} onChange={(e) => brand({ whatsapp: e.target.value })} placeholder="919876543210" hint="Used for “Ask on WhatsApp” and order messages" />
                  <Field label="Business address" value={s.brand.address} onChange={(e) => brand({ address: e.target.value })} className="sm:col-span-2" />
                </div>
              </Panel>
              <Panel title="Social" icon={ICONS.globe}>
                <div className="grid gap-3">
                  <Field label="Instagram" value={s.brand.instagram} onChange={(e) => brand({ instagram: e.target.value })} placeholder="https://instagram.com/savlino" />
                  <Field label="Facebook" value={s.brand.facebook} onChange={(e) => brand({ facebook: e.target.value })} />
                  <Field label="YouTube" value={s.brand.youtube} onChange={(e) => brand({ youtube: e.target.value })} />
                </div>
              </Panel>
            </div>
          )}

          {tab === "payments" && (
            <div className="grid gap-6 xl:grid-cols-2">
              <Panel title="UPI" icon={ICONS.payments} subtitle="Customers pay to this UPI ID and submit the UTR for verification">
                <div className="grid gap-3">
                  <Field label="UPI ID" value={s.commerce.upiId} onChange={(e) => commerce({ upiId: e.target.value.trim() })} placeholder="savlino@okhdfcbank" hint={upiOk ? "Leave empty to hide UPI at checkout" : "This doesn’t look like a UPI ID (name@bank)"} />
                  <Field label="Name shown in the UPI app" value={s.commerce.upiName} onChange={(e) => commerce({ upiName: e.target.value })} />
                </div>
              </Panel>
              <Panel title="Cash on delivery" icon={ICONS.truck}>
                <Toggle label="Offer cash on delivery" hint="Customers pay in cash when the order arrives" checked={s.commerce.codEnabled} onChange={(v) => commerce({ codEnabled: v })} />
                <p className="mt-4 text-xs crm-muted">Online cards / netbanking (Razorpay) can be added later — share the keys when ready.</p>
              </Panel>
            </div>
          )}

          {tab === "shipping" && (
            <Panel title="Shipping & Tax" icon={ICONS.truck}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <Field label="Shipping fee (₹)" type="number" min={0} value={s.commerce.shippingFee} onChange={(e) => commerce({ shippingFee: Number(e.target.value) || 0 })} hint="0 = free shipping" />
                <Field label="Free shipping above (₹)" type="number" min={0} value={s.commerce.freeShippingAbove} onChange={(e) => commerce({ freeShippingAbove: Number(e.target.value) || 0 })} hint="0 = never" />
                <Field label="Tax %" type="number" min={0} value={s.commerce.taxPercent} onChange={(e) => commerce({ taxPercent: Number(e.target.value) || 0 })} hint="Prices are shown inclusive of tax" />
                <Field label="Order number prefix" value={s.commerce.orderPrefix} maxLength={6} onChange={(e) => commerce({ orderPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} />
                <Field label="Return window (days)" type="number" min={0} value={s.commerce.returnWindowDays} onChange={(e) => commerce({ returnWindowDays: Number(e.target.value) || 0 })} />
              </div>
            </Panel>
          )}

          {tab === "team" && (
            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
              <Panel title="Admin Users & Roles" icon={ICONS.user}>
                <ul className="divide-y" style={{ borderColor: "var(--crm-border-soft)" }}>
                  {profiles.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold" style={{ background: "var(--crm-wash)", color: "#f8d9a8" }}>
                        {(p.full_name || p.email || "?").slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">
                          {p.full_name || p.email} {p.id === me.id && <span className="crm-muted">(you)</span>}
                        </span>
                        <span className="text-[0.7rem] crm-muted">
                          {p.email} · joined {fmtDate(p.created_at)}
                        </span>
                      </span>
                      <Badge status={p.role === "none" ? "rejected" : "verified"} label={p.role === "none" ? "No access" : p.role} />
                      {isAdmin && (
                        <select value={p.role} onChange={(e) => void setRole(p, e.target.value as Profile["role"])} className="crm-input !mt-0 w-auto py-1.5 text-xs">
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                          <option value="none">No access</option>
                        </select>
                      )}
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel title="Add a team member" icon={ICONS.shield}>
                <ol className="list-decimal space-y-2 pl-5 text-sm crm-muted">
                  <li>Supabase → Authentication → Users → “Add user”, enter their email and a password (tick “Auto confirm”).</li>
                  <li>They appear in this list with “No access”.</li>
                  <li>Choose Staff (products, orders, payments) or Admin (also website &amp; settings).</li>
                </ol>
                <p className="mt-4 text-xs crm-muted">Keep “Allow new users to sign up” switched off in Supabase → Authentication → Sign In / Providers.</p>
              </Panel>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {dirty && tab !== "team" && (
          <motion.div initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }} className="crm-panel fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 px-5 py-3 lg:ml-[132px]">
            <span className="text-sm">Unsaved changes</span>
            <button type="button" className="crm-btn" onClick={() => setS(saved)}>
              Discard
            </button>
            <button type="button" disabled={busy || !upiOk} className="crm-btn crm-btn-gold" onClick={() => void save()}>
              <Icon d={ICONS.check} /> {busy ? "Saving…" : "Save & apply"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
