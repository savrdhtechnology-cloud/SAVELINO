import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { customerSections } from "@/lib/portals";
import { getSessionContext } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default async function AccountLayout({ children }: { children: ReactNode }) {
  const session = await getSessionContext();
  if (session.configured) {
    if (!session.user) redirect("/login?next=/account");
    if (session.role === "admin") redirect("/admin");
    if (session.role === "partner") redirect("/partner/dashboard");
    if (session.role === "worker") redirect("/worker");
  }

  return (
    <PortalShell
      eyebrow="Customer portal"
      title="My SAVLINO"
      basePath="/account"
      overviewLabel="Overview"
      links={[...customerSections, { slug: "try-ons", title: "Try-On previews" }]}
    >
      {children}
    </PortalShell>
  );
}
