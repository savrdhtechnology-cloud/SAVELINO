import { NextResponse } from "next/server";
import { TRYON_INPUT_TYPES, TRYON_LIMITS, type TryOnInputType } from "@/lib/tryon/config";
import { errorResponse, isUuid, readGuestId, tryonRpc } from "@/lib/tryon/server";

export const dynamic = "force-dynamic";

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Magic-byte check so a renamed file can't pass as an image. */
function looksLikeImage(dataUrl: string) {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1, dataUrl.indexOf(",") + 1 + 24);
  const bytes = Buffer.from(b64, "base64");
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const webp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return jpeg || png || webp;
}

/**
 * Stores one customer photo for a session. Photos arrive already down-scaled by the
 * browser; the server re-validates type, size and dimensions before saving privately.
 */
export async function POST(req: Request) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > TRYON_LIMITS.maxDataUrlChars + 4096) {
    return NextResponse.json({ error: "That photo is too large. Please use a smaller image." }, { status: 413 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const sessionId = body.sessionId;
  const type = String(body.type ?? "front") as TryOnInputType;
  const data = typeof body.data === "string" ? body.data : "";
  const width = Math.round(Number(body.width));
  const height = Math.round(Number(body.height));

  if (!isUuid(sessionId)) return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  if (!TRYON_INPUT_TYPES.includes(type)) return NextResponse.json({ error: "Unknown photo type." }, { status: 400 });
  if (data.length > TRYON_LIMITS.maxDataUrlChars) {
    return NextResponse.json({ error: "That photo is too large. Please use a smaller image." }, { status: 413 });
  }
  if (!DATA_URL.test(data) || !looksLikeImage(data)) {
    return NextResponse.json({ error: "Please upload a JPG, PNG or WEBP photo." }, { status: 415 });
  }
  if (!Number.isFinite(width) || !Number.isFinite(height) || Math.min(width, height) < 200 || Math.max(width, height) > 4000) {
    return NextResponse.json({ error: "Photo resolution is too low. Please use a clearer photo." }, { status: 400 });
  }

  const { error } = await tryonRpc("tryon_add_input", {
    p_session: sessionId,
    p_guest: await readGuestId(),
    p_type: type,
    p_data: data,
    p_width: width,
    p_height: height,
  });
  if (error) return errorResponse(error.message);
  return NextResponse.json({ ok: true, type });
}
