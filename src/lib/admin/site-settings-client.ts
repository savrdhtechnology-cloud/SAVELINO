"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEFAULT_SETTINGS, mergeSettings, type SiteSettings } from "@/lib/settings";
import { toast } from "./store";

const DEMO_KEY = "savlino-demo-site-settings";

type SettingsTable = {
  select(c: string): { eq(c: string, v: number): { maybeSingle(): PromiseLike<{ data: { data?: unknown } | null; error: { message: string } | null }> } };
  update(v: Record<string, unknown>): { eq(c: string, v: number): PromiseLike<{ error: { message: string } | null }> };
};

/** Loads and saves the website settings row. In demo mode changes stay in this browser. */
export function useSiteSettings(live: boolean) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      let next = DEFAULT_SETTINGS;
      if (live) {
        const sb = createSupabaseBrowserClient();
        const { data } = (await (sb?.from("site_settings") as unknown as SettingsTable | undefined)?.select("data").eq("id", 1).maybeSingle()) ?? {
          data: null,
        };
        next = mergeSettings(data?.data);
      } else {
        try {
          next = mergeSettings(JSON.parse(window.localStorage.getItem(DEMO_KEY) ?? "null"));
        } catch {
          next = DEFAULT_SETTINGS;
        }
      }
      if (!alive) return;
      setSettings(next);
      setSaved(next);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [live]);

  const save = useCallback(
    async (next: SiteSettings = settings) => {
      setSaving(true);
      if (!live) {
        try {
          window.localStorage.setItem(DEMO_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        setSaved(next);
        setSaving(false);
        toast("Demo mode — saved in this browser only, the live website is unchanged");
        return true;
      }
      const sb = createSupabaseBrowserClient();
      const res = await (sb?.from("site_settings") as unknown as SettingsTable | undefined)
        ?.update({ data: next, updated_at: new Date().toISOString() })
        .eq("id", 1);
      setSaving(false);
      if (!res || res.error) {
        toast(res?.error?.message ?? "Could not save", "danger");
        return false;
      }
      setSaved(next);
      await fetch("/api/revalidate", { method: "POST" }).catch(() => undefined);
      toast("Published to the website");
      return true;
    },
    [live, settings],
  );

  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);

  return { settings, setSettings, save, saving, loading, dirty, reset: () => setSettings(saved) };
}
