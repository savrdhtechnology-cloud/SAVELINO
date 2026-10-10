import type { Metadata } from "next";
import { AuthPage } from "@/components/auth/AuthPage";

export const metadata: Metadata = { title: "Sign in", alternates: { canonical: "/login" } };

export default function LoginPage() {
  return (
    <AuthPage
      mode="login"
      audience="customer"
      eyebrow="Customer login"
      title="Welcome back to SAVLINO"
      intro="Sign in to view your orders, track deliveries, manage your wishlist and saved addresses."
    />
  );
}
