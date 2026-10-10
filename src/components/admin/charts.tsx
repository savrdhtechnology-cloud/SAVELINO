"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
import { EASE, formatINR } from "./ui";

export type Point = { label: string; value: number };

/** Gold area chart with a drawn-in line and a hover read-out. */
export function AreaChart({ data, height = 220 }: { data: Point[]; height?: number }) {
  const reduce = useReducedMotion();
  const gid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const W = 640;
  const H = height;
  const pad = { t: 16, r: 8, b: 26, l: 8 };
  const max = Math.max(1, ...data.map((d) => d.value)) * 1.15;
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, data.length - 1);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);

  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`;
  const h = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full overflow-visible"
        role="img"
        aria-label="Revenue trend"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
          setHover(Math.max(0, Math.min(data.length - 1, i)));
        }}
      >
        <defs>
          <linearGradient id={`fill-${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#d4af37" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`stroke-${gid}`} x1="0" x2="1">
            <stop offset="0%" stopColor="#9c7a22" />
            <stop offset="50%" stopColor="#f1d98a" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + (H - pad.t - pad.b) * f} y2={pad.t + (H - pad.t - pad.b) * f} stroke="rgba(212,175,55,0.08)" />
        ))}
        <motion.path
          d={area}
          fill={`url(#fill-${gid})`}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.6 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke={`url(#stroke-${gid})`}
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.8, ease: EASE }}
        />
        {data.map((d, i) =>
          i % Math.ceil(data.length / 6) === 0 ? (
            <text key={d.label} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" className="fill-ivory/40">
              {d.label}
            </text>
          ) : null,
        )}
        {hover !== null && h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="rgba(212,175,55,0.35)" strokeDasharray="3 4" />
            <motion.circle
              key={hover}
              cx={x(hover)}
              cy={y(h.value)}
              r={5}
              fill="var(--color-noir)"
              stroke="#f1d98a"
              strokeWidth={2}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            />
          </g>
        )}
      </svg>
      {h && (
        <div className="pointer-events-none absolute right-0 top-0 border border-gold/30 bg-noir/90 px-3 py-2 text-right">
          <p className="text-[0.55rem] uppercase tracking-[0.25em] text-ivory/50">{h.label}</p>
          <p className="font-display text-lg text-gold-light">{formatINR(h.value)}</p>
        </div>
      )}
    </div>
  );
}

/** Horizontal bars that grow in, staggered. */
export function BarList({ data, format = (n) => String(n) }: { data: Point[]; format?: (n: number) => string }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3.5">
      {data.map((d, i) => (
        <li key={d.label}>
          <div className="flex items-baseline justify-between text-xs">
            <span className="uppercase tracking-[0.18em] text-ivory/65">{d.label.replace(/_/g, " ")}</span>
            <span className="tabular-nums text-ivory">{format(d.value)}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden bg-ivory/[0.06]">
            <motion.div
              className="h-full bg-gradient-to-r from-gold-deep via-gold to-gold-light"
              initial={reduce ? false : { width: 0 }}
              animate={{ width: `${(d.value / max) * 100}%` }}
              transition={{ duration: 1.2, delay: 0.2 + i * 0.08, ease: EASE }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Ring chart for a single share (0–1). */
export function Ring({ value, label }: { value: number; label: string }) {
  const reduce = useReducedMotion();
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto h-36 w-36">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(212,175,55,0.1)" strokeWidth="7" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#d4af37"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value) }}
          transition={{ duration: 1.6, ease: EASE, delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl text-ivory">{Math.round(value * 100)}%</span>
        <span className="text-[0.55rem] uppercase tracking-[0.25em] text-ivory/45">{label}</span>
      </div>
    </div>
  );
}
