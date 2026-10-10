import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { partnerSections } from "@/lib/portals";
import { getSessionContext } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partner dashboard",
  robots: { index: false, follow: false },
};

export default async function PartnerDashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSessionContext();
  if (session.configured) {
    if (!session.user) redirect("/partner/login?next=/partner/dashboard");
    if (session.role === "admin") redirect("/admin");
    if (session.role !== "partner") redirect("/account");
  }
  return (
    <PortalShell
      eyebrow="Partner portal"
      title="Partner dashboard"
      basePath="/partner/dashboard"
      overviewLabel="Dashboard"
      links={partnerSections}
    >
      {children}
    </PortalShell>
  );
}
