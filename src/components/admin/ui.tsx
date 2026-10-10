"use client";

import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import type { Column, Row } from "@/lib/admin/types";

export const EASE = [0.22, 1, 0.36, 1] as const;

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export const formatINR = (n: number) => inr.format(n);

export function cellValue(row: Row, col: Column) {
  return col.get ? col.get(row) : row[col.key];
}

const statusTone: Record<string, string> = {
  pending: "border-gold/50 text-gold bg-gold/10",
  pending_payment: "border-gold/50 text-gold bg-gold/10",
  payment_review: "border-gold/50 text-gold bg-gold/10",
  label_created: "border-gold/40 text-gold/90",
  confirmed: "border-ivory/40 text-ivory",
  approved: "border-ivory/40 text-ivory",
  in_production: "border-ivory/40 text-ivory",
  in_transit: "border-ivory/40 text-ivory",
  out_for_delivery: "border-ivory/40 text-ivory",
  shipped: "border-sky-300/40 text-sky-200",
  delivered: "border-emerald-300/40 text-emerald-200 bg-emerald-400/5",
  verified: "border-emerald-300/40 text-emerald-200 bg-emerald-400/5",
  paid: "border-emerald-300/40 text-emerald-200 bg-emerald-400/5",
  admin: "border-gold/60 text-gold-light bg-gold/10",
  partner: "border-ivory/40 text-ivory",
  customer: "border-ivory/20 text-ivory/70",
  cancelled: "border-red-300/40 text-red-200 bg-red-400/5",
  rejected: "border-red-300/40 text-red-200 bg-red-400/5",
  suspended: "border-red-300/40 text-red-200 bg-red-400/5",
  exception: "border-red-300/40 text-red-200 bg-red-400/5",
  returned: "border-red-300/40 text-red-200",
  refunded: "border-ivory/30 text-ivory/70",
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <motion.span
      key={value}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.35, ease: EASE }}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-2.5 py-1 text-[0.58rem] uppercase tracking-[0.18em] ${
        statusTone[value] ?? "border-ivory/20 text-ivory/70"
      }`}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {value.replace(/_/g, " ")}
    </motion.span>
  );
}

export function FormattedCell({ row, col }: { row: Row; col: Column }) {
  const v = cellValue(row, col);
  if (v === null || v === undefined || v === "") return <span className="text-ivory/25">—</span>;
  switch (col.format) {
    case "currency":
      return <span className="tabular-nums">{inr.format(Number(v))}</span>;
    case "date": {
      const d = new Date(String(v));
      return <span className="tabular-nums">{Number.isNaN(d.getTime()) ? String(v) : dateFmt.format(d)}</span>;
    }
    case "status":
      return <StatusBadge value={String(v)} />;
    case "bool":
      return (
        <span className={`inline-flex items-center gap-2 ${v ? "text-emerald-200" : "text-ivory/40"}`}>
          <span className={`h-2 w-2 rounded-full ${v ? "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.7)]" : "bg-ivory/25"}`} />
          {v ? "Yes" : "No"}
        </span>
      );
    case "percent":
      return <span className="tabular-nums">{String(v)}%</span>;
    case "number":
      return <span className="tabular-nums">{String(v)}</span>;
    default:
      return <>{String(v)}</>;
  }
}

/** Animated number that counts up when it mounts or changes. */
export function CountUp({ value, currency = false }: { value: number; currency?: boolean }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => (currency ? inr.format(Math.round(v)) : Math.round(v).toLocaleString("en-IN")));
  const [display, setDisplay] = useState(text.get());
  useEffect(() => text.on("change", setDisplay), [text]);
  useEffect(() => {
    const controls = animate(mv, value, { duration: reduce ? 0 : 1.6, ease: EASE });
    return () => controls.stop();
  }, [mv, value, reduce]);
  return <span className="tabular-nums">{display}</span>;
}

export function Icon({ d, className = "h-[18px] w-[18px]" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`fill-none stroke-current stroke-[1.4] ${className}`} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-[60] bg-noir/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
            className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-md flex-col border-l border-gold/20 bg-noir-soft shadow-[-40px_0_80px_-20px_rgba(0,0,0,0.8)]"
          >
            <div className="flex items-center justify-between border-b border-gold/15 px-7 py-5">
              <p className="font-display text-2xl italic text-ivory">{title}</p>
              <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 text-xl text-gold transition-transform hover:rotate-90">
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-7 py-6">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; message: string; tone: "gold" | "danger" }[]>([]);
  useEffect(() => {
    const onToast = (e: Event) => {
      const { message, tone } = (e as CustomEvent<{ message: string; tone: "gold" | "danger" }>).detail;
      const id = Date.now() + Math.random();
      setItems((t) => [...t, { id, message, tone }]);
      setTimeout(() => setItems((t) => t.filter((x) => x.id !== id)), 3200);
    };
    window.addEventListener("savlino:toast", onToast);
    return () => window.removeEventListener("savlino:toast", onToast);
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-6 right-6 z-[80] flex flex-col items-end gap-3">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.4, ease: EASE }}
            className={`border px-5 py-3 text-sm backdrop-blur-md ${
              t.tone === "danger" ? "border-red-300/40 bg-red-950/80 text-red-100" : "border-gold/40 bg-noir/90 text-gold-light"
            }`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
