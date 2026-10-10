/**
 * Website + business settings edited from CRM → Settings and CRM → Studio.
 * Stored as one JSON row in `public.site_settings` (id = 1). Anything missing
 * falls back to these defaults, so the site always renders.
 */

export const SECTION_IDS = [
  "designer-blouses",
  "showcase",
  "signature",
  "ready-made",
  "custom-stitching",
  "heritage",
  "craftsmanship",
  "lookbook",
  "collections",
  "partners",
  "account",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const SECTION_LABELS: Record<SectionId, string> = {
  "designer-blouses": "Designer blouses",
  showcase: "3D product showcase",
  signature: "Signature gallery",
  "ready-made": "Ready-made blouses",
  "custom-stitching": "Custom stitching",
  heritage: "Heritage story",
  craftsmanship: "Craftsmanship",
  lookbook: "Editorial lookbook",
  collections: "Collections",
  partners: "Partner program",
  account: "Customer login",
};

export type ThemeMode = "dark" | "light";

/** noir = background, ivory = text, gold = accent, burgundy = accent wash. */
export type Palette = { gold: string; noir: string; ivory: string; burgundy: string };

export const DARK_PALETTE: Palette = { gold: "#D4AF37", noir: "#0B0B0B", ivory: "#F8F5EB", burgundy: "#6B0F1A" };
export const LIGHT_PALETTE: Palette = { gold: "#9A7724", noir: "#F7F2E7", ivory: "#1D1714", burgundy: "#EAD7D0" };

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
  };
  theme: {
    /** House default for every visitor. */
    mode: ThemeMode;
    /** Show a light/dark switch in the website header. */
    allowToggle: boolean;
    displayFont: "bodoni" | "cormorant";
    dark: Palette;
    light: Palette;
  };
  /** House defaults for the CRM (each admin may override in Settings → Appearance). */
  crm: {
    mode: ThemeMode;
    accent: string;
    wallpaper: string;
    radius: "sharp" | "soft";
  };
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
    codEnabled: false,
    returnWindowDays: 0,
  },
  theme: { mode: "dark", allowToggle: false, displayFont: "bodoni", dark: { ...DARK_PALETTE }, light: { ...LIGHT_PALETTE } },
  crm: { mode: "dark", accent: "gold", wallpaper: "silk", radius: "sharp" },
  hero: {
    eyebrow: "Timeless women’s luxury",
    title: "A Legacy of Elegance",
    subtitle: "Designer blouses, heirloom sarees and intimate essentials — tradition in style, always.",
    primaryLabel: "Explore collections",
    primaryHref: "/collections",
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
  for (const group of ["brand", "commerce", "theme", "hero", "announcement", "crm"] as const) {
    mergeInto(out[group] as unknown as Record<string, unknown>, src[group]);
  }
  if (out.theme.mode !== "light") out.theme.mode = "dark";
  if (out.crm.mode !== "light") out.crm.mode = "dark";
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
  const rules = [`html[data-theme="dark"]{${paletteVars(theme.dark)}}`, `html[data-theme="light"]{${paletteVars(theme.light)}}`];
  if (theme.displayFont === "cormorant") rules.push("html{--font-display:var(--font-cormorant),Garamond,serif}");
  return rules.join("");
}
