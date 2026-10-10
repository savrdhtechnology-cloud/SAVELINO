"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { getModule, navGroups } from "@/lib/admin/modules";
import { EASE, Icon } from "./ui";

const extraDescriptions: Record<string, string> = {
  "": "Today at a glance.",
  analytics: "Sales and fulfilment trends.",
  apps: "Every app in SAVLINO OS.",
  studio: "Design the website: theme, hero, sections.",
  settings: "Business details, commerce rules, appearance.",
  "virtual-try-ons": "AI try-on sessions, consent, previews and conversion.",
  "design-studio": "Garment designs, technical flats, versions and approval.",
  "pattern-library": "Size-wise 2D patterns, review and true-scale export.",
  "size-charts": "Standard size measurements, grading and approval.",
  "fabric-calculator": "Estimated vs verified-marker fabric needs.",
  "bill-of-materials": "Reusable BOM per design linked to stock.",
  "production-batches": "Batches, job cards, reservation and stock.",
  "worker-tasks": "Who is on which job card, and worker messages.",
  "quality-control": "QC checklist before finished inventory.",
};

export function Launchpad() {
  const reduce = useReducedMotion();
  let n = 0;
  return (
    <div>
      <motion.header initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
        <p className="text-[0.6rem] uppercase tracking-[0.4em] text-gold">SAVLINO OS</p>
        <h1 className="mt-2 font-display text-4xl text-ivory md:text-5xl">All apps</h1>
        <p className="mt-2 font-serif text-lg text-ivory/60">Everything you need to run the house, in one place.</p>
      </motion.header>

      <div className="mt-10 space-y-10">
        {navGroups.map((g) => (
          <section key={g.title}>
            <p className="text-[0.58rem] uppercase tracking-[0.35em] text-ivory/40">{g.title}</p>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {g.items
                .filter((i) => i.slug !== "apps")
                .map((item) => {
                  const delay = reduce ? 0 : (n++ % 24) * 0.03;
                  const desc = getModule(item.slug)?.description ?? extraDescriptions[item.slug] ?? "";
                  return (
                    <motion.li
                      key={item.slug || "dashboard"}
                      initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay, duration: 0.5, ease: EASE }}
                      whileHover={reduce ? undefined : { y: -4 }}
                    >
                      <Link
                        href={item.slug ? `/admin/${item.slug}` : "/admin"}
                        className="group relative flex h-full flex-col overflow-hidden border border-gold/12 bg-noir-soft/50 p-5 backdrop-blur transition-colors hover:border-gold/50"
                      >
                        <span aria-hidden className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gold/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                        <span className="flex h-11 w-11 items-center justify-center border border-gold/30 bg-gradient-to-br from-gold/20 to-transparent text-gold transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110">
                          <Icon d={item.icon} className="h-5 w-5" />
                        </span>
                        <span className="mt-4 text-sm text-ivory">{item.title}</span>
                        <span className="mt-1 line-clamp-2 text-xs text-ivory/45">{desc}</span>
                      </Link>
                    </motion.li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
