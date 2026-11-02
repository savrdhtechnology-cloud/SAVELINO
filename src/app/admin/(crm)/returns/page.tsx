import type { Metadata } from "next";
import { Returns } from "@/components/crm/Returns";

export const metadata: Metadata = { title: "Returns & Exchanges" };

export default function ReturnsPage() {
  return <Returns />;
}
