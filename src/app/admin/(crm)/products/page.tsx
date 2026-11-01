import type { Metadata } from "next";
import { Products } from "@/components/crm/Products";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  return <Products initialQuery={q ?? ""} initialStatus={status ?? "all"} />;
}
