import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Completes email-confirmation / magic-link sign-in by exchanging the auth code for a session. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/account";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/account";

  const supabase = await createSupabaseServerClient();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        const role = (profile as { role?: string } | null)?.role;
        const destination = role === "admin" ? "/admin" : role === "partner" ? "/partner/dashboard" : "/account";
        const allowed = next === destination || next.startsWith(destination + "/");
        return NextResponse.redirect(`${origin}${allowed ? next : destination}`);
      }
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
