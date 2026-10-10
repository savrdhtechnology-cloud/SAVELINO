import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Partner login", alternates: { canonical: "/partner/login" } };

export default function PartnerLoginPage() {
  return (
    <AuthPage
      mode="login"
      audience="partner"
      eyebrow="Partner login"
      title="Partner dashboard"
      intro="Sign in to see your referral code and link, referred orders, commission status and payout history."
    />
  );
}
