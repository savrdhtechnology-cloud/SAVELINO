import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Create account", alternates: { canonical: "/register" } };

export default function RegisterPage() {
  return (
    <AuthPage
      mode="register"
      audience="customer"
      eyebrow="Registration"
      title="Begin your SAVLINO story"
      intro="One account for your orders, measurements, wishlist and returns — kept private and secure."
    />
  );
}
