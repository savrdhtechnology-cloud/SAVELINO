import type { Metadata } from "next";
import { Settings } from "@/components/crm/Settings";
import { getSessionContext } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getSessionContext();
  const me = session.configured && session.user && "role" in session ? { id: session.user.id, role: session.role } : { id: "", role: "none" };
  return <Settings me={me} />;
}
