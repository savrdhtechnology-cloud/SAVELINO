import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { DEFAULT_SETTINGS, mergeSettings, type SiteSettings } from "./settings";

export const SETTINGS_TAG = "site-settings";

/** Raw stored settings JSON (cached; CRM saves revalidate the tag). Merged with defaults per request. */
const getStoredSettings = unstable_cache(
  async (): Promise<unknown> => {
    const env = getSupabaseEnv();
    if (!env) return null;
    try {
      const client = createClient(env.url, env.anonKey, { auth: { persistSession: false } });
      const { data } = await client.from("settings").select("data").eq("id", 1).maybeSingle();
      return (data as { data?: unknown } | null)?.data ?? null;
    } catch {
      return null;
    }
  },
  ["settings-raw-v3"],
  { tags: [SETTINGS_TAG], revalidate: 300 },
);

/** Public website settings, always in the current shape. */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    return mergeSettings(await getStoredSettings());
  } catch {
    return DEFAULT_SETTINGS;
  }
}
