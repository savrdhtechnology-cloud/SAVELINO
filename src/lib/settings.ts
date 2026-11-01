import { BODY_FONTS, HEADING_FONTS, type BodyFont, type HeadingFont } from "./fonts";

/**
 * Website + business settings edited from CRM → Website and CRM → Settings.
 * Stored as one JSON row in `public.settings` (id = 1). Anything missing
 * falls back to these defaults, so the site always renders.
 */

export const SECTION_IDS = [
  "shop",
  "designer-blouses",
  "showcase",
  "signature",
  "ready-made",
  "custom-stitching",
  "heritage",
  "craftsmanship",
  "lookbook",
  "collections",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_LABELS: Record<SectionId, string> = {
  shop: "Shop the collection (new arrivals)",
  "designer-blouses": "Designer blouses story",
  showcase: "3D product showcase",
  signature: "Signature gallery",
  "ready-made": "Ready-made blouses",
  "custom-stitching": "Custom stitching",
  heritage: "Heritage story",
  craftsmanship: "Craftsmanship",
  lookbook: "Editorial lookbook",
  collections: "Collections",
};

/** dark = Royal Noir · light = Ivory Atelier · porcelain = clean white workspace. */
export type ThemeMode = "dark" | "light" | "porcelain";
export const THEME_MODES: ThemeMode[] = ["dark", "light", "porcelain"];
export const THEME_LABELS: Record<ThemeMode, string> = {
  dark: "Royal Noir",
  light: "Ivory Atelier",
  porcelain: "Porcelain",
};
export const isThemeMode = (v: unknown): v is ThemeMode => v === "dark" || v === "light" || v === "porcelain";

/** noir = background, ivory = text, gold = accent, burgundy = accent wash. */
export type Palette = { gold: string; noir: string; ivory: string; burgundy: string };

export const DARK_PALETTE: Palette = { gold: "#D4AF37", noir: "#0B0B0B", ivory: "#F8F5EB", burgundy: "#6B0F1A" };
export const LIGHT_PALETTE: Palette = { gold: "#8E6C1E", noir: "#F7F2E7", ivory: "#17120F", burgundy: "#EAD7D0" };
export const PORCELAIN_PALETTE: Palette = { gold: "#8A6A1F", noir: "#F3F2EF", ivory: "#111111", burgundy: "#F3E6E2" };
export const DEFAULT_PALETTES: Record<ThemeMode, Palette> = { dark: DARK_PALETTE, light: LIGHT_PALETTE, porcelain: PORCELAIN_PALETTE };

/** Ambient background motion drawn over the page (pointer-events: none). */
export const BG_EFFECTS = ["none", "aurora", "silk", "dust", "spotlight", "grain"] as const;
export type BgEffect = (typeof BG_EFFECTS)[number];
export const BG_EFFECT_LABELS: Record<BgEffect, { label: string; note: string }> = {
  none: { label: "Still", note: "No background motion" },
  aurora: { label: "Aurora", note: "Slow gold & burgundy glow drifting" },
  silk: { label: "Silk sheen", note: "A light sweep, like satin catching light" },
  dust: { label: "Gold dust", note: "Fine gold particles floating upward" },
  spotlight: { label: "Spotlight", note: "A soft light that follows the mouse" },
  grain: { label: "Film grain", note: "Subtle moving texture, editorial feel" },
};

/** Mouse effects (desktop / trackpad only; touch screens keep the normal behaviour). */
export const CURSOR_EFFECTS = ["default", "ring", "glow", "sparkle", "halo"] as const;
export type CursorEffect = (typeof CURSOR_EFFECTS)[number];
export const CURSOR_EFFECT_LABELS: Record<CursorEffect, { label: string; note: string }> = {
  default: { label: "Normal", note: "Standard pointer" },
  ring: { label: "Gold ring", note: "A ring that trails the pointer and grows on links" },
  glow: { label: "Soft glow", note: "A warm glow that follows the pointer" },
  sparkle: { label: "Sparkle trail", note: "Tiny gold sparkles behind the pointer" },
  halo: { label: "Halo dot", note: "A small dot with a fading halo on click" },
};

export const EFFECT_INTENSITIES = ["subtle", "medium", "bold"] as const;
export type EffectIntensity = (typeof EFFECT_INTENSITIES)[number];

/** CRM looks: "luxe" = maroon silk & gold (signature), "royal" = black & gold, "ivory" = light ivory & gold. */
export const CRM_THEMES = ["luxe", "royal", "ivory"] as const;
export type CrmTheme = (typeof CRM_THEMES)[number];
export const CRM_THEME_LABELS: Record<CrmTheme, string> = { luxe: "SAVLINO Luxe", royal: "Royal Dark", ivory: "Ivory Gold" };

export const CATEGORY_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type SiteSettings = {
  brand: {
    name: string;
    tagline: string;
    contactEmail: string;
    phone: string;
    whatsapp: string;
    address: string;
    instagram: string;
    facebook: string;
    youtube: string;
  };
  commerce: {
    currency: "INR";
    shippingFee: number;
    freeShippingAbove: number;
    taxPercent: number;
    orderPrefix: string;
    codEnabled: boolean;
    returnWindowDays: number;
    /** UPI ID customers pay to (shown with a QR code at checkout). */
    upiId: string;
    upiName: string;
  };
  theme: {
    /** House default for every visitor. */
    mode: ThemeMode;
    /** Show a light/dark switch in the website header. */
    allowToggle: boolean;
    displayFont: HeadingFont;
    bodyFont: BodyFont;
    dark: Palette;
    light: Palette;
    porcelain: Palette;
  };
  /** CRM appearance (CRM → Website → Appearance). */
  crm: {
    theme: CrmTheme;
    headingFont: HeadingFont;
    bodyFont: BodyFont;
    background: BgEffect;
    cursor: CursorEffect;
  };
  /** Website background motion and mouse effects (Studio → Motion). */
  effects: {
    background: BgEffect;
    intensity: EffectIntensity;
    cursor: CursorEffect;
    /** Also show background motion on phones. */
    mobile: boolean;
  };
  seo: { title: string; description: string };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
  };
  announcement: { enabled: boolean; text: string; href: string };
  sections: { id: SectionId; visible: boolean }[];
};

export const DEFAULT_SETTINGS: SiteSettings = {
  brand: {
    name: "SAVLINO",
    tagline: "A Legacy of Elegance",
    contactEmail: "",
    phone: "",
    whatsapp: "",
    address: "",
    instagram: "",
    facebook: "",
    youtube: "",
  },
  commerce: {
    currency: "INR",
    shippingFee: 0,
    freeShippingAbove: 0,
    taxPercent: 0,
    orderPrefix: "SV",
    codEnabled: true,
    returnWindowDays: 7,
    upiId: "",
    upiName: "SAVLINO",
  },
  theme: {
    mode: "dark",
    allowToggle: false,
    displayFont: "bodoni",
    bodyFont: "manrope",
    dark: { ...DARK_PALETTE },
    light: { ...LIGHT_PALETTE },
    porcelain: { ...PORCELAIN_PALETTE },
  },
  crm: { theme: "luxe", headingFont: "cinzel", bodyFont: "manrope", background: "none", cursor: "default" },
  effects: { background: "none", intensity: "subtle", cursor: "default", mobile: false },
  seo: {
    title: "SAVLINO — Designer Blouses | A Legacy of Elegance",
    description: "Designer blouses and sarees, finished by hand. Choose your colour and size — delivered across India.",
  },

  hero: {
    eyebrow: "Timeless women’s luxury",
    title: "A Legacy of Elegance",
    subtitle: "Designer blouses, heirloom sarees and intimate essentials — tradition in style, always.",
    primaryLabel: "Shop now",
    primaryHref: "/shop",
    secondaryLabel: "Custom stitching",
    secondaryHref: "/custom-stitching",
  },
  announcement: { enabled: false, text: "", href: "" },
  sections: SECTION_IDS.map((id) => ({ id, visible: true })),
};

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Copies values from `src` onto `base` only where the key exists and the type matches (recursively). */
function mergeInto(base: Record<string, unknown>, src: unknown) {
  if (!isObj(src)) return;
  for (const [k, v] of Object.entries(src)) {
    if (!(k in base)) continue;
    const cur = base[k];
    if (isObj(cur)) mergeInto(cur, v);
    else if (!Array.isArray(cur) && typeof v === typeof cur) base[k] = v;
  }
}

/** Deep-merges stored settings over defaults, ignoring unknown or mistyped keys. */
export function mergeSettings(stored: unknown): SiteSettings {
  const out = structuredClone(DEFAULT_SETTINGS);
  if (!isObj(stored)) return out;
  const src = structuredClone(stored) as Record<string, unknown>;
  // Older saves kept one flat palette under theme — treat it as the dark palette.
  if (isObj(src.theme) && typeof src.theme.gold === "string" && !isObj(src.theme.dark)) {
    const t = src.theme;
    src.theme = { ...t, dark: { gold: t.gold, noir: t.noir, ivory: t.ivory, burgundy: t.burgundy } };
  }
  for (const group of ["brand", "commerce", "theme", "hero", "announcement", "crm", "effects", "seo"] as const) {
    mergeInto(out[group] as unknown as Record<string, unknown>, src[group]);
  }
  if (!isThemeMode(out.theme.mode)) out.theme.mode = "dark";
  if (!CRM_THEMES.includes(out.crm.theme)) out.crm.theme = "luxe";
  if (!(out.theme.displayFont in HEADING_FONTS)) out.theme.displayFont = "bodoni";
  if (!(out.theme.bodyFont in BODY_FONTS)) out.theme.bodyFont = "manrope";
  if (!(out.crm.headingFont in HEADING_FONTS)) out.crm.headingFont = "cinzel";
  if (!(out.crm.bodyFont in BODY_FONTS)) out.crm.bodyFont = "manrope";
  if (!BG_EFFECTS.includes(out.crm.background)) out.crm.background = "none";
  if (!CURSOR_EFFECTS.includes(out.crm.cursor)) out.crm.cursor = "default";
  if (!BG_EFFECTS.includes(out.effects.background)) out.effects.background = "none";
  if (!CURSOR_EFFECTS.includes(out.effects.cursor)) out.effects.cursor = "default";
  if (!EFFECT_INTENSITIES.includes(out.effects.intensity)) out.effects.intensity = "subtle";
  if (Array.isArray(src.sections)) {
    const seen = new Set<string>();
    const list: { id: SectionId; visible: boolean }[] = [];
    for (const s of src.sections) {
      if (isObj(s) && SECTION_IDS.includes(s.id as SectionId) && !seen.has(String(s.id))) {
        seen.add(String(s.id));
        list.push({ id: s.id as SectionId, visible: s.visible !== false });
      }
    }
    for (const id of SECTION_IDS) if (!seen.has(id)) list.push({ id, visible: true });
    out.sections = list;
  }
  return out;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function paletteVars(p: Palette) {
  const vars: string[] = [];
  if (HEX.test(p.gold)) {
    vars.push(`--color-gold:${p.gold}`);
    vars.push(`--color-gold-light:color-mix(in srgb,${p.gold} 72%,white)`);
    vars.push(`--color-gold-deep:color-mix(in srgb,${p.gold} 72%,black)`);
  }
  if (HEX.test(p.noir)) {
    vars.push(`--color-noir:${p.noir}`);
    if (HEX.test(p.ivory)) vars.push(`--color-noir-soft:color-mix(in srgb,${p.noir} 93%,${p.ivory})`);
  }
  if (HEX.test(p.ivory)) vars.push(`--color-ivory:${p.ivory}`);
  if (HEX.test(p.burgundy)) {
    vars.push(`--color-burgundy:${p.burgundy}`);
    if (HEX.test(p.noir)) vars.push(`--color-burgundy-deep:color-mix(in srgb,${p.burgundy} 55%,${p.noir})`);
  }
  return vars.join(";");
}

/**
 * Website-only CSS: the Studio palettes for each mode, scoped to <html>, so the
 * CRM (which sets its own data-theme on its shell) keeps the house templates.
 */
export function themeCss(theme: SiteSettings["theme"]) {
  const rules = THEME_MODES.map((m) => `html[data-theme="${m}"]{${paletteVars(theme[m])}}`);
  const fonts: string[] = [];
  if (theme.displayFont !== "bodoni") fonts.push(`--font-display:${HEADING_FONTS[theme.displayFont].css}`);
  if (theme.bodyFont !== "manrope") fonts.push(`--font-sans:${BODY_FONTS[theme.bodyFont].css}`);
  if (fonts.length) rules.push(`html{${fonts.join(";")}}`);
  return rules.join("");
}
