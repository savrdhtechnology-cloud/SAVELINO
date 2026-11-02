import { fromInches, toInches } from "@/lib/designlab/requirements";

type D = { view: "front" | "back"; unit: "in" | "cm"; chestHalf: number; waistHalf: number; bottomHalf: number; length: number; shoulder: number; armhole: number; neckDepth: number; neckWidth: number };
const K = 11; // px per inch (schematic)

/** Schematic of a blouse panel with its key dimensions. Not to scale and NOT a cutting pattern. */
export function Diagram({ d }: { d: D }) {
  const W = d.chestHalf, cx = W / 2;
  const nw = Math.max(1.5, Math.min(d.neckWidth || 3, W / 3));
  const sh = Math.min(d.shoulder || 14, W - 2);
  const ah = Math.min(d.armhole || 8, d.length - 2);
  const nd = Math.min(d.neckDepth || 3, d.length - 1);
  const yw = d.length * 0.68;
  const x = (v: number) => (v + 6) * K;
  const y = (v: number) => (v + 2) * K;
  const wl = cx - d.waistHalf / 2, wr = cx + d.waistHalf / 2, bl = cx - d.bottomHalf / 2, br = cx + d.bottomHalf / 2;
  const sl = cx - sh / 2, sr = cx + sh / 2;
  const path = `M${x(cx - nw)},${y(0)} L${x(sl)},${y(0.6)} Q${x(sl - 1.2)},${y(ah * 0.5)} ${x(0)},${y(ah)} L${x(wl)},${y(yw)} L${x(bl)},${y(d.length)} L${x(br)},${y(d.length)} L${x(wr)},${y(yw)} L${x(W)},${y(ah)} Q${x(sr + 1.2)},${y(ah * 0.5)} ${x(sr)},${y(0.6)} L${x(cx + nw)},${y(0)} Q${x(cx)},${y(nd * 1.15)} ${x(cx - nw)},${y(0)} Z`;
  const u = d.unit;
  const f = (inches: number) => `${Math.round(fromInches(inches, u) * 10) / 10}${u === "in" ? "”" : " cm"}`;
  const width = (W + 6 + 14) * K, height = (d.length + 4) * K;
  const dash = { stroke: "#b0176b", strokeDasharray: "4 3", strokeWidth: 1 } as const;
  const lbl = { fontSize: 10, fill: "#111", fontFamily: "Arial, sans-serif" } as const;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={`${d.view} half view with dimensions`}>
      <path d={path} fill="#fff" stroke="#222" strokeWidth={1.4} />
      <line x1={x(0)} x2={x(W) + 8} y1={y(ah)} y2={y(ah)} {...dash} />
      <line x1={x(wl)} x2={x(W) + 8} y1={y(yw)} y2={y(yw)} {...dash} />
      <text x={x(W) + 12} y={y(ah) - 2} {...lbl}>Chest (half)</text>
      <text x={x(W) + 12} y={y(ah) + 10} {...lbl} fontWeight={700}>{f(d.chestHalf)}</text>
      <text x={x(W) + 12} y={y(yw) - 2} {...lbl}>Waist (half)</text>
      <text x={x(W) + 12} y={y(yw) + 10} {...lbl} fontWeight={700} fill="#b0176b">{f(d.waistHalf)}</text>
      <text x={x(cx)} y={height - 4} textAnchor="middle" {...lbl}>Bottom width (half) {f(d.bottomHalf)}</text>
      <text x={x(cx)} y={y(0) - 6} textAnchor="middle" {...lbl}>Shoulder {f(sh)} · Neck width {f(nw)}</text>
      <text x={x(cx)} y={y(nd * 0.6)} textAnchor="middle" {...lbl}>Neck depth {f(nd)}</text>
      <text x={x(0) - 4} y={y(d.length / 2)} textAnchor="end" {...lbl} transform={`rotate(-90 ${x(0) - 4} ${y(d.length / 2)})`}>Length {f(d.length)}</text>
    </svg>
  );
}

export const toDiagram = (view: "front" | "back", unit: "in" | "cm", body: Record<string, string>, garment: Record<string, string>): D => {
  const g = (k: string) => toInches(body[k] || garment[k], unit);
  const bust = g("bust") || 38, waist = g("waist") || bust - 8;
  return {
    view, unit, chestHalf: bust / 2, waistHalf: waist / 2, bottomHalf: Math.max(waist / 2, bust / 2 - 3),
    length: g(view === "front" ? "front_length" : "back_length") || 13, shoulder: g("shoulder") || 14, armhole: g("armhole") || 7.5,
    neckDepth: g(view === "front" ? "front_neck_depth" : "back_neck_depth") || 3, neckWidth: g("neck_width") || 3,
  };
};
