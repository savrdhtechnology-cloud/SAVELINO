import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { getSupabaseEnv } from "./env";

export type StaffRole = "none" | "staff" | "admin";

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
  | { configured: true; user: { id: string; email: string | null; name: string }; role: StaffRole };

/** The signed-in CRM user and their role (read from public.profiles, never from the client). */
export const getSessionContext = cache(async (): Promise<SessionContext> => {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { configured: false };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { configured: true, user: null };
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
  const p = profile as { role?: StaffRole; full_name?: string } | null;
  return { configured: true, user: { id: user.id, email: user.email ?? null, name: p?.full_name || user.email || "Admin" }, role: p?.role ?? "none" };
});

export const isStaffRole = (role: StaffRole) => role === "staff" || role === "admin";
