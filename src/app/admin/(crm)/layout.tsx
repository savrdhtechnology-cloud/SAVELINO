import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { CrmShell } from "@/components/crm/CrmShell";
import { NoAccess } from "@/components/crm/NoAccess";
import { getSiteSettings } from "@/lib/settings-server";
import { getSessionContext, isStaffRole } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "SAVLINO Commerce CRM", template: "%s · SAVLINO CRM" },
  robots: { index: false, follow: false },
};

export default async function CrmLayout({ children }: { children: ReactNode }) {
  const session = await getSessionContext();
  const { crm } = await getSiteSettings();
  if (!session.configured) return <NoAccess crm={crm} reason="setup" />;
  if (!session.user) redirect("/admin/login");
  if (!("role" in session) || !isStaffRole(session.role)) return <NoAccess crm={crm} reason="role" email={session.user.email} />;
  return (
    <CrmShell crm={crm} user={{ name: session.user.name, email: session.user.email, role: session.role }}>
      {children}
    </CrmShell>
  );
}
