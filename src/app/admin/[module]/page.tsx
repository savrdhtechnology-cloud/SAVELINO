import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Dashboard } from "@/components/admin/Dashboard";
import { ModuleView } from "@/components/admin/ModuleView";
import { getModule } from "@/lib/admin/modules";
import { isBackendConfigured } from "@/lib/supabase/env";

type Params = { params: Promise<{ module: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { module: slug } = await params;
  return { title: slug === "analytics" ? "Analytics" : (getModule(slug)?.title ?? "CRM") };
}

export default async function AdminModulePage({ params }: Params) {
  const { module: slug } = await params;
  const live = isBackendConfigured();
  if (slug === "analytics") return <Dashboard live={live} variant="analytics" />;
  if (!getModule(slug)) notFound();
  return <ModuleView slug={slug} live={live} />;
}
