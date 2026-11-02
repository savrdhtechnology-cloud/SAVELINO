import type { Metadata } from "next";
import { SizeMaster } from "@/components/designlab/SizeMaster";

export const metadata: Metadata = { title: "DesignLab · Size & Pattern Master" };
export default function Page() {
  return <SizeMaster />;
}
