import { NextResponse } from "next/server";
import { errorResponse, isUuid, readGuestId, tryonRpc } from "@/lib/tryon/server";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ sessionId: string }> };

const PRIVATE = { "Cache-Control": "private, no-store" };

/** Returns a session only to its owner (customer or guest token holder) or an admin. */
export async function GET(_req: Request, { params }: Ctx) {
  const { sessionId } = await params;
  if (!isUuid(sessionId)) return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  const { data, error } = await tryonRpc("tryon_get", { p_session: sessionId, p_guest: await readGuestId() });
  if (error) return errorResponse(error.message);
  if (!data) return errorResponse("not_found");
  return NextResponse.json(data, { headers: PRIVATE });
}

/** Erases the customer's photos and previews for this session. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { sessionId } = await params;
  if (!isUuid(sessionId)) return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  const { error } = await tryonRpc("tryon_erase", { p_session: sessionId, p_guest: await readGuestId() });
  if (error) return errorResponse(error.message);
  return NextResponse.json({ ok: true });
}
