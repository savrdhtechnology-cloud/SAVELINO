/**
 * Preview data for the Design & Production Studio, used ONLY when the CRM runs without
 * a database connection (local preview / CI screenshots). Production never loads it.
 */
import { DEMO_REFERENCE_DATE } from "@/lib/admin/demo";
import { demoMaterials, demoTeam } from "@/lib/admin/demo-business";
import type { Row } from "@/lib/admin/types";
import { DEFAULT_SPEC, STANDARD_SIZES, STARTER_MEASUREMENTS, type DesignSpec } from "./constants";
import { draftPieces } from "./drafting";

const day = 86400000;
const iso = (offsetDays: number) => new Date(DEMO_REFERENCE_DATE + offsetDays * day).toISOString();

export function seedAtelierDemo(): Record<string, Row[]> {
  const specA: DesignSpec = { ...DEFAULT_SPEC, instructions: "Princess seams pressed open. Zardozi panel centred on CF, 2 cm below neckline." };
  const specB: DesignSpec = { ...DEFAULT_SPEC, neckline: "boat", backNeck: "keyhole", sleeve: "puff", cut: "darted", darts: ["bust", "waist"], embroidery: "Sequin", lining: "Butter crepe", colors: ["Ivory", "Gold"] };
  const specC: DesignSpec = { ...DEFAULT_SPEC, neckline: "v", backNeck: "v", sleeve: "sleeveless", cut: "katori", embroidery: "Aari", colors: ["Emerald"] };

  const designs: Row[] = [
    { id: "dz1", code: "DS-RANI01", name: "Rani princess-cut blouse", category: "designer-blouses", status: "approved", spec: specA, sketches: [], current_version: 4, created_at: iso(-30), updated_at: iso(-6), approved_at: iso(-6) },
    { id: "dz2", code: "DS-NOOR02", name: "Noor puff-sleeve blouse", category: "designer-blouses", status: "sample", spec: specB, sketches: [], current_version: 2, created_at: iso(-12), updated_at: iso(-2) },
    { id: "dz3", code: "DS-ZOYA03", name: "Zoya katori sleeveless", category: "designer-blouses", status: "draft", spec: specC, sketches: [], current_version: 1, created_at: iso(-3), updated_at: iso(-1) },
  ];
  const versions: Row[] = [
    ...[1, 2, 3, 4].map((v) => ({ id: `dv1-${v}`, design_id: "dz1", version: v, name: "Rani princess-cut blouse", status: v === 4 ? "approved" : "draft", spec: specA, created_at: iso(-30 + v * 6) })),
    ...[1, 2].map((v) => ({ id: `dv2-${v}`, design_id: "dz2", version: v, name: "Noor puff-sleeve blouse", status: v === 2 ? "sample" : "draft", spec: specB, created_at: iso(-12 + v * 5) })),
    { id: "dv3-1", design_id: "dz3", version: 1, name: "Zoya katori sleeveless", status: "draft", spec: specC, created_at: iso(-3) },
  ];

  const chart: Row = { id: "sc1", category: "designer-blouses", name: "Blouse standard sizes", version: 2, status: "approved", unit: "cm", approved_at: iso(-20), created_at: iso(-40) };
  const measurements: Row[] = STANDARD_SIZES.map((s) => ({ id: `sm-${s}`, size_chart_id: "sc1", size: s, ...STARTER_MEASUREMENTS[s] }));

  const pieces: Row[] = [];
  for (const size of ["34", "36", "38"]) {
    for (const g of draftPieces(STARTER_MEASUREMENTS[size], specA)) {
      if (g.piece.startsWith("lining_sleeve")) continue;
      pieces.push({
        id: `pp-${size}-${g.piece}`,
        design_id: "dz1",
        design_version: 4,
        size_chart_id: "sc1",
        size,
        piece_type: g.piece,
        version: 1,
        status: size === "38" ? "in_review" : "approved",
        geometry: g,
        seam_allowance: g.seamAllowance,
        annotations: [],
        approved_at: size === "38" ? null : iso(-5),
        created_at: iso(-8),
      });
    }
  }

  const layouts: Row[] = [
    { id: "cl1", design_id: "dz1", size: "36", fabric_role: "main", fabric_width_cm: 112, layout_type: "folded", marker_length_cm: 148, pieces_per_marker: 2, shrinkage_pct: 3, status: "verified", verified_at: iso(-5), notes: "Marker checked on cutting table, 2 pcs nested" },
    { id: "cl2", design_id: "dz1", size: "36", fabric_role: "lining", fabric_width_cm: 112, layout_type: "folded", marker_length_cm: 92, pieces_per_marker: 2, shrinkage_pct: 2, status: "verified", verified_at: iso(-5) },
    { id: "cl3", design_id: "dz1", size: "38", fabric_role: "main", fabric_width_cm: 112, layout_type: "folded", marker_length_cm: 156, pieces_per_marker: 2, shrinkage_pct: 3, status: "estimated" },
  ];

  const mats = demoMaterials();
  const bom: Row[] = [
    { id: "bm1", design_id: "dz1", item_type: "main_fabric", material_id: mats[1].id, unit: "metre", qty_per_piece: 0.8, wastage_pct: 0, description: "Raw silk · Burgundy" },
    { id: "bm2", design_id: "dz1", item_type: "lining", material_id: null, unit: "metre", qty_per_piece: 0.5, wastage_pct: 0, description: "Cotton cambric" },
    { id: "bm3", design_id: "dz1", item_type: "hooks", material_id: null, unit: "pcs", qty_per_piece: 6, wastage_pct: 5, description: "Hook & eye, size 2" },
    { id: "bm4", design_id: "dz1", item_type: "thread", material_id: mats[4].id, unit: "spool", qty_per_piece: 0.25, wastage_pct: 10, description: "Zari thread · antique gold" },
    { id: "bm5", design_id: "dz1", item_type: "pads", material_id: null, unit: "pair", qty_per_piece: 1, wastage_pct: 0, description: "Moulded cups" },
    { id: "bm6", design_id: "dz1", item_type: "label", material_id: null, unit: "pcs", qty_per_piece: 2, wastage_pct: 0, description: "SAVLINO woven label + size label" },
    { id: "bm7", design_id: "dz1", item_type: "packaging", material_id: null, unit: "set", qty_per_piece: 1, wastage_pct: 0, description: "Gift box + tissue" },
  ];

  const batches: Row[] = [
    { id: "pb1", batch_no: "PB-261002-A1F3", design_id: "dz1", design_version: 4, size: "36", color: "Wine", quantity: 12, priority: "high", due_date: iso(6).slice(0, 10), status: "stitching", created_at: iso(-4) },
    { id: "pb2", batch_no: "PB-261005-B7C2", design_id: "dz1", design_version: 4, size: "34", color: "Noir", quantity: 8, priority: "normal", due_date: iso(12).slice(0, 10), status: "material_reserved", created_at: iso(-2) },
    { id: "pb3", batch_no: "PB-260924-C3D9", design_id: "dz1", design_version: 4, size: "36", color: "Noir", quantity: 10, priority: "normal", due_date: iso(-1).slice(0, 10), status: "quality_check", created_at: iso(-12) },
    { id: "pb4", batch_no: "PB-260915-D2E4", design_id: "dz1", design_version: 3, size: "36", color: "Wine", quantity: 6, priority: "low", due_date: iso(-8).slice(0, 10), status: "stock_received", created_at: iso(-20) },
    { id: "pb5", batch_no: "PB-261008-E9A1", design_id: "dz1", design_version: 4, size: "38", color: "Wine", quantity: 6, priority: "urgent", due_date: iso(9).slice(0, 10), status: "draft", created_at: iso(-1) },
  ];

  const team = demoTeam().map((t, i) => ({ ...t, atelier_role: ["pattern_master", "cutter", "tailor", "designer", "qc_inspector", null][i], user_id: i < 3 || i === 4 ? `user-${t.id}` : null }));
  const taskMats = bom.map((b) => ({ item: b.item_type, material: b.description, unit: b.unit, per_piece: b.qty_per_piece }));
  const tasks: Row[] = [
    { id: "pt1", batch_id: "pb1", stage: "cutting", title: "Cut Rani princess-cut blouse · size 36", instructions: "Cut using the approved pattern set and the verified marker only.", quantity: 12, status: "done", materials: taskMats, minutes_worked: 140, completed_at: iso(-2) },
    { id: "pt2", batch_id: "pb1", stage: "stitching", title: "Stitch Rani princess-cut blouse · size 36", instructions: String(specA.instructions), quantity: 12, status: "in_progress", materials: taskMats, minutes_worked: 210, started_at: iso(-1) },
    { id: "pt3", batch_id: "pb1", stage: "finishing", title: "Finish & press Rani princess-cut blouse · size 36", instructions: "Hooks, hems, pressing and trims.", quantity: 12, status: "todo", materials: taskMats, minutes_worked: 0 },
    { id: "pt4", batch_id: "pb2", stage: "cutting", title: "Cut Rani princess-cut blouse · size 34", instructions: "Cut using the approved pattern set and the verified marker only.", quantity: 8, status: "todo", materials: taskMats, minutes_worked: 0 },
    { id: "pt5", batch_id: "pb3", stage: "finishing", title: "Finish & press Rani princess-cut blouse · size 36", instructions: "Hooks, hems, pressing.", quantity: 10, status: "done", materials: taskMats, minutes_worked: 95 },
  ];
  const assignments: Row[] = [
    { id: "wa1", task_id: "pt1", team_member_id: "tm2" },
    { id: "wa2", task_id: "pt2", team_member_id: "tm3" },
    { id: "wa3", task_id: "pt3", team_member_id: "tm3" },
    { id: "wa4", task_id: "pt4", team_member_id: "tm2" },
    { id: "wa5", task_id: "pt5", team_member_id: "tm1" },
  ];
  const notes: Row[] = [
    { id: "tn1", task_id: "pt2", kind: "clarification", message: "Should the zardozi panel continue past the princess seam?", resolved: false, created_at: iso(-0.5) },
    { id: "tn2", task_id: "pt2", kind: "shortage", message: "Short on hook & eye size 2 — need 1 more pack.", quantity: 1, resolved: false, created_at: iso(-0.3) },
  ];
  const consumption: Row[] = [
    { id: "mc1", batch_id: "pb1", material_id: mats[1].id, kind: "reserved", quantity: 9.15, unit: "metre", basis: "verified_marker", created_at: iso(-3) },
    { id: "mc2", batch_id: "pb1", material_id: mats[1].id, kind: "actual", quantity: 8.9, unit: "metre", basis: "manual", created_at: iso(-2) },
    { id: "mc3", batch_id: "pb1", material_id: mats[4].id, kind: "reserved", quantity: 3.3, unit: "spool", basis: "bom", created_at: iso(-3) },
  ];
  const qc: Row[] = [
    { id: "qi1", batch_id: "pb4", result: "approved", approved_quantity: 6, rejected_quantity: 0, checklist: {}, notes: "All within ±0.5 cm", inspected_at: iso(-9) },
  ];
  const approvals: Row[] = [
    { id: "ap1", subject: "design", design_id: "dz1", design_version: 4, decision: "approved", comment: "Approved for Diwali drop", decided_at: iso(-6) },
    { id: "ap2", subject: "size_chart", size_chart_id: "sc1", decision: "approved", comment: "Verified on fit model", decided_at: iso(-20) },
  ];
  return {
    garment_designs: designs,
    design_versions: versions,
    size_charts: [chart, { id: "sc0", category: "designer-blouses", name: "Blouse standard sizes", version: 1, status: "archived", unit: "cm", created_at: iso(-90) }],
    size_measurements: measurements,
    pattern_pieces: pieces,
    cutting_layouts: layouts,
    design_bom: bom,
    production_batches: batches,
    production_tasks: tasks,
    worker_assignments: assignments,
    production_task_notes: notes,
    material_consumption: consumption,
    quality_inspections: qc,
    design_approvals: approvals,
    materials: mats,
    team_members: team,
    product_variants: [{ id: "pv1", sku: "SAV-RANI-36-WINE", size: "36", color: "Wine" }, { id: "pv2", sku: "SAV-RANI-34-NOIR", size: "34", color: "Noir" }],
    atelier_audit_log: [],
  };
}
