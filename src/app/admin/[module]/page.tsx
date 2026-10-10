import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Dashboard } from "@/components/admin/Dashboard";
import { ModuleView } from "@/components/admin/ModuleView";
import { Launchpad } from "@/components/admin/Launchpad";
import { SettingsApp } from "@/components/admin/SettingsApp";
import { StudioApp } from "@/components/admin/StudioApp";
import { TryOnAdmin } from "@/components/admin/TryOnAdmin";
import { getModule } from "@/lib/admin/modules";
import { isBackendConfigured } from "@/lib/supabase/env";

type Params = { params: Promise<{ module: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { module: slug } = await params;
  const special: Record<string, string> = { analytics: "Analytics", apps: "All apps", settings: "Settings", studio: "Studio", "virtual-try-ons": "Virtual Try-Ons" };
  return { title: special[slug] ?? getModule(slug)?.title ?? "CRM" };
}

export default async function AdminModulePage({ params }: Params) {
  const { module: slug } = await params;
  const live = isBackendConfigured();
  if (slug === "analytics") return <Dashboard live={live} variant="analytics" />;
  if (slug === "apps") return <Launchpad />;
  if (slug === "settings") return <SettingsApp live={live} />;
  if (slug === "studio") return <StudioApp live={live} />;
  if (slug === "virtual-try-ons") return <TryOnAdmin live={live} />;
  if (!getModule(slug)) notFound();
  return <ModuleView slug={slug} live={live} />;
}
