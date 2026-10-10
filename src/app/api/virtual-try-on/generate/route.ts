import { NextResponse } from "next/server";
import { getTryOnProvider } from "@/lib/tryon/provider";
import { errorResponse, isUuid, readGuestId, tryonRpc } from "@/lib/tryon/server";

export const dynamic = "force-dynamic";

type SessionBundle = {
  session: { product_id: string; category: string; mode: "quick" | "premium"; selected_size: string | null; selected_color: string | null };
  inputs: { type: string }[];
};

/** Runs the configured provider (mock in Phase 1) and records the four views. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const sessionId = body?.sessionId;
  if (!isUuid(sessionId)) return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  const guest = await readGuestId();

  const { data, error } = await tryonRpc("tryon_get", { p_session: sessionId, p_guest: guest });
  if (error) return errorResponse(error.message);
  const bundle = data as SessionBundle | null;
  if (!bundle) return errorResponse("not_found");
  if (!bundle.inputs.length) return errorResponse("no_inputs");

  const provider = getTryOnProvider();
  await tryonRpc("tryon_set_status", { p_session: sessionId, p_guest: guest, p_status: "processing", p_provider: provider.id });

  try {
    const outputs = await provider.generate({
      sessionId,
      productId: bundle.session.product_id,
      category: bundle.session.category,
      mode: bundle.session.mode,
      size: bundle.session.selected_size,
      color: bundle.session.selected_color,
      inputTypes: bundle.inputs.map((i) => i.type),
    });
    const rec = await tryonRpc("tryon_record_outputs", {
      p_session: sessionId,
      p_guest: guest,
      p_provider: provider.id,
      p_outputs: outputs,
    });
    if (rec.error) return errorResponse(rec.error.message);
    return NextResponse.json({ ok: true, provider: provider.id, live: provider.live });
  } catch {
    await tryonRpc("tryon_set_status", { p_session: sessionId, p_guest: guest, p_status: "failed", p_provider: provider.id });
    return NextResponse.json({ error: "We couldn’t generate your preview. Please try again." }, { status: 502 });
  }
}
