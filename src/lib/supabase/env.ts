export type SupabaseEnv = { url: string; anonKey: string };

/** Returns Supabase credentials, or null while the backend is not yet provisioned. */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export const isBackendConfigured = () => getSupabaseEnv() !== null;
