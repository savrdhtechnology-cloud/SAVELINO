import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSupabaseEnv } from "./env";
import type { UserRole } from "@/lib/types";

export async function createSupabaseServerClient() {
  const env = getSupabaseEnv();
  if (!env) return null;
  const cookieStore = await cookies();
  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — the middleware refreshes sessions instead.
        }
      },
    },
  });
}

export type SessionContext =
  | { configured: false }
  | { configured: true; user: null }
  | { configured: true; user: { id: string; email: string | null }; role: UserRole };

/** Resolves the signed-in user and their role (role is read from the database, never from the client). */
export const getSessionContext = cache(async (): Promise<SessionContext> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { configured: false };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { configured: true, user: null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = ((profile as unknown as { role?: UserRole } | null)?.role ?? "customer") as UserRole;
  return { configured: true, user: { id: user.id, email: user.email ?? null }, role };
});
