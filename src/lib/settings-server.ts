import "server-only";
import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { DEFAULT_SETTINGS, mergeSettings, type SiteSettings } from "./settings";

export const SETTINGS_TAG = "site-settings";

/**
 * Raw stored settings (cached; Studio/Settings saves revalidate the tag). Only the
 * stored JSON is cached — merging with the current defaults happens per request, so a
 * cache entry written by an older deployment can never hand out an outdated shape.
 */
const getStoredSettings = unstable_cache(
  async (): Promise<unknown> => {
    const env = getSupabaseEnv();
    if (!env) return null;
    try {
      const client = createClient(env.url, env.anonKey, { auth: { persistSession: false } });
      const { data } = await (client.from("site_settings") as unknown as {
        select(c: string): { eq(c: string, v: number): { maybeSingle(): PromiseLike<{ data: { data?: unknown } | null }> } };
      })
        .select("data")
        .eq("id", 1)
        .maybeSingle();
      return data?.data ?? null;
    } catch {
      return null;
    }
  },
  ["site-settings-raw-v2"],
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
