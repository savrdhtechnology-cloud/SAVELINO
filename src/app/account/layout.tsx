import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { customerSections } from "@/lib/portals";

/** Always render per request: session and backend configuration are read at runtime. */
export const dynamic = "force-dynamic";

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
