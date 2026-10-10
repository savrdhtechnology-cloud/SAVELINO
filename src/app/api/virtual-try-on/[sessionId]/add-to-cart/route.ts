import { NextResponse } from "next/server";
import { errorResponse, isUuid, readGuestId, tryonRpc } from "@/lib/tryon/server";

export const dynamic = "force-dynamic";

/**
 * Records add-to-cart intent from a try-on. Checkout isn't live yet, so no cart or order
 * is created — the response says so, and analytics count it as intent only.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!isUuid(sessionId)) return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  const { error } = await tryonRpc("tryon_add_to_cart", { p_session: sessionId, p_guest: await readGuestId() });
  if (error) return errorResponse(error.message);
  return NextResponse.json({ ok: true, cartLive: false, message: "Saved to your bag list — checkout opens soon." });
}
