import type { Row } from "./types";

/**
 * Deterministic SAMPLE data used only while Supabase is not connected, so the CRM
 * can be reviewed visually. Every screen shows a "Demo data" badge in this mode.
 */

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const REF = Date.UTC(2026, 9, 10, 10, 0, 0); // fixed reference date keeps SSR and client output identical
const day = 86400000;

const first = ["Aarohi", "Ananya", "Diya", "Ishita", "Kavya", "Meera", "Nisha", "Priya", "Riya", "Saanvi", "Tanvi", "Zoya", "Aditi", "Pooja", "Neha", "Sneha"];
const last = ["Sharma", "Verma", "Iyer", "Kapoor", "Mehta", "Reddy", "Nair", "Gupta", "Singh", "Joshi", "Patel", "Rao"];
const cities = ["Bhopal", "Mumbai", "Delhi", "Bengaluru", "Jaipur", "Pune", "Hyderabad", "Kolkata", "Indore", "Chennai"];
const productNames = [
  ["Noir Zardozi Blouse", "designer-blouses", 6800],
  ["Emerald Keyhole Blouse", "designer-blouses", 5900],
  ["Burgundy Sweetheart Blouse", "ready-made-blouses", 3200],
  ["Ivory Raw-Silk Blouse", "ready-made-blouses", 2900],
  ["Maharani Velvet Anarkali", "salwar-suits", 18500],
  ["Durbar Gota Sharara", "salwar-suits", 15200],
  ["Gilded Hour Banarasi", "sarees", 24900],
  ["Kanjeevaram Ivory Gold", "sarees", 32000],
  ["Noir Sculpt Bodysuit", "shapewear", 2400],
  ["Saree Smoothing Petticoat", "shapewear", 1600],
  ["Bordeaux Lace Set", "lingerie", 3400],
  ["Champagne Satin Lounge Set", "loungewear", 4600],
] as const;

const pick = <T,>(r: () => number, arr: readonly T[]) => arr[Math.floor(r() * arr.length)];
const iso = (t: number) => new Date(t).toISOString();

export function demoProducts(): Row[] {
  const r = rng(7);
  return productNames.map(([name, collection, price], i) => ({
    id: `p${i + 1}`,
    name,
    slug: name.toLowerCase().replace(/[^a-z]+/g, "-"),
    collection,
    price,
    is_active: r() > 0.15,
    created_at: iso(REF - (40 - i * 3) * day),
  }));
}

export function demoCollections(): Row[] {
  return [
    ["Designer Blouses", "designer-blouses"],
    ["Ready-Made Blouses", "ready-made-blouses"],
    ["Salwar Suits", "salwar-suits"],
    ["Sarees", "sarees"],
    ["Shapewear", "shapewear"],
    ["Lingerie", "lingerie"],
    ["Loungewear", "loungewear"],
  ].map(([name, slug], i) => ({ id: `c${i + 1}`, name, slug, sort_order: i + 1, is_published: true }));
}

export function demoInventory(): Row[] {
  const r = rng(11);
  const sizes = ["32", "34", "36", "38", "40", "42"];
  const out: Row[] = [];
  productNames.slice(0, 6).forEach(([name], pi) =>
    sizes.slice(0, 4).forEach((size, si) =>
      out.push({
        id: `v${pi}-${si}`,
        sku: `SV-${String(pi + 1).padStart(2, "0")}-${size}`,
        product_name: name,
        size,
        quantity: Math.floor(r() * 24),
      }),
    ),
  );
  return out;
}

const orderStatuses = ["pending_payment", "payment_review", "confirmed", "in_production", "shipped", "delivered", "delivered", "delivered", "cancelled"];

export function demoOrders(): Row[] {
  const r = rng(23);
  return Array.from({ length: 140 }, (_, i) => {
    const qty = 1 + Math.floor(r() * 2);
    const price = pick(r, productNames)[2];
    const status = i < 4 ? pick(r, ["pending_payment", "payment_review"]) : pick(r, orderStatuses);
    return {
      id: `o${i + 1}`,
      order_number: `SV-${String(261010 - Math.floor(i / 3)).slice(-6)}-${(1000 + i * 37).toString(36).toUpperCase()}`,
      status,
      total_amount: price * qty + 150,
      created_at: iso(REF - Math.floor(i * 0.21 * day + r() * day * 0.5)),
      shipping_address: { full_name: `${pick(r, first)} ${pick(r, last)}`, city: pick(r, cities) },
      partner_id: r() > 0.7 ? `pt${1 + Math.floor(r() * 3)}` : null,
    };
  });
}

export function demoCustomers(): Row[] {
  const r = rng(31);
  return Array.from({ length: 26 }, (_, i) => ({
    id: `u${i + 1}`,
    full_name: `${pick(r, first)} ${pick(r, last)}`,
    phone: `+91 9${Math.floor(100000000 + r() * 899999999)}`,
    role: i === 0 ? "admin" : i < 4 ? "partner" : "customer",
    created_at: iso(REF - Math.floor(r() * 90) * day),
  }));
}

export function demoPartners(): Row[] {
  return [
    ["Rangrez Boutique", "SAVA7K2Q9", "approved", 10],
    ["Kaveri Stylists", "SAV3M8PX1", "approved", 8],
    ["Silk Route Tailors", "SAVQ2N7D4", "approved", 8],
    ["Meera Creates", null, "pending", null],
    ["The Drape Studio", null, "pending", null],
    ["Jaipur Threads", "SAVZ9R1K6", "suspended", 8],
  ].map(([business_name, referral_code, status, commission_rate], i) => ({
    id: `pt${i + 1}`,
    business_name,
    referral_code,
    status,
    commission_rate,
    created_at: iso(REF - (60 - i * 9) * day),
  }));
}

export function demoCommissions(): Row[] {
  const r = rng(41);
  return Array.from({ length: 14 }, (_, i) => ({
    id: `cm${i + 1}`,
    partner: pick(r, ["Rangrez Boutique", "Kaveri Stylists", "Silk Route Tailors"]),
    order_number: `SV-2610${String(10 - (i % 9)).padStart(2, "0")}-${(2000 + i * 53).toString(36).toUpperCase()}`,
    amount: Math.round((1500 + r() * 2200) / 10) * 10,
    status: i < 4 ? "pending" : pick(r, ["approved", "paid", "paid"]),
    created_at: iso(REF - i * 2 * day),
  }));
}

export function demoPayments(): Row[] {
  const r = rng(53);
  return Array.from({ length: 16 }, (_, i) => ({
    id: `pm${i + 1}`,
    order_number: `SV-2610${String(10 - (i % 9)).padStart(2, "0")}-${(3000 + i * 41).toString(36).toUpperCase()}`,
    method: pick(r, ["UPI", "UPI", "Card", "Bank transfer"]),
    provider_reference: `REF${Math.floor(100000 + r() * 899999)}`,
    amount: pick(r, productNames)[2] + 150,
    status: i < 5 ? "pending" : pick(r, ["verified", "verified", "verified", "rejected"]),
    created_at: iso(REF - Math.floor(i * 0.8 * day)),
  }));
}

export function demoShipments(): Row[] {
  const r = rng(61);
  return Array.from({ length: 12 }, (_, i) => ({
    id: `sh${i + 1}`,
    order_number: `SV-2610${String(9 - (i % 8)).padStart(2, "0")}-${(4000 + i * 29).toString(36).toUpperCase()}`,
    carrier: pick(r, ["Blue Dart", "Delhivery", "DTDC", "India Post"]),
    tracking_number: `${Math.floor(10000000 + r() * 89999999)}`,
    status: pick(r, ["label_created", "in_transit", "in_transit", "out_for_delivery", "delivered"]),
    shipped_at: iso(REF - i * day),
  }));
}

export function demoContent(): Row[] {
  return [
    ["hero", "A Legacy of Elegance"],
    ["designer-blouses", "The blouse, elevated to an heirloom"],
    ["lookbook", "For every shade of a woman"],
    ["partners", "Grow with the house of SAVLINO"],
    ["announcement", "Festive edit — coming soon"],
  ].map(([key, title], i) => ({ id: `cb${i + 1}`, key, title, updated_at: iso(REF - i * 3 * day) }));
}

export function demoMessages(): Row[] {
  const r = rng(71);
  const topics = ["Custom stitching", "Ready-made sizing", "Partner program", "Order help"];
  return Array.from({ length: 9 }, (_, i) => ({
    id: `m${i + 1}`,
    name: `${pick(r, first)} ${pick(r, last)}`,
    email: `customer${i + 1}@example.com`,
    topic: pick(r, topics),
    message: "Sample enquiry shown in demo mode.",
    handled: i > 3,
    created_at: iso(REF - i * 0.7 * day),
  }));
}

export const DEMO_REFERENCE_DATE = REF;
