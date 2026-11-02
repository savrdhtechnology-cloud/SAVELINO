import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { AccountPortal } from "@/components/account/AccountPortal";

export const metadata: Metadata = { title: "My account", robots: { index: false, follow: false } };

export default function AccountPage() {
  return (
    <PageShell>
      <Suspense fallback={<p className="px-5 py-20 text-center text-ivory/60">Loading…</p>}>
        <AccountPortal />
      </Suspense>
    </PageShell>
  );
}
