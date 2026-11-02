import "server-only";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient, getSessionContext, isStaffRole } from "@/lib/supabase/server";
import type { SpecInput } from "./requirements";

/** Signed-in staff only; returns a Supabase client that carries their session (so RLS still applies). */
export async function staffClient() {
  const session = await getSessionContext();
  if (!session.configured) notFound();
  if (!session.user) redirect("/admin/login");
  if (!("role" in session) || !isStaffRole(session.role)) notFound();
  const sb = await createSupabaseServerClient();
  if (!sb) notFound();
  return sb;
}

export type TemplateRow = { size_label: string; sort_order: number; unit: "in" | "cm"; body: Record<string, string>; garment: Record<string, string>; ease: Record<string, string>; cutting: Record<string, string>; seam_allowance: number | null; verified: boolean };
export type RevisionRow = TemplateRow & { revision: number; status: string; sample_verified: boolean; sample_verified_by: string | null; pattern_code?: string };

export type SizeData = { size: string; spec: SpecInput & { body: Record<string, string>; cutting: Record<string, string>; ease: Record<string, string> }; source: "approved" | "revision" | "template" | "none"; verified: boolean; revision?: number; pattern?: string };

const RANK: Record<string, number> = { approved: 0, submitted: 1, draft: 2, rejected: 3, superseded: 4 };

/** Per size: the design's approved revision, else its latest revision, else the size template (clearly flagged). */
export function pickSizes(templates: TemplateRow[], revisions: RevisionRow[], wanted: string[]): SizeData[] {
  return wanted.map((size) => {
    const revs = revisions.filter((r) => r.size_label === size).sort((a, b) => (RANK[a.status] ?? 9) - (RANK[b.status] ?? 9) || b.revision - a.revision);
    const r = revs[0];
    const t = templates.find((x) => x.size_label === size);
    const src = r ?? t;
    if (!src) return { size, spec: { unit: "in", garment: {}, body: {}, cutting: {}, ease: {}, seam: null }, source: "none", verified: false };
    return {
      size,
      spec: { unit: src.unit, garment: src.garment ?? {}, body: src.body ?? {}, cutting: src.cutting ?? {}, ease: src.ease ?? {}, seam: src.seam_allowance == null ? null : Number(src.seam_allowance) },
      source: r ? (r.status === "approved" ? "approved" : "revision") : "template",
      verified: r ? r.status === "approved" && r.sample_verified : false,
      revision: r?.revision,
      pattern: r?.pattern_code,
    };
  });
}
