import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Become a partner", alternates: { canonical: "/partner/register" } };

export default function PartnerRegisterPage() {
  return (
    <AuthPage
      mode="register"
      audience="partner"
      eyebrow="Partner registration"
      title="Apply to the SAVLINO partner program"
      intro="Boutiques, stylists, tailors and creators are welcome. Every application is reviewed by our team before a referral code is issued."
    />
  );
}
