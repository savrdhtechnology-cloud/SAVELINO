import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireStoreAdmin } from "@/lib/store/admin-auth";
import { STORE_TAG, adminDeleteImage } from "@/lib/store/products-server";
import { isUuid } from "@/lib/store/validate";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireStoreAdmin();
  if (denied) return denied;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await adminDeleteImage(id);
  revalidateTag(STORE_TAG);
  return NextResponse.json({ ok: true });
}
