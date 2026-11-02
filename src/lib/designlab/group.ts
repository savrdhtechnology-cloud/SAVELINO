/**
 * Turns a list of ZIP paths (+ optional catalog CSV) into SUGGESTED design groups.
 * Rules (reviewed by a person before anything is saved):
 *  1. A folder that directly holds pictures is one design (nested folders are fine) — never merged with a sibling.
 *  2. Names like  style_front.jpg / style_back.jpg  → angle tags + split loose files by their style stem.
 *  3. Loose pictures with no reliable structure are left as one-picture suggestions marked "needs review";
 *     the admin merges them by hand. Colour alone never merges anything, and there is NO automatic image-similarity merge.
 */
export type Angle = "unlabeled" | "front" | "back" | "side" | "detail";
export type SuggestedImage = { path: string; angle: Angle };
export type SuggestedGroup = {
  key: string;
  name: string;
  category: string;
  color: string;
  sku: string | null;
  basis: "folder" | "filename" | "catalog" | "loose";
  needsReview: boolean;
  images: SuggestedImage[];
};

const IMG = /\.(jpe?g|png|webp|avif)$/i; // avif is an extra: real catalogs contain it and the media bucket accepts it
const ANGLE_WORDS: [Angle, RegExp][] = [
  ["front", /(^|[^a-z0-9])front(view)?(?![a-z])/i],
  ["back", /(^|[^a-z0-9])back(view)?(?![a-z])/i],
  ["side", /(^|[^a-z0-9])side(view)?(?![a-z])/i],
  ["detail", /(^|[^a-z0-9])(detail|details|close-?up|closeup|zoom|macro)(?![a-z])/i],
];

export function detectAngle(fileName: string): Angle {
  const base = fileName.replace(/\.[^.]+$/, "");
  for (const [a, re] of ANGLE_WORDS) if (re.test(base)) return a;
  return "unlabeled";
}

const stripAngle = (base: string) =>
  base.replace(/[\s_-]*(front|back|side|detail|details|close-?up|closeup|zoom|macro)(view)?(?![a-z])/gi, "").replace(/[\s_-]*\d{1,3}$/, "").replace(/[\s_-]+$/, "");

export const prettify = (s: string) =>
  s.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim().replace(/\b([a-z])/g, (m) => m.toUpperCase());

/** "SV-BL-002_Amber_Silk" → { sku: "SV-BL-002", name: "Amber Silk" } */
export function parseFolderName(folder: string): { sku: string | null; name: string } {
  const m = folder.match(/^([A-Za-z]{1,6}(?:-[A-Za-z0-9]{1,6}){1,3}-\d{1,6})[_\s-]+(.+)$/);
  if (m) return { sku: m[1].toUpperCase(), name: prettify(m[2]) };
  return { sku: null, name: prettify(folder) };
}

export type CatalogRow = { sku: string; name: string; category: string; color: string };

/** Tiny CSV parser (quotes, BOM). Reads Product_Catalog.csv style files: SKU, Product Name, Category, Design / Color. */
export function parseCatalogCsv(text: string): CatalogRow[] {
  const rows: string[][] = [];
  let cur: string[] = [], cell = "", q = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { cur.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && src[i + 1] === "\n") i++; cur.push(cell); cell = ""; if (cur.some((x) => x.trim())) rows.push(cur); cur = []; }
    else cell += c;
  }
  if (cell || cur.length) { cur.push(cell); if (cur.some((x) => x.trim())) rows.push(cur); }
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (...names: string[]) => head.findIndex((h) => names.some((n) => h === n));
  const iSku = col("sku"), iName = col("product name", "name"), iCat = col("category"), iCol = col("design / color", "design/color", "color", "colour");
  if (iSku < 0) return [];
  const out: CatalogRow[] = [];
  const seen = new Set<string>();
  for (const r of rows.slice(1)) {
    const sku = (r[iSku] ?? "").trim().toUpperCase();
    if (!sku || seen.has(sku)) continue;
    seen.add(sku);
    out.push({ sku, name: (r[iName] ?? "").trim(), category: (r[iCat] ?? "").trim(), color: (r[iCol] ?? "").trim() });
  }
  return out;
}

const dirOf = (p: string) => (p.includes("/") ? p.slice(0, p.lastIndexOf("/")) : "");
const fileOf = (p: string) => p.slice(p.lastIndexOf("/") + 1);
const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
const IGNORE_DIR = /(^|\/)(__macosx|\.ds_store|size[_ -]?guides?|size[_ -]?charts?)(\/|$)/i;

export type GroupResult = { groups: SuggestedGroup[]; ignored: { path: string; reason: string }[] };

export function suggestGroups(paths: string[], catalog: CatalogRow[] = []): GroupResult {
  const ignored: { path: string; reason: string }[] = [];
  const bySku = new Map(catalog.map((c) => [c.sku, c]));
  const folders = new Map<string, string[]>();
  for (const p of paths) {
    const f = fileOf(p);
    if (!IMG.test(f) || f.startsWith("._") || f.startsWith(".")) continue;
    if (IGNORE_DIR.test(p)) { ignored.push({ path: p, reason: "Size guide / system file — not a design" }); continue; }
    const d = dirOf(p);
    folders.set(d, [...(folders.get(d) ?? []), p]);
  }

  const groups: SuggestedGroup[] = [];
  const used = new Set<string>();
  const uniqueKey = (k: string) => { let key = k, n = 2; while (used.has(key)) key = `${k}#${n++}`; used.add(key); return key; };

  for (const [dir, files] of [...folders.entries()].sort((a, b) => natural(a[0], b[0]))) {
    const sorted = [...files].sort((a, b) => natural(fileOf(a), fileOf(b)));
    if (dir) {
      const parts = dir.split("/");
      const leaf = parts[parts.length - 1];
      const parent = parts.length > 1 ? parts[parts.length - 2] : "";
      const { sku, name } = parseFolderName(leaf);
      const row = sku ? bySku.get(sku) : undefined;
      groups.push({
        key: uniqueKey(dir),
        name: row?.name || name,
        category: row?.category || prettify(parent),
        color: row?.color || "",
        sku,
        basis: row ? "catalog" : "folder",
        needsReview: false,
        images: sorted.map((path) => ({ path, angle: detectAngle(fileOf(path)) })),
      });
      continue;
    }
    // Loose files at the ZIP root: split by filename stem when the names carry a style.
    const stems = new Map<string, string[]>();
    for (const p of sorted) {
      const stem = stripAngle(fileOf(p).replace(/\.[^.]+$/, ""));
      stems.set(stem, [...(stems.get(stem) ?? []), p]);
    }
    for (const [stem, list] of stems) {
      const reliable = list.length > 1 || list.some((p) => detectAngle(fileOf(p)) !== "unlabeled");
      groups.push({
        key: uniqueKey(`root/${stem || list[0]}`),
        name: prettify(stem) || "Untitled design",
        category: "",
        color: "",
        sku: null,
        basis: reliable ? "filename" : "loose",
        needsReview: !reliable,
        images: list.map((path) => ({ path, angle: detectAngle(fileOf(path)) })),
      });
    }
  }
  return { groups, ignored };
}
