/** Typefaces available to the website (Studio) and the CRM (Settings → Appearance). */

export const HEADING_FONTS = {
  bodoni: { label: "Bodoni Moda", css: "var(--font-bodoni), Didot, serif", sample: "serif" },
  cormorant: { label: "Cormorant", css: "var(--font-cormorant), Garamond, serif", sample: "serif" },
  playfair: { label: "Playfair Display", css: "var(--font-playfair), Georgia, serif", sample: "serif" },
  dmserif: { label: "DM Serif Display", css: "var(--font-dmserif), Georgia, serif", sample: "serif" },
  cinzel: { label: "Cinzel", css: '"Cinzel", "Trajan Pro", serif', sample: "serif" },
  italiana: { label: "Italiana", css: '"Italiana", Didot, serif', sample: "serif" },
  marcellus: { label: "Marcellus", css: '"Marcellus", Georgia, serif', sample: "serif" },
  manrope: { label: "Manrope", css: "var(--font-manrope), system-ui, sans-serif", sample: "sans" },
  inter: { label: "Inter", css: "var(--font-inter), system-ui, sans-serif", sample: "sans" },
  poppins: { label: "Poppins", css: "var(--font-poppins), system-ui, sans-serif", sample: "sans" },
} as const;

export const BODY_FONTS = {
  manrope: { label: "Manrope", css: "var(--font-manrope), system-ui, sans-serif" },
  inter: { label: "Inter", css: "var(--font-inter), system-ui, sans-serif" },
  poppins: { label: "Poppins", css: "var(--font-poppins), system-ui, sans-serif" },
  jost: { label: "Jost", css: '"Jost", system-ui, sans-serif' },
  montserrat: { label: "Montserrat", css: '"Montserrat", system-ui, sans-serif' },
  raleway: { label: "Raleway", css: '"Raleway", system-ui, sans-serif' },
  lora: { label: "Lora", css: "var(--font-lora), Georgia, serif" },
  cormorant: { label: "Cormorant", css: "var(--font-cormorant), Garamond, serif" },
} as const;

export type HeadingFont = keyof typeof HEADING_FONTS;
export type BodyFont = keyof typeof BODY_FONTS;

export const isHeadingFont = (v: string): v is HeadingFont => v in HEADING_FONTS;
export const isBodyFont = (v: string): v is BodyFont => v in BODY_FONTS;

/** One-click heading + body pairings offered in Studio (website and CRM). */
export const FONT_PRESETS: { id: string; label: string; note: string; heading: HeadingFont; body: BodyFont }[] = [
  { id: "maison", label: "Maison", note: "Bodoni · Manrope — the house signature", heading: "bodoni", body: "manrope" },
  { id: "couture", label: "Couture", note: "Playfair · Jost — fashion editorial", heading: "playfair", body: "jost" },
  { id: "royal", label: "Royal Court", note: "Cinzel · Cormorant — regal, carved", heading: "cinzel", body: "cormorant" },
  { id: "vogue", label: "Vogue", note: "Italiana · Montserrat — tall and airy", heading: "italiana", body: "montserrat" },
  { id: "heirloom", label: "Heirloom", note: "Cormorant · Lora — soft and literary", heading: "cormorant", body: "lora" },
  { id: "gallery", label: "Gallery", note: "Marcellus · Raleway — calm, classic", heading: "marcellus", body: "raleway" },
  { id: "modern", label: "Modern Atelier", note: "DM Serif · Inter — crisp and modern", heading: "dmserif", body: "inter" },
  { id: "clean", label: "Clean Studio", note: "Poppins · Poppins — simple, geometric", heading: "poppins", body: "poppins" },
];

type FontKey = HeadingFont | BodyFont;

/** Google Fonts `family=` specs for every typeface above. */
const GOOGLE_SPECS: Record<FontKey, string> = {
  bodoni: "Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900",
  cormorant: "Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500;1,600",
  playfair: "Playfair+Display:ital,wght@0,400..900;1,400..900",
  dmserif: "DM+Serif+Display:ital@0;1",
  cinzel: "Cinzel:wght@400..900",
  italiana: "Italiana",
  marcellus: "Marcellus",
  manrope: "Manrope:wght@200..800",
  inter: "Inter:wght@100..900",
  poppins: "Poppins:wght@300;400;500;600",
  jost: "Jost:ital,wght@0,300..700;1,300..700",
  montserrat: "Montserrat:ital,wght@0,300..700;1,300..700",
  raleway: "Raleway:ital,wght@0,300..700;1,300..700",
  lora: "Lora:ital,wght@0,400..700;1,400..700",
};

export const ALL_FONT_KEYS = Object.keys(GOOGLE_SPECS) as FontKey[];

/** Stylesheet URL loading only the given typefaces (unknown keys are ignored). */
export function googleFontsHref(keys: readonly string[]) {
  const unique = [...new Set(keys)].filter((k): k is FontKey => k in GOOGLE_SPECS);
  return `https://fonts.googleapis.com/css2?${unique.map((k) => `family=${GOOGLE_SPECS[k]}`).join("&")}&display=swap`;
}
