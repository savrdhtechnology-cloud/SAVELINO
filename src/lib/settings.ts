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
    gold: string;
    noir: string;
    ivory: string;
    burgundy: string;
    displayFont: "bodoni" | "cormorant";
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
  theme: { gold: "#D4AF37", noir: "#0B0B0B", ivory: "#F8F5EB", burgundy: "#6B0F1A", displayFont: "bodoni" },
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

/** Deep-merges stored settings over defaults, ignoring unknown or mistyped keys. */
export function mergeSettings(stored: unknown): SiteSettings {
  const out = structuredClone(DEFAULT_SETTINGS) as unknown as Record<string, Record<string, unknown>>;
  if (!isObj(stored)) return out as unknown as SiteSettings;
  for (const group of ["brand", "commerce", "theme", "hero", "announcement"] as const) {
    const src = stored[group];
    if (!isObj(src)) continue;
    for (const [k, v] of Object.entries(src)) {
      if (k in out[group] && typeof v === typeof out[group][k]) out[group][k] = v;
    }
  }
  if (Array.isArray(stored.sections)) {
    const seen = new Set<string>();
    const list: { id: SectionId; visible: boolean }[] = [];
    for (const s of stored.sections) {
      if (isObj(s) && SECTION_IDS.includes(s.id as SectionId) && !seen.has(String(s.id))) {
        seen.add(String(s.id));
        list.push({ id: s.id as SectionId, visible: s.visible !== false });
      }
    }
    for (const id of SECTION_IDS) if (!seen.has(id)) list.push({ id, visible: true });
    (out as unknown as SiteSettings).sections = list;
  }
  return out as unknown as SiteSettings;
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** CSS variable overrides for the brand palette (only valid hex colours are applied). */
export function themeCss(theme: SiteSettings["theme"]) {
  const vars: string[] = [];
  const map: [string, string][] = [
    ["--color-gold", theme.gold],
    ["--color-noir", theme.noir],
    ["--color-ivory", theme.ivory],
    ["--color-burgundy", theme.burgundy],
  ];
  for (const [k, v] of map) if (HEX.test(v)) vars.push(`${k}:${v}`);
  if (theme.displayFont === "cormorant") vars.push("--font-display:var(--font-cormorant),Garamond,serif");
  return vars.length ? `:root{${vars.join(";")}}` : "";
}
