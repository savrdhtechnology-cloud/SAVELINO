import { NextResponse } from "next/server";
import { requireStoreAdmin } from "@/lib/store/admin-auth";
import { adminListOrders } from "@/lib/store/products-server";

export async function GET() {
  const denied = await requireStoreAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json({ orders: await adminListOrders() });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load orders" }, { status: 400 });
  }
}
