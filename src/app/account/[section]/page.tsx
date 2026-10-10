import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionPage } from "@/components/portal/SectionPage";
import { customerSections } from "@/lib/portals";

type Params = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { section } = await params;
  return { title: customerSections.find((s) => s.slug === section)?.title ?? "Account" };
}

export default async function AccountSectionPage({ params }: Params) {
  const { section: slug } = await params;
  const section = customerSections.find((s) => s.slug === slug);
  if (!section) notFound();
  return <SectionPage section={section} loginPath={`/login?next=/account/${slug}`} />;
}
