"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { DESIGN_STATUS, ORDER_LABEL, type DesignStatus, type OrderStatus } from "./data";

const TABS = [
  { href: "/admin/designlab/library", label: "Design Library" },
  { href: "/admin/designlab/import", label: "ZIP Import" },
  { href: "/admin/designlab/sizes", label: "Size & Pattern Master" },
  { href: "/admin/designlab/orders", label: "Tailor Job Orders" },
  { href: "/admin/designlab/tracker", label: "Production Tracker" },
];

/** Sub-navigation shown on every DesignLab page. "Design Workspace" is opened from a library card. */
export function DesignLabNav() {
  const path = usePathname();
  return (
    <nav aria-label="DesignLab" className="crm-panel mt-6 flex flex-wrap gap-1 p-1">
      {TABS.map((t) => {
        const on = path === t.href || (t.href.endsWith("/library") && path.startsWith("/admin/designlab/designs"));
        return (
          <Link key={t.href} href={t.href} className="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors" style={on ? { background: "linear-gradient(180deg, var(--crm-accent-2), var(--crm-accent))", color: "var(--crm-accent-ink)" } : { color: "var(--crm-muted)" }}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Pill({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.68rem] font-semibold" style={{ background: `${color}22`, color, boxShadow: `inset 0 0 0 1px ${color}55` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

export const DesignPill = ({ status }: { status: DesignStatus }) => <Pill color={DESIGN_STATUS[status].color}>{DESIGN_STATUS[status].label}</Pill>;

const ORDER_COLOR: Record<OrderStatus, string> = {
  draft: "#e0a83a", pattern_approved: "#58c48a", assigned: "#5aa0e8", cutting: "#d06bd8", stitching: "#b98cf0",
  finishing: "#e08a5a", qc: "#4fc3d9", completed: "#2fa86a", cancelled: "#ef6b6b",
};
export const OrderPill = ({ status }: { status: OrderStatus }) => <Pill color={ORDER_COLOR[status]}>{ORDER_LABEL[status]}</Pill>;

export function useDebounced<T>(value: T, ms = 220) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Plain <img> on purpose: signed Supabase URLs, no resize server needed, and zoom needs the original. */
export function Photo({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  if (!src) return <div className={`flex items-center justify-center crm-muted ${className}`} style={{ background: "var(--crm-border-soft)" }}>No image</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={className} />;
}

/** Full-screen viewer with zoom (click / +/-), keyboard arrows and Esc. */
export function Lightbox({ images, index, onClose, onIndex }: { images: { url: string; label: string }[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const [zoom, setZoom] = useState(1);
  useEffect(() => setZoom(1), [index]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex(Math.min(images.length - 1, index + 1));
      if (e.key === "ArrowLeft") onIndex(Math.max(0, index - 1));
      if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(4, z + 0.5));
      if (e.key === "-") setZoom((z) => Math.max(1, z - 0.5));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [index, images.length, onClose, onIndex]);
  const cur = images[index];
  if (!cur) return null;
  const btn = "rounded-full border border-white/30 bg-black/50 px-3 py-1.5 text-sm text-white hover:bg-black/70";
  return (
    <div role="dialog" aria-modal="true" aria-label="Image viewer" className="fixed inset-0 z-[90] flex flex-col bg-black/90" onClick={onClose}>
      <div className="flex items-center justify-between gap-3 p-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-white/80">{cur.label} · {index + 1}/{images.length}</p>
        <div className="flex gap-2">
          <button className={btn} onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label="Zoom out">−</button>
          <button className={btn} onClick={() => setZoom((z) => Math.min(4, z + 0.5))} aria-label="Zoom in">+</button>
          <button className={btn} onClick={onClose}>Close</button>
        </div>
      </div>
      <div className="relative flex-1 overflow-auto p-2" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cur.url} alt={cur.label} onClick={() => setZoom((z) => (z >= 3 ? 1 : z + 1))} style={{ width: `${zoom * 100}%`, maxWidth: zoom === 1 ? "100%" : "none", maxHeight: zoom === 1 ? "100%" : "none" }} className="mx-auto block h-auto cursor-zoom-in object-contain" />
      </div>
      {images.length > 1 && (
        <div className="flex justify-center gap-2 p-3" onClick={(e) => e.stopPropagation()}>
          <button className={btn} disabled={index === 0} onClick={() => onIndex(index - 1)}>‹ Prev</button>
          <button className={btn} disabled={index === images.length - 1} onClick={() => onIndex(index + 1)}>Next ›</button>
        </div>
      )}
    </div>
  );
}

export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div role="alert" className="crm-panel flex flex-wrap items-center justify-between gap-3 p-5 text-sm" style={{ borderColor: "#ef6b6b88" }}>
      <p style={{ color: "#ef6b6b" }}>{message}</p>
      {retry && <button onClick={retry} className="crm-btn">Try again</button>}
    </div>
  );
}

export const angleLabel = (a: string) => (a === "unlabeled" ? "Photo" : a[0].toUpperCase() + a.slice(1));
