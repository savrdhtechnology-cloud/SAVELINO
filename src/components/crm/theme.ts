import type { CSSProperties } from "react";
import { BODY_FONTS, HEADING_FONTS, isBodyFont, isHeadingFont } from "@/lib/fonts";
import type { CrmTheme, SiteSettings } from "@/lib/settings";

type Tokens = Record<string, string>;

const THEMES: Record<CrmTheme, Tokens> = {
  luxe: {
    "--crm-scheme": "dark",
    "--crm-bg": "#12080a",
    "--crm-panel": "rgba(34, 13, 17, 0.72)",
    "--crm-panel-2": "rgba(52, 18, 24, 0.45)",
    "--crm-input": "rgba(12, 5, 7, 0.55)",
    "--crm-border": "rgba(212, 175, 55, 0.34)",
    "--crm-border-soft": "rgba(212, 175, 55, 0.15)",
    "--crm-text": "#f6ebdd",
    "--crm-muted": "rgba(246, 235, 221, 0.6)",
    "--crm-accent": "#d4af37",
    "--crm-accent-2": "#f0d38a",
    "--crm-accent-ink": "#1d0f05",
    "--crm-wash": "#6b0f1a",
    "--crm-danger": "#ef6b6b",
    "--crm-success": "#58c48a",
  },
  royal: {
    "--crm-scheme": "dark",
    "--crm-bg": "#0a0a0a",
    "--crm-panel": "rgba(22, 20, 17, 0.8)",
    "--crm-panel-2": "rgba(34, 30, 24, 0.5)",
    "--crm-input": "rgba(0, 0, 0, 0.45)",
    "--crm-border": "rgba(212, 175, 55, 0.3)",
    "--crm-border-soft": "rgba(212, 175, 55, 0.13)",
    "--crm-text": "#f5efe3",
    "--crm-muted": "rgba(245, 239, 227, 0.58)",
    "--crm-accent": "#d4af37",
    "--crm-accent-2": "#ecd08a",
    "--crm-accent-ink": "#141005",
    "--crm-wash": "#2d2416",
    "--crm-danger": "#ef6b6b",
    "--crm-success": "#58c48a",
  },
  ivory: {
    "--crm-scheme": "light",
    "--crm-bg": "#f5eee2",
    "--crm-panel": "rgba(255, 252, 246, 0.82)",
    "--crm-panel-2": "rgba(244, 233, 214, 0.6)",
    "--crm-input": "rgba(255, 255, 255, 0.9)",
    "--crm-border": "rgba(154, 119, 36, 0.38)",
    "--crm-border-soft": "rgba(154, 119, 36, 0.18)",
    "--crm-text": "#25170f",
    "--crm-muted": "rgba(37, 23, 15, 0.6)",
    "--crm-accent": "#9a7724",
    "--crm-accent-2": "#c9a13b",
    "--crm-accent-ink": "#ffffff",
    "--crm-wash": "#e7cfc0",
    "--crm-danger": "#c0392b",
    "--crm-success": "#22874f",
  },
};

/** CSS variables for the CRM shell from the saved appearance. */
export function crmStyle(crm: SiteSettings["crm"]): CSSProperties {
  const t = THEMES[crm.theme] ?? THEMES.luxe;
  return {
    ...t,
    "--crm-heading": HEADING_FONTS[isHeadingFont(crm.headingFont) ? crm.headingFont : "cinzel"].css,
    "--crm-body": BODY_FONTS[isBodyFont(crm.bodyFont) ? crm.bodyFont : "manrope"].css,
    // Website utility classes inside the CRM (previews) follow the CRM accent.
    "--color-gold": t["--crm-accent"],
    "--color-gold-light": t["--crm-accent-2"],
  } as CSSProperties;
}

export const CRM_SWATCH: Record<CrmTheme, [string, string, string]> = {
  luxe: ["#12080a", "#6b0f1a", "#d4af37"],
  royal: ["#0a0a0a", "#2d2416", "#d4af37"],
  ivory: ["#f5eee2", "#e7cfc0", "#9a7724"],
};
