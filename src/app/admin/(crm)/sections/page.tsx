import type { Metadata } from "next";
import { WebsiteSections } from "@/components/crm/WebsiteSections";

export const metadata: Metadata = { title: "Website Sections" };

export default function WebsiteSectionsPage() {
  return <WebsiteSections />;
}
