import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { partnerSections } from "@/lib/portals";

export const metadata: Metadata = {
  title: "Partner dashboard",
  robots: { index: false, follow: false },
};

export default function PartnerDashboardLayout({ children }: { children: ReactNode }) {
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
