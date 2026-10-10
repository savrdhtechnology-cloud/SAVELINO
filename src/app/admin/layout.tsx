import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getSessionContext } from "@/lib/supabase/server";

/** Always render per request: session and backend configuration are read at runtime. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "CRM", template: "%s · SAVLINO CRM" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSessionContext();
  if (session.configured) {
    if (!session.user) redirect("/login?next=/admin");
    // Admin role comes from the profiles table (server-side), never from the client.
    if (!("role" in session) || session.role !== "admin") notFound();
  }
  const email = session.configured && session.user ? session.user.email : null;

  return (
    <AdminShell live={session.configured} email={email}>
      {children}
    </AdminShell>
  );
}
