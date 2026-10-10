/** Vocabulary for the SAVLINO Design & Production Studio. */

export const DESIGN_CATEGORIES = [
  { value: "designer-blouses", label: "Designer Blouses", ready: true },
  { value: "salwar-suits", label: "Salwar Suits", ready: false },
  { value: "sarees", label: "Sarees", ready: false },
  { value: "shapewear", label: "Shapewear", ready: false },
  { value: "lingerie", label: "Lingerie", ready: false },
  { value: "loungewear", label: "Loungewear", ready: false },
] as const;

export const NECKLINES = [
  { value: "round", label: "Round" },
  { value: "sweetheart", label: "Sweetheart" },
  { value: "v", label: "V-neck" },
  { value: "boat", label: "Boat" },
  { value: "square", label: "Square" },
  { value: "u", label: "Deep U" },
  { value: "high", label: "High / collar" },
] as const;

export const BACK_NECKS = [
  { value: "round", label: "Round" },
  { value: "deep-u", label: "Deep U" },
  { value: "v", label: "V-back" },
  { value: "square", label: "Square" },
  { value: "keyhole", label: "Keyhole + tie" },
] as const;

export const SLEEVES = [
  { value: "sleeveless", label: "Sleeveless" },
  { value: "cap", label: "Cap" },
  { value: "short", label: "Short" },
  { value: "elbow", label: "Elbow" },
  { value: "three-quarter", label: "Three-quarter" },
  { value: "puff", label: "Puff" },
] as const;

export const CUTS = [
  { value: "darted", label: "Classic darted" },
  { value: "princess", label: "Princess cut" },
  { value: "katori", label: "Katori" },
] as const;

export const DARTS = [
  { value: "bust", label: "Bust darts" },
  { value: "waist", label: "Waist darts" },
  { value: "side", label: "Side darts" },
  { value: "back-waist", label: "Back waist darts" },
] as const;

export const CLOSURES = [
  { value: "front-hooks", label: "Front hooks" },
  { value: "back-hooks", label: "Back hooks" },
  { value: "side-zip", label: "Side zip" },
  { value: "back-zip", label: "Back zip" },
] as const;

export const FABRICS = ["Raw silk", "Banarasi brocade", "Velvet", "Chanderi", "Organza", "Georgette", "Cotton silk", "Satin"] as const;
export const LININGS = ["none", "Cotton cambric", "Butter crepe", "Satin lining", "Shantoon"] as const;
export const EMBROIDERY = ["None", "Zardozi", "Aari", "Sequin", "Thread work", "Mirror work", "Cutdana", "Gota patti"] as const;
export const ACCESSORIES = ["Padding", "Latkans", "Back tie (dori)", "Piping", "Lace edging", "Tassels", "Buttons"] as const;

export type DesignSpec = {
  neckline: string;
  backNeck: string;
  sleeve: string;
  cut: string;
  darts: string[];
  closure: string;
  fabric: string;
  lining: string;
  embroidery: string;
  accessories: string[];
  colors: string[];
  instructions: string;
  notes: string;
};

export const DEFAULT_SPEC: DesignSpec = {
  neckline: "sweetheart",
  backNeck: "deep-u",
  sleeve: "elbow",
  cut: "princess",
  darts: ["waist"],
  closure: "front-hooks",
  fabric: "Raw silk",
  lining: "Cotton cambric",
  embroidery: "Zardozi",
  accessories: ["Padding", "Latkans"],
  colors: ["Wine", "Noir"],
  instructions: "",
  notes: "",
};

export const DESIGN_STATUSES = ["draft", "sample", "approved", "archived"] as const;

export const STANDARD_SIZES = ["32", "34", "36", "38", "40", "42"] as const;

export const MEASUREMENT_FIELDS = [
  { key: "bust", label: "Bust" },
  { key: "waist", label: "Waist" },
  { key: "shoulder", label: "Shoulder" },
  { key: "blouse_length", label: "Blouse length" },
  { key: "armhole", label: "Armhole" },
  { key: "sleeve_length", label: "Sleeve length" },
  { key: "neck_depth_front", label: "Neck depth (front)" },
  { key: "neck_depth_back", label: "Neck depth (back)" },
  { key: "ease", label: "Ease" },
  { key: "seam_allowance", label: "Seam allowance" },
] as const;
export type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number]["key"];
export type Measurements = Record<MeasurementKey, number>;

/**
 * Optional starting values for a new draft chart. They are NOT verified: the pattern
 * master must measure fit samples, correct them and approve the chart before use.
 */
export const STARTER_MEASUREMENTS: Record<string, Measurements> = {
  "32": { bust: 81.5, waist: 66, shoulder: 34, blouse_length: 36, armhole: 38, sleeve_length: 14, neck_depth_front: 16.5, neck_depth_back: 15, ease: 4, seam_allowance: 1.5 },
  "34": { bust: 86.5, waist: 71, shoulder: 35, blouse_length: 37, armhole: 40, sleeve_length: 14.5, neck_depth_front: 17, neck_depth_back: 15.5, ease: 4, seam_allowance: 1.5 },
  "36": { bust: 91.5, waist: 76, shoulder: 36.5, blouse_length: 38, armhole: 42, sleeve_length: 15, neck_depth_front: 17.5, neck_depth_back: 16, ease: 4, seam_allowance: 1.5 },
  "38": { bust: 96.5, waist: 81, shoulder: 37.5, blouse_length: 39, armhole: 44, sleeve_length: 15.5, neck_depth_front: 18, neck_depth_back: 16.5, ease: 4, seam_allowance: 1.5 },
  "40": { bust: 101.5, waist: 86, shoulder: 38.5, blouse_length: 40, armhole: 46, sleeve_length: 16, neck_depth_front: 18.5, neck_depth_back: 17, ease: 4, seam_allowance: 1.5 },
  "42": { bust: 106.5, waist: 91, shoulder: 39.5, blouse_length: 41, armhole: 48, sleeve_length: 16.5, neck_depth_front: 19, neck_depth_back: 17.5, ease: 4, seam_allowance: 1.5 },
};

export const PIECE_TYPES = [
  { value: "front", label: "Front" },
  { value: "back", label: "Back" },
  { value: "sleeve", label: "Sleeve" },
  { value: "neck_facing", label: "Neck facing" },
  { value: "lining_front", label: "Lining · front" },
  { value: "lining_back", label: "Lining · back" },
  { value: "lining_sleeve", label: "Lining · sleeve" },
] as const;
export type PieceType = (typeof PIECE_TYPES)[number]["value"];

export const BOM_ITEMS = [
  { value: "main_fabric", label: "Main fabric", unit: "metre" },
  { value: "lining", label: "Lining", unit: "metre" },
  { value: "pads", label: "Pads", unit: "pair" },
  { value: "hooks", label: "Hooks", unit: "pcs" },
  { value: "thread", label: "Thread", unit: "spool" },
  { value: "lace", label: "Lace", unit: "metre" },
  { value: "zipper", label: "Zipper", unit: "pcs" },
  { value: "label", label: "Labels", unit: "pcs" },
  { value: "packaging", label: "Packaging", unit: "set" },
  { value: "embroidery", label: "Embroidery panel", unit: "pcs" },
  { value: "other", label: "Other", unit: "pcs" },
] as const;

export const BATCH_STATUSES = [
  "draft",
  "approved",
  "material_reserved",
  "cutting",
  "stitching",
  "finishing",
  "quality_check",
  "completed",
  "stock_received",
] as const;
export type BatchStatus = (typeof BATCH_STATUSES)[number];
export const BATCH_LABEL: Record<BatchStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  material_reserved: "Material reserved",
  cutting: "Cutting",
  stitching: "Stitching",
  finishing: "Finishing",
  quality_check: "Quality check",
  completed: "Completed",
  stock_received: "Stock received",
};

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export const QC_CHECKS = [
  { key: "measurements", label: "Measurements within tolerance" },
  { key: "stitch_quality", label: "Stitch quality" },
  { key: "fabric_defects", label: "No fabric defects" },
  { key: "neckline", label: "Neckline finishing" },
  { key: "sleeve_alignment", label: "Sleeve alignment" },
  { key: "closures", label: "Hook & closure quality" },
  { key: "pressing", label: "Pressing" },
  { key: "final_appearance", label: "Final appearance" },
] as const;

export const TASK_STATUSES = ["todo", "in_progress", "paused", "blocked", "done"] as const;

/** Friendly text for workflow errors raised by the database. */
export const WORKFLOW_ERRORS: Record<string, string> = {
  admin_only: "Only administrators can do this.",
  pattern_master_only: "Only the Pattern Master can approve this.",
  qc_inspector_only: "Only a QC inspector can record quality checks.",
  cannot_inspect_own_work: "Inspectors cannot verify QC on a batch they worked on.",
  use_approval_workflow: "Use the approval workflow for this change.",
  use_production_workflow: "Batch status changes go through the production workflow.",
  approved_design_locked: "Approved designs are locked. Reopen as a new draft version to edit.",
  approved_pattern_locked: "Approved patterns are locked. Create a new pattern version instead.",
  approved_size_chart_locked: "Approved size charts are locked. Create a new chart version to edit.",
  verified_marker_locked: "Verified markers cannot be edited.",
  design_not_approved: "The design must be approved first.",
  size_chart_not_approved: "An approved size chart is required.",
  patterns_not_approved: "Approved patterns are missing for this size",
  marker_not_verified: "A verified marker is required before fabric can be reserved",
  insufficient_stock: "Not enough stock",
  bom_missing: "Add a bill of materials to this design first.",
  bom_material_not_linked: "Link every BOM line to a material in inventory",
  stage_tasks_open: "Finish all job cards for this stage first",
  batch_not_completed: "Only completed, QC-approved batches can be received into stock.",
  variant_required: "Link the batch to a product variant before receiving stock.",
  not_assigned: "This task isn’t assigned to you.",
  invalid_transition: "That action isn’t available right now.",
  size_chart_empty: "Add measurements before approving.",
  pattern_not_in_review: "This pattern isn’t waiting for review.",
};

export function friendlyError(message: string) {
  const key = Object.keys(WORKFLOW_ERRORS).find((k) => message.includes(k));
  if (!key) return message;
  const detail = message.split(`${key}:`)[1];
  return detail ? `${WORKFLOW_ERRORS[key]}: ${detail.replace(/_/g, " ")}` : WORKFLOW_ERRORS[key];
}
