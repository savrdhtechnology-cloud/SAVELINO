import type { Metadata } from "next";
import { Inventory } from "@/components/crm/Inventory";

export const metadata: Metadata = { title: "Inventory" };

export default function InventoryPage() {
  return <Inventory />;
}
