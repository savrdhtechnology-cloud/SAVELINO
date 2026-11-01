"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { Effects } from "@/components/site/Effects";
import type { SiteSettings } from "@/lib/settings";
import { ALL_FONT_KEYS, googleFontsHref } from "@/lib/fonts";
import { db } from "./data";
import { crmStyle } from "./theme";
import { EASE, ICONS, Icon, Toaster } from "./ui";

/** Unsaved CRM appearance from CRM → Website → Appearance, previewed live (null = back to saved). */
const ALL_FONTS = googleFontsHref(ALL_FONT_KEYS);

export const CRM_PREVIEW_EVENT = "savlino:crm-appearance-preview";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: ICONS.dashboard },
  { href: "/admin/studio", label: "Product Studio", icon: ICONS.studio, badge: "New" },
  { href: "/admin/products", label: "Products", icon: ICONS.products },
  { href: "/admin/orders", label: "Orders", icon: ICONS.orders },
  { href: "/admin/payments", label: "Payments", icon: ICONS.payments },
  { href: "/admin/website", label: "Website", icon: ICONS.website },
  { href: "/admin/settings", label: "Settings", icon: ICONS.settings },
];

function Emblem() {
  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-[176px] flex-col items-center justify-center rounded-full text-center" style={{ boxShadow: "inset 0 0 0 1.5px var(--crm-accent), inset 0 0 0 6px transparent, inset 0 0 0 7px var(--crm-border), 0 0 40px -10px var(--crm-accent)", background: "radial-gradient(circle, color-mix(in srgb, var(--crm-wash) 80%, transparent), transparent 75%)" }}>
      <svg viewBox="0 0 24 24" className="h-7 w-7 crm-accent" fill="none" stroke="currentColor" strokeWidth={1.2} aria-hidden>
        <path d="M12 4c1.5 2 1.5 5 0 7-1.5-2-1.5-5 0-7Zm0 7c-2-1-4.5-.8-6 .8 1.6 1.4 4 1.6 6-.8Zm0 0c2-1 4.5-.8 6 .8-1.6 1.4-4 1.6-6-.8ZM6 15h12" strokeLinecap="round" />
      </svg>
      <span className="crm-heading mt-1 text-xl tracking-[0.12em]">SAVLINO</span>
      <span className="mt-0.5 text-[0.48rem] uppercase tracking-[0.2em] crm-muted">Designer Blouse Collection</span>
      <span className="crm-serif mt-2 text-sm italic crm-accent">A Legacy of Elegance</span>
    </div>
  );
}

export function CrmShell({ crm, user, children }: { crm: SiteSettings["crm"]; user: { name: string; email: string | null; role: string }; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [preview, setPreview] = useState<SiteSettings["crm"] | null>(null);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [alerts, setAlerts] = useState({ orders: 0, payments: 0 });
  const [q, setQ] = useState("");
  const look = preview ?? crm;

  useEffect(() => {
    const on = (e: Event) => setPreview((e as CustomEvent<SiteSettings["crm"] | null>).detail);
    window.addEventListener(CRM_PREVIEW_EVENT, on);
    return () => window.removeEventListener(CRM_PREVIEW_EVENT, on);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const client = db();
        const [o, p] = await Promise.all([
          client.from("orders").select("id", { count: "exact", head: true }).eq("status", "new"),
          client.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending").neq("method", "cod"),
        ]);
        if (alive) setAlerts({ orders: o.count ?? 0, payments: p.count ?? 0 });
      } catch {
        // counts are a convenience
      }
    })();
    return () => {
      alive = false;
    };
  }, [pathname]);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  async function signOut() {
    await db().auth.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const nav = (
    <LayoutGroup id="crm-nav">
      <nav aria-label="CRM" className="space-y-1">
        {NAV.map((item, i) => {
          const active = isActive(item.href);
          return (
            <motion.div key={item.href} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i, duration: 0.5, ease: EASE }}>
              <Link href={item.href} className="group relative flex items-center gap-3 rounded-xl px-4 py-3 text-[0.92rem] transition-colors" style={{ color: active ? "var(--crm-accent-ink)" : "var(--crm-text)" }}>
                {active && (
                  <motion.span
                    layoutId="crm-nav-active"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: "linear-gradient(180deg, var(--crm-accent-2), var(--crm-accent))", boxShadow: "0 10px 30px -12px var(--crm-accent), inset 0 0 0 1px rgba(255,255,255,.25)" }}
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative transition-transform duration-300 group-hover:scale-110">
                  <Icon d={item.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="crm-serif relative text-[1.05rem]">{item.label}</span>
                {item.badge && (
                  <span className="relative ml-auto rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider" style={{ background: "var(--crm-wash)", color: "#f8d9a8" }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>
    </LayoutGroup>
  );

  const brand = (
    <Link href="/admin" className="flex items-center gap-3">
      <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ boxShadow: "inset 0 0 0 1.5px var(--crm-accent)", background: "var(--crm-wash)" }}>
        <Image src="/branding/savlino-monogram-alpha.png" alt="" width={44} height={44} className="h-10 w-10 object-contain" />
      </span>
      <span>
        <span className="crm-heading block text-2xl leading-none tracking-[0.1em]">SAVLINO</span>
        <span className="mt-1 block text-[0.52rem] uppercase tracking-[0.22em] crm-muted">Designer Blouse Collection</span>
      </span>
    </Link>
  );

  return (
    <div className="crm" style={crmStyle(look)}>
      <link rel="stylesheet" href={ALL_FONTS} precedence="default" />
      <div aria-hidden className="crm-silk" />
      <Effects key={`${look.background}-${look.cursor}`} background={look.background} cursor={look.cursor} intensity="subtle" mobile={false} zIndex={0} />

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r px-4 pb-5 pt-5 lg:flex" style={{ borderColor: "var(--crm-border-soft)", background: "color-mix(in srgb, var(--crm-bg) 82%, transparent)", backdropFilter: "blur(16px)" }}>
        <div className="px-2">{brand}</div>
        <div className="crm-scroll mt-8 flex-1 overflow-y-auto">{nav}</div>
        <Emblem />
      </aside>

      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-[72px] items-center gap-3 border-b px-4 lg:left-[264px] lg:px-8" style={{ borderColor: "var(--crm-border-soft)", background: "color-mix(in srgb, var(--crm-bg) 78%, transparent)", backdropFilter: "blur(16px)" }}>
        <button type="button" onClick={() => setOpen(true)} className="crm-btn px-2.5 lg:hidden" aria-label="Open menu">
          <Icon d="M4 7h16M4 12h16M4 17h16" />
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) router.push(`/admin/products?q=${encodeURIComponent(q.trim())}`);
          }}
          className="relative mx-auto hidden w-full max-w-md md:block"
        >
          <Icon d={ICONS.search} className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 crm-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, orders, customers…" className="crm-input !mt-0 !rounded-xl pl-10" />
        </form>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/" target="_blank" rel="noreferrer" className="hidden items-center gap-2 rounded-full border px-4 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.18em] crm-accent sm:flex" style={{ borderColor: "var(--crm-accent)", background: "color-mix(in srgb, var(--crm-accent) 10%, transparent)" }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--crm-accent)] opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--crm-accent)]" />
            </span>
            Live shop
          </Link>
          <Link href={alerts.payments ? "/admin/payments" : "/admin/orders"} className="relative p-2 crm-muted hover:text-[var(--crm-accent)]" aria-label="Notifications">
            <Icon d={ICONS.bell} className="h-5 w-5" />
            {alerts.orders + alerts.payments > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c0283c] px-1 text-[0.58rem] font-bold text-white">
                {alerts.orders + alerts.payments}
              </span>
            )}
          </Link>
          <div className="relative">
            <button type="button" onClick={() => setMenu((v) => !v)} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-[var(--crm-panel-2)]">
              <span className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold" style={{ background: "linear-gradient(135deg, var(--crm-accent-2), var(--crm-accent))", color: "var(--crm-accent-ink)" }}>
                {user.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-semibold leading-tight">{user.role === "admin" ? "Admin" : "Staff"}</span>
                <span className="block max-w-[160px] truncate text-[0.7rem] crm-muted">{user.email ?? "SAVLINO Studio"}</span>
              </span>
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="crm-panel absolute right-0 top-12 w-52 p-1.5">
                  <Link href="/admin/settings" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--crm-panel-2)]">
                    <Icon d={ICONS.settings} /> Settings
                  </Link>
                  <button type="button" onClick={() => void signOut()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--crm-panel-2)]">
                    <Icon d={ICONS.logout} /> Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.button type="button" aria-label="Close menu" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60" />
            <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.4, ease: EASE }} className="absolute inset-y-0 left-0 flex w-[280px] flex-col p-5" style={{ background: "var(--crm-bg)" }}>
              {brand}
              <div className="mt-8 flex-1">{nav}</div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <main className="relative z-10 px-4 pb-16 pt-[96px] lg:ml-[264px] lg:px-8">
        <AnimatePresence mode="wait">
          <motion.div key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <Toaster />
    </div>
  );
}
