import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/supabase/server";

/**
 * Store admin access. While the CRM's own login (Supabase) isn't connected, the
 * store is managed with a password kept in Vercel (STORE_ADMIN_PASSWORD). A signed,
 * httpOnly cookie remembers the admin for 12 hours. A signed-in CRM admin also counts.
 */
export const STORE_ADMIN_COOKIE = "sv_store_admin";
const TTL_SECONDS = 12 * 60 * 60;

const password = () => process.env.STORE_ADMIN_PASSWORD ?? "";
const secret = () => process.env.STORE_ADMIN_SECRET || password();
export const storePasswordConfigured = () => password().length >= 8;

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");
const digest = (v: string) => createHash("sha256").update(v).digest();

export function passwordMatches(input: string) {
  if (!storePasswordConfigured()) return false;
  return timingSafeEqual(digest(input), digest(password()));
}

export function sessionCookieValue() {
  const exp = String(Math.floor(Date.now() / 1000) + TTL_SECONDS);
  return { value: `${exp}.${sign(exp)}`, maxAge: TTL_SECONDS };
}

function validCookie(value: string | undefined) {
  if (!value || !storePasswordConfigured()) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || Number(exp) * 1000 < Date.now()) return false;
  const expected = Buffer.from(sign(exp));
  const got = Buffer.from(sig);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export async function isStoreAdmin() {
  const jar = await cookies();
  if (validCookie(jar.get(STORE_ADMIN_COOKIE)?.value)) return true;
  try {
    const session = await getSessionContext();
    return session.configured && Boolean(session.user) && "role" in session && session.role === "admin";
  } catch {
    return false;
  }
}

/** Returns a 401 response when the caller isn't a store admin, otherwise null. */
export async function requireStoreAdmin() {
  return (await isStoreAdmin()) ? null : NextResponse.json({ error: "Please sign in to the store admin" }, { status: 401 });
}
