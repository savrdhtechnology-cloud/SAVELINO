import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { adminModules } from "@/lib/portals";
import { getSessionContext } from "@/lib/supabase/server";

/** Always render per request: session and backend configuration are read at runtime. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin CRM",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSessionContext();
  if (session.configured) {
    if (!session.user) redirect("/login?next=/admin");
    // Admin role comes from the profiles table (server-side), never from the client.
    if (!("role" in session) || session.role !== "admin") notFound();
  }

  return (
    <PortalShell eyebrow="SAVLINO CRM" title="Admin" basePath="/admin" overviewLabel="Dashboard" links={adminModules}>
      {children}
    </PortalShell>
  );
}
