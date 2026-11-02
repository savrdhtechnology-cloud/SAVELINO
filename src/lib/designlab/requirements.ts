/**
 * Material estimate for one blouse. A rule-of-thumb lay-plan estimate from the finished measurements:
 * 4 body panels (front pair + back pair) placed across the fabric width, sleeves added only when a sleeve
 * length is entered, 5% wastage, rounded up to 5 cm. It is an ESTIMATE — confirm with a real lay plan.
 */
export type SpecInput = {
  unit: "in" | "cm";
  garment: Record<string, string>;
  body?: Record<string, string>;
  cutting?: Record<string, string>;
  seam: number | null;
};

const IN = 0.0254; // metres per inch

export const toInches = (v: string | number | null | undefined, unit: "in" | "cm"): number => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return 0;
  return unit === "cm" ? n / 2.54 : n;
};

export const fromInches = (inches: number, unit: "in" | "cm") => (unit === "cm" ? inches * 2.54 : inches);

const roundUp = (m: number, step = 0.05) => Math.round(Math.ceil(m / step - 1e-9) * step * 100) / 100;

export type Need = { fabricM: number; liningM: number; fusingM: number; hooks: number; rows: number; usedSleeve: boolean };

export function fabricNeed(spec: SpecInput, opts: { widthIn?: number; lined?: boolean } = {}): Need {
  const W = opts.widthIn && opts.widthIn > 20 ? opts.widthIn : 44;
  const u = spec.unit;
  const g = (k: string) => toInches(spec.garment[k], u);
  const seam = spec.seam != null && spec.seam >= 0 ? toInches(spec.seam, u) : 1;
  const hem = toInches(spec.cutting?.hem_allowance, u) || 1;
  const bust = g("bust") || toInches(spec.body?.bust, u) + 2 || 38;
  const len = Math.max(g("front_length"), g("back_length")) || 13;
  const rowLen = len + hem + 2 * seam;
  const panelW = bust / 4 + 2 * seam + 1;
  const across = Math.max(1, Math.floor(W / panelW));
  const rows = Math.ceil(4 / across);
  const body = rows * rowLen;
  const sl = g("sleeve_length");
  let sleeve = 0;
  if (sl > 0) {
    const sw = (g("sleeve_opening") || bust / 3) + 2 * seam + 1;
    const rows2 = Math.ceil(2 / Math.max(1, Math.floor(W / sw)));
    sleeve = rows2 * (sl + hem + 2 * seam);
  }
  const facing = 10; // neck + armhole binding
  const fabricM = roundUp((body + sleeve + facing) * 1.05 * IN);
  const liningM = opts.lined === false ? 0 : roundUp(body * 1.05 * IN);
  return { fabricM, liningM, fusingM: 0.25, hooks: 8, rows, usedSleeve: sl > 0 };
}

export const STD_SIZES = ["S", "M", "L", "XL"] as const;

/** Thread: one spool per 8 pieces (rounded up). */
export const spools = (pieces: number) => (pieces > 0 ? Math.ceil(pieces / 8) : 0);

export const fmtNum = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? "—" : String(Math.round(n * 10 ** d) / 10 ** d));

export type Piece = { name: string; qty: number; w: number; l: number; fabric: "main" | "lining" | "fusing"; note: string };

/** Cut sizes (inches, seam + hem included) for each piece of a blouse. Rule-of-thumb rectangles — a tailor refines them on the sample. */
export function cutPieces(spec: SpecInput, opts: { lined?: boolean } = {}): Piece[] {
  const u = spec.unit;
  const g = (k: string) => toInches(spec.garment[k], u);
  const seam = spec.seam != null && spec.seam >= 0 ? toInches(spec.seam, u) : 1;
  const hem = toInches(spec.cutting?.hem_allowance, u) || 1;
  const bust = g("bust") || toInches(spec.body?.bust, u) + 2 || 38;
  const fl = g("front_length") || 13, bl = g("back_length") || fl;
  const pw = bust / 4 + 2 * seam + 1;
  const r = (n: number) => Math.round(n * 4) / 4;
  const out: Piece[] = [
    { name: "Front panel", qty: 2, w: r(pw), l: r(fl + hem + 2 * seam), fabric: "main", note: "1 left + 1 right (mirror pair). Mark bust dart and neck curve." },
    { name: "Back panel", qty: 2, w: r(pw), l: r(bl + hem + 2 * seam), fabric: "main", note: "1 left + 1 right (mirror pair). Mark back neck and closure line." },
  ];
  const sl = g("sleeve_length");
  if (sl > 0) out.push({ name: "Sleeve", qty: 2, w: r((g("sleeve_opening") || bust / 3) + 2 * seam + 1), l: r(sl + hem + 2 * seam), fabric: "main", note: "1 left + 1 right." });
  const bind = 2 * (g("armhole") || 6.5) * 2 + 2 * (g("neck_width") || 6) + (g("front_neck_depth") || 6) + (g("back_neck_depth") || 6) + 2;
  out.push({ name: "Neck & armhole binding (bias strip)", qty: 1, w: 1.5, l: r(bind), fabric: "main", note: "Cut on the bias (45°). Piece strips together if needed." });
  if (opts.lined !== false) {
    out.push({ name: "Lining — front", qty: 2, w: r(pw), l: r(fl + 2 * seam), fabric: "lining", note: "Same shape as front, without hem allowance." });
    out.push({ name: "Lining — back", qty: 2, w: r(pw), l: r(bl + 2 * seam), fabric: "lining", note: "Same shape as back, without hem allowance." });
  }
  out.push({ name: "Fusing strips (neck, closure)", qty: 2, w: 2, l: r(Math.max(fl, bl)), fabric: "fusing", note: "Iron on the wrong side of the closure edges and neck." });
  return out;
}

export type Placed = { name: string; x: number; y: number; w: number; l: number };

/** Simple shelf lay plan for the MAIN-fabric pieces across the fabric width. Returns rectangles + used length (inches). */
export function layPlan(pieces: Piece[], widthIn: number): { placed: Placed[]; length: number } {
  const items: Piece[] = [];
  for (const p of pieces.filter((x) => x.fabric === "main" && x.w < 5)) items.push(p); // bias strip handled separately
  const flat: { name: string; w: number; l: number }[] = [];
  for (const p of pieces.filter((x) => x.fabric === "main" && x.w >= 5)) for (let i = 0; i < p.qty; i++) flat.push({ name: p.name, w: p.w, l: p.l });
  flat.sort((a, b) => b.l - a.l);
  const placed: Placed[] = [];
  let y = 0, x = 0, rowH = 0;
  for (const f of flat) {
    if (x > 0 && x + f.w > widthIn) { y += rowH; x = 0; rowH = 0; }
    placed.push({ name: f.name, x, y, w: f.w, l: f.l });
    x += f.w; rowH = Math.max(rowH, f.l);
  }
  return { placed, length: y + rowH + (items.length ? 10 : 0) };
}
