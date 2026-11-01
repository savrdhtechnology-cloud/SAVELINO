"use client";

import { AnimatePresence, LayoutGroup, animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export const EASE = [0.22, 1, 0.36, 1] as const;

/* ───────────────────────── Icons (24×24 stroke paths) ───────────────────────── */
export const ICONS = {
  dashboard: "M3 10.5 12 3l9 7.5V21H3V10.5Zm6 10.5v-6h6v6",
  studio: "M12 3l2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4L12 3Zm7 12 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15Z",
  products: "M20 7 12 3 4 7m16 0-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  orders: "M6 7h12l1 14H5L6 7Zm3 0V5a3 3 0 0 1 6 0v2",
  payments: "M2 6h20v12H2zM2 10h20M6 15h4",
  website: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4a7.5 7.5 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7.5 7.5 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.3-4.3",
  bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9Zm-4.3 13a2 2 0 0 1-3.4 0",
  plus: "M12 5v14M5 12h14",
  upload: "M12 16V4m0 0-4 4m4-4 4 4M4 16v4h16v-4",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  edit: "M4 20h4L19 9l-4-4L4 16v4Zm11-15 4 4",
  copy: "M8 8h12v12H8zM4 16V4h12",
  trash: "M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3",
  check: "M5 12.5 10 17l9-10",
  x: "M6 6l12 12M18 6 6 18",
  arrow: "M5 12h14m-6-6 6 6-6 6",
  external: "M14 4h6v6m0-6-9 9M18 14v6H4V6h6",
  sparkle: "M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M6 18l2.5-2.5m7-7L18 6",
  rupee: "M6 4h12M6 9h12M9 4c4 0 6 2 6 5s-2 5-6 5H6l8 7",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v5l3 2",
  truck: "M1 4h14v12H1zM15 9h4l3 3v4h-7M5.5 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm12 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
  draft: "M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h4",
  archive: "M3 4h18v4H3zM5 8v12h14V8M10 12h4",
  warn: "M12 3 2 20h20L12 3Zm0 7v4m0 3h.01",
  whatsapp: "M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.3A8 8 0 1 1 20 12Zm-11-3c0 3.5 2.5 6 6 6l1-1.5-2-1-1 1c-1-.5-2-1.5-2.5-2.5l1-1-1-2L9 9Z",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z",
  palette: "M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-1.5-1-2.5S14 15 15 15h2a4 4 0 0 0 4-4c0-4.4-4-8-9-8ZM7.5 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm3-3.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm4 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  layers: "M12 3 2 8l10 5 10-5-10-5Zm-10 9 10 5 10-5M2 16l10 5 10-5",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11",
  drag: "M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01",
  image: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M15.5 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  bolt: "M13 2 4 14h7l-1 8 9-12h-7l1-8Z",
  chart: "M3 3v18h18M7 15l4-5 3 3 5-7",
  shield: "M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4Zm-3 10 2 2 4-4",
} as const;

export function Icon({ d, className = "h-4 w-4", strokeWidth = 1.6 }: { d: string; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}

/* ───────────────────────── Text effects ───────────────────────── */

/** Letters rise in one by one. */
export function RevealText({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={className} aria-label={text}>
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block whitespace-pre"
          initial={{ opacity: 0, y: "0.45em", filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: delay + i * 0.028, duration: 0.55, ease: EASE }}
        >
          {ch}
        </motion.span>
      ))}
    </span>
  );
}

export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-IN") }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => format(v));
  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, value, { duration: 1.4, ease: EASE });
    return () => c.stop();
  }, [inView, value, mv]);
  return <motion.span ref={ref}>{text}</motion.span>;
}

/** "SAVLINO Commerce CRM" + the page name, as in the brand mockups. */
export function PageHeader({ section, subtitle, actions }: { section: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
      <div>
        <h1 className="flex flex-wrap items-baseline gap-x-3 text-[clamp(1.9rem,3.4vw,2.9rem)] leading-none">
          <RevealText text="SAVLINO" className="crm-heading crm-gold-text font-semibold tracking-[0.06em]" />
          <RevealText text="Commerce CRM" delay={0.2} className="crm-serif italic" />
        </h1>
        <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.45, duration: 0.6, ease: EASE }} className="mt-2 flex flex-wrap items-baseline gap-x-3">
          <span className="crm-serif text-2xl italic crm-accent">{section}</span>
          {subtitle && <span className="crm-serif text-lg italic crm-muted">{subtitle}</span>}
        </motion.p>
      </div>
      {actions && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }} className="flex flex-wrap items-center gap-2">
          {actions}
        </motion.div>
      )}
    </header>
  );
}

/* ───────────────────────── Surfaces ───────────────────────── */

export function Panel({
  title,
  icon,
  action,
  children,
  className = "",
  delay = 0,
  subtitle,
}: {
  title?: ReactNode;
  icon?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  delay?: number;
  subtitle?: string;
}) {
  return (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.6, ease: EASE }} className={`crm-panel p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {icon && <Icon d={icon} className="h-5 w-5 crm-accent" />}
            <div>
              <h2 className="crm-serif text-[1.35rem] leading-tight">{title}</h2>
              {subtitle && <p className="crm-serif text-sm italic crm-muted">{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </motion.section>
  );
}

export function Kpi({
  label,
  value,
  format,
  icon,
  note,
  tone = "default",
  delay = 0,
  onClick,
}: {
  label: string;
  value: number;
  format?: (n: number) => string;
  icon: string;
  note?: string;
  tone?: "default" | "wine";
  delay?: number;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -3 }}
      transition={{ delay, duration: 0.55, ease: EASE }}
      className={`crm-panel group flex w-full items-start gap-4 p-5 text-left ${onClick ? "cursor-pointer" : "cursor-default"}`}
      style={tone === "wine" ? { background: "linear-gradient(135deg, color-mix(in srgb, var(--crm-wash) 85%, transparent), var(--crm-panel))" } : undefined}
    >
      <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border crm-accent" style={{ borderColor: "var(--crm-border)" }}>
        <Icon d={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="crm-serif block text-lg leading-tight">{label}</span>
        <span className="crm-serif mt-1 block text-[2.1rem] font-medium leading-none">
          <CountUp value={value} format={format} />
        </span>
        {note && <span className="mt-1.5 block text-[0.72rem] crm-muted">{note}</span>}
      </span>
      <span aria-hidden className="absolute inset-x-5 bottom-0 h-px origin-left scale-x-0 bg-[var(--crm-accent)] transition-transform duration-500 group-hover:scale-x-100" />
    </motion.button>
  );
}

export function Skeleton({ className = "h-40" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl ${className}`} style={{ background: "var(--crm-panel-2)" }} />;
}

export function Empty({ icon = ICONS.sparkle, title, children }: { icon?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border crm-accent" style={{ borderColor: "var(--crm-border)" }}>
        <Icon d={icon} className="h-6 w-6" />
      </span>
      <p className="crm-serif text-xl">{title}</p>
      {children && <div className="max-w-sm text-sm crm-muted">{children}</div>}
    </div>
  );
}

/* ───────────────────────── Form controls ───────────────────────── */

export function Field({ label, hint, className = "", ...props }: { label: string; hint?: string; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="crm-label">{label}</span>
      <input {...props} className="crm-input" />
      {hint && <span className="mt-1 block text-[0.7rem] crm-muted">{hint}</span>}
    </label>
  );
}

export function Area({ label, className = "", ...props }: { label: string; className?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="crm-label">{label}</span>
      <textarea rows={3} {...props} className="crm-input resize-y" />
    </label>
  );
}

export function Select({ label, className = "", children, ...props }: { label: string; className?: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="crm-label">{label}</span>
      <select {...props} className="crm-input">
        {children}
      </select>
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label?: string; hint?: string }) {
  const sw = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
      style={{ background: checked ? "linear-gradient(180deg, var(--crm-accent-2), var(--crm-accent))" : "var(--crm-border-soft)" }}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 34 }} className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow ${checked ? "right-0.5" : "left-0.5"}`} />
    </button>
  );
  if (!label) return sw;
  return (
    <div className="flex items-center justify-between gap-4">
      <span>
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-[0.72rem] crm-muted">{hint}</span>}
      </span>
      {sw}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; icon?: string }[] }) {
  const id = useId();
  return (
    <LayoutGroup id={id}>
      <div className="crm-panel flex flex-wrap gap-1 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors"
            style={{ color: value === o.value ? "var(--crm-accent-ink)" : "var(--crm-muted)" }}
          >
            {value === o.value && (
              <motion.span layoutId={`tab-${id}`} className="absolute inset-0 rounded-xl" style={{ background: "linear-gradient(180deg, var(--crm-accent-2), var(--crm-accent))" }} transition={{ type: "spring", stiffness: 420, damping: 34 }} />
            )}
            {o.icon && <Icon d={o.icon} className="relative h-4 w-4" />}
            <span className="relative whitespace-nowrap font-medium">{o.label}</span>
          </button>
        ))}
      </div>
    </LayoutGroup>
  );
}

/* ───────────────────────── Status badges ───────────────────────── */

const BADGE: Record<string, [string, string]> = {
  live: ["#58c48a", "Live"],
  draft: ["#e0a83a", "Draft"],
  archived: ["#9a9a9a", "Archived"],
  new: ["#e0a83a", "New"],
  payment_review: ["#d06bd8", "Payment review"],
  processing: ["#5aa0e8", "Processing"],
  stitching: ["#b98cf0", "Stitching"],
  qc: ["#4fc3d9", "QC"],
  shipped: ["#58c48a", "Shipped"],
  delivered: ["#2fa86a", "Delivered"],
  cancelled: ["#ef6b6b", "Cancelled"],
  pending: ["#e0a83a", "Pending"],
  verified: ["#58c48a", "Verified"],
  rejected: ["#ef6b6b", "Rejected"],
  refunded: ["#9a9a9a", "Refunded"],
};

export function Badge({ status, label }: { status: string; label?: string }) {
  const [color, text] = BADGE[status] ?? ["#9a9a9a", status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.68rem] font-semibold" style={{ background: `${color}22`, color, boxShadow: `inset 0 0 0 1px ${color}55` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label ?? text}
    </span>
  );
}

/* ───────────────────────── Drawer ───────────────────────── */

export function Drawer({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.button type="button" aria-label="Close" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.45, ease: EASE }}
            className={`crm-scroll absolute inset-y-0 right-0 flex w-full flex-col border-l ${wide ? "max-w-3xl" : "max-w-xl"}`}
            style={{ background: "var(--crm-bg)", borderColor: "var(--crm-border)" }}
          >
            <header className="flex items-center justify-between gap-4 border-b px-6 py-4" style={{ borderColor: "var(--crm-border-soft)" }}>
              <div className="crm-serif text-2xl">{title}</div>
              <button type="button" onClick={onClose} className="crm-btn px-2.5 py-2" aria-label="Close">
                <Icon d={ICONS.x} />
              </button>
            </header>
            <div className="crm-scroll flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <footer className="flex flex-wrap items-center gap-2 border-t px-6 py-4" style={{ borderColor: "var(--crm-border-soft)" }}>
                {footer}
              </footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ───────────────────────── Toasts ───────────────────────── */

type ToastItem = { id: number; message: string; tone: "ok" | "error" };
const TOAST = "savlino:crm-toast";

export function toast(message: string, tone: "ok" | "error" = "ok") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(TOAST, { detail: { message, tone } }));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ message: string; tone: "ok" | "error" }>).detail;
      const id = ++n;
      setItems((x) => [...x, { id, ...d }]);
      setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4200);
    };
    window.addEventListener(TOAST, on);
    return () => window.removeEventListener(TOAST, on);
  }, []);
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex flex-col items-end gap-2">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            className="crm-panel pointer-events-auto flex max-w-sm items-center gap-3 px-4 py-3 text-sm"
            style={{ borderColor: t.tone === "error" ? "var(--crm-danger)" : "var(--crm-accent)" }}
          >
            <Icon d={t.tone === "error" ? ICONS.warn : ICONS.check} className="h-4 w-4 shrink-0" />
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ───────────────────────── Helpers ───────────────────────── */

const dt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const dateOnly = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
export const fmtDateTime = (iso: string) => dt.format(new Date(iso));
export const fmtDate = (iso: string) => dateOnly.format(new Date(iso));
export const compactInr = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(2)}L` : `₹${Math.round(n).toLocaleString("en-IN")}`;
