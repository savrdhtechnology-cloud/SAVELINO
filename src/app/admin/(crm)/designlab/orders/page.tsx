import type { Metadata } from "next";
import { Orders } from "@/components/designlab/Orders";

export const metadata: Metadata = { title: "DesignLab · Job Orders" };
export default function Page() {
  return <Orders />;
}
