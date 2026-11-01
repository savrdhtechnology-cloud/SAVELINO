import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CATALOG_TAG } from "@/lib/data/catalog-server";
import { SETTINGS_TAG } from "@/lib/settings-server";
import { getSessionContext, isStaffRole } from "@/lib/supabase/server";

/** Called by the CRM after saving so the website shows changes immediately. Staff only. */
export async function POST() {
  const session = await getSessionContext();
  if (!session.configured || !session.user || !("role" in session) || !isStaffRole(session.role)) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  revalidateTag(SETTINGS_TAG);
  revalidateTag(CATALOG_TAG);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
