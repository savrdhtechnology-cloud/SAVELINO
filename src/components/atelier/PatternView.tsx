"use client";

import { toPath, type PieceGeometry, type Pt } from "@/lib/atelier/drafting";

export type Layers = { seam: boolean; notches: boolean; grain: boolean; labels: boolean; measurements: boolean };
export const ALL_LAYERS: Layers = { seam: true, notches: true, grain: true, labels: true, measurements: true };

/** One pattern piece in centimetre units (stroke widths scale with the viewport). */
export function PatternPiece({ g, layers = ALL_LAYERS, offset = [0, 0], tone = "gold", ghost = false }: { g: PieceGeometry; layers?: Layers; offset?: Pt; tone?: "gold" | "ivory" | "muted"; ghost?: boolean }) {
  const stroke = tone === "gold" ? "#d4af37" : tone === "ivory" ? "var(--color-ivory, #f8f5eb)" : "rgba(212,175,55,0.35)";
  const ox = offset[0], oy = offset[1];
  const [a, b] = g.grainline;
  const o = g.outline;
  const width = g.bounds.maxX - g.bounds.minX;
  const height = g.bounds.maxY - g.bounds.minY;
  return (
    <g transform={`translate(${ox} ${oy})`} opacity={ghost ? 0.55 : 1}>
      {!ghost && <path d={toPath(g.cutLine)} fill="rgba(212,175,55,0.05)" stroke="none" />}
      {layers.seam && <path d={toPath(g.cutLine)} fill="none" stroke={stroke} strokeWidth={0.09} />}
      <path d={toPath(o)} fill="none" stroke={stroke} strokeWidth={layers.seam ? 0.06 : 0.1} strokeDasharray={layers.seam ? "0.5 0.35" : undefined} />
      {g.fold && <line x1={0} y1={g.bounds.minY} x2={0} y2={g.bounds.maxY} stroke={stroke} strokeWidth={0.12} strokeDasharray="1.4 0.5" />}
      {g.darts.map((d, i) => <path key={i} d={toPath(d, false)} fill="none" stroke={stroke} strokeWidth={0.07} />)}
      {g.styleLines.map((d, i) => <path key={i} d={toPath(d, false)} fill="none" stroke={stroke} strokeWidth={0.07} strokeDasharray="1 0.4 0.2 0.4" />)}
      {layers.grain && (
        <g stroke={stroke} strokeWidth={0.08} fill="none">
          <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />
          <path d={`M${a[0] - 0.5},${a[1] + 1} L${a[0]},${a[1]} L${a[0] + 0.5},${a[1] + 1} M${b[0] - 0.5},${b[1] - 1} L${b[0]},${b[1]} L${b[0] + 0.5},${b[1] - 1}`} />
        </g>
      )}
      {layers.notches &&
        g.notches.map((n, i) => (
          <g key={i}>
            <circle cx={n.at[0]} cy={n.at[1]} r={0.35} fill="#6b0f1a" stroke={stroke} strokeWidth={0.05} />
            <line x1={n.at[0] - 0.6} y1={n.at[1]} x2={n.at[0] + 0.6} y2={n.at[1]} stroke={stroke} strokeWidth={0.08} />
          </g>
        ))}
      {layers.labels &&
        g.labels.map((l, i) => (
          <text key={i} x={l.at[0]} y={l.at[1]} fontSize={l.size ?? 1} fill={tone === "muted" ? "rgba(212,175,55,0.6)" : "var(--color-ivory, #f8f5eb)"} fontFamily="var(--font-manrope), sans-serif" letterSpacing={0.05}>
            {l.text}
          </text>
        ))}
      {layers.measurements && !ghost && (
        <g fill="rgba(212,175,55,0.85)" fontSize={0.85} fontFamily="var(--font-manrope), sans-serif">
          <text x={g.bounds.minX} y={g.bounds.minY - 1}>{`${width.toFixed(1)} cm wide incl. SA${g.fold ? " · half, on fold" : ""}`}</text>
          <text x={g.bounds.maxX + 0.8} y={(g.bounds.minY + g.bounds.maxY) / 2} transform={`rotate(90 ${g.bounds.maxX + 0.8} ${(g.bounds.minY + g.bounds.maxY) / 2})`}>{`${height.toFixed(1)} cm long`}</text>
        </g>
      )}
    </g>
  );
}
