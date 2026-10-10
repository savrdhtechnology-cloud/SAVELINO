/**
 * Parametric blouse block drafting.
 *
 * Draft blocks are produced from a size chart's measurements and the design's
 * construction choices (neckline, sleeve, cut, darts). They are a starting point for
 * the Pattern Master: every piece is saved as a draft and must be checked against a
 * fit sample and approved before it can be used for cutting. Nothing here is derived
 * from photographs or AI-generated images.
 *
 * Units are centimetres. x grows to the right, y grows downwards.
 */
import type { DesignSpec, Measurements, PieceType } from "./constants";

export type Pt = [number, number];
export type Notch = { at: Pt; angle: number };
export type PieceGeometry = {
  piece: PieceType;
  label: string;
  fold: boolean;
  outline: Pt[];
  cutLine: Pt[];
  darts: Pt[][];
  styleLines: Pt[][];
  notches: Notch[];
  grainline: [Pt, Pt];
  labels: { at: Pt; text: string; size?: number }[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  seamAllowance: number;
  cutCount: string;
  draftVersion: 1;
};

const r1 = (n: number) => Math.round(n * 10) / 10;

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps = 14): Pt[] {
  const out: Pt[] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const a = (1 - t) ** 3, b = 3 * (1 - t) ** 2 * t, c = 3 * (1 - t) * t ** 2, d = t ** 3;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
}

const quad = (p0: Pt, c: Pt, p1: Pt, steps = 12) =>
  cubic(p0, [p0[0] + (2 / 3) * (c[0] - p0[0]), p0[1] + (2 / 3) * (c[1] - p0[1])], [p1[0] + (2 / 3) * (c[0] - p1[0]), p1[1] + (2 / 3) * (c[1] - p1[1])], p1, steps);

function signedArea(poly: Pt[]) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** Offsets a closed polygon outwards by d (miter-limited). Points left of minX are clamped for fold pieces. */
export function offsetPolygon(poly: Pt[], d: number, clampX?: number): Pt[] {
  const n = poly.length;
  const dir = signedArea(poly) > 0 ? -1 : 1;
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const p0 = poly[(i - 1 + n) % n], p1 = poly[i], p2 = poly[(i + 1) % n];
    const e1 = norm([p1[0] - p0[0], p1[1] - p0[1]]);
    const e2 = norm([p2[0] - p1[0], p2[1] - p1[1]]);
    const n1: Pt = [e1[1] * dir, -e1[0] * dir];
    const n2: Pt = [e2[1] * dir, -e2[0] * dir];
    let m = norm([n1[0] + n2[0], n1[1] + n2[1]]);
    const cos = m[0] * n2[0] + m[1] * n2[1];
    let len = cos > 0.35 ? d / cos : d;
    if (!Number.isFinite(len)) {
      m = n2;
      len = d;
    }
    let x = p1[0] + m[0] * len;
    const y = p1[1] + m[1] * len;
    if (clampX !== undefined && p1[0] <= clampX + 0.01) x = clampX;
    out.push([x, y]);
  }
  return out;
}

function norm(v: Pt): Pt {
  const l = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / l, v[1] / l];
}

function bounds(pts: Pt[]) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

/** Neckline from shoulder-neck point (nw, 0) down to centre (0, depth). */
function neckline(style: string, nw: number, depth: number): { pts: Pt[]; width: number; depth: number } {
  switch (style) {
    case "boat":
      return { pts: quad([nw + 3, 0], [nw + 2, depth - 6], [0, Math.max(depth - 7, 4)]), width: nw + 3, depth: Math.max(depth - 7, 4) };
    case "high":
      return { pts: quad([nw - 1, 0], [nw - 1, 6.5], [0, 7]), width: nw - 1, depth: 7 };
    case "v":
      return { pts: [[nw * 0.5, depth * 0.5], [0, depth]], width: nw, depth };
    case "square":
      return { pts: [[nw, depth - 0.5], [nw - 0.5, depth], [0, depth]], width: nw, depth };
    case "u":
      return { pts: cubic([nw, 0], [nw + 0.5, depth + 2], [nw * 0.4, depth + 3], [0, depth + 3]), width: nw, depth: depth + 3 };
    case "sweetheart":
      return {
        pts: [...cubic([nw, 0], [nw + 0.5, depth * 0.6], [nw * 0.75, depth * 0.95], [nw * 0.42, depth * 0.85], 10), ...quad([nw * 0.42, depth * 0.85], [nw * 0.12, depth * 0.75], [0, depth], 8)],
        width: nw,
        depth,
      };
    default:
      return { pts: quad([nw, 0], [nw * 0.9, depth * 0.95], [0, depth]), width: nw, depth };
  }
}

type BodiceSide = "front" | "back";

function bodice(side: BodiceSide, m: Measurements, spec: DesignSpec, opts: { lining?: boolean } = {}): PieceGeometry {
  const front = side === "front";
  const bustW = (m.bust + m.ease) / 4 + (front ? 1 : -1);
  const waistW = (m.waist + m.ease) / 4 + (front ? 1 : -1);
  const halfShoulder = m.shoulder / 2;
  const slope = front ? 3.2 : 2.2;
  const armDepth = m.armhole / 2 + slope;
  const length = m.blouse_length + (front ? 2.5 : 0);
  const nw = halfShoulder * 0.38;
  const neckStyle = front ? spec.neckline : ({ "deep-u": "u", v: "v", square: "square", keyhole: "round", round: "round" } as Record<string, string>)[spec.backNeck] ?? "round";
  const depth = front ? m.neck_depth_front : m.neck_depth_back;
  const neck = neckline(neckStyle, nw, depth);

  const apex: Pt = [front ? m.bust * 0.1 : waistW * 0.48, front ? armDepth + 4.5 : armDepth + 6];
  const dartIntake = front ? 2.5 : 2;
  const hasWaistDart = spec.cut !== "princess" && (front ? spec.darts.includes("waist") || spec.cut === "darted" : spec.darts.includes("back-waist"));
  const hasSideDart = front && (spec.darts.includes("side") || spec.darts.includes("bust") || spec.cut === "katori");
  const waistLen = waistW + (hasWaistDart ? dartIntake : 0);

  const shoulderNeck: Pt = [neck.width, 0];
  const shoulderTip: Pt = [halfShoulder, slope];
  const underarm: Pt = [bustW, armDepth];
  const sideWaist: Pt = [waistLen, length - (front ? 1.2 : 0)];
  const cfWaist: Pt = [0, length];

  const outline: Pt[] = [];
  // centre neck → around neckline → shoulder → armhole → side → waist → centre
  outline.push([0, neck.depth]);
  outline.push(...[...neck.pts].reverse().slice(1), shoulderNeck);
  outline.push(shoulderTip);
  outline.push(...cubic(shoulderTip, [halfShoulder - 1.2, armDepth * 0.55], [bustW - 3, armDepth], underarm));

  const darts: Pt[][] = [];
  const notches: Notch[] = [];
  if (hasSideDart) {
    const y = armDepth + 4.5;
    const a: Pt = [bustW + (sideWaist[0] - bustW) * ((y - armDepth) / (sideWaist[1] - armDepth)), y];
    const b: Pt = [a[0] + 0.2, y + 2.5];
    const tip: Pt = [apex[0] + 2.5, apex[1]];
    outline.push(a, tip, b);
    darts.push([a, tip, b]);
  }
  outline.push(sideWaist);
  if (hasWaistDart) {
    const cx = apex[0];
    const yW = length - (front ? 1.2 * (cx / waistLen) : 0);
    const a: Pt = [cx + dartIntake / 2, yW];
    const b: Pt = [cx - dartIntake / 2, yW];
    const tip: Pt = [cx, apex[1] + 2];
    outline.push(a, tip, b);
    darts.push([a, tip, b]);
  }
  outline.push(cfWaist);

  const styleLines: Pt[][] = [];
  if (spec.cut === "princess") {
    const armMid: Pt = [halfShoulder + (bustW - halfShoulder) * 0.35, armDepth * 0.62];
    styleLines.push([armMid, ...cubic(armMid, [apex[0] + 3, apex[1] - 4], [apex[0] + 0.5, apex[1] - 1], apex, 10), ...quad(apex, [apex[0], apex[1] + 6], [apex[0] - 0.3, length - (front ? 1.2 * (apex[0] / waistLen) : 0)], 8)]);
  }
  if (spec.cut === "katori" && front) {
    styleLines.push([[0, armDepth + 1], [bustW - 1, armDepth + 1]]);
  }

  notches.push({ at: [halfShoulder + (bustW - halfShoulder) * 0.55, armDepth * 0.72], angle: 0 });
  notches.push({ at: [bustW + (sideWaist[0] - bustW) * 0.5, armDepth + (sideWaist[1] - armDepth) * 0.5], angle: 0 });
  if (!front) notches.push({ at: [halfShoulder + (bustW - halfShoulder) * 0.6, armDepth * 0.8], angle: 0 }, { at: [halfShoulder + (bustW - halfShoulder) * 0.62, armDepth * 0.86], angle: 0 });

  const sa = m.seam_allowance;
  const cutLine = offsetPolygon(outline, sa, 0);
  const all = [...outline, ...cutLine];
  const gx = Math.max(4, neck.width * 0.6);
  const title = opts.lining ? `Lining · ${front ? "front" : "back"}` : front ? "Front bodice" : "Back bodice";
  return {
    piece: (opts.lining ? `lining_${side}` : side) as PieceType,
    label: title,
    fold: true,
    outline,
    cutLine,
    darts,
    styleLines,
    notches,
    grainline: [[gx + 2, neck.depth + 3], [gx + 2, length - 4]],
    labels: [
      { at: [gx + 4, length * 0.48], text: title.toUpperCase(), size: 1.3 },
      { at: [gx + 4, length * 0.48 + 2], text: `Cut 1 on fold${opts.lining ? " · lining" : ""}`, size: 0.9 },
      { at: [0.6, length * 0.3], text: "CENTRE FOLD", size: 0.7 },
    ],
    bounds: bounds(all),
    seamAllowance: sa,
    cutCount: "1 on fold",
    draftVersion: 1,
  };
}

function sleeve(m: Measurements, spec: DesignSpec, lining = false): PieceGeometry | null {
  if (spec.sleeve === "sleeveless") return null;
  const lengthBy: Record<string, number> = { cap: 6, short: m.sleeve_length, elbow: m.sleeve_length + 13, "three-quarter": m.sleeve_length + 24, puff: m.sleeve_length - 2 };
  const L = Math.max(5, lengthBy[spec.sleeve] ?? m.sleeve_length);
  const capH = m.armhole / 3 - 1;
  const puff = spec.sleeve === "puff" ? 6 : 0;
  const bw = m.armhole * 0.78 + puff;
  const taper = spec.sleeve === "cap" ? 0.5 : Math.min(4.5, 1.5 + L * 0.08);
  const left: Pt = [0, capH];
  const top: Pt = [bw / 2, 0];
  const right: Pt = [bw, capH];
  const outline: Pt[] = [
    left,
    ...cubic(left, [bw * 0.18, capH * 0.85], [bw * 0.3, puff ? -1 : 0], top),
    ...cubic(top, [bw * 0.68, puff ? -1 : 0], [bw * 0.84, capH * 0.6], right),
    [bw - taper, capH + L],
    [taper, capH + L],
  ];
  const sa = m.seam_allowance;
  const cutLine = offsetPolygon(outline, sa);
  const label = lining ? "Lining · sleeve" : "Sleeve";
  return {
    piece: (lining ? "lining_sleeve" : "sleeve") as PieceType,
    label,
    fold: false,
    outline,
    cutLine,
    darts: [],
    styleLines: puff ? [[[bw * 0.22, capH * 0.4], [bw * 0.78, capH * 0.4]]] : [],
    notches: [
      { at: [bw / 2, 0], angle: 90 },
      { at: [bw * 0.2, capH * 0.6], angle: 0 },
      { at: [bw * 0.82, capH * 0.42], angle: 0 },
      { at: [bw * 0.85, capH * 0.5], angle: 0 },
    ],
    grainline: [[bw / 2, capH * 0.5], [bw / 2, capH + L - 2]],
    labels: [
      { at: [bw / 2 - 4, capH + L * 0.45], text: label.toUpperCase(), size: 1.3 },
      { at: [bw / 2 - 4, capH + L * 0.45 + 2], text: puff ? "Cut 2 · gather cap between notches" : "Cut 2 (mirror)", size: 0.9 },
    ],
    bounds: bounds([...outline, ...cutLine]),
    seamAllowance: sa,
    cutCount: "2 (mirror)",
    draftVersion: 1,
  };
}

function neckFacing(m: Measurements, spec: DesignSpec): PieceGeometry {
  const nw = (m.shoulder / 2) * 0.38;
  const neck = neckline(spec.neckline, nw, m.neck_depth_front);
  const inner: Pt[] = [[neck.width, 0], ...neck.pts];
  const band = 4;
  const outer: Pt[] = inner.map((p, i) => {
    const a = inner[Math.max(0, i - 1)], b = inner[Math.min(inner.length - 1, i + 1)];
    const t = norm([b[0] - a[0], b[1] - a[1]]);
    return [p[0] + t[1] * band, p[1] - t[0] * band];
  });
  const outline: Pt[] = [...inner, [0, neck.depth + band], ...outer.slice(1, -1).reverse(), [neck.width + band, 0]];
  const sa = m.seam_allowance;
  const cutLine = offsetPolygon(outline, sa, 0);
  return {
    piece: "neck_facing",
    label: "Front neck facing",
    fold: true,
    outline,
    cutLine,
    darts: [],
    styleLines: [],
    notches: [{ at: [neck.width * 0.5, neck.depth * 0.5], angle: 0 }],
    grainline: [[1.5, neck.depth * 0.2], [1.5, neck.depth + band - 0.5]],
    labels: [
      { at: [neck.width * 0.3 + 2, neck.depth + band + 2.5], text: "FRONT NECK FACING", size: 1.1 },
      { at: [neck.width * 0.3 + 2, neck.depth + band + 4], text: "Cut 1 on fold · interface", size: 0.8 },
    ],
    bounds: bounds([...outline, ...cutLine]),
    seamAllowance: sa,
    cutCount: "1 on fold",
    draftVersion: 1,
  };
}

/** Drafts every piece the design needs for one size. */
export function draftPieces(m: Measurements, spec: DesignSpec): PieceGeometry[] {
  const pieces: (PieceGeometry | null)[] = [bodice("front", m, spec), bodice("back", m, spec), sleeve(m, spec), neckFacing(m, spec)];
  if (spec.lining && spec.lining !== "none") {
    pieces.push(bodice("front", m, spec, { lining: true }), bodice("back", m, spec, { lining: true }), sleeve(m, spec, true));
  }
  return pieces.filter((p): p is PieceGeometry => p !== null);
}

export function toPath(pts: Pt[], close = true) {
  if (!pts.length) return "";
  return `M${pts.map((p) => `${r1(p[0])},${r1(p[1])}`).join(" L")}${close ? " Z" : ""}`;
}

/** Bounding-box area of a cut piece (cm²), counting mirrored/fold pieces. */
export function cutArea(g: PieceGeometry) {
  const w = g.bounds.maxX - g.bounds.minX;
  const h = g.bounds.maxY - g.bounds.minY;
  const copies = g.fold ? 1 : 2;
  return { width: g.fold ? w * 2 : w, height: h, copies, area: (g.fold ? w * 2 : w) * h * copies };
}

/** Builds a standalone true-scale SVG (1 user unit = 1 cm) for export and printing. */
export function pieceSvg(g: PieceGeometry, meta: { design: string; size: string; status: string; version: number }, opts: { calibration?: boolean } = {}) {
  const pad = 3;
  const calib = opts.calibration ? 12 : 0;
  const w = g.bounds.maxX - g.bounds.minX + pad * 2;
  const h = g.bounds.maxY - g.bounds.minY + pad * 2 + 6 + calib;
  const ox = -g.bounds.minX + pad, oy = -g.bounds.minY + pad + 6;
  const tr = (p: Pt): Pt => [p[0] + ox, p[1] + oy];
  const P = (pts: Pt[], close = true) => toPath(pts.map(tr), close);
  const [g1, g2] = g.grainline.map(tr);
  const notch = g.notches.map((n) => {
    const [x, y] = tr(n.at);
    return `<line x1="${r1(x - 0.4)}" y1="${r1(y)}" x2="${r1(x + 0.4)}" y2="${r1(y)}" stroke="#000" stroke-width="0.08"/>`;
  });
  const text = g.labels.map((l) => {
    const [x, y] = tr(l.at);
    return `<text x="${r1(x)}" y="${r1(y)}" font-size="${l.size ?? 1}" font-family="Helvetica, Arial">${esc(l.text)}</text>`;
  });
  const calibBox = opts.calibration
    ? `<g transform="translate(${pad},${r1(h - calib + 1)})"><rect width="10" height="10" fill="none" stroke="#000" stroke-width="0.06"/><text x="11" y="5" font-size="0.9" font-family="Helvetica, Arial">10 cm × 10 cm calibration square — measure after printing at 100% / actual size</text></g>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${r1(w)}cm" height="${r1(h)}cm" viewBox="0 0 ${r1(w)} ${r1(h)}">
<title>${esc(`${meta.design} · ${g.label} · size ${meta.size}`)}</title>
<text x="${pad}" y="2.2" font-size="1.1" font-family="Helvetica, Arial">SAVLINO · ${esc(meta.design)} · ${esc(g.label)} · Size ${esc(meta.size)} · Pattern v${meta.version} · ${esc(meta.status.toUpperCase())}</text>
<text x="${pad}" y="3.8" font-size="0.8" font-family="Helvetica, Arial">Seam allowance ${g.seamAllowance} cm included on cut line · ${esc(g.cutCount)}${meta.status === "approved" ? "" : " · NOT APPROVED FOR PRODUCTION"}</text>
<path d="${P(g.cutLine)}" fill="none" stroke="#000" stroke-width="0.08"/>
<path d="${P(g.outline)}" fill="none" stroke="#000" stroke-width="0.05" stroke-dasharray="0.6 0.4"/>
${g.darts.map((d) => `<path d="${P(d, false)}" fill="none" stroke="#000" stroke-width="0.05"/>`).join("\n")}
${g.styleLines.map((d) => `<path d="${P(d, false)}" fill="none" stroke="#000" stroke-width="0.05" stroke-dasharray="1.2 0.4 0.2 0.4"/>`).join("\n")}
<line x1="${r1(g1[0])}" y1="${r1(g1[1])}" x2="${r1(g2[0])}" y2="${r1(g2[1])}" stroke="#000" stroke-width="0.06"/>
<path d="M${r1(g1[0] - 0.4)},${r1(g1[1] + 0.8)} L${r1(g1[0])},${r1(g1[1])} L${r1(g1[0] + 0.4)},${r1(g1[1] + 0.8)} M${r1(g2[0] - 0.4)},${r1(g2[1] - 0.8)} L${r1(g2[0])},${r1(g2[1])} L${r1(g2[0] + 0.4)},${r1(g2[1] - 0.8)}" fill="none" stroke="#000" stroke-width="0.06"/>
${notch.join("\n")}
${text.join("\n")}
${calibBox}
</svg>`;
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
}
