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
