import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GUEST_COOKIE } from "./config";

type RpcResult = { data: unknown; error: { message: string } | null };
type RpcClient = { rpc(fn: string, args: Record<string, unknown>): PromiseLike<RpcResult> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** Calls a try-on database function with the visitor's own session (or as a guest). */
export async function tryonRpc(fn: string, args: Record<string, unknown>) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { data: null, error: { message: "backend_unavailable" } } as RpcResult;
  return (supabase as unknown as RpcClient).rpc(fn, args);
}

/** The private guest token (httpOnly cookie) that lets a guest reopen their own sessions. */
export async function readGuestId() {
  const store = await cookies();
  const v = store.get(GUEST_COOKIE)?.value;
  return isUuid(v) ? v : null;
}

export async function ensureGuestId() {
  const existing = await readGuestId();
  if (existing) return { id: existing, created: false };
  return { id: crypto.randomUUID(), created: true };
}

export function setGuestCookie(res: NextResponse, id: string) {
  res.cookies.set(GUEST_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

const FRIENDLY: Record<string, [number, string]> = {
  backend_unavailable: [503, "Virtual Try-On is not connected yet."],
  consent_required: [400, "Please accept the try-on consent to continue."],
  category_not_enabled: [400, "Virtual Try-On isn’t available for this collection."],
  guest_token_required: [400, "Please enable cookies to use Virtual Try-On."],
  not_found: [404, "This try-on session could not be found."],
  no_inputs: [400, "Please add your photo first."],
  sign_in_required: [401, "Sign in to save looks to your account."],
  invalid_event: [400, "Unknown action."],
};

export function errorResponse(message: string) {
  const key = Object.keys(FRIENDLY).find((k) => message.includes(k));
  if (message.includes("Could not find the function")) {
    return NextResponse.json({ error: "This action isn’t enabled on the server yet." }, { status: 501 });
  }
  const [status, text] = key ? FRIENDLY[key] : [500, "Something went wrong. Please try again."];
  return NextResponse.json({ error: text }, { status });
}
