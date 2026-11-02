"use client";

import { useEffect, useState } from "react";
import { db, must } from "@/components/crm/data";

export type DesignStatus = "new" | "in_review" | "approved" | "in_production" | "completed";
export const DESIGN_STATUS: Record<DesignStatus, { label: string; color: string }> = {
  new: { label: "New", color: "#e0a83a" },
  in_review: { label: "In review", color: "#5aa0e8" },
  approved: { label: "Approved", color: "#58c48a" },
  in_production: { label: "In production", color: "#b98cf0" },
  completed: { label: "Completed", color: "#2fa86a" },
};

export type Angle = "unlabeled" | "front" | "back" | "side" | "detail";
export const ANGLES: Angle[] = ["unlabeled", "front", "back", "side", "detail"];

export type DlImage = {
  id: string; design_id: string; url: string; storage_path: string | null; position: number; angle: Angle;
  width: number | null; height: number | null; file_name: string; content_hash: string | null; size_bytes: number | null;
};
export type DlDesign = {
  id: string; design_code: string; name: string; category: string; color: string; source_sku: string | null;
  fabric: string; neckline: string; sleeve: string; closure: string; lining: string; stitching_notes: string;
  status: DesignStatus; archived: boolean; product_id: string | null; batch_id: string | null;
  approved_at: string | null; created_at: string; updated_at: string;
  designlab_images?: DlImage[];
};

export type Measures = Record<string, string>;
export type SizeTemplate = {
  id: string; size_label: string; sort_order: number; unit: "in" | "cm"; body: Measures; garment: Measures; ease: Measures;
  seam_allowance: number | null; cutting: Measures; notes: string; verified: boolean; verified_by_name: string | null; verified_at: string | null;
};
export type RevisionStatus = "draft" | "submitted" | "approved" | "rejected" | "superseded";
export type Revision = {
  id: string; pattern_id: string; revision: number; size_label: string; size_template_id: string | null; unit: "in" | "cm";
  body: Measures; garment: Measures; ease: Measures; seam_allowance: number | null; cutting: Measures;
  cutting_notes: string; stitching_notes: string; status: RevisionStatus; sample_verified: boolean;
  sample_verified_by: string | null; sample_verified_at: string | null; review_note: string; approved_at: string | null; created_at: string;
};
export type OrderStatus = "draft" | "pattern_approved" | "assigned" | "cutting" | "stitching" | "finishing" | "qc" | "completed" | "cancelled";
export const ORDER_FLOW: OrderStatus[] = ["draft", "pattern_approved", "assigned", "cutting", "stitching", "finishing", "qc", "completed"];
export const ORDER_LABEL: Record<OrderStatus, string> = {
  draft: "Draft", pattern_approved: "Pattern approved", assigned: "Assigned", cutting: "Cutting", stitching: "Stitching",
  finishing: "Finishing", qc: "QC", completed: "Completed", cancelled: "Cancelled",
};
export type OrderItem = { id: string; order_id: string; revision_id: string; size_label: string; quantity: number; produced_qty: number; accepted_qty: number; rejected_qty: number; rework_qty: number };
export type TailorOrder = {
  id: string; order_no: string; design_id: string; product_id: string | null; fabric: string; lining: string; color: string;
  tailor_name: string; tailor_phone: string; delivery_date: string | null; instructions: string; notes: string; status: OrderStatus;
  completed_at: string | null; stock_posted_at: string | null; created_at: string;
  designlab_designs?: Pick<DlDesign, "id" | "design_code" | "name" | "category" | "color"> & { designlab_images?: DlImage[] };
  designlab_order_items?: OrderItem[];
};
export type ProdEvent = { id: string; order_id: string; design_id: string; event_type: string; from_status: string | null; to_status: string | null; note: string; by_name: string; created_at: string };
export type Approval = { id: string; entity_type: string; action: string; note: string; by_name: string; created_at: string };
export type Batch = { id: string; file_name: string; file_size: number; status: string; designs_created: number; images_uploaded: number; images_failed: number; images_skipped: number; report: { failed?: { path: string; reason: string }[]; skipped?: { path: string; reason: string }[] }; created_at: string; finished_at: string | null };

/** The measurement points a tailor needs. Same keys are enforced by the database before a pattern can be approved. */
export const MEASURE_FIELDS: { key: string; label: string; required?: boolean; body?: boolean; garment?: boolean; cutting?: boolean }[] = [
  { key: "bust", label: "Bust", required: true, body: true, garment: true, cutting: true },
  { key: "underbust", label: "Underbust", body: true, garment: true },
  { key: "waist", label: "Waist", required: true, body: true, garment: true },
  { key: "shoulder", label: "Shoulder", required: true, body: true, garment: true, cutting: true },
  { key: "front_length", label: "Front length", required: true, body: true, garment: true, cutting: true },
  { key: "back_length", label: "Back length", required: true, body: true, garment: true, cutting: true },
  { key: "armhole", label: "Armhole", required: true, body: true, garment: true, cutting: true },
  { key: "front_neck_depth", label: "Front neck depth", required: true, body: true, garment: true, cutting: true },
  { key: "back_neck_depth", label: "Back neck depth", required: true, body: true, garment: true, cutting: true },
  { key: "neck_width", label: "Neck width", required: true, body: true, garment: true, cutting: true },
  { key: "sleeve_length", label: "Sleeve length (if any)", body: true, garment: true, cutting: true },
  { key: "sleeve_opening", label: "Sleeve opening", garment: true, cutting: true },
  { key: "closure_allowance", label: "Closure allowance", cutting: true },
  { key: "hem_allowance", label: "Hem allowance", cutting: true },
];

export const sortImages = (imgs: DlImage[] = []) => [...imgs].sort((a, b) => a.position - b.position);
export const coverOf = (d: { designlab_images?: DlImage[] }) => sortImages(d.designlab_images)[0]?.url ?? null;

export async function fetchDesigns(): Promise<DlDesign[]> {
  return must(await db().from("designlab_designs").select("*, designlab_images(*)").order("design_code")) as unknown as DlDesign[];
}
export async function fetchDesign(code: string): Promise<DlDesign | null> {
  const col = /^[0-9a-f-]{36}$/i.test(code) ? "id" : "design_code";
  const rows = must(await db().from("designlab_designs").select("*, designlab_images(*)").eq(col, code).limit(1)) as unknown as DlDesign[];
  return rows[0] ?? null;
}
export async function fetchSizes(): Promise<SizeTemplate[]> {
  return must(await db().from("designlab_size_templates").select("*").order("sort_order").order("size_label")) as unknown as SizeTemplate[];
}
export async function fetchRevisions(designId: string): Promise<Revision[]> {
  const pat = must(await db().from("designlab_patterns").select("id, pattern_code").eq("design_id", designId).limit(1)) as { id: string; pattern_code: string }[];
  if (!pat[0]) return [];
  return must(await db().from("designlab_pattern_revisions").select("*").eq("pattern_id", pat[0].id).order("size_label").order("revision", { ascending: false })) as unknown as Revision[];
}
export async function fetchOrders(filter?: { designId?: string }): Promise<TailorOrder[]> {
  let q = db().from("designlab_tailor_orders").select("*, designlab_designs(id, design_code, name, category, color, designlab_images(*)), designlab_order_items(*)").order("created_at", { ascending: false });
  if (filter?.designId) q = q.eq("design_id", filter.designId);
  return must(await q) as unknown as TailorOrder[];
}
export async function fetchEvents(filter: { orderId?: string; designId?: string }): Promise<ProdEvent[]> {
  let q = db().from("designlab_production_events").select("*").order("created_at", { ascending: false }).limit(300);
  if (filter.orderId) q = q.eq("order_id", filter.orderId);
  if (filter.designId) q = q.eq("design_id", filter.designId);
  return must(await q) as unknown as ProdEvent[];
}
export async function fetchApprovals(designId: string): Promise<Approval[]> {
  return must(await db().from("designlab_approvals").select("*").eq("design_id", designId).order("created_at", { ascending: false })) as unknown as Approval[];
}
export async function fetchBatches(): Promise<Batch[]> {
  return must(await db().from("designlab_import_batches").select("*").order("created_at", { ascending: false }).limit(30)) as unknown as Batch[];
}

/** Server-side workflow functions. Each one re-checks the signed-in user's role in the database. */
export async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");
export const num = (v: string | number | null | undefined) => (v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v));

/** Signed-in staff member's role, so the UI can hide admin-only buttons (the database enforces it regardless). */
export function useRole() {
  const [role, setRole] = useState<string>("staff");
  useEffect(() => {
    void (async () => {
      try {
        const { data } = await db().auth.getUser();
        if (!data.user) return;
        const rows = must(await db().from("profiles").select("role").eq("id", data.user.id).limit(1)) as { role: string }[];
        if (rows[0]) setRole(rows[0].role);
      } catch { /* default: staff */ }
    })();
  }, []);
  return role;
}
