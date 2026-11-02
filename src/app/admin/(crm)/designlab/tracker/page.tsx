import type { Metadata } from "next";
import { Suspense } from "react";
import { Tracker } from "@/components/designlab/Tracker";

export const metadata: Metadata = { title: "DesignLab · Production Tracker" };
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Tracker />
    </Suspense>
  );
}
