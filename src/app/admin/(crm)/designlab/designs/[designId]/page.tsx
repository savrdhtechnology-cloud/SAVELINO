import type { Metadata } from "next";
import { Workspace } from "@/components/designlab/Workspace";

export const metadata: Metadata = { title: "DesignLab · Workspace" };
export default async function Page({ params }: { params: Promise<{ designId: string }> }) {
  const { designId } = await params;
  return <Workspace designKey={decodeURIComponent(designId)} />;
}
