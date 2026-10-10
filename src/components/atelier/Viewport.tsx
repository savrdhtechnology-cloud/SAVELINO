"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

type Box = { x: number; y: number; w: number; h: number };

/**
 * Zoom & pan canvas. Content is drawn in its own units (cm for patterns); the
 * viewport fits it on load and supports wheel / pinch-free button zoom and drag-to-pan.
 */
export function Viewport({ content, children, grid = 0, className = "", label }: { content: Box; children: ReactNode; grid?: number; className?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 560 });
  const [view, setView] = useState({ k: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);

  const fit = useCallback(() => {
    const pad = 0.08;
    const k = Math.min(size.w / (content.w * (1 + pad * 2)), size.h / (content.h * (1 + pad * 2)));
    setView({ k, x: (size.w - content.w * k) / 2 - content.x * k, y: (size.h - content.h * k) / 2 - content.y * k });
  }, [content.h, content.w, content.x, content.y, size.h, size.w]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => fit(), [fit]);

  const zoomAt = (factor: number, cx = size.w / 2, cy = size.h / 2) =>
    setView((v) => {
      const k = Math.min(Math.max(v.k * factor, 0.2), 80);
      const f = k / v.k;
      return { k, x: cx - (cx - v.x) * f, y: cy - (cy - v.y) * f };
    });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size.w, size.h]);

  const gridPx = grid * view.k;
  return (
    <div className={`relative overflow-hidden border border-gold/15 bg-noir ${className}`}>
      <div
        ref={ref}
        role="img"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "+" || e.key === "=") zoomAt(1.2);
          if (e.key === "-") zoomAt(1 / 1.2);
          if (e.key === "0") fit();
        }}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) setView((v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y }));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        className="h-full w-full cursor-grab touch-none outline-none active:cursor-grabbing"
        style={
          grid && gridPx > 4
            ? {
                backgroundImage: `linear-gradient(rgba(212,175,55,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.07) 1px, transparent 1px)`,
                backgroundSize: `${gridPx}px ${gridPx}px`,
                backgroundPosition: `${view.x}px ${view.y}px`,
              }
            : undefined
        }
      >
        <svg width="100%" height="100%" className="block">
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>{children}</g>
        </svg>
      </div>
      <div className="absolute bottom-3 right-3 flex items-center gap-1 border border-gold/20 bg-noir/85 p-1 backdrop-blur">
        <button type="button" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.25)} className="h-7 w-7 text-gold hover:bg-gold/10">−</button>
        <span className="w-12 text-center text-[0.6rem] tabular-nums text-ivory/60">{grid ? `${Math.round((view.k / 37.8) * 100)}%` : `${Math.round(view.k * 100)}%`}</span>
        <button type="button" aria-label="Zoom in" onClick={() => zoomAt(1.25)} className="h-7 w-7 text-gold hover:bg-gold/10">+</button>
        <button type="button" onClick={fit} className="px-2 text-[0.55rem] uppercase tracking-[0.2em] text-ivory/70 hover:text-gold">Fit</button>
      </div>
      {grid > 0 && <span className="pointer-events-none absolute left-3 top-3 text-[0.55rem] uppercase tracking-[0.22em] text-ivory/35">Grid {grid} cm · drag to pan · scroll to zoom</span>}
    </div>
  );
}
