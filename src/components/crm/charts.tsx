"use client";

import { motion } from "motion/react";
import { useId } from "react";
import { EASE } from "./ui";

export type Point = { label: string; value: number };

/** Smooth area chart that draws itself in. */
export function AreaChart({ points, height = 200, format = (n: number) => String(n) }: { points: Point[]; height?: number; format?: (n: number) => string }) {
  const id = useId().replace(/:/g, "");
  const W = 600;
  const H = height;
  const pad = { l: 44, r: 12, t: 14, b: 26 };
  const max = Math.max(1, ...points.map((p) => p.value));
  const nice = Math.ceil(max / 4) * 4 || 4;
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, points.length - 1);
  const y = (v: number) => pad.t + (1 - v / nice) * (H - pad.t - pad.b);
  const coords = points.map((p, i) => [x(i), y(p.value)] as const);
  const line = coords.reduce((acc, [cx, cy], i) => {
    if (i === 0) return `M${cx},${cy}`;
    const [px, py] = coords[i - 1];
    const mx = (px + cx) / 2;
    return `${acc} C${mx},${py} ${mx},${cy} ${cx},${cy}`;
  }, "");
  const area = coords.length ? `${line} L${coords[coords.length - 1][0]},${H - pad.b} L${coords[0][0]},${H - pad.b} Z` : "";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Chart">
      <defs>
        <linearGradient id={`fill-${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#c0283c" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#c0283c" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`line-${id}`} x1="0" x2="1">
          <stop offset="0%" stopColor="#c0283c" />
          <stop offset="100%" stopColor="var(--crm-accent-2)" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const v = (nice / 4) * i;
        return (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="var(--crm-border-soft)" strokeDasharray="3 5" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--crm-muted)">
              {format(v)}
            </text>
          </g>
        );
      })}
      {points.map((p, i) => (
        <text key={p.label + i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--crm-muted)">
          {p.label}
        </text>
      ))}
      <motion.path d={area} fill={`url(#fill-${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }} />
      <motion.path d={line} fill="none" stroke={`url(#line-${id})`} strokeWidth={2.5} strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: EASE }} />
      {coords.map(([cx, cy], i) => (
        <motion.circle key={i} cx={cx} cy={cy} r={4} fill="var(--crm-bg)" stroke="var(--crm-accent-2)" strokeWidth={2} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.8 + i * 0.06 }}>
          <title>{`${points[i].label}: ${format(points[i].value)}`}</title>
        </motion.circle>
      ))}
    </svg>
  );
}

const DONUT_COLORS = ["#d6246e", "#9b6bd8", "#3fa7e0", "#f2a900", "#58c48a", "#ef6b6b"];

/** Donut with an animated sweep and a centre label. */
export function Donut({ slices, center, sub }: { slices: { label: string; value: number }[]; center: string; sub: string }) {
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;
  const R = 70;
  const C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0 -rotate-90">
        <circle cx="90" cy="90" r={R} fill="none" stroke="var(--crm-border-soft)" strokeWidth="20" />
        {slices.map((s, i) => {
          const len = (s.value / total) * C;
          const el = (
            <motion.circle
              key={s.label}
              cx="90"
              cy="90"
              r={R}
              fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
              strokeWidth="20"
              strokeDasharray={`${len} ${C}`}
              strokeDashoffset={-acc}
              initial={{ strokeDasharray: `0 ${C}` }}
              animate={{ strokeDasharray: `${len} ${C}` }}
              transition={{ delay: 0.2 + i * 0.12, duration: 0.9, ease: EASE }}
            />
          );
          acc += len;
          return el;
        })}
        <g className="rotate-90" style={{ transformOrigin: "90px 90px" }}>
          <text x="90" y="88" textAnchor="middle" fontSize="18" fontWeight="600" fill="var(--crm-text)">
            {center}
          </text>
          <text x="90" y="106" textAnchor="middle" fontSize="10" fill="var(--crm-muted)">
            {sub}
          </text>
        </g>
      </svg>
      <ul className="w-full space-y-2 text-sm">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="flex-1">{s.label}</span>
            <span className="crm-muted">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Last N days as chart points from dated rows. */
export function byDay<T>(rows: T[], days: number, date: (r: T) => string, value: (r: T) => number): Point[] {
  const fmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "Asia/Kolkata" });
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
  const out: { k: string; label: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    out.push({ k: key.format(d), label: days <= 7 ? fmt.format(d) : `${d.getDate()}/${d.getMonth() + 1}`, value: 0 });
  }
  const idx = new Map(out.map((o, i) => [o.k, i]));
  for (const r of rows) {
    const i = idx.get(key.format(new Date(date(r))));
    if (i !== undefined) out[i].value += value(r);
  }
  return out.map(({ label, value: v }) => ({ label, value: v }));
}
