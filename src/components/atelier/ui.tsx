"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { EASE } from "@/components/admin/ui";

export const panel = "relative border border-gold/15 bg-noir-soft/50 backdrop-blur";
export const inputCls =
  "w-full border border-gold/20 bg-noir/60 px-3 py-2 text-sm text-ivory placeholder:text-ivory/25 outline-none transition-colors focus:border-gold";
export const btn = "inline-flex items-center justify-center gap-2 px-4 py-2 text-[0.6rem] uppercase tracking-[0.22em] transition-colors disabled:cursor-not-allowed disabled:opacity-40";
export const btnGold = `${btn} bg-gold text-noir hover:bg-gold-light`;
export const btnLine = `${btn} border border-gold/40 text-gold hover:border-gold hover:bg-gold/10`;
export const btnGhost = `${btn} text-ivory/60 hover:text-gold`;
export const btnDanger = `${btn} border border-red-300/40 text-red-200 hover:bg-red-400/10`;

export function AppHeader({ eyebrow, title, description, actions, live }: { eyebrow: string; title: string; description: string; actions?: ReactNode; live: boolean }) {
  return (
    <motion.header initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[0.6rem] uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
        <h1 className="mt-2 font-display text-4xl italic text-ivory">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-ivory/55">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {!live && <span className="border border-gold/40 bg-gold/10 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.22em] text-gold">Preview data — not saved</span>}
        {actions}
      </div>
    </motion.header>
  );
}

export function Section({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${panel} p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[0.6rem] uppercase tracking-[0.28em] text-ivory/60">{title}</p>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-[0.55rem] uppercase tracking-[0.24em] text-ivory/50">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-[0.65rem] text-ivory/40">{hint}</span>}
    </label>
  );
}

export function Select({ value, onChange, options, disabled, ariaLabel }: { value: string; onChange: (v: string) => void; options: { value: string; label: string; disabled?: boolean }[]; disabled?: boolean; ariaLabel?: string }) {
  return (
    <select aria-label={ariaLabel} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={`${inputCls} disabled:opacity-50`}>
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled} className="bg-noir">
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Animated segmented control (front/back, view modes, filters). */
export function Segmented<T extends string>({ value, onChange, options, id }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; id: string }) {
  return (
    <div role="tablist" className="inline-flex border border-gold/20 p-0.5">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)} className="relative px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.22em]">
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 bg-gold" transition={{ duration: 0.35, ease: EASE }} />}
          <span className={`relative ${value === o.value ? "text-noir" : "text-ivory/65"}`}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Chips({ values, options, onChange, disabled }: { values: string[]; options: readonly (string | { readonly value: string; readonly label: string })[]; onChange: (v: string[]) => void; disabled?: boolean }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map((o) => {
        const on = values.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onChange(on ? values.filter((v) => v !== o.value) : [...values, o.value])}
            className={`border px-2.5 py-1 text-[0.7rem] transition-colors disabled:opacity-50 ${on ? "border-gold bg-gold/15 text-ivory" : "border-ivory/15 text-ivory/60 hover:border-gold/40"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 border border-dashed border-gold/20 px-6 py-12 text-center">
      <p className="font-serif text-xl text-ivory">{title}</p>
      <p className="max-w-md text-sm text-ivory/50">{body}</p>
      {action}
    </div>
  );
}

export function Notice({ tone = "gold", children }: { tone?: "gold" | "danger" | "info"; children: ReactNode }) {
  const cls = tone === "danger" ? "border-red-300/40 bg-red-400/5 text-red-200" : tone === "info" ? "border-sky-300/30 bg-sky-400/5 text-sky-100" : "border-gold/30 bg-gold/5 text-gold-light";
  return <p className={`border px-4 py-3 text-xs leading-relaxed ${cls}`}>{children}</p>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className={`${panel} p-4`}>
      <p className="text-[0.55rem] uppercase tracking-[0.24em] text-ivory/50">{label}</p>
      <p className="mt-2 font-display text-3xl text-ivory">{value}</p>
      {sub && <p className="mt-1 text-[0.7rem] text-ivory/45">{sub}</p>}
    </div>
  );
}

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
const dtFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
export const fmtDate = (v: unknown) => (v ? dateFmt.format(new Date(String(v))) : "—");
export const fmtDateTime = (v: unknown) => (v ? dtFmt.format(new Date(String(v))) : "—");
export const label = (s: unknown) => String(s ?? "").replace(/[_-]/g, " ");
