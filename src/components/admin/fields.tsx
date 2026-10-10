"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { EASE } from "./ui";

const input =
  "mt-1.5 w-full border border-gold/20 bg-noir/60 px-3 py-2.5 text-sm text-ivory placeholder:text-ivory/25 outline-none transition-colors focus:border-gold";

export function Label({ children }: { children: ReactNode }) {
  return <span className="text-[0.58rem] uppercase tracking-[0.25em] text-ivory/50">{children}</span>;
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="block">
      <Label>{label}</Label>
      {multiline ? (
        <textarea rows={3} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={input} />
      ) : (
        <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={input} />
      )}
    </label>
  );
}

export function NumberField({ label, value, onChange, suffix }: { label: string; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <div className="relative">
        <input
          type="number"
          min={0}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
          className={`${input} ${suffix ? "pr-12" : ""}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 mt-0.5 -translate-y-1/2 text-xs text-ivory/40">{suffix}</span>}
      </div>
    </label>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 border border-gold/12 bg-noir/40 px-4 py-3 text-left transition-colors hover:border-gold/35"
    >
      <span>
        <span className="block text-sm text-ivory">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ivory/45">{hint}</span>}
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-gold" : "bg-ivory/15"}`}>
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 34 }}
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-noir shadow ${checked ? "right-0.5" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-3 border border-gold/12 bg-noir/40 p-3">
      <span className="relative h-10 w-10 shrink-0 overflow-hidden border border-gold/30" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={label} />
      </span>
      <span className="min-w-0 flex-1">
        <Label>{label}</Label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-0.5 block w-full bg-transparent font-mono text-sm uppercase text-ivory outline-none"
          maxLength={7}
        />
      </span>
    </label>
  );
}

export function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="border border-gold/12 bg-noir-soft/50 p-6 backdrop-blur"
    >
      <h2 className="font-display text-xl text-ivory">{title}</h2>
      {description && <p className="mt-1 text-sm text-ivory/50">{description}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </motion.section>
  );
}

/** Sticky "unsaved changes" bar that slides up when something changed. */
export function SaveBar({ dirty, saving, onSave, onReset, live }: { dirty: boolean; saving: boolean; onSave: () => void; onReset: () => void; live: boolean }) {
  return (
    <AnimatePresence>
      {dirty && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 border border-gold/40 bg-noir/95 px-5 py-3 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)] backdrop-blur-xl"
        >
          <span className="text-sm text-ivory/80">{live ? "Unsaved changes" : "Unsaved changes (demo)"}</span>
          <button type="button" onClick={onReset} className="text-[0.6rem] uppercase tracking-[0.25em] text-ivory/50 hover:text-ivory">
            Discard
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            disabled={saving}
            onClick={onSave}
            className="bg-gold px-4 py-2 text-[0.6rem] font-medium uppercase tracking-[0.25em] text-noir hover:bg-gold-light disabled:opacity-60"
          >
            {saving ? "Publishing…" : live ? "Publish" : "Save"}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
