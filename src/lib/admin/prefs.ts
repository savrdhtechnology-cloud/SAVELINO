"use client";

import { useCallback, useEffect, useState } from "react";

/** Per-admin CRM appearance preferences (kept in this browser only). */
export type CrmPrefs = {
  accent: "gold" | "rose" | "champagne" | "emerald" | "ivory";
  wallpaper: "silk" | "burgundy" | "plain";
  dockExpanded: boolean;
  density: "comfortable" | "compact";
  motion: "full" | "reduced";
};

export const DEFAULT_PREFS: CrmPrefs = {
  accent: "gold",
  wallpaper: "silk",
  dockExpanded: true,
  density: "comfortable",
  motion: "full",
};

export const ACCENTS: Record<CrmPrefs["accent"], { label: string; base: string; light: string; deep: string }> = {
  gold: { label: "Antique gold", base: "#d4af37", light: "#f1d98a", deep: "#9c7a22" },
  rose: { label: "Rose gold", base: "#c98b72", light: "#ecc2ae", deep: "#8e5a46" },
  champagne: { label: "Champagne", base: "#d8c39a", light: "#f3e7cc", deep: "#9c8a63" },
  emerald: { label: "Emerald", base: "#3fae86", light: "#9be3c6", deep: "#22735a" },
  ivory: { label: "Ivory", base: "#e9e2cf", light: "#fbf8ef", deep: "#a59d88" },
};

export const WALLPAPERS: Record<CrmPrefs["wallpaper"], { label: string; css: string }> = {
  silk: {
    label: "Noir silk",
    css: "radial-gradient(ellipse at 85% 0%, color-mix(in srgb, var(--color-gold) 10%, transparent), transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(107,15,26,0.22), transparent 60%)",
  },
  burgundy: {
    label: "Burgundy velvet",
    css: "radial-gradient(ellipse at 50% -10%, rgba(107,15,26,0.55), transparent 65%), radial-gradient(ellipse at 100% 100%, rgba(62,9,16,0.6), transparent 60%)",
  },
  plain: { label: "Plain noir", css: "none" },
};

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

  return [prefs, update] as const;
}
