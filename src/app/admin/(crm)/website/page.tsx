import type { Metadata } from "next";
import { Website } from "@/components/crm/Website";

export const metadata: Metadata = { title: "Appearance Studio" };

export default function WebsitePage() {
  return <Website />;
}
