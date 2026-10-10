import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPage } from "@/components/portal/SectionPage";
import { partnerSections } from "@/lib/portals";

type Params = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { section } = await params;
  return { title: partnerSections.find((s) => s.slug === section)?.title ?? "Partner" };
}

export default async function PartnerSectionPage({ params }: Params) {
  const { section: slug } = await params;
  const section = partnerSections.find((s) => s.slug === slug);
  if (!section) notFound();
  return <SectionPage section={section} loginPath={`/partner/login?next=/partner/dashboard/${slug}`} />;
}
