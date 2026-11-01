import { NextResponse } from "next/server";
import { requireStoreAdmin } from "@/lib/store/admin-auth";
import { adminSetOrderStatus } from "@/lib/store/products-server";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/store/types";
import { isUuid } from "@/lib/store/validate";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireStoreAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { status?: unknown } | null;
  const status = body?.status as OrderStatus;
  if (!isUuid(id) || !ORDER_STATUSES.includes(status)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!(await adminSetOrderStatus(id, status))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
