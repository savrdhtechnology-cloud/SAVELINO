import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireStoreAdmin } from "@/lib/store/admin-auth";
import { STORE_TAG, adminDeleteProduct, adminUpdateProduct } from "@/lib/store/products-server";
import { isUuid, parseProductInput } from "@/lib/store/validate";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const denied = await requireStoreAdmin();
  if (denied) return denied;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = parseProductInput(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    if (!(await adminUpdateProduct(id, parsed.value))) return NextResponse.json({ error: "Not found" }, { status: 404 });
    revalidateTag(STORE_TAG);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save";
    return NextResponse.json({ error: msg.includes("products_slug_key") ? "Another product already uses this web address" : msg }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const denied = await requireStoreAdmin();
  if (denied) return denied;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await adminDeleteProduct(id);
  revalidateTag(STORE_TAG);
  return NextResponse.json({ ok: true });
}
