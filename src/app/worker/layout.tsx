import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionContext } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Worker Portal", template: "%s · SAVLINO Atelier" },
  robots: { index: false, follow: false },
};

/** Atelier workers only (administrators may open it to preview). Role is read server-side. */
export default async function WorkerLayout({ children }: { children: ReactNode }) {
  const session = await getSessionContext();
  if (session.configured) {
    if (!session.user) redirect("/login?next=/worker");
    if (!("role" in session) || (session.role !== "worker" && session.role !== "admin")) notFound();
  }
  return <div className="min-h-screen bg-noir text-ivory">{children}</div>;
}
