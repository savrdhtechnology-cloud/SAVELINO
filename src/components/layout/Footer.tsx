"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { Logo } from "@/components/ui/Logo";
import { collections } from "@/lib/collections";

const columns = [
  {
    title: "Collections",
    links: collections.map((c) => ({ label: c.title, href: `/collections/${c.slug}` })),
  },
  {
    title: "The House",
    links: [
      { label: "Custom stitching", href: "/custom-stitching" },
      { label: "Heritage", href: "/#heritage" },
      { label: "Craftsmanship", href: "/#craftsmanship" },
      { label: "Lookbook", href: "/#lookbook" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/register" },
      { label: "Partner program", href: "/partner" },
      { label: "Partner login", href: "/partner/login" },
    ],
  },
];

const EASE = [0.22, 1, 0.36, 1] as const;

export function Footer() {
  const reduce = useReducedMotion();
  return (
    <footer className="grain relative overflow-hidden border-t border-gold/15 bg-noir pt-20 md:pt-28">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(212,175,55,0.12),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-[1440px] px-5 md:px-10">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 30, filter: "blur(8px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, ease: EASE }}
          className="flex justify-center"
        >
          <Link href="/" aria-label="SAVLINO home">
            <Logo height={150} className="max-md:h-[110px]! max-md:w-auto!" />
          </Link>
        </motion.div>

        <motion.div
          aria-hidden
          initial={reduce ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 2, delay: 0.3, ease: EASE }}
          className="gold-rule mx-auto mt-14 max-w-4xl"
        />

        <div className="mt-14 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-2xl italic text-ivory">Timeless women’s luxury.</p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-ivory/55">
              Designer blouses, custom stitching and intimate essentials — crafted with Indian heritage, made for the
              modern woman.
            </p>
          </div>
          {columns.map((col, ci) => (
            <motion.nav
              key={col.title}
              aria-label={col.title}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.1 * ci, ease: EASE }}
            >
              <p className="eyebrow">{col.title}</p>
              <ul className="mt-6 space-y-3">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group inline-flex items-center gap-2 text-sm text-ivory/70 transition-colors duration-500 hover:text-gold"
                    >
                      <span className="h-px w-0 bg-gold transition-all duration-500 group-hover:w-4" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.nav>
          ))}
        </div>

        <div className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-gold/10 py-8 text-[0.62rem] uppercase tracking-[0.3em] text-ivory/40 md:flex-row">
          <p>© {new Date().getFullYear()} SAVLINO. All rights reserved.</p>
          <p>A Legacy of Elegance</p>
        </div>
      </div>
    </footer>
  );
}
