import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { SETTINGS_TAG } from "@/lib/settings-server";
import { getSessionContext } from "@/lib/supabase/server";

/** Called by CRM Settings/Studio after saving so the website shows changes immediately. Admins only. */
export async function POST() {
  const session = await getSessionContext();
  if (!session.configured || !session.user || !("role" in session) || session.role !== "admin") {
    return NextResponse.json({ ok: false }, { status: 403 });
  }
  revalidateTag(SETTINGS_TAG);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
