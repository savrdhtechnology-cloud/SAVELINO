import type { Metadata } from "next";
import { Orders } from "@/components/crm/Orders";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const { open } = await searchParams;
  return <Orders openId={open} />;
}
