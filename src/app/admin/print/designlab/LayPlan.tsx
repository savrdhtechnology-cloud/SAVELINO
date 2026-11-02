import type { Placed } from "@/lib/designlab/requirements";

/** Top-down picture of the pieces laid across the fabric width (scaled). */
export function LayPlan({ placed, widthIn, length }: { placed: Placed[]; widthIn: number; length: number }) {
  const S = 9; // px per inch
  const W = widthIn * S, H = Math.max(length, 8) * S;
  return (
    <svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} style={{ width: "100%", maxHeight: 260, border: "1px solid #bbb", background: "#fafafa" }} role="img" aria-label="Lay plan">
      <rect x={0} y={0} width={W} height={H} fill="#fff" stroke="#999" strokeDasharray="4 3" />
      {placed.map((p, i) => (
        <g key={i}>
          <rect x={p.x * S + 1} y={p.y * S + 1} width={p.w * S - 2} height={p.l * S - 2} fill="#fde9f2" stroke="#b0176b" />
          <text x={p.x * S + (p.w * S) / 2} y={p.y * S + (p.l * S) / 2} fontSize={9} textAnchor="middle" fill="#7a1f2b">{p.name}</text>
        </g>
      ))}
      <text x={W / 2} y={H + 1} fontSize={8} textAnchor="middle" fill="#555" dy={-2}>← fabric width {widthIn}” →</text>
    </svg>
  );
}
