import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { PartnerProgram } from "@/components/sections/PartnerProgram";

export const metadata: Metadata = {
  title: "Partner referral program",
  description: "Join the SAVLINO partner referral program — apply, receive your referral code and earn commission on verified orders.",
  alternates: { canonical: "/partner" },
};

export default function PartnerPage() {
  return (
    <PageShell>
      <PartnerProgram />
    </PageShell>
  );
}
