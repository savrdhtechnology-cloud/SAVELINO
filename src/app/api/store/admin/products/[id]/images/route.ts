import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireStoreAdmin } from "@/lib/store/admin-auth";
import { STORE_TAG, adminAddImage, adminOrderImages } from "@/lib/store/products-server";
import { isUuid } from "@/lib/store/validate";

type Ctx = { params: Promise<{ id: string }> };
const MIMES = new Set(["image/webp", "image/jpeg", "image/png"]);
const MAX_BYTES = 3 * 1024 * 1024;

/** Adds one photo (sent as base64; the CRM resizes it to WebP in the browser first). */
export async function POST(req: Request, { params }: Ctx) {
  const denied = await requireStoreAdmin();
  if (denied) return denied;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { mime?: unknown; data?: unknown; width?: unknown; height?: unknown } | null;
  const mime = typeof body?.mime === "string" ? body.mime : "";
  const data = typeof body?.data === "string" ? body.data : "";
  if (!MIMES.has(mime) || !data || !/^[A-Za-z0-9+/=]+$/.test(data)) return NextResponse.json({ error: "Unsupported image" }, { status: 400 });
  if ((data.length * 3) / 4 > MAX_BYTES) return NextResponse.json({ error: "Photo is too large (max 3 MB)" }, { status: 400 });
  const dim = (v: unknown) => (typeof v === "number" && v > 0 && v < 10000 ? Math.round(v) : 0);
  try {
    const imageId = await adminAddImage(id, { mime, data, width: dim(body?.width), height: dim(body?.height) });
    revalidateTag(STORE_TAG);
    return NextResponse.json({ id: imageId });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Upload failed" }, { status: 400 });
  }
}

/** Reorders photos: body { ids: [...] } — the first becomes the cover. */
export async function PUT(req: Request, { params }: Ctx) {
  const denied = await requireStoreAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? body.ids.filter(isUuid).slice(0, 30) : [];
  if (!isUuid(id) || ids.length === 0) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await adminOrderImages(id, ids);
  revalidateTag(STORE_TAG);
  return NextResponse.json({ ok: true });
}
