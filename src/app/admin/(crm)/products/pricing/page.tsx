import type { Metadata } from "next";
import { PriceManager } from "@/components/crm/PriceManager";

export const metadata: Metadata = { title: "Price Manager" };

export default function PricingPage() {
  return <PriceManager />;
}
