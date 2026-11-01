import { NextResponse } from "next/server";
import { getImage } from "@/lib/store/products-server";
import { isUuid } from "@/lib/store/validate";

/** Serves a product photo stored in Neon. Image ids never change content, so they cache forever. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return new NextResponse("Not found", { status: 404 });
  try {
    const img = await getImage(id);
    if (!img) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(new Uint8Array(Buffer.from(img.b64, "base64")), {
      headers: { "Content-Type": img.mime, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new NextResponse("Unavailable", { status: 503 });
  }
}
