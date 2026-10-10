import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { DEFAULT_SETTINGS, mergeSettings, type SiteSettings } from "./settings";

export const SETTINGS_TAG = "site-settings";

/** Public website settings (cached; Studio/Settings saves revalidate the tag). */
export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const env = getSupabaseEnv();
    if (!env) return DEFAULT_SETTINGS;
    try {
      const client = createClient(env.url, env.anonKey, { auth: { persistSession: false } });
      const { data } = await (client.from("site_settings") as unknown as {
        select(c: string): { eq(c: string, v: number): { maybeSingle(): PromiseLike<{ data: { data?: unknown } | null }> } };
      })
        .select("data")
        .eq("id", 1)
        .maybeSingle();
      return mergeSettings(data?.data);
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  ["site-settings-v1"],
  { tags: [SETTINGS_TAG], revalidate: 300 },
);
