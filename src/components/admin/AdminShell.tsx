"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Monogram } from "@/components/ui/Logo";
import { navGroups } from "@/lib/admin/modules";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { EASE, Icon, Toaster } from "./ui";

type Props = { children: ReactNode; live: boolean; email: string | null };

export function AdminShell({ children, live, email }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => setOpen(false), [pathname]);

  const allItems = useMemo(() => navGroups.flatMap((g) => g.items), []);
  const matches = query ? allItems.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())) : [];

  const isActive = (slug: string) => (slug === "" ? pathname === "/admin" : pathname.startsWith(`/admin/${slug}`));

  async function signOut() {
    await createSupabaseBrowserClient()?.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const sidebar = (
    <LayoutGroup id="admin-nav">
      <nav aria-label="CRM" className="space-y-7">
        {navGroups.map((group, gi) => (
          <motion.div
            key={group.title}
            initial={reduce ? false : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + gi * 0.07, duration: 0.6, ease: EASE }}
          >
            <p className="px-3 text-[0.56rem] uppercase tracking-[0.35em] text-ivory/35">{group.title}</p>
            <ul className="mt-2 space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.slug);
                return (
                  <li key={item.slug || "dashboard"}>
                    <Link
                      href={item.slug ? `/admin/${item.slug}` : "/admin"}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 text-[0.78rem] tracking-[0.04em] transition-colors duration-300 ${
                        active ? "text-noir" : "text-ivory/70 hover:text-gold"
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="admin-nav-pill"
                          className="absolute inset-0 bg-gradient-to-r from-gold to-gold-light shadow-[0_8px_30px_-8px_rgba(212,175,55,0.6)]"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        />
                      )}
                      <span className="relative transition-transform duration-300 group-hover:scale-110">
                        <Icon d={item.icon} />
                      </span>
                      <span className="relative">{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ))}
      </nav>
    </LayoutGroup>
  );

  return (
    <div className="min-h-screen bg-noir text-ivory">
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.08),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(107,15,26,0.18),transparent_60%)]" />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-gold/12 bg-noir/95 lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto px-4 pb-8">{sidebar}</div>
        <SidebarFooter live={live} email={email} onSignOut={signOut} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-noir/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-gold/20 bg-noir lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 32 }}
            >
              <Brand />
              <div className="flex-1 overflow-y-auto px-4 pb-8">{sidebar}</div>
              <SidebarFooter live={live} email={email} onSignOut={signOut} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="relative lg:pl-64">
        <motion.header
          initial={reduce ? false : { y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gold/12 bg-noir/80 px-4 backdrop-blur-xl md:px-8"
        >
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="flex h-10 w-10 items-center justify-center border border-gold/25 text-gold lg:hidden"
          >
            <Icon d="M4 7h16M4 12h16M4 17h10" />
          </button>

          <div className="relative w-full max-w-sm">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ivory/40">
              <Icon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35" className="h-4 w-4" />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Jump to…  orders, partners, payments"
              aria-label="Jump to a CRM section"
              className="h-10 w-full border border-gold/15 bg-noir-soft/60 pl-9 pr-3 text-sm text-ivory placeholder:text-ivory/30 outline-none transition-colors focus:border-gold/60"
            />
            <AnimatePresence>
              {matches.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute inset-x-0 top-12 border border-gold/25 bg-noir-soft py-1 shadow-2xl"
                >
                  {matches.map((m) => (
                    <li key={m.slug || "dashboard"}>
                      <Link
                        href={m.slug ? `/admin/${m.slug}` : "/admin"}
                        onClick={() => setQuery("")}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-ivory/80 hover:bg-gold/10 hover:text-gold"
                      >
                        <Icon d={m.icon} className="h-4 w-4" />
                        {m.title}
                      </Link>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {!live && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="hidden items-center gap-2 border border-gold/40 bg-gold/10 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.25em] text-gold sm:inline-flex"
                title="Supabase is not connected. Figures are sample data for preview only."
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-gold" />
                </span>
                Demo data
              </motion.span>
            )}
            <Link
              href="/"
              className="border border-gold/25 px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.25em] text-ivory/70 transition-colors hover:border-gold hover:text-gold"
            >
              View site
            </Link>
          </div>
        </motion.header>

        <main id="main" className="relative px-4 py-8 md:px-8 md:py-10">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-3 px-6 py-6">
      <motion.span
        animate={{ rotateY: [0, 360] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="inline-block [transform-style:preserve-3d]"
      >
        <Monogram size={40} />
      </motion.span>
      <span>
        <span className="block font-display text-lg tracking-[0.2em] text-gold">SAVLINO</span>
        <span className="block text-[0.55rem] uppercase tracking-[0.4em] text-ivory/45">CRM</span>
      </span>
    </Link>
  );
}

function SidebarFooter({ live, email, onSignOut }: { live: boolean; email: string | null; onSignOut: () => void }) {
  return (
    <div className="border-t border-gold/12 px-6 py-5">
      {live ? (
        <>
          <p className="truncate text-xs text-ivory/60">{email ?? "Administrator"}</p>
          <button type="button" onClick={onSignOut} className="mt-2 text-[0.6rem] uppercase tracking-[0.3em] text-gold hover:text-gold-light">
            Sign out
          </button>
        </>
      ) : (
        <p className="text-[0.65rem] leading-relaxed text-ivory/45">
          Preview mode. Connect Supabase to manage real orders, partners and payments.
        </p>
      )}
    </div>
  );
}
