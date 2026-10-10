/** Shared configuration for the SAVLINO Virtual Try-On Studio. */

export const TRYON_CONSENT_VERSION = "2026-10-v1";

/** Categories enabled for try-on. Shapewear and lingerie stay off until explicitly approved. */
export const TRYON_CATEGORIES = ["designer-blouses", "ready-made-blouses", "salwar-suits", "sarees", "loungewear"] as const;
export type TryOnCategory = (typeof TRYON_CATEGORIES)[number];
export const isTryOnCategory = (v: string): v is TryOnCategory => (TRYON_CATEGORIES as readonly string[]).includes(v);

export const TRYON_VIEWS = ["front", "left", "right", "back"] as const;
export type TryOnView = (typeof TRYON_VIEWS)[number];

export const TRYON_INPUT_TYPES = ["front", "left", "right", "back", "selfie", "other"] as const;
export type TryOnInputType = (typeof TRYON_INPUT_TYPES)[number];

export const TRYON_SIZES = ["32", "34", "36", "38", "40", "42", "44", "Custom"] as const;

export const TRYON_COLORS: Record<TryOnCategory, string[]> = {
  "designer-blouses": ["Noir & gold", "Emerald", "Burgundy", "Ivory"],
  "ready-made-blouses": ["Burgundy", "Noir", "Ivory", "Rose"],
  "salwar-suits": ["Burgundy", "Emerald", "Ivory gold", "Midnight"],
  sarees: ["Tissue gold", "Ivory & gold", "Noir sequin", "Wine"],
  loungewear: ["Champagne", "Ivory", "Blush", "Noir"],
};

/** Upload limits (client resizes before sending; server re-checks). */
export const TRYON_LIMITS = {
  maxOriginalBytes: 12 * 1024 * 1024,
  maxDataUrlChars: 3_000_000,
  minDimension: 400,
  outputMaxDimension: 1280,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

export const TRYON_DISCLAIMER = "This is an AI-assisted styling preview. Actual fit and fabric fall may vary.";

export const TRYON_CONSENT_POINTS = [
  "My photo is used only to generate my virtual preview.",
  "Images are processed to create preview outputs and are never shown publicly without my permission.",
  "I can delete my photos and previews at any time.",
  "Previews are AI-generated and illustrative — actual fit, fall, drape and appearance may vary.",
];

export const PHOTO_GUIDANCE = [
  { title: "Stand straight", body: "Face the camera, shoulders relaxed." },
  { title: "Plain background", body: "A clear wall works best." },
  { title: "Good light", body: "Soft, even daylight — no strong shadows." },
  { title: "Arms slightly away", body: "Leave a little space at your sides." },
  { title: "Frame the garment", body: "Upper body for blouses; full length for sarees and suits." },
  { title: "Face visible", body: "Avoid covering your face where possible." },
];

export const GUEST_COOKIE = "savlino_tryon_guest";
