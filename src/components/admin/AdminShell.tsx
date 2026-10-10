"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Monogram } from "@/components/ui/Logo";
import { ICONS, navGroups } from "@/lib/admin/modules";
import { ACCENTS, WALLPAPERS, usePrefs } from "@/lib/admin/prefs";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { CommandPalette } from "./CommandPalette";
import { EASE, Icon, Toaster } from "./ui";

type Props = { children: ReactNode; live: boolean; email: string | null };

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const clockFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function AdminShell({ children, live, email }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [prefs, setPrefs] = usePrefs();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const now = useClock();
  const expanded = prefs.dockExpanded;

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = useMemo(() => {
    const slug = pathname.replace(/^\/admin\/?/, "").split("/")[0] ?? "";
    for (const g of navGroups) for (const i of g.items) if (i.slug === slug) return i;
    return navGroups[0].items[0];
  }, [pathname]);

  const isActive = (slug: string) => (slug === "" ? pathname === "/admin" : pathname.startsWith(`/admin/${slug}`));

  async function signOut() {
    await createSupabaseBrowserClient()?.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const accent = ACCENTS[prefs.accent];
  const shellStyle = {
    "--color-gold": accent.base,
    "--color-gold-light": accent.light,
    "--color-gold-deep": accent.deep,
  } as CSSProperties;

  const dock = (wide: boolean) => (
    <LayoutGroup id="os-dock">
      <nav aria-label="CRM apps" className="space-y-5">
        {navGroups.map((group) => (
          <div key={group.title}>
            {wide ? (
              <p className="px-3 pb-1.5 text-[0.55rem] uppercase tracking-[0.35em] text-ivory/30">{group.title}</p>
            ) : (
              <span aria-hidden className="mx-auto mb-2 block h-px w-6 bg-gold/15" />
            )}
            <ul className={`space-y-0.5 ${prefs.density === "compact" ? "" : "space-y-1"}`}>
              {group.items.map((item) => {
                const active = isActive(item.slug);
                return (
                  <li key={item.slug || "dashboard"} className="group/item relative">
                    <Link
                      href={item.slug ? `/admin/${item.slug}` : "/admin"}
                      aria-label={item.title}
                      className={`relative flex items-center gap-3 ${wide ? "px-3" : "justify-center"} ${
                        prefs.density === "compact" ? "py-2" : "py-2.5"
                      } text-[0.78rem] transition-colors duration-300 ${active ? "text-noir" : "text-ivory/60 hover:text-gold"}`}
                    >
                      {active && (
                        <motion.span
                          layoutId="os-dock-active"
                          className="absolute inset-0 bg-gradient-to-r from-gold to-gold-light shadow-[0_8px_28px_-8px_var(--color-gold)]"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        />
                      )}
                      <span className="relative transition-transform duration-300 group-hover/item:scale-110">
                        <Icon d={item.icon} />
                      </span>
                      {wide && <span className="relative truncate">{item.title}</span>}
                    </Link>
                    {!wide && (
                      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap border border-gold/30 bg-noir px-2.5 py-1 text-[0.65rem] text-ivory opacity-0 shadow-xl transition-opacity group-hover/item:opacity-100">
                        {item.title}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </LayoutGroup>
  );

  return (
    <MotionConfig reducedMotion={prefs.motion === "reduced" ? "always" : "user"}>
      <div style={shellStyle} className="min-h-screen bg-noir text-ivory">
        <div aria-hidden className="pointer-events-none fixed inset-0" style={{ backgroundImage: WALLPAPERS[prefs.wallpaper].css }} />

        {/* OS menu bar */}
        <motion.header
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="fixed inset-x-0 top-0 z-40 flex h-12 items-center gap-3 border-b border-gold/12 bg-noir/75 px-3 backdrop-blur-xl md:px-4"
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open apps"
            className="flex h-8 w-8 items-center justify-center text-gold lg:hidden"
          >
            <Icon d={ICONS.apps} className="h-4 w-4" />
          </button>
          <Link href="/admin" className="flex items-center gap-2">
            <motion.span animate={{ rotateY: [0, 360] }} transition={{ duration: 14, repeat: Infinity, ease: "linear" }} className="inline-block">
              <Monogram size={26} />
            </motion.span>
            <span className="hidden font-display text-sm tracking-[0.25em] text-gold sm:inline">SAVLINO</span>
            <span className="hidden text-[0.55rem] uppercase tracking-[0.35em] text-ivory/40 sm:inline">OS</span>
          </Link>
          <span aria-hidden className="hidden h-4 w-px bg-gold/20 md:block" />
          <AnimatePresence mode="wait">
            <motion.span
              key={current.slug}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="hidden items-center gap-2 text-xs text-ivory/80 md:flex"
            >
              <Icon d={current.icon} className="h-3.5 w-3.5 text-gold" />
              {current.title}
            </motion.span>
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setPalette(true)}
            className="mx-auto flex h-8 w-full max-w-xs items-center gap-2 border border-gold/15 bg-noir-soft/60 px-3 text-xs text-ivory/40 transition-colors hover:border-gold/45 hover:text-ivory/70"
          >
            <Icon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35" className="h-3.5 w-3.5" />
            Search or run…
            <kbd className="ml-auto hidden border border-gold/25 px-1 text-[0.55rem] sm:inline">⌘K</kbd>
          </button>

          <div className="flex items-center gap-2">
            {!live && (
              <span
                className="hidden items-center gap-1.5 border border-gold/40 bg-gold/10 px-2 py-1 text-[0.55rem] uppercase tracking-[0.25em] text-gold sm:inline-flex"
                title="Supabase not connected — figures are sample data"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
                </span>
                Demo
              </span>
            )}
            <Link href="/admin/studio" className="hidden text-ivory/55 hover:text-gold md:block" aria-label="Studio" title="Studio">
              <Icon d={ICONS.studio} className="h-4 w-4" />
            </Link>
            <Link href="/admin/settings" className="hidden text-ivory/55 hover:text-gold md:block" aria-label="Settings" title="Settings">
              <Icon d={ICONS.settings} className="h-4 w-4" />
            </Link>
            <span className="hidden min-w-[9.5rem] text-right text-[0.7rem] tabular-nums text-ivory/55 xl:block">{now ? clockFmt.format(now) : ""}</span>
            <Link
              href="/"
              className="border border-gold/25 px-2.5 py-1 text-[0.55rem] uppercase tracking-[0.25em] text-ivory/70 transition-colors hover:border-gold hover:text-gold"
            >
              Site
            </Link>
          </div>
        </motion.header>

        {/* Dock */}
        <motion.aside
          animate={{ width: expanded ? 232 : 68 }}
          transition={{ type: "spring", stiffness: 300, damping: 34 }}
          className="fixed bottom-0 left-0 top-12 z-30 hidden flex-col border-r border-gold/12 bg-noir/85 backdrop-blur-xl lg:flex"
        >
          <div className="no-scrollbar flex-1 overflow-y-auto overflow-x-visible px-2.5 py-4">{dock(expanded)}</div>
          <div className="border-t border-gold/12 p-2.5">
            {expanded && (
              <div className="mb-2 px-2">
                {live ? (
                  <>
                    <p className="truncate text-[0.7rem] text-ivory/55">{email ?? "Administrator"}</p>
                    <button type="button" onClick={signOut} className="mt-1 text-[0.55rem] uppercase tracking-[0.3em] text-gold hover:text-gold-light">
                      Sign out
                    </button>
                  </>
                ) : (
                  <p className="text-[0.62rem] leading-relaxed text-ivory/40">Preview mode — connect Supabase for live data.</p>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => setPrefs({ dockExpanded: !expanded })}
              aria-label={expanded ? "Collapse dock" : "Expand dock"}
              className="flex h-9 w-full items-center justify-center border border-gold/15 text-gold/80 transition-colors hover:border-gold/45 hover:text-gold"
            >
              <motion.span animate={{ rotate: expanded ? 180 : 0 }}>
                <Icon d="M9 6l6 6-6 6" className="h-4 w-4" />
              </motion.span>
            </button>
          </div>
        </motion.aside>

        {/* Mobile dock */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                className="fixed inset-0 z-40 bg-noir/70 backdrop-blur-sm lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
              />
              <motion.aside
                className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto border-r border-gold/20 bg-noir px-3 py-5 lg:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 280, damping: 32 }}
              >
                {dock(true)}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className={`relative pt-12 transition-[padding] duration-500 ${expanded ? "lg:pl-[232px]" : "lg:pl-[68px]"}`}>
          <main id="main" className={`relative ${prefs.density === "compact" ? "px-4 py-6 md:px-6" : "px-4 py-8 md:px-8 md:py-10"}`}>
            {children}
          </main>
        </div>

        <CommandPalette open={palette} onClose={() => setPalette(false)} />
        <Toaster />
      </div>
    </MotionConfig>
  );
}
