import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { customerSections } from "@/lib/portals";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <PortalShell
      eyebrow="Customer portal"
      title="My SAVLINO"
      basePath="/account"
      overviewLabel="Overview"
      links={customerSections}
    >
      {children}
    </PortalShell>
  );
}
