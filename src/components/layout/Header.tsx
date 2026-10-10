"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/Logo";
import { primaryNav } from "@/lib/site";
import { AnnouncementBar } from "@/components/site/AnnouncementBar";

const EASE = [0.22, 1, 0.36, 1] as const;

export function Header({
  announcement,
  themeToggle = false,
}: {
  announcement?: { text: string; href: string } | null;
  themeToggle?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <motion.header
      initial={reduce ? false : { y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 1.2, delay: 0.2, ease: EASE }}
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-700 ${
        scrolled || open
          ? "border-b border-gold/15 bg-noir/90 backdrop-blur-md"
          : "border-b border-transparent bg-gradient-to-b from-noir/70 to-transparent"
      }`}
    >
      {announcement && <AnnouncementBar text={announcement.text} href={announcement.href} />}
      <div className="mx-auto flex h-[var(--header-h)] max-w-[1440px] items-center justify-between px-5 md:px-10">
        <nav aria-label="Primary" className="hidden flex-1 items-center gap-8 lg:flex">
          {primaryNav.slice(0, 3).map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <Link href="/" aria-label="SAVLINO home" className="flex shrink-0 items-center lg:justify-center">
          <Logo
            height={scrolled ? 56 : 68}
            priority
            className="h-auto transition-[width,height] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] max-md:h-[50px]! max-md:w-auto!"
          />
        </Link>

        <div className="hidden flex-1 items-center justify-end gap-8 lg:flex">
          {primaryNav.slice(3).map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
          {themeToggle && <ThemeToggle />}
          <Link
            href="/login"
            className="border border-gold/50 px-5 py-2.5 text-[0.65rem] uppercase tracking-[0.3em] text-gold transition-colors duration-500 hover:bg-gold hover:text-noir"
          >
            Sign in
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="relative flex h-11 w-11 items-center justify-center lg:hidden"
        >
          <span
            className={`absolute h-px w-6 bg-gold transition-transform duration-500 ${open ? "rotate-45" : "-translate-y-1.5"}`}
          />
          <span
            className={`absolute h-px w-6 bg-gold transition-transform duration-500 ${open ? "-rotate-45" : "translate-y-1.5"}`}
          />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="mobile-menu"
            aria-label="Mobile"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: reduce ? 0 : 0.5, ease: EASE }}
            className="h-[calc(100dvh-var(--header-h))] overflow-y-auto border-t border-gold/15 bg-noir px-6 pb-10 pt-8 lg:hidden"
          >
            <ul className="space-y-1">
              {primaryNav.map((item, i) => (
                <motion.li
                  key={item.href}
                  initial={reduce ? false : { opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduce ? 0 : 0.05 * i, duration: 0.6, ease: EASE }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block border-b border-gold/10 py-4 font-display text-3xl text-ivory transition-colors hover:text-gold"
                  >
                    {item.label}
                  </Link>
                </motion.li>
              ))}
            </ul>
            <div className="mt-10 grid grid-cols-2 gap-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="bg-gold py-3.5 text-center text-[0.7rem] uppercase tracking-[0.3em] text-noir"
              >
                Sign in
              </Link>
              <Link
                href="/partner"
                onClick={() => setOpen(false)}
                className="border border-gold/50 py-3.5 text-center text-[0.7rem] uppercase tracking-[0.3em] text-gold"
              >
                Partners
              </Link>
            </div>
            {themeToggle && (
              <div className="mt-6 flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.3em] text-ivory/60">
                <ThemeToggle /> Light / dark
              </div>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}

function NavLink({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="group relative py-2 text-[0.68rem] uppercase tracking-[0.3em] text-ivory/80 transition-colors duration-500 hover:text-gold"
    >
      {label}
      <span
        aria-hidden
        className="absolute -bottom-0.5 left-0 h-px w-full origin-left scale-x-0 bg-gold transition-transform duration-500 group-hover:scale-x-100"
      />
    </Link>
  );
}

function ThemeToggle() {
  const [mode, setMode] = useState<"dark" | "light" | null>(null);
  useEffect(() => {
    setMode(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
  }, []);
  const toggle = () => {
    const next = mode === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("savlino-site-theme", next);
    } catch {
      // storage unavailable — applies for this visit only
    }
    setMode(next);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mode === "light" ? "Switch to dark theme" : "Switch to light theme"}
      className="flex h-9 w-9 items-center justify-center border border-gold/30 text-gold transition-colors hover:bg-gold hover:text-noir"
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-none stroke-current stroke-[1.5]">
        {mode === "light" ? (
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        ) : (
          <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
        )}
      </svg>
    </button>
  );
}
