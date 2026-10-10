import { DEMO_REFERENCE_DATE } from "./demo";
import type { Row } from "./types";

/** Deterministic SAMPLE data for business modules (shown only while Supabase is not connected). */

const day = 86400000;
const iso = (t: number) => new Date(t).toISOString();
const date = (offsetDays: number) => new Date(DEMO_REFERENCE_DATE + offsetDays * day).toISOString().slice(0, 10);

export function demoStitching(): Row[] {
  const rows: [string, string, string, number, number, number, string][] = [
    ["Aarohi Sharma", "Bridal blouse", "enquiry", 4, 0, 0, ""],
    ["Kavya Nair", "Designer blouse", "measurements", 9, 8500, 3000, "Meena"],
    ["Ishita Kapoor", "Padded blouse", "cutting", 6, 4200, 2000, "Ravi"],
    ["Diya Mehta", "Boat-neck blouse", "stitching", 5, 3800, 1500, "Ravi"],
    ["Priya Reddy", "Zardozi blouse", "embroidery", 12, 12500, 6000, "Salim"],
    ["Tanvi Joshi", "Keyhole blouse", "trial", 2, 4600, 2000, "Meena"],
    ["Neha Gupta", "Anarkali alteration", "ready", 1, 1800, 1800, "Ravi"],
    ["Zoya Iyer", "Sleeveless blouse", "delivered", -3, 3500, 3500, "Meena"],
    ["Riya Singh", "Saree blouse (2 pcs)", "stitching", 8, 7200, 3500, "Salim"],
  ];
  return rows.map(([customer_name, garment, stage, due, price, advance_paid, assigned_to], i) => ({
    id: `st${i + 1}`,
    customer_name,
    garment,
    stage,
    due_date: date(due),
    price: price || null,
    advance_paid,
    assigned_to: assigned_to || null,
    fabric_source: i % 3 === 0 ? "savlino" : "customer",
    created_at: iso(DEMO_REFERENCE_DATE - (i + 2) * day),
  }));
}

export function demoLeads(): Row[] {
  const rows: [string, string, string, string, number][] = [
    ["Meera Kulkarni", "instagram", "new", "Bridal blouse set", 18000],
    ["Sneha Patil", "whatsapp", "contacted", "Custom anarkali", 15000],
    ["Pooja Rao", "website", "consultation", "Silk saree + blouse", 32000],
    ["Anjali Verma", "referral", "quoted", "3 designer blouses", 21000],
    ["Kritika Shah", "walk_in", "won", "Kanjeevaram saree", 28000],
    ["Nidhi Jain", "exhibition", "lost", "Lehenga blouse", 9000],
    ["Simran Kaur", "instagram", "new", "Ready-made blouses", 6400],
    ["Aditi Bose", "whatsapp", "consultation", "Trousseau consultation", 85000],
  ];
  return rows.map(([name, source, stage, interest, value], i) => ({
    id: `ld${i + 1}`,
    name,
    source,
    stage,
    interest,
    value,
    follow_up: date(i % 4),
    created_at: iso(DEMO_REFERENCE_DATE - i * day),
  }));
}

export function demoTasks(): Row[] {
  const rows: [string, string, string, string, number][] = [
    ["Photograph festive edit", "Studio", "todo", "high", 3],
    ["Order gold zari thread", "Operations", "doing", "medium", 2],
    ["Reply to bridal enquiries", "Sales", "todo", "high", 0],
    ["Update size chart patterns", "Design", "review", "medium", 5],
    ["Pack & dispatch 4 orders", "Operations", "doing", "high", 0],
    ["Instagram reel — zardozi process", "Marketing", "todo", "low", 6],
    ["Reconcile September expenses", "Accounts", "done", "medium", -2],
  ];
  return rows.map(([title, assignee, status, priority, due], i) => ({
    id: `tk${i + 1}`,
    title,
    assignee,
    status,
    priority,
    due_date: date(due),
    created_at: iso(DEMO_REFERENCE_DATE - i * day),
  }));
}

export function demoCoupons(): Row[] {
  return [
    ["FESTIVE10", "percent", 10, 3000, true, 37],
    ["WELCOME500", "flat", 500, 4000, true, 12],
    ["BRIDAL15", "percent", 15, 15000, true, 4],
    ["MONSOON20", "percent", 20, 2500, false, 58],
  ].map(([code, kind, value, min_order, active, used_count], i) => ({
    id: `cp${i + 1}`,
    code,
    kind,
    value,
    min_order,
    active,
    used_count,
    ends_at: date(30 - i * 20),
  }));
}

export function demoSuppliers(): Row[] {
  return [
    ["Varanasi Silk House", "Ramesh Gupta", "Varanasi", "fabric"],
    ["Surat Georgette Mills", "Hitesh Patel", "Surat", "fabric"],
    ["Lucknow Zardozi Works", "Salim Khan", "Lucknow", "embroidery"],
    ["Mumbai Trims & Laces", "Farah Sheikh", "Mumbai", "trims"],
    ["Bhopal Box Co.", "Amit Jain", "Bhopal", "packaging"],
  ].map(([name, contact_person, city, category], i) => ({ id: `sp${i + 1}`, name, contact_person, city, category }));
}

export function demoMaterials(): Row[] {
  return [
    ["Raw silk", "Silk", "Noir", "Varanasi Silk House", 42, 20, 680],
    ["Raw silk", "Silk", "Burgundy", "Varanasi Silk House", 14, 20, 680],
    ["Georgette", "Georgette", "Ivory", "Surat Georgette Mills", 65, 30, 320],
    ["Velvet", "Velvet", "Deep wine", "Surat Georgette Mills", 9, 15, 540],
    ["Zari thread", "Thread", "Antique gold", "Lucknow Zardozi Works", 120, 50, 45],
    ["French lace", "Lace", "Bordeaux", "Mumbai Trims & Laces", 18, 10, 410],
  ].map(([name, kind, color, supplier_name, quantity, reorder_level, cost_per_unit], i) => ({
    id: `mt${i + 1}`,
    name,
    kind,
    color,
    supplier_name,
    unit: name === "Zari thread" ? "spool" : "metre",
    quantity,
    reorder_level,
    cost_per_unit,
  }));
}

export function demoExpenses(): Row[] {
  return [
    ["fabric", "Raw silk — 30 m", 20400, "Varanasi Silk House"],
    ["karigar", "Embroidery wages — week 40", 18500, "Lucknow Zardozi Works"],
    ["rent", "Studio rent — October", 35000, "Landlord"],
    ["marketing", "Instagram promotion", 8000, "Meta"],
    ["shipping", "Courier charges", 4600, "Delhivery"],
    ["packaging", "Gift boxes (200)", 9000, "Bhopal Box Co."],
    ["utilities", "Electricity", 3200, "MPEB"],
  ].map(([category, description, amount, paid_to], i) => ({
    id: `ex${i + 1}`,
    category,
    description,
    amount,
    paid_to,
    payment_method: i % 2 ? "UPI" : "Bank transfer",
    spent_on: date(-i * 3),
  }));
}

export function demoReviews(): Row[] {
  return [
    ["Kavya N.", "Noir Zardozi Blouse", 5, "The back design got so many compliments!", "published"],
    ["Ishita K.", "Ready-made blouse 36", 4, "Great fit, needed a tiny alteration.", "published"],
    ["Pooja R.", "Gilded Hour Banarasi", 5, "Absolutely regal drape.", "pending"],
    ["Neha G.", "Champagne lounge set", 4, "So soft and elegant.", "pending"],
    ["Anonymous", "Bordeaux lace set", 2, "Sizing ran small.", "hidden"],
  ].map(([customer_name, product, rating, comment, status], i) => ({
    id: `rv${i + 1}`,
    customer_name,
    product,
    rating,
    comment,
    status,
    created_at: iso(DEMO_REFERENCE_DATE - i * 2 * day),
  }));
}

export function demoTeam(): Row[] {
  return [
    ["Meena Devi", "tailor", "Blouse drafting, fittings"],
    ["Ravi Kumar", "tailor", "Cutting, stitching"],
    ["Salim Ansari", "karigar", "Zardozi, aari"],
    ["Ayesha Khan", "designer", "Necklines, embroidery placement"],
    ["Rohit Verma", "operations", "Dispatch, inventory"],
    ["Sana Mirza", "sales", "WhatsApp & Instagram enquiries"],
  ].map(([name, role, skills], i) => ({ id: `tm${i + 1}`, name, role, skills, active: true }));
}
