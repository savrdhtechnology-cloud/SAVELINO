/**
 * SAVLINO creative generator — draws branded product images in the browser from raw photos.
 *
 *  • Combined creative (1800×1200): logo, feature icons, a large hero shot, framed side angles,
 *    a strip of close-ups, the script title on a wine band and a cream bar with colours, sizes
 *    and Shop Now — the layout of the SAVLINO reference creatives.
 *  • Single creatives (1080×1350) for every photo, in the same background and style:
 *    "classic" (icons column + framed photo + wine title band) or "elegant" (gold border,
 *    title, tagline and an icon row beside the photo).
 *
 * Everything is drawn on <canvas>; nothing leaves the browser until the admin publishes.
 */
import type { Color, CreativeSettings, Framing } from "@/lib/data/types";

export const DEFAULT_FRAMING: Framing = { top: 0, zoom: 1, x: 0.5, y: 0 };

export type Source = { key: string; bitmap: ImageBitmap; framing: Framing; face: number | null | undefined };
export type RenderInput = { sources: Source[]; settings: CreativeSettings; colors: Color[]; sizes: string[] };
export type Rendered = { id: string; label: string; canvas: HTMLCanvasElement };

const C = {
  gold: "#D8B25A",
  goldLight: "#F4DC97",
  goldDeep: "#9C7430",
  ivory: "#FFF6E8",
  cream: "#F6EAD6",
  ink: "#2A1D17",
  wine: "#6B0F1A",
  wineDeep: "#3E0910",
};

export const FONTS = {
  brand: '"Cinzel", "Times New Roman", serif',
  script: '"Playfair Display", "Times New Roman", serif',
  sans: '"Montserrat", "Helvetica Neue", Arial, sans-serif',
};
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Montserrat:wght@400;500;600&family=Playfair+Display:ital,wght@1,500;1,600&display=swap";

let fontsReady: Promise<void> | null = null;
/** Loads the creative fonts once (canvas only uses fonts that are already loaded). */
export function loadCreativeFonts() {
  if (!fontsReady) {
    fontsReady = (async () => {
      if (!document.querySelector(`link[data-creative-fonts]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = FONT_HREF;
        link.dataset.creativeFonts = "1";
        document.head.appendChild(link);
      }
      await Promise.allSettled([
        document.fonts.load(`600 40px "Cinzel"`, "SAVLINO"),
        document.fonts.load(`italic 600 40px "Playfair Display"`, "Designer Blouse"),
        document.fonts.load(`500 20px "Montserrat"`, "Premium Fabric"),
        document.fonts.load(`600 20px "Montserrat"`, "Shop Now"),
      ]);
    })();
  }
  return fontsReady;
}

// ───────────────────────── Content presets ─────────────────────────

type IconName = "diamond" | "cotton" | "needle" | "form" | "mirror" | "pearl" | "sparkle" | "tassel" | "leaf" | "scissors";

export const FEATURE_PRESETS: { label: string; icon: IconName }[] = [
  { label: "Premium Fabric", icon: "diamond" },
  { label: "Smooth Texture", icon: "cotton" },
  { label: "Fine Stitching", icon: "needle" },
  { label: "Perfect Fit", icon: "form" },
  { label: "Mirror Work", icon: "mirror" },
  { label: "Finely Stitched", icon: "needle" },
  { label: "Pearl Work", icon: "pearl" },
  { label: "Tassel Detail", icon: "tassel" },
  { label: "Handcrafted", icon: "sparkle" },
  { label: "Soft Lining", icon: "leaf" },
  { label: "Custom Tailoring", icon: "scissors" },
  { label: "Elegant Back", icon: "sparkle" },
];

const ICON_RULES: [RegExp, IconName][] = [
  [/fabric|silk|premium|material/i, "diamond"],
  [/smooth|texture|cotton|comfort/i, "cotton"],
  [/stitch|craft/i, "needle"],
  [/fit|size/i, "form"],
  [/mirror/i, "mirror"],
  [/pearl|bead/i, "pearl"],
  [/tassel|latkan/i, "tassel"],
  [/soft|lining|breath/i, "leaf"],
  [/tailor|custom|alter/i, "scissors"],
];
export const iconFor = (label: string): IconName => FEATURE_PRESETS.find((f) => f.label === label)?.icon ?? ICON_RULES.find(([r]) => r.test(label))?.[1] ?? "sparkle";

/** 24×24 line icons (stroked), drawn with Path2D. */
export const ICON_PATHS: Record<IconName, string> = {
  diamond: "M6.5 4h11l3.5 5-9 11L3 9l3.5-5Z M3 9h18 M12 20 8.5 9l2-5 M12 20l3.5-11-2-5",
  cotton:
    "M12 21v-6.5 M12 14.5c-2.6 0-4.6-1.7-4.6-3.8 0-1.5 1-2.7 2.5-3.1.3-1.7 1.4-2.6 2.1-2.6s1.8.9 2.1 2.6c1.5.4 2.5 1.6 2.5 3.1 0 2.1-2 3.8-4.6 3.8Z M7.6 10.6C5.6 10.5 4 11.9 4 13.8c0 2 1.8 3.2 3.8 2.6 M16.4 10.6c2-.1 3.6 1.3 3.6 3.2 0 2-1.8 3.2-3.8 2.6",
  needle: "M4.5 19.5 17 7 M15.4 5.2l3.4 3.4-1.6 1.6-3.4-3.4Z M17.6 6.4l-.9.9 M4.5 19.5c-1.2 1.4.2 2.6 1.5 1.3 M7.5 16.5c2.8 1.3 5.4-.6 4.6-2.6-.8-2-4.2-1-3.3 1.8 1 3 6.2 3.4 8.7.3",
  form: "M9 3h6 M12 3v1.6 M8.4 4.6h7.2c0 2.6-1.3 3.9-1.3 5.6 0 1.9 1.8 2.8 1.8 5.6H7.9c0-2.8 1.8-3.7 1.8-5.6 0-1.7-1.3-3-1.3-5.6Z M12 15.8V20 M8.8 21h6.4",
  mirror:
    "M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z M12 10.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Z M12 3v2.2 M12 18.8V21 M3 12h2.2 M18.8 12H21 M5.6 5.6l1.5 1.5 M16.9 16.9l1.5 1.5 M5.6 18.4l1.5-1.5 M16.9 7.1l1.5-1.5",
  pearl:
    "M4 14a2.3 2.3 0 1 0 4.6 0 2.3 2.3 0 1 0-4.6 0Z M9.7 11a2.3 2.3 0 1 0 4.6 0 2.3 2.3 0 1 0-4.6 0Z M15.4 14a2.3 2.3 0 1 0 4.6 0 2.3 2.3 0 1 0-4.6 0Z M3 7c3 3 15 3 18 0",
  sparkle: "M12 3l2.1 5.6L19.8 11l-5.7 2.2L12 19l-2.1-5.8L4.2 11l5.7-2.4Z M18.5 3.5v3 M17 5h3",
  tassel: "M12 2.5v5 M9 7.5h6l-1 3.2h-4Z M10.3 10.7 8.6 20.5 M12 10.7v10.3 M13.7 10.7l1.7 9.8 M8 21h8",
  leaf: "M5 19.5c0-8.3 5.3-13.6 14.5-14.5-.9 9.2-6.2 14.5-14.5 14.5Z M5 19.5l8.5-8.5",
  scissors: "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M8.4 7.6 20 18.5 M8.4 16.4 20 5.5",
};

/** Content each category starts with — every field can be changed before publishing. */
export function defaultSettings(categorySlug = "designer-blouses", categoryName = "Designer Blouses"): CreativeSettings {
  const presets: Record<string, Pick<CreativeSettings, "brandLine" | "titleTop" | "titleBottom" | "tagline" | "features">> = {
    "designer-blouses": {
      brandLine: "Designer Blouse Collection",
      titleTop: "Designer",
      titleBottom: "Blouse",
      tagline: "Modern Design with Elegant Back Style",
      features: ["Premium Fabric", "Smooth Texture", "Fine Stitching", "Perfect Fit"],
    },
    "ready-made-blouses": {
      brandLine: "Premium Blouse Collection",
      titleTop: "Ready-Made",
      titleBottom: "Blouse",
      tagline: "Ready to Wear, Made to Shine",
      features: ["Premium Fabric", "Finely Stitched", "Perfect Fit"],
    },
    sarees: {
      brandLine: "Saree Collection",
      titleTop: "Designer",
      titleBottom: "Saree",
      tagline: "Timeless Drape, Modern Grace",
      features: ["Premium Fabric", "Handcrafted", "Smooth Texture"],
    },
  };
  const words = categoryName.trim().split(/\s+/);
  const last = words[words.length - 1] ?? "Collection";
  const singular = /ies$/i.test(last) ? `${last.slice(0, -3)}y` : /(ss|us)$/i.test(last) ? last : last.replace(/s$/i, "");
  const fallback = {
    brandLine: `${categoryName} Collection`,
    titleTop: words.slice(0, -1).join(" ") || "Designer",
    titleBottom: singular,
    tagline: "Crafted for Every Celebration",
    features: ["Premium Fabric", "Fine Stitching", "Perfect Fit"],
  };
  return {
    ...(presets[categorySlug] ?? fallback),
    showColors: true,
    showSizes: true,
    showShopNow: true,
    hideFaces: true,
    singleStyle: "classic",
    combo: true,
    singles: true,
    skip: [],
    showRaw: false,
    backgroundAuto: true,
    backgroundColor: "#A66F7C",
    backgroundOpacity: 0.36,
    backgroundSize: 1,
    framing: {},
  };
}

export function mergeSettings(saved: Partial<CreativeSettings> | null | undefined, base: CreativeSettings): CreativeSettings {
  if (!saved || typeof saved !== "object" || !Object.keys(saved).length) return base;
  return { ...base, ...saved, features: Array.isArray(saved.features) ? saved.features : base.features, skip: saved.skip ?? [], framing: saved.framing ?? {} };
}

// ───────────────────────── Drawing helpers ─────────────────────────

type Ctx = CanvasRenderingContext2D;

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/** Text with manual letter spacing (canvas letterSpacing is not in every browser). */
function spaced(ctx: Ctx, text: string, x: number, y: number, spacing: number, align: "left" | "center" | "right" = "left") {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * Math.max(0, chars.length - 1);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prev;
  return total;
}

function wrap(ctx: Ctx, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/** Splits a feature label into at most two balanced lines. */
function labelLines(label: string): string[] {
  const w = label.trim().split(/\s+/);
  if (w.length < 2) return [label];
  const mid = Math.ceil(w.length / 2);
  return [w.slice(0, mid).join(" "), w.slice(mid).join(" ")];
}

/** Samples vivid garment colours rather than pale walls/skin where possible. */
function garmentTint(src: Source): string {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 40;
  const cx = cv.getContext("2d", { willReadFrequently: true });
  if (!cx) return "#A66F7C";
  cx.drawImage(src.bitmap, 0, 0, 40, 40);
  const pixels = cx.getImageData(0, 0, 40, 40).data;
  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < pixels.length; i += 4) {
    const [r,g,b] = [pixels[i],pixels[i+1],pixels[i+2]];
    const high = Math.max(r,g,b), low = Math.min(r,g,b);
    if (high < 55 || high - low < 48 || high > 245 && low > 210) continue;
    // Skip typical warm skin/wall tones unless there are no stronger garment colours.
    if (r > g * 1.17 && g > b * 1.12 && r - b < 150) continue;
    const hue = Math.atan2(Math.sqrt(3)*(g-b),2*r-g-b);
    const key = Math.round((hue+Math.PI)*12/(2*Math.PI));
    const hit = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    hit.n++; hit.r+=r; hit.g+=g; hit.b+=b;
    buckets.set(key,hit);
  }
  const winner = [...buckets.values()].sort((x,y)=>y.n-x.n)[0];
  if (!winner) return "#A66F7C";
  const hex = (v:number)=>Math.round(v/winner.n).toString(16).padStart(2,"0");
  return "#"+hex(winner.r)+hex(winner.g)+hex(winner.b);
}
function background(ctx: Ctx, W: number, H: number, seed = 1, settings?: CreativeSettings, source?: Source) {
  const g = ctx.createRadialGradient(W * 0.3, H * 0.34, 0, W * 0.3, H * 0.34, Math.max(W, H) * 0.95);
  g.addColorStop(0, "#b8917a");
  g.addColorStop(0.36, "#8d6852");
  g.addColorStop(0.74, "#4d3328");
  g.addColorStop(1, "#33221b");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const tint = settings?.backgroundAuto && source ? garmentTint(source) : (settings?.backgroundColor || "#A66F7C");
  const opacity = Math.max(0,Math.min(1,settings?.backgroundOpacity ?? 0.36));
  const spread = Math.max(0.4,Math.min(2.5,settings?.backgroundSize ?? 1));
  if (/^#[0-9a-f]{6}$/i.test(tint) && opacity > 0) {
    ctx.save();
    ctx.globalAlpha = opacity;
    const glow = ctx.createRadialGradient(W*0.38,H*0.34,0,W*0.38,H*0.34,Math.max(W,H)*0.64*spread);
    glow.addColorStop(0,tint);
    glow.addColorStop(1,"transparent");
    ctx.fillStyle=glow;
    ctx.fillRect(0,0,W,H);
    ctx.restore();
  }
  // soft warm bokeh
  const rand = mulberry(seed);
  for (let i = 0; i < 14; i++) {
    const x = rand() * W;
    const y = rand() * H * 0.8;
    const r = (0.02 + rand() * 0.05) * W;
    const b = ctx.createRadialGradient(x, y, 0, x, y, r);
    b.addColorStop(0, `rgba(255,222,170,${0.1 + rand() * 0.12})`);
    b.addColorStop(1, "rgba(255,222,170,0)");
    ctx.fillStyle = b;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // vignette
  const v = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(20,10,6,0.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

function mulberry(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Out-of-focus red flowers, like the corner of the reference creatives. */
function flowers(ctx: Ctx, items: { x: number; y: number; r: number; blur: number }[]) {
  for (const f of items) {
    ctx.save();
    ctx.filter = f.blur ? `blur(${f.blur}px)` : "none";
    ctx.translate(f.x, f.y);
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3);
      const g = ctx.createLinearGradient(0, 0, 0, -f.r);
      g.addColorStop(0, "#9e1b34");
      g.addColorStop(1, "#ef5a76");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -f.r * 0.52, f.r * 0.26, f.r * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#f2c14e";
    ctx.beginPath();
    ctx.arc(0, 0, f.r * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/** The SAVLINO lotus mark, centred on x, top at y, `w` wide. */
function lotus(ctx: Ctx, x: number, y: number, w: number) {
  const s = w / 100;
  ctx.save();
  ctx.translate(x - 50 * s, y);
  ctx.scale(s, s);
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const p = new Path2D(
    [
      "M50 4C59 17 59 37 50 52C41 37 41 17 50 4Z",
      "M50 52C39 45 31 32 33 15C43 22 49 35 50 52Z",
      "M50 52C61 45 69 32 67 15C57 22 51 35 50 52Z",
      "M50 52C33 53 19 43 12 29C28 28 42 38 50 52Z",
      "M50 52C67 53 81 43 88 29C72 28 58 38 50 52Z",
      "M24 57Q50 49 76 57",
    ].join(" "),
  );
  ctx.stroke(p);
  ctx.restore();
}

/** Lotus + SAVLINO® + collection line, centred on x. Returns the bottom y. */
function logo(ctx: Ctx, x: number, y: number, size: number, line: string) {
  lotus(ctx, x, y, size * 1.25);
  ctx.fillStyle = C.ivory;
  ctx.font = `500 ${size}px ${FONTS.brand}`;
  ctx.textBaseline = "alphabetic";
  const base = y + size * 0.85 + size * 0.95;
  const w = spaced(ctx, "SAVLINO", x, base, size * 0.06, "center");
  ctx.font = `500 ${size * 0.26}px ${FONTS.sans}`;
  ctx.fillText("®", x + w / 2 + size * 0.05, base - size * 0.62);
  ctx.font = `500 ${size * 0.235}px ${FONTS.sans}`;
  ctx.fillStyle = "rgba(255,246,232,0.92)";
  spaced(ctx, line.toUpperCase(), x, base + size * 0.55, size * 0.075, "center");
  return base + size * 0.62;
}

function featureIcon(ctx: Ctx, label: string, cx: number, cy: number, r: number, labelSize: number) {
  ctx.save();
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = Math.max(1.5, r * 0.06);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const s = (r * 1.05) / 24;
  ctx.translate(cx - 12 * s, cy - 12 * s);
  ctx.scale(s, s);
  ctx.lineWidth = 1.25;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(new Path2D(ICON_PATHS[iconFor(label)]));
  ctx.restore();
  ctx.fillStyle = C.ivory;
  ctx.font = `500 ${labelSize}px ${FONTS.sans}`;
  ctx.textAlign = "center";
  labelLines(label).forEach((l, i) => ctx.fillText(l, cx, cy + r + labelSize * 1.35 + i * labelSize * 1.15));
  ctx.textAlign = "left";
}

function goldGradient(ctx: Ctx, y0: number, y1: number) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, C.goldLight);
  g.addColorStop(0.55, C.gold);
  g.addColorStop(1, C.goldDeep);
  return g;
}

function title(ctx: Ctx, top: string, bottom: string, x: number, y: number, size0: number, indent: number, maxW: number) {
  ctx.save();
  // Shrink long titles so they never run into the photos or the info bar.
  ctx.font = `italic 500 ${size0 * 0.78}px ${FONTS.script}`;
  const w1 = ctx.measureText(top).width;
  ctx.font = `italic 500 ${size0}px ${FONTS.script}`;
  const w2 = ctx.measureText(bottom).width + indent;
  const size = size0 * Math.min(1, maxW / Math.max(1, w1, w2));
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.04;
  ctx.fillStyle = C.ivory;
  ctx.font = `italic 500 ${size * 0.78}px ${FONTS.script}`;
  ctx.fillText(top, x, y);
  ctx.font = `italic 500 ${size}px ${FONTS.script}`;
  ctx.fillStyle = goldGradient(ctx, y + size * 0.1, y + size * 1.05);
  ctx.fillText(bottom, x + indent, y + size * 0.98);
  ctx.restore();
}

/** Where to read the photo from so it covers a dw×dh frame, honouring framing and face crop. */
function sourceRect(bmp: ImageBitmap, dw: number, dh: number, f: Framing, faceTop: number) {
  const W = bmp.width;
  const H = bmp.height;
  const top = Math.min(0.75, Math.max(0, f.top, faceTop)) * H;
  const availH = H - top;
  const ar = dw / dh;
  let sw = W;
  let sh = W / ar;
  if (sh > availH) {
    sh = availH;
    sw = sh * ar;
  }
  const z = Math.max(1, f.zoom);
  sw /= z;
  sh /= z;
  const sx = (W - sw) * clamp01(f.x);
  const sy = top + (availH - sh) * clamp01(f.y);
  return [sx, sy, sw, sh] as const;
}
const clamp01 = (v: number) => Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0.5));

export const faceTopFor = (s: Source, hideFaces: boolean) => (hideFaces && typeof s.face === "number" ? s.face : 0);

function drawPhoto(ctx: Ctx, src: Source, hide: boolean, x: number, y: number, w: number, h: number, override?: Partial<Framing>) {
  const f = { ...src.framing, ...override };
  const [sx, sy, sw, sh] = sourceRect(src.bitmap, w, h, f, faceTopFor(src, hide));
  ctx.drawImage(src.bitmap, sx, sy, sw, sh, x, y, w, h);
}

/** Photo in a cream + gold rounded frame with a soft shadow. */
function framed(ctx: Ctx, src: Source, hide: boolean, x: number, y: number, w: number, h: number, r: number, override?: Partial<Framing>) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = r * 1.2;
  ctx.shadowOffsetY = r * 0.4;
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = C.cream;
  ctx.fill();
  ctx.restore();
  const b = Math.max(3, r * 0.2);
  ctx.save();
  roundRect(ctx, x + b, y + b, w - b * 2, h - b * 2, r - b * 0.6);
  ctx.clip();
  drawPhoto(ctx, src, hide, x + b, y + b, w - b * 2, h - b * 2, override);
  ctx.restore();
  ctx.save();
  roundRect(ctx, x - 1, y - 1, w + 2, h + 2, r + 1);
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = Math.max(1.5, r * 0.09);
  ctx.stroke();
  ctx.restore();
}

/** Photo whose edges melt into the background (the hero of the reference creatives). */
function feathered(ctx: Ctx, src: Source, hide: boolean, x: number, y: number, w: number, h: number, edges: { l?: number; r?: number; t?: number; b?: number }) {
  const off = document.createElement("canvas");
  off.width = Math.round(w);
  off.height = Math.round(h);
  const o = off.getContext("2d");
  if (!o) return;
  drawPhoto(o, src, hide, 0, 0, off.width, off.height);
  o.globalCompositeOperation = "destination-in";
  const gx = o.createLinearGradient(0, 0, off.width, 0);
  const l = (edges.l ?? 0) / off.width;
  const r = (edges.r ?? 0) / off.width;
  gx.addColorStop(0, l ? "rgba(0,0,0,0)" : "#000");
  gx.addColorStop(Math.min(0.49, l), "#000");
  gx.addColorStop(Math.max(0.51, 1 - r), "#000");
  gx.addColorStop(1, r ? "rgba(0,0,0,0)" : "#000");
  o.fillStyle = gx;
  o.fillRect(0, 0, off.width, off.height);
  const gy = o.createLinearGradient(0, 0, 0, off.height);
  const t = (edges.t ?? 0) / off.height;
  const bt = (edges.b ?? 0) / off.height;
  gy.addColorStop(0, t ? "rgba(0,0,0,0)" : "#000");
  gy.addColorStop(Math.min(0.49, t), "#000");
  gy.addColorStop(Math.max(0.51, 1 - bt), "#000");
  gy.addColorStop(1, bt ? "rgba(0,0,0,0)" : "#000");
  o.fillStyle = gy;
  o.fillRect(0, 0, off.width, off.height);
  ctx.drawImage(off, x, y, w, h);
}

function bagIcon(ctx: Ctx, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s / 24, s / 24);
  ctx.lineWidth = 1.9;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke(new Path2D("M6 7h12l1 14H5L6 7Zm3 0V5a3 3 0 0 1 6 0v2"));
  ctx.restore();
}

/** Cream bar with colours, sizes and Shop Now. Draws from x..x+w, vertically centred on cy. */
function infoBar(ctx: Ctx, s: CreativeSettings, colors: Color[], sizes: string[], x: number, cy: number, w: number, h: number) {
  const showC = s.showColors && colors.length > 0;
  const showS = s.showSizes && sizes.length > 0;
  if (!showC && !showS && !s.showShopNow) return;
  const y = cy - h / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = h * 0.4;
  ctx.shadowOffsetY = h * 0.12;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = C.cream;
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.strokeStyle = "rgba(216,178,90,0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const fs = h * 0.22;
  const dot = h * 0.27;
  let cx = x + h * 0.6;
  ctx.textBaseline = "middle";
  if (showC) {
    ctx.fillStyle = C.ink;
    ctx.font = `600 ${fs}px ${FONTS.sans}`;
    ctx.textAlign = "center";
    const lw = Math.max(ctx.measureText("Available").width, ctx.measureText("Colors").width);
    ctx.fillText("Available", cx + lw / 2, cy - fs * 0.62);
    ctx.fillText("Colors", cx + lw / 2, cy + fs * 0.62);
    cx += lw + h * 0.4;
    for (const c of colors.slice(0, 6)) {
      ctx.beginPath();
      ctx.arc(cx + dot, cy, dot, 0, Math.PI * 2);
      ctx.fillStyle = c.hex;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      cx += dot * 2 + dot * 0.75;
    }
    cx += h * 0.15;
  }
  if (showC && showS) {
    ctx.fillStyle = "rgba(42,29,23,0.25)";
    ctx.fillRect(cx, cy - h * 0.28, 2, h * 0.56);
    cx += h * 0.45;
  }
  if (showS) {
    ctx.fillStyle = C.ink;
    ctx.font = `600 ${fs * 1.05}px ${FONTS.sans}`;
    ctx.textAlign = "left";
    ctx.fillText("Sizes", cx, cy);
    cx += ctx.measureText("Sizes").width + h * 0.32;
    ctx.font = `600 ${fs * 0.92}px ${FONTS.sans}`;
    for (const sz of sizes.slice(0, 7)) {
      const tw = ctx.measureText(sz).width;
      const bw = Math.max(dot * 2, tw + dot * 0.9);
      roundRect(ctx, cx, cy - dot, bw, dot * 2, dot);
      ctx.strokeStyle = "rgba(42,29,23,0.45)";
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.textAlign = "center";
      ctx.fillText(sz, cx + bw / 2, cy + 1);
      cx += bw + dot * 0.5;
    }
  }
  if (s.showShopNow) {
    const bw = h * 2.35;
    const bh = h * 0.68;
    const bx = x + w - bw - h * 0.17;
    roundRect(ctx, bx, cy - bh / 2, bw, bh, bh / 2);
    const g = ctx.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2);
    g.addColorStop(0, "#7d1424");
    g.addColorStop(1, C.wineDeep);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = C.ivory;
    ctx.fillStyle = C.ivory;
    const is = bh * 0.42;
    ctx.font = `600 ${fs * 1.1}px ${FONTS.sans}`;
    const tw = ctx.measureText("Shop Now").width;
    const start = bx + (bw - (is + bh * 0.2 + tw)) / 2;
    bagIcon(ctx, start, cy - is / 2 - 1, is);
    ctx.textAlign = "left";
    ctx.fillText("Shop Now", start + is + bh * 0.2, cy + 1);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

/** Fills empty side/detail frames with close-ups of the photos we have. */
function slotSources(sources: Source[], count: number): { src: Source; override?: Partial<Framing> }[] {
  const rest = sources.slice(1);
  const out: { src: Source; override?: Partial<Framing> }[] = rest.slice(0, count).map((src) => ({ src }));
  const focus = [
    { x: 0.2, y: 0.25 },
    { x: 0.8, y: 0.3 },
    { x: 0.5, y: 0.75 },
    { x: 0.3, y: 0.55 },
    { x: 0.7, y: 0.65 },
  ];
  let k = 0;
  while (out.length < count && sources.length) {
    const src = sources[k % sources.length];
    out.push({ src, override: { zoom: Math.max(1.9, src.framing.zoom * 1.9), ...focus[k % focus.length] } });
    k++;
  }
  return out;
}

// ───────────────────────── Layouts ─────────────────────────

/** 3:2 combined creative (reference: 1536×1024, drawn at 1800×1200). */
export function renderCombo(input: RenderInput, scale = 1): HTMLCanvasElement {
  const { sources, settings: s, colors, sizes } = input;
  const W = 1536;
  const H = 1024;
  const k = (1800 / W) * scale;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * k);
  canvas.height = Math.round(H * k);
  const ctx = canvas.getContext("2d");
  if (!ctx || !sources.length) return canvas;
  ctx.scale(k, k);
  const hide = s.hideFaces;
  background(ctx, W, H, 7, input.settings, input.sources[0]);

  // Hero: large, edges melting into the background.
  feathered(ctx, sources[0], hide, 175, 0, 740, H, { l: 90, r: 70, t: 40 });

  // Side angles + detail strip.
  const slots = slotSources(sources, 5);
  const [a, b, ...details] = slots;
  if (a) framed(ctx, a.src, hide, 918, 10, 606, 345, 20, a.override);
  if (b) framed(ctx, b.src, hide, 918, 367, 606, 300, 20, b.override);
  const dw = (1524 - 828 - 2 * 12) / 3;
  details.forEach((d, i) => framed(ctx, d.src, hide, 828 + i * (dw + 12), 680, dw, 238, 18, d.override));

  // Logo + feature icons.
  logo(ctx, 192, 30, 52, s.brandLine);
  const feats = s.features.slice(0, 4);
  const step = feats.length > 3 ? 136 : 160;
  const top = 285 + (4 - feats.length) * 30;
  feats.forEach((f, i) => featureIcon(ctx, f, 92, top + i * step, 33, 15.5));

  // Flowers, wine band and the script title.
  flowers(ctx, [
    { x: 40, y: 840, r: 46, blur: 4 },
    { x: 108, y: 905, r: 30, blur: 2 },
    { x: 18, y: 965, r: 34, blur: 5 },
  ]);
  ctx.save();
  const band = new Path2D("M0 870C150 822 330 812 520 858L560 1024H0Z");
  const g = ctx.createLinearGradient(0, 830, 0, 1024);
  g.addColorStop(0, "#82172a");
  g.addColorStop(1, C.wineDeep);
  ctx.fillStyle = g;
  ctx.fill(band);
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 2.5;
  ctx.stroke(new Path2D("M0 870C150 822 330 812 520 858"));
  ctx.restore();
  title(ctx, s.titleTop, s.titleBottom, 70, 922, 82, 48, 330);

  infoBar(ctx, s, colors, sizes, 410, 975, 1114, 80);
  return canvas;
}

/** 4:5 single creative for one photo. */
export function renderSingle(input: RenderInput, index: number, scale = 1): HTMLCanvasElement {
  const { sources, settings: s, colors, sizes } = input;
  const style = s.singleStyle === "mix" ? (index % 2 === 0 ? "classic" : "elegant") : s.singleStyle;
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext("2d");
  const src = sources[index];
  if (!ctx || !src) return canvas;
  ctx.scale(scale, scale);
  const hide = s.hideFaces;
  background(ctx, W, H, 11 + index, input.settings, input.sources[index]);

  if (style === "classic") {
    logo(ctx, W / 2, 36, 66, s.brandLine);
    framed(ctx, src, hide, 268, 262, 772, 900, 30);
    const feats = s.features.slice(0, 4);
    const step = feats.length > 3 ? 196 : 230;
    feats.forEach((f, i) => featureIcon(ctx, f, 134, 360 + i * step, 48, 21));
    flowers(ctx, [
      { x: 60, y: 1140, r: 62, blur: 5 },
      { x: 150, y: 1215, r: 40, blur: 2 },
    ]);
    const band = new Path2D("M0 1150C300 1088 720 1090 1080 1162V1350H0Z");
    const g = ctx.createLinearGradient(0, 1100, 0, H);
    g.addColorStop(0, "#82172a");
    g.addColorStop(1, C.wineDeep);
    ctx.fillStyle = g;
    ctx.fill(band);
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 3;
    ctx.stroke(new Path2D("M0 1150C300 1088 720 1090 1080 1162"));
    title(ctx, s.titleTop, s.titleBottom, 64, 1232, 98, 70, 560);
    // colours + sizes on the right of the band
    ctx.textBaseline = "middle";
    let y = 1214;
    if (s.showColors && colors.length) {
      const list = colors.slice(0, 6);
      let x = 1020 - list.length * 46;
      for (const c of list) {
        ctx.beginPath();
        ctx.arc(x + 18, y, 18, 0, Math.PI * 2);
        ctx.fillStyle = c.hex;
        ctx.fill();
        ctx.strokeStyle = C.cream;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        x += 46;
      }
      y += 66;
    }
    if (s.showSizes && sizes.length) {
      ctx.font = `600 20px ${FONTS.sans}`;
      const list = sizes.slice(0, 6);
      const widths = list.map((z) => Math.max(44, ctx.measureText(z).width + 22));
      let x = 1020 - widths.reduce((a, b) => a + b + 8, -8);
      list.forEach((z, i) => {
        roundRect(ctx, x, y - 20, widths[i], 40, 20);
        ctx.strokeStyle = "rgba(246,234,214,0.75)";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = C.cream;
        ctx.textAlign = "center";
        ctx.fillText(z, x + widths[i] / 2, y + 1);
        x += widths[i] + 8;
      });
      ctx.textAlign = "left";
    }
    ctx.textBaseline = "alphabetic";
  } else {
    // Elegant: photo melts in from the right, content on the left, thin gold border.
    feathered(ctx, src, hide, 430, 0, 650, H, { l: 200 });
    flowers(ctx, [
      { x: 70, y: 470, r: 58, blur: 9 },
      { x: 170, y: 420, r: 34, blur: 7 },
    ]);
    logo(ctx, 262, 64, 62, s.brandLine);
    title(ctx, s.titleTop, s.titleBottom, 72, 640, 118, 52, 470);
    ctx.fillStyle = C.ivory;
    ctx.font = `400 31px ${FONTS.sans}`;
    wrap(ctx, s.tagline, 400)
      .slice(0, 3)
      .forEach((l, i) => ctx.fillText(l, 78, 860 + i * 42));
    ctx.fillStyle = C.gold;
    ctx.fillRect(78, 975, 100, 2.5);
    const feats = s.features.slice(0, 3);
    feats.forEach((f, i) => featureIcon(ctx, f, 128 + i * 140, 1080, 50, 23));
    if (s.showColors && colors.length) {
      colors.slice(0, 6).forEach((c, i) => {
        ctx.beginPath();
        ctx.arc(96 + i * 42, 1262, 15, 0, Math.PI * 2);
        ctx.fillStyle = c.hex;
        ctx.fill();
        ctx.strokeStyle = C.cream;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 26, W - 52, H - 52);
  }
  return canvas;
}

/** Every creative the current settings ask for, in website order (combined first). */
export function renderAll(input: RenderInput, scale = 1): Rendered[] {
  const out: Rendered[] = [];
  if (!input.sources.length) return out;
  if (input.settings.combo) out.push({ id: "combo", label: "Combined creative", canvas: renderCombo(input, scale) });
  if (input.settings.singles)
    input.sources.forEach((src, i) => out.push({ id: `single:${src.key}`, label: `Photo ${i + 1}`, canvas: renderSingle(input, i, scale) }));
  return out;
}

export async function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const encode = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  let blob = await encode("image/webp", 0.9);
  if (!blob || blob.type !== "image/webp") blob = await encode("image/jpeg", 0.9);
  if (!blob) throw new Error("Could not create the image");
  return blob;
}

/** Loads a photo (new upload or saved URL) as an upright bitmap for drawing. */
export async function loadBitmap(file: File | undefined, url: string): Promise<ImageBitmap> {
  const blob = file ?? (await (await fetch(url, { mode: "cors" })).blob());
  try {
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    return await createImageBitmap(blob);
  }
}
