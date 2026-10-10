import { NextResponse } from "next/server";
import { errorResponse, isUuid, readGuestId, tryonRpc } from "@/lib/tryon/server";

export const dynamic = "force-dynamic";

const EVENTS = ["compare_original", "try_other_color", "try_other_size", "download", "share", "custom_stitching_request", "view_result"];

/** Logs a result-page action for try-on analytics. */
export async function POST(req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!isUuid(sessionId)) return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  const body = (await req.json().catch(() => null)) as { type?: string; data?: Record<string, unknown> } | null;
  if (!body?.type || !EVENTS.includes(body.type)) return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  const data = body.data && typeof body.data === "object" ? body.data : {};
  if (JSON.stringify(data).length > 2000) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { error } = await tryonRpc("tryon_log_event", {
    p_session: sessionId,
    p_guest: await readGuestId(),
    p_type: body.type,
    p_data: data,
  });
  if (error) return errorResponse(error.message);
  return NextResponse.json({ ok: true });
}
