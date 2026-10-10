import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPage } from "@/components/portal/SectionPage";
import { adminModules } from "@/lib/portals";

type Params = { params: Promise<{ module: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { module: slug } = await params;
  return { title: adminModules.find((m) => m.slug === slug)?.title ?? "Admin" };
}

export default async function AdminModulePage({ params }: Params) {
  const { module: slug } = await params;
  const section = adminModules.find((m) => m.slug === slug);
  if (!section) notFound();
  return <SectionPage section={section} loginPath={`/login?next=/admin/${slug}`} />;
}
