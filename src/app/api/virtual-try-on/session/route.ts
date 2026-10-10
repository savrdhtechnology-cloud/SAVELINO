import { NextResponse } from "next/server";
import { getCollection } from "@/lib/collections";
import { TRYON_CONSENT_VERSION, isTryOnCategory } from "@/lib/tryon/config";
import { ensureGuestId, errorResponse, setGuestCookie, tryonRpc } from "@/lib/tryon/server";

export const dynamic = "force-dynamic";

/** Creates a try-on session (consent is required and recorded with its version). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const productId = String(body.productId ?? "");
  const product = getCollection(productId);
  if (!product || !isTryOnCategory(product.slug)) {
    return NextResponse.json({ error: "Virtual Try-On isn’t available for this collection." }, { status: 400 });
  }
  if (body.consent !== true) {
    return NextResponse.json({ error: "Please accept the try-on consent to continue." }, { status: 400 });
  }
  const mode = body.mode === "premium" ? "premium" : "quick";
  const guest = await ensureGuestId();

  const { data, error } = await tryonRpc("tryon_create_session", {
    p_guest: guest.id,
    p_product_id: product.slug,
    p_product_name: product.title,
    p_category: product.slug,
    p_size: typeof body.size === "string" ? body.size.slice(0, 20) : null,
    p_color: typeof body.color === "string" ? body.color.slice(0, 40) : null,
    p_mode: mode,
    p_consent: true,
    p_consent_version: TRYON_CONSENT_VERSION,
  });
  if (error) return errorResponse(error.message);

  const res = NextResponse.json({ sessionId: data as string, mode });
  if (guest.created) setGuestCookie(res, guest.id);
  return res;
}
