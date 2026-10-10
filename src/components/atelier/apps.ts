import type { ComponentType } from "react";
import { BomApp } from "./BomApp";
import { DesignStudio } from "./DesignStudio";
import { PhotoTemplateStudio } from "./PhotoTemplateStudio";
import { FabricCalculator } from "./FabricCalculator";
import { PatternLibrary } from "./PatternLibrary";
import { ProductionBatches } from "./ProductionBatches";
import { QualityControl } from "./QualityControl";
import { SizeCharts } from "./SizeCharts";
import { WorkerTasks } from "./WorkerTasks";

/** Atelier › Design & Production Studio apps, routed at /admin/<slug>. */
export const ATELIER_APPS: Record<string, { title: string; App: ComponentType<{ live: boolean }> }> = {
  "photo-to-template": { title: "Photo to Template", App: PhotoTemplateStudio },
  "design-studio": { title: "Design Studio", App: DesignStudio },
  "pattern-library": { title: "Pattern Library", App: PatternLibrary },
  "size-charts": { title: "Size Charts", App: SizeCharts },
  "fabric-calculator": { title: "Fabric Calculator", App: FabricCalculator },
  "bill-of-materials": { title: "Bill of Materials", App: BomApp },
  "production-batches": { title: "Production Batches", App: ProductionBatches },
  "worker-tasks": { title: "Worker Tasks", App: WorkerTasks },
  "quality-control": { title: "Quality Control", App: QualityControl },
};
