import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireStoreAdmin } from "@/lib/store/admin-auth";
import { STORE_TAG, adminCreateProduct, adminListProducts } from "@/lib/store/products-server";
import { parseProductInput } from "@/lib/store/validate";

const fail = (e: unknown) => {
  const msg = e instanceof Error ? e.message : "Something went wrong";
  return NextResponse.json({ error: msg.includes("products_slug_key") ? "Another product already uses this web address" : msg }, { status: 400 });
};

export async function GET() {
  const denied = await requireStoreAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json({ products: await adminListProducts() });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  const denied = await requireStoreAdmin();
  if (denied) return denied;
  const parsed = parseProductInput(await req.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const id = await adminCreateProduct(parsed.value);
    revalidateTag(STORE_TAG);
    return NextResponse.json({ id });
  } catch (e) {
    return fail(e);
  }
}
