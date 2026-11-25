export const costLabels = ["Industrial sewing and overlock/interlock machines", "Cutting equipment and tables", "Finishing and steam press equipment", "Furniture, storage racks and fixtures", "Electrical and premises fit-out", "Equipment installation and commissioning", "Refundable premises deposit", "Opening fabric stock", "Opening trims and accessories stock", "Opening operating cash and liquidity reserve"];
export const fixedLabels = ["Retained wages and support", "Premises rent", "Power and utilities", "Marketing and promotion", "Admin, repairs and overheads"];
export const capacity = [3600.0, 4200.0, 4800.0, 5400.0, 6000.0];
export const monthlySales = [1.1, 1.3, 1.5, 1.7, 1.8, 1.9, 2.0, 2.1, 2.4, 2.5, 2.7, 3.0];
export const defaultBank = "Indian Overseas Bank";

export const defaults = {
  applicant: "",
  bank: defaultBank,
  bankBranch: "Bhopal, Madhya Pradesh",
  category: "Woman entrepreneur",
  loan: 10,
  rate: 11,
  term: 60,
  cost: [3.15, 0.8, 0.65, 0.6, 0.45, 0.35, 0.4, 3.0, 0.65, 2.45],
  units: [2400.0, 3000.0, 3500.0, 4000.0, 4500.0],
  price: [1000, 1100, 1200, 1260, 1333.3333333333333],
  fixed: [[2.64, 3.12, 3.6, 4.08, 4.56], [1.8, 1.92, 2.04, 2.16, 2.28], [0.48, 0.6, 0.72, 0.84, 0.96], [1.2, 1.5, 1.8, 2.1, 2.4], [1.08, 1.26, 1.44, 1.62, 1.8]],
  capitalExpenditure: [0, 0.25, 0.4, 0.5, 0.6],
  drawings: [0.6, 0.9, 1.2, 1.5, 1.8],
  directRates: [32, 6, 9, 8],
  taxRate: 15,
};

export type Assumptions = typeof defaults;
