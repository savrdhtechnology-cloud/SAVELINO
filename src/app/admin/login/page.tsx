import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/crm/LoginForm";
import { getSiteSettings } from "@/lib/settings-server";

export const metadata: Metadata = { title: "Sign in · SAVLINO CRM", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  const { crm } = await getSiteSettings();
  return (
    <Suspense>
      <LoginForm crm={crm} />
    </Suspense>
  );
}
