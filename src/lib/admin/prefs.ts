"use client";

import { useCallback, useEffect, useState } from "react";
import type { SiteSettings } from "@/lib/settings";

/**
 * Per-admin CRM appearance, kept in this browser. "house" means: use the
 * defaults set for all admins in Settings → Appearance → House defaults.
 */
export type CrmPrefs = {
  mode: "house" | "dark" | "light" | "system";
  accent: "house" | AccentKey | "custom";
  customAccent: string;
  wallpaper: "house" | WallpaperKey;
  radius: "house" | "sharp" | "soft";
  headingFont: "bodoni" | "cormorant" | "manrope";
  dockExpanded: boolean;
  density: "comfortable" | "compact";
  motion: "full" | "reduced";
};

export type AccentKey = "gold" | "rose" | "champagne" | "emerald" | "ivory";
export type WallpaperKey = "silk" | "burgundy" | "plain";

export const DEFAULT_PREFS: CrmPrefs = {
  mode: "house",
  accent: "house",
  customAccent: "#D4AF37",
  wallpaper: "house",
  radius: "house",
  headingFont: "bodoni",
  dockExpanded: true,
  density: "comfortable",
  motion: "full",
};

/** `dark` values sit on noir; `light` values are deepened for contrast on ivory paper. */
export const ACCENTS: Record<AccentKey, { label: string; dark: [string, string, string]; light: [string, string, string] }> = {
  gold: { label: "Antique gold", dark: ["#d4af37", "#f1d98a", "#9c7a22"], light: ["#9a7724", "#b8923a", "#6f5414"] },
  rose: { label: "Rose gold", dark: ["#c98b72", "#ecc2ae", "#8e5a46"], light: ["#a5604a", "#c27f68", "#73402f"] },
  champagne: { label: "Champagne", dark: ["#d8c39a", "#f3e7cc", "#9c8a63"], light: ["#8c7440", "#a8905a", "#5f4e2a"] },
  emerald: { label: "Emerald", dark: ["#3fae86", "#9be3c6", "#22735a"], light: ["#1f7a5c", "#2f9a76", "#14513d"] },
  ivory: { label: "Ivory / graphite", dark: ["#e9e2cf", "#fbf8ef", "#a59d88"], light: ["#4d473c", "#6b6457", "#2e2a23"] },
};

export const WALLPAPERS: Record<WallpaperKey, { label: string; css: string }> = {
  silk: {
    label: "Silk glow",
    css: "radial-gradient(ellipse at 85% 0%, color-mix(in srgb, var(--color-gold) 12%, transparent), transparent 55%), radial-gradient(ellipse at 0% 100%, color-mix(in srgb, var(--color-burgundy) 30%, transparent), transparent 60%)",
  },
  burgundy: {
    label: "Velvet",
    css: "radial-gradient(ellipse at 50% -10%, color-mix(in srgb, var(--color-burgundy) 70%, transparent), transparent 65%), radial-gradient(ellipse at 100% 100%, color-mix(in srgb, var(--color-burgundy) 45%, transparent), transparent 60%)",
  },
  plain: { label: "Plain", css: "none" },
};

export const HEADING_FONTS: Record<CrmPrefs["headingFont"], { label: string; css: string }> = {
  bodoni: { label: "Bodoni", css: "var(--font-bodoni), Didot, serif" },
  cormorant: { label: "Cormorant", css: "var(--font-cormorant), Garamond, serif" },
  manrope: { label: "Manrope", css: "var(--font-manrope), system-ui, sans-serif" },
};

export type ResolvedTheme = {
  mode: "dark" | "light";
  accent: [string, string, string];
  wallpaper: string;
  radius: "sharp" | "soft";
  headingFont: string;
};

const isAccent = (v: string): v is AccentKey => v in ACCENTS;
const isWallpaper = (v: string): v is WallpaperKey => v in WALLPAPERS;

/** Combines house defaults, this admin's overrides and the OS colour scheme. */
export function resolveTheme(prefs: CrmPrefs, house: SiteSettings["crm"], systemDark: boolean): ResolvedTheme {
  const mode = prefs.mode === "house" ? house.mode : prefs.mode === "system" ? (systemDark ? "dark" : "light") : prefs.mode;
  let accent: [string, string, string];
  if (prefs.accent === "custom" && /^#[0-9a-fA-F]{6}$/.test(prefs.customAccent)) {
    const c = prefs.customAccent;
    accent =
      mode === "light"
        ? [`color-mix(in srgb, ${c} 75%, black)`, c, `color-mix(in srgb, ${c} 50%, black)`]
        : [c, `color-mix(in srgb, ${c} 65%, white)`, `color-mix(in srgb, ${c} 70%, black)`];
  } else {
    const key = prefs.accent !== "house" && prefs.accent !== "custom" ? prefs.accent : isAccent(house.accent) ? house.accent : "gold";
    accent = ACCENTS[key][mode];
  }
  const wp = prefs.wallpaper !== "house" ? prefs.wallpaper : isWallpaper(house.wallpaper) ? house.wallpaper : "silk";
  return {
    mode,
    accent,
    wallpaper: WALLPAPERS[wp].css,
    radius: prefs.radius === "house" ? house.radius : prefs.radius,
    headingFont: HEADING_FONTS[prefs.headingFont].css,
  };
}

const KEY = "savlino-crm-prefs";
const EVENT = "savlino:prefs";

function read(): CrmPrefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<CrmPrefs>) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function usePrefs() {
  const [prefs, setPrefs] = useState<CrmPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    setPrefs(read());
    const sync = () => setPrefs(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((patch: Partial<CrmPrefs>) => {
    const next = { ...read(), ...patch };
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — keep in memory for this session
    }
    setPrefs(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const reset = useCallback(() => update(DEFAULT_PREFS), [update]);

  return [prefs, update, reset] as const;
}

/** Tracks the operating system's light/dark preference. */
export function useSystemDark() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const on = () => setDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return dark;
}
