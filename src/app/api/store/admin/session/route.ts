import { NextResponse } from "next/server";
import { STORE_ADMIN_COOKIE, isStoreAdmin, passwordMatches, sessionCookieValue, storePasswordConfigured } from "@/lib/store/admin-auth";
import { isStoreConfigured } from "@/lib/store/neon";

export async function GET() {
  return NextResponse.json({ admin: await isStoreAdmin(), passwordSet: storePasswordConfigured(), database: isStoreConfigured() });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const pw = typeof body?.password === "string" ? body.password : "";
  if (!passwordMatches(pw)) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  const { value, maxAge } = sessionCookieValue();
  const res = NextResponse.json({ admin: true });
  res.cookies.set(STORE_ADMIN_COOKIE, value, { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ admin: false });
  res.cookies.set(STORE_ADMIN_COOKIE, "", { httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0 });
  return res;
}
