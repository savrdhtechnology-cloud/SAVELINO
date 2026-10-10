/**
 * Fabric requirement estimates.
 *
 * Estimates come from the drafted piece sizes laid out with a simple shelf-packing
 * model. They are planning figures only. Cutting and stock reservation always use a
 * verified marker (a real lay plan checked by the Pattern Master), never this estimate.
 */
import type { DesignSpec, Measurements } from "./constants";
import { cutArea, draftPieces } from "./drafting";

export type EstimateInput = {
  measurements: Measurements;
  spec: DesignSpec;
  fabricWidthCm: number;
  quantity: number;
  layout: "single_ply" | "folded";
  shrinkagePct: number;
  wastagePct: number;
};

export type EstimateResult = {
  basis: "estimated";
  perPieceCm: number;
  liningPerPieceCm: number;
  totalMetres: number;
  liningMetres: number;
  efficiency: number;
  pieces: { label: string; width: number; height: number; copies: number }[];
  warnings: string[];
};

type Rect = { w: number; h: number };

/** Shelf packing: places rectangles in rows across the usable width; returns marker length. */
function shelfLength(rects: Rect[], width: number) {
  const sorted = [...rects].sort((a, b) => b.h - a.h);
  let x = 0, shelfH = 0, total = 0;
  for (const r of sorted) {
    const w = Math.min(r.w, width);
    if (x + w > width) {
      total += shelfH;
      x = 0;
      shelfH = 0;
    }
    x += w + 1;
    shelfH = Math.max(shelfH, r.h + 1);
  }
  return total + shelfH;
}

export function estimateFabric(input: EstimateInput): EstimateResult {
  const pieces = draftPieces(input.measurements, input.spec);
  const warnings: string[] = [];
  const usable = Math.max(10, input.fabricWidthCm - 4); // selvedges
  const laneWidth = input.layout === "folded" ? usable / 2 : usable;

  const main = pieces.filter((p) => !p.piece.startsWith("lining"));
  const lining = pieces.filter((p) => p.piece.startsWith("lining"));

  const rects = (list: typeof pieces) =>
    list.flatMap((p) => {
      const a = cutArea(p);
      // On a folded lay, fold pieces are placed on the fold at half width and mirrored pieces cut 2 at once.
      if (input.layout === "folded") return [{ w: p.fold ? a.width / 2 : a.width, h: a.height }];
      return Array.from({ length: a.copies }, () => ({ w: a.width, h: a.height }));
    });

  const mainRects = rects(main);
  const tooWide = mainRects.find((r) => r.w > laneWidth);
  if (tooWide) warnings.push("A piece is wider than the usable fabric width for this lay — use single-ply or a wider fabric.");

  const perPiece = shelfLength(mainRects, laneWidth);
  const liningPer = lining.length ? shelfLength(rects(lining), laneWidth) : 0;
  const factor = (1 + input.shrinkagePct / 100) * (1 + input.wastagePct / 100);
  const pieceArea = main.reduce((s, p) => s + cutArea(p).area, 0);
  const efficiency = Math.min(1, pieceArea / (perPiece * usable));

  if (input.quantity > 1) warnings.push("Multi-piece lays usually nest better than this estimate. Confirm with a marker before cutting.");

  return {
    basis: "estimated",
    perPieceCm: Math.round(perPiece * 10) / 10,
    liningPerPieceCm: Math.round(liningPer * 10) / 10,
    totalMetres: Math.ceil(((perPiece * input.quantity * factor) / 100) * 100) / 100,
    liningMetres: Math.ceil(((liningPer * input.quantity * factor) / 100) * 100) / 100,
    efficiency,
    pieces: main.concat(lining).map((p) => {
      const a = cutArea(p);
      return { label: p.label, width: Math.round(a.width * 10) / 10, height: Math.round(a.height * 10) / 10, copies: a.copies };
    }),
    warnings,
  };
}

/** Consumption from a verified marker — the only figure used for reservation. */
export function verifiedConsumption(marker: { marker_length_cm: number; pieces_per_marker: number; shrinkage_pct: number }, quantity: number) {
  const markers = Math.ceil(quantity / marker.pieces_per_marker);
  return Math.ceil((marker.marker_length_cm / 100) * markers * (1 + marker.shrinkage_pct / 100) * 100) / 100;
}
