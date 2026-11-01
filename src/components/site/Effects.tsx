"use client";

import { useEffect, useRef, useState } from "react";
import type { BgEffect, CursorEffect, EffectIntensity } from "@/lib/settings";

export type EffectsConfig = {
  background: BgEffect;
  intensity: EffectIntensity;
  cursor: CursorEffect;
  mobile: boolean;
};

const STRENGTH: Record<EffectIntensity, number> = { subtle: 0.45, medium: 0.72, bold: 1 };

function useMedia(query: string) {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatch(mq.matches);
    const on = () => setMatch(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

/** Reads a CSS colour variable from <html> (falls back to antique gold). */
function cssColor(name: string, fallback = "#d4af37") {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/**
 * Background motion + mouse effects. Purely decorative: never intercepts the
 * pointer, switches off for people who ask for reduced motion, and the mouse
 * effects only run on devices with a precise pointer (not touch screens).
 */
export function Effects({ background, intensity, cursor, mobile, zIndex = 1 }: EffectsConfig & { zIndex?: number }) {
  const reduce = useMedia("(prefers-reduced-motion: reduce)");
  const fine = useMedia("(hover: hover) and (pointer: fine)");
  const small = useMedia("(max-width: 767px)");
  if (reduce) return null;
  const showBg = background !== "none" && (mobile || !small);
  const strength = STRENGTH[intensity] ?? STRENGTH.subtle;
  return (
    <>
      {showBg && <Background kind={background} strength={strength} zIndex={zIndex} />}
      {fine && cursor !== "default" && <Cursor kind={cursor} />}
    </>
  );
}

function Background({ kind, strength, zIndex }: { kind: BgEffect; strength: number; zIndex: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (kind !== "spotlight") return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--fx-x", `${e.clientX}px`);
        el.style.setProperty("--fx-y", `${e.clientY}px`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [kind]);

  return (
    <div ref={ref} aria-hidden className="fx-layer" style={{ opacity: strength, zIndex }}>
      {kind === "aurora" && (
        <>
          <span className="fx-blob fx-blob-1" />
          <span className="fx-blob fx-blob-2" />
          <span className="fx-blob fx-blob-3" />
        </>
      )}
      {kind === "silk" && <span className="fx-silk" />}
      {kind === "grain" && <span className="fx-grain" />}
      {kind === "spotlight" && <span className="fx-spotlight" />}
      {kind === "dust" && <Dust />}
    </div>
  );
}

/** Fine gold particles drifting upward. */
function Dust() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const color = cssColor("--color-gold");
    let w = 0;
    let h = 0;
    let raf = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    type P = { x: number; y: number; r: number; v: number; d: number; a: number; t: number };
    let parts: P[] = [];
    const spawn = (anywhere: boolean): P => ({
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : h + 10,
      r: 0.6 + Math.random() * 1.8,
      v: 0.15 + Math.random() * 0.45,
      d: (Math.random() - 0.5) * 0.3,
      a: 0.25 + Math.random() * 0.6,
      t: Math.random() * Math.PI * 2,
    });
    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, (w * h) / 16000));
      parts = Array.from({ length: count }, () => spawn(true));
    };
    const tick = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      for (const p of parts) {
        p.y -= p.v;
        p.t += 0.02;
        p.x += p.d + Math.sin(p.t) * 0.15;
        if (p.y < -10) Object.assign(p, spawn(false));
        ctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(p.t * 1.7));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(tick);
    };
    resize();
    raf = requestAnimationFrame(tick);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}

const INTERACTIVE = "a, button, [role='button'], input, select, textarea, label, summary";

function Cursor({ kind }: { kind: CursorEffect }) {
  if (kind === "sparkle") return <Sparkle />;
  return <Follower kind={kind} />;
}

/** Ring / glow / halo that follow the pointer with a little easing. */
function Follower({ kind }: { kind: CursorEffect }) {
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o) return;
    let x = -100;
    let y = -100;
    let ox = -100;
    let oy = -100;
    let hover = false;
    let shown = false;
    let raf = 0;
    const ease = kind === "glow" ? 0.12 : 0.2;
    const loop = () => {
      ox += (x - ox) * ease;
      oy += (y - oy) * ease;
      o.style.transform = `translate3d(${ox}px, ${oy}px, 0) translate(-50%, -50%) scale(${hover ? 1.8 : 1})`;
      if (i) i.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(loop);
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!shown) {
        shown = true;
        ox = x;
        oy = y;
        o.style.opacity = "1";
        if (i) i.style.opacity = "1";
      }
      hover = e.target instanceof Element && Boolean(e.target.closest(INTERACTIVE));
    };
    const onLeave = () => {
      shown = false;
      o.style.opacity = "0";
      if (i) i.style.opacity = "0";
    };
    const onDown = () => {
      if (kind !== "halo") return;
      o.classList.remove("fx-halo-pulse");
      o.getBoundingClientRect();
      o.classList.add("fx-halo-pulse");
    };
    raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, [kind]);

  return (
    <>
      <span ref={outer} aria-hidden className={`fx-cursor fx-cursor-${kind}`} />
      {kind !== "glow" && <span ref={inner} aria-hidden className="fx-cursor fx-cursor-dot" />}
    </>
  );
}

/** Tiny gold sparkles left behind the pointer. */
function Sparkle() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const color = cssColor("--color-gold");
    const light = cssColor("--color-gold-light", "#f1d98a");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    type S = { x: number; y: number; vx: number; vy: number; life: number; r: number; c: string };
    const sparks: S[] = [];
    let raf = 0;
    let running = false;
    let last = 0;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const tick = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let k = sparks.length - 1; k >= 0; k--) {
        const s = sparks[k];
        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.03;
        s.life -= 0.022;
        if (s.life <= 0) {
          sparks.splice(k, 1);
          continue;
        }
        ctx.globalAlpha = s.life;
        ctx.fillStyle = s.c;
        const r = s.r * s.life;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - r * 2);
        ctx.lineTo(s.x + r * 0.5, s.y);
        ctx.lineTo(s.x, s.y + r * 2);
        ctx.lineTo(s.x - r * 0.5, s.y);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (sparks.length) raf = requestAnimationFrame(tick);
      else running = false;
    };
    const onMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - last < 16) return;
      last = now;
      for (let n = 0; n < 2; n++) {
        sparks.push({
          x: e.clientX + (Math.random() - 0.5) * 6,
          y: e.clientY + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8 - 0.2,
          life: 1,
          r: 1.5 + Math.random() * 2.5,
          c: Math.random() > 0.5 ? color : light,
        });
      }
      if (sparks.length > 160) sparks.splice(0, sparks.length - 160);
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[100] h-full w-full" />;
}
