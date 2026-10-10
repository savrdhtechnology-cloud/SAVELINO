/** Typefaces available to the website (Studio) and the CRM (Settings → Appearance). */

export const HEADING_FONTS = {
  bodoni: { label: "Bodoni Moda", css: "var(--font-bodoni), Didot, serif", sample: "serif" },
  cormorant: { label: "Cormorant", css: "var(--font-cormorant), Garamond, serif", sample: "serif" },
  playfair: { label: "Playfair Display", css: "var(--font-playfair), Georgia, serif", sample: "serif" },
  dmserif: { label: "DM Serif Display", css: "var(--font-dmserif), Georgia, serif", sample: "serif" },
  manrope: { label: "Manrope", css: "var(--font-manrope), system-ui, sans-serif", sample: "sans" },
  inter: { label: "Inter", css: "var(--font-inter), system-ui, sans-serif", sample: "sans" },
  poppins: { label: "Poppins", css: "var(--font-poppins), system-ui, sans-serif", sample: "sans" },
} as const;

export const BODY_FONTS = {
  manrope: { label: "Manrope", css: "var(--font-manrope), system-ui, sans-serif" },
  inter: { label: "Inter", css: "var(--font-inter), system-ui, sans-serif" },
  poppins: { label: "Poppins", css: "var(--font-poppins), system-ui, sans-serif" },
  lora: { label: "Lora", css: "var(--font-lora), Georgia, serif" },
  cormorant: { label: "Cormorant", css: "var(--font-cormorant), Garamond, serif" },
} as const;

export type HeadingFont = keyof typeof HEADING_FONTS;
export type BodyFont = keyof typeof BODY_FONTS;

export const isHeadingFont = (v: string): v is HeadingFont => v in HEADING_FONTS;
export const isBodyFont = (v: string): v is BodyFont => v in BODY_FONTS;
