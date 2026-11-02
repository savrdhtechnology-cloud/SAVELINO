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
