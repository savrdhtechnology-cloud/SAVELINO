import type { Metadata } from "next";
import { ProductStudio } from "@/components/crm/ProductStudio";

export const metadata: Metadata = { title: "Product Studio" };

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  return <ProductStudio productId={id && /^[0-9a-f-]{36}$/i.test(id) ? id : null} />;
}
