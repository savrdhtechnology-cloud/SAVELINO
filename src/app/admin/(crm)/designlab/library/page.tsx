import type { Metadata } from "next";
import { Library } from "@/components/designlab/Library";

export const metadata: Metadata = { title: "DesignLab · Library" };
export default function Page() {
  return <Library />;
}
