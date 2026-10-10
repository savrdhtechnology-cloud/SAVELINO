import { NextResponse } from "next/server";
import { errorResponse, isUuid, tryonRpc } from "@/lib/tryon/server";

export const dynamic = "force-dynamic";

/** Saves a look to the signed-in customer's account. */
export async function POST(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!isUuid(sessionId)) return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  const { error } = await tryonRpc("tryon_save_look", { p_session: sessionId });
  if (error) return errorResponse(error.message);
  return NextResponse.json({ ok: true });
}
