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

/**
 * Full website look — the structural "theme" for the whole storefront (header, homepage composition, card
 * styling), as opposed to the Hero preset above (which only changes the hero section). New looks are added
 * here and to SITE_THEME_LABELS; the website and the CRM thumbnail grid pick them up automatically.
 */
export const SITE_THEMES = ["signature", "pearl", "cinema"] as const;
export type SiteThemeId = (typeof SITE_THEMES)[number];
export const SITE_THEME_LABELS: Record<SiteThemeId, { label: string; note: string }> = {
  signature: { label: "SAVLINO Signature", note: "The current maroon-and-gold luxury look — angular gold buttons, no stats strip" },
  pearl: { label: "Pearl Celebration", note: "Rounded pill buttons, a warm festive offer bar and a trust stats strip under the hero" },
  cinema: { label: "Royal Cinema", note: "Cinematic maroon-and-gold: split editorial hero, 3D category and product carousels, stitching journey" },
};

/** "still" = no animation. "reveal" = fade/rise text + sections on scroll. "cinematic" = reveal + card hover lift/tilt/glow. */
export const MOTION_STYLES = ["still", "reveal", "cinematic"] as const;
export type MotionStyle = (typeof MOTION_STYLES)[number];
export const MOTION_STYLE_LABELS: Record<MotionStyle, string> = {
  still: "Still — no animation",
  reveal: "Reveal — text & sections fade in on scroll",
  cinematic: "Cinematic — reveal + card hover lift, tilt & glow",
};

/** CRM looks: "luxe" = maroon silk & gold (signature), "royal" = black & gold, "ivory" = light ivory & gold. */
export const CRM_THEMES = ["luxe", "royal", "ivory"] as const;
export type CrmTheme = (typeof CRM_THEMES)[number];
export const CRM_THEME_LABELS: Record<CrmTheme, string> = { luxe: "SAVLINO Luxe", royal: "Royal Dark", ivory: "Ivory Gold" };

export const CATEGORY_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const HERO_PRESETS = ["classic-3d", "royal-cinema", "rose-silk", "purple-aura", "midnight-gold", "ivory-editorial", "emerald-court", "champagne-atelier"] as const;
export type HeroPreset = (typeof HERO_PRESETS)[number];
export const HERO_PRESET_LABELS: Record<HeroPreset,string> = {
  "classic-3d":"Classic 3D Monogram", "royal-cinema":"Royal Cinema", "rose-silk":"Rose Silk",
  "purple-aura":"Purple Aura", "midnight-gold":"Midnight Gold", "ivory-editorial":"Ivory Editorial",
  "emerald-court":"Emerald Court", "champagne-atelier":"Champagne Atelier"
};
export const HERO_PRESET_PALETTES: Record<HeroPreset,{background:string;accent:string;shade:string}> = {
  "classic-3d":{background:"#0B0B0B",accent:"#D4AF37",shade:"#6B0F1A"},
  "royal-cinema":{background:"#1D080D",accent:"#E0B65E",shade:"#680C23"},
  "rose-silk":{background:"#330F1D",accent:"#F0B4AC",shade:"#9C345D"},
  "purple-aura":{background:"#1C092A",accent:"#E8A8F1",shade:"#782CB0"},
  "midnight-gold":{background:"#070B12",accent:"#E3C67A",shade:"#2C3853"},
  "ivory-editorial":{background:"#EDE1D1",accent:"#9B7133",shade:"#C4A58F"},
  "emerald-court":{background:"#061D18",accent:"#C5B46E",shade:"#106F58"},
  "champagne-atelier":{background:"#473125",accent:"#F1D6A8",shade:"#986E54"}
};
/** Royal Cinema hero slider: each slide is its own photograph, copy and colour mood. */
export const CINEMA_STYLES = ["palace", "noir", "festive", "ivory"] as const;
export type CinemaStyle = (typeof CINEMA_STYLES)[number];
export const CINEMA_STYLE_LABELS: Record<CinemaStyle, string> = {
  palace: "Palace Royal — maroon & candlelight",
  noir: "Noir Gold — black & spotlight",
  festive: "Festive — red & marigold",
  ivory: "Ivory Atelier — champagne & soft light",
};
export type CinemaSlide = {
  /** Uploaded photo URL. Empty = the built-in placeholder photo for this position. */
  image: string;
  style: CinemaStyle;
  eyebrow: string;
  title: string;
  subtitle: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
};
export const MAX_CINEMA_SLIDES = 6;
export const DEFAULT_CINEMA_SLIDES: CinemaSlide[] = [
  { image: "", style: "palace", eyebrow: "The SAVLINO Edit", title: "Peacock Blue Gold Tassel Blouse", subtitle: "Peacock-blue elegance with signature golden tassel detailing and graceful craftsmanship.", primaryLabel: "Shop This Blouse", primaryHref: "/shop", secondaryLabel: "Custom Stitching", secondaryHref: "/custom-stitching" },
  { image: "", style: "noir", eyebrow: "Royal Evening Edit", title: "Crafted for Royal Moments", subtitle: "Intricate embroidery, timeless elegance and refined detailing.", primaryLabel: "Explore Blouses", primaryHref: "/shop", secondaryLabel: "View Collections", secondaryHref: "/collections" },
  { image: "", style: "festive", eyebrow: "The Emerald Edit", title: "Elegance in Every Detail", subtitle: "Rich velvet textures with exquisite golden craftsmanship.", primaryLabel: "Explore Collection", primaryHref: "/shop", secondaryLabel: "Custom Stitching", secondaryHref: "/custom-stitching" },
  { image: "", style: "ivory", eyebrow: "Festive Colour Edit", title: "Celebrate in Colour", subtitle: "Vibrant designer blouses created for unforgettable celebrations.", primaryLabel: "Shop Festive", primaryHref: "/shop", secondaryLabel: "View Collections", secondaryHref: "/collections" },
];

export type SiteSettings = {
  /** The whole-website look (Appearance Studio → Website themes). More looks are added over time. */
  layout: { theme: SiteThemeId };
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
    /** Scroll-reveal text animation + card hover effects across the website. */
    motion: MotionStyle;
  };
  seo: { title: string; description: string };
  hero: {
    preset: HeroPreset;
    height: number;
    spotlight: number;
    eyebrow: string;
    title: string;
    subtitle: string;
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
    secondaryHref: string;
    /** Royal Cinema theme only: the hero photo slider. */
    slides: CinemaSlide[];
  };
  /** Optional replacement images for the six Signature Gallery cards, ordered as displayed. */
  signatureImages: string[];
  announcement: { enabled: boolean; text: string; href: string };
  sections: { id: SectionId; visible: boolean }[];
};

export const DEFAULT_SETTINGS: SiteSettings = {
  layout: { theme: "signature" },
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
  effects: { background: "none", intensity: "subtle", cursor: "default", mobile: false, motion: "cinematic" },
  seo: {
    title: "SAVLINO — Designer Blouses | A Legacy of Elegance",
    description: "Designer blouses and sarees, finished by hand. Choose your colour and size — delivered across India.",
  },

  hero: {
    preset: "classic-3d",
    height: 100,
    spotlight: 70,
    eyebrow: "Timeless women’s luxury",
    title: "A Legacy of Elegance",
    subtitle: "Designer blouses, heirloom sarees and intimate essentials — tradition in style, always.",
    primaryLabel: "Shop now",
    primaryHref: "/shop",
    secondaryLabel: "Custom stitching",
    secondaryHref: "/custom-stitching",
    slides: DEFAULT_CINEMA_SLIDES,
  },
  signatureImages: ["", "", "", "", "", ""],
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
  for (const group of ["layout", "brand", "commerce", "theme", "hero", "announcement", "crm", "effects", "seo"] as const) {
    mergeInto(out[group] as unknown as Record<string, unknown>, src[group]);
  }
  if (!HERO_PRESETS.includes(out.hero.preset)) out.hero.preset = "classic-3d";
  out.hero.height = Math.max(65, Math.min(110, out.hero.height));
  out.hero.spotlight = Math.max(0, Math.min(100, out.hero.spotlight));
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
  if (!MOTION_STYLES.includes(out.effects.motion)) out.effects.motion = "cinematic";
  if (!SITE_THEMES.includes(out.layout.theme)) out.layout.theme = "signature";
  const storedSignatureImages = src.signatureImages;
  if (Array.isArray(storedSignatureImages)) {
    out.signatureImages = Array.from({ length: 6 }, (_, i) => {
      const url: unknown = storedSignatureImages[i];
      return typeof url === "string" && /^https:\/\//.test(url) ? url : "";
    });
  }
  const rawSlides = isObj(src.hero) && Array.isArray(src.hero.slides) ? src.hero.slides : null;
  if (rawSlides) {
    const str = (v: unknown, d: string) => (typeof v === "string" ? v : d);
    const list = rawSlides.filter(isObj).slice(0, MAX_CINEMA_SLIDES).map((r, i) => {
      const d = DEFAULT_CINEMA_SLIDES[i % DEFAULT_CINEMA_SLIDES.length];
      const image = str(r.image, "");
      return {
        image: /^https:\/\//.test(image) ? image : "",
        style: CINEMA_STYLES.includes(r.style as CinemaStyle) ? (r.style as CinemaStyle) : d.style,
        eyebrow: str(r.eyebrow, d.eyebrow),
        title: str(r.title, d.title),
        subtitle: str(r.subtitle, d.subtitle),
        primaryLabel: str(r.primaryLabel, d.primaryLabel),
        primaryHref: str(r.primaryHref, d.primaryHref),
        secondaryLabel: str(r.secondaryLabel, d.secondaryLabel),
        secondaryHref: str(r.secondaryHref, d.secondaryHref),
      };
    });
    // Upgrade untouched legacy marketing copy without changing uploaded photos or custom admin wording.
    const legacyTitles = [
      "Designer Blouse Collection",
      "Midnight Gold Blouses",
      "Celebrate Every Tradition",
      "Soft Pearl Collection",
    ];
    const legacyCopy = [
      { subtitle: "Timeless elegance. Perfect fit. Premium craftsmanship.", primaryLabel: "Shop Collection" },
      { subtitle: "Black silk and gold embroidery, made for evenings that are remembered.", primaryLabel: "Shop Collection" },
      { subtitle: "Mirror work, tassels and zari in colours made for your festive wardrobe.", primaryLabel: "Shop Festive" },
      { subtitle: "Pearl-scallop sleeves and champagne silks, finished by hand.", primaryLabel: "Shop Collection" },
    ];
    for (let i = 0; i < Math.min(4, list.length); i++) {
      const d = DEFAULT_CINEMA_SLIDES[i];
      if (list[i].title === legacyTitles[i]) {
        list[i] = { ...list[i], eyebrow: d.eyebrow, title: d.title,
          subtitle: list[i].subtitle === legacyCopy[i].subtitle ? d.subtitle : list[i].subtitle,
          primaryLabel: list[i].primaryLabel === legacyCopy[i].primaryLabel ? d.primaryLabel : list[i].primaryLabel,
          primaryHref: d.primaryHref };
      }
    }
    if (list.length) out.hero.slides = list;
  }
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
