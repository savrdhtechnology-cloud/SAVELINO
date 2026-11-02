import type { Metadata } from "next";
import { ZipImport } from "@/components/designlab/ZipImport";

export const metadata: Metadata = { title: "DesignLab · ZIP Import" };
export default function Page() {
  return <ZipImport />;
}
