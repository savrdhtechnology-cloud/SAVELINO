import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createOrder, liveProductsByIds } from "@/lib/store/products-server";
import { isStoreConfigured } from "@/lib/store/neon";
import type { OrderItem } from "@/lib/store/types";
import { isUuid } from "@/lib/store/validate";
import { getSiteSettings } from "@/lib/settings-server";

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Places an order. Prices, sizes and colours are checked against the live catalogue on the server. */
export async function POST(req: Request) {
  if (!isStoreConfigured()) return NextResponse.json({ error: "Ordering is not open yet" }, { status: 503 });
  const body = await req.json().catch(() => null);
  if (!isObj(body) || !isObj(body.customer) || !Array.isArray(body.items)) return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  if (str(body.website, 100)) return NextResponse.json({ ok: true, orderNo: "SV-0" }); // honeypot field filled by bots

  const c = body.customer;
  const customer = {
    name: str(c.name, 80),
    phone: str(c.phone, 20).replace(/[^\d+]/g, ""),
    email: str(c.email, 120),
    address: str(c.address, 300),
    city: str(c.city, 60),
    state: str(c.state, 60),
    pincode: str(c.pincode, 10),
    notes: str(c.notes, 500),
  };
  if (!customer.name || !/^\+?\d{10,13}$/.test(customer.phone) || !customer.address || !customer.city || !customer.state || !/^\d{6}$/.test(customer.pincode)) {
    return NextResponse.json({ error: "Please fill in your name, a valid phone number, full address and 6-digit PIN code" }, { status: 400 });
  }
  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return NextResponse.json({ error: "Please check your email" }, { status: 400 });
  const payment = body.payment === "whatsapp" ? "whatsapp" : "cod";

  const wanted = body.items.filter(isObj).slice(0, 20);
  const ids = [...new Set(wanted.map((i) => i.productId).filter(isUuid))];
  if (ids.length === 0) return NextResponse.json({ error: "Your bag is empty" }, { status: 400 });

  try {
    const products = new Map((await liveProductsByIds(ids)).map((p) => [p.id, p]));
    const items: OrderItem[] = [];
    for (const w of wanted) {
      const p = typeof w.productId === "string" ? products.get(w.productId) : undefined;
      if (!p) return NextResponse.json({ error: "A piece in your bag is no longer available — please review your bag" }, { status: 409 });
      const size = str(w.size, 12);
      const color = str(w.color, 40);
      if (p.sizes.length > 0 && !p.sizes.includes(size)) return NextResponse.json({ error: `Please choose a size for ${p.name}` }, { status: 400 });
      if (p.colors.length > 0 && !p.colors.some((x) => x.name === color)) return NextResponse.json({ error: `Please choose a colour for ${p.name}` }, { status: 400 });
      const qty = Math.min(10, Math.max(1, Math.round(Number(w.qty) || 1)));
      items.push({ productId: p.id, slug: p.slug, name: p.name, price: p.price, size, color, qty });
    }

    const { commerce } = await getSiteSettings();
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = commerce.freeShippingAbove > 0 && subtotal >= commerce.freeShippingAbove ? 0 : commerce.shippingFee;
    const d = new Date();
    const orderNo = `${commerce.orderPrefix || "SV"}${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${randomBytes(3).toString("hex").toUpperCase()}`;

    const created = await createOrder({
      order_no: orderNo,
      customer_name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      city: customer.city,
      state: customer.state,
      pincode: customer.pincode,
      notes: customer.notes,
      items,
      subtotal,
      shipping,
      total: subtotal + shipping,
      payment_method: payment,
    });
    if (!created) throw new Error("Order not saved");
    return NextResponse.json({ ok: true, orderNo: created.order_no, total: subtotal + shipping });
  } catch (e) {
    console.error("[store] order", e);
    return NextResponse.json({ error: "We couldn't place the order right now. Please try again in a minute." }, { status: 500 });
  }
}
