"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { ORDER_STATUSES, ORDER_STATUS_LABELS, inr, type Order, type OrderStatus, type Payment, type Product } from "@/lib/data/types";
import { db, fetchOrders, fetchProducts, must, useLoad } from "./data";
import { Area, Badge, Drawer, EASE, Empty, Field, ICONS, Icon, Kpi, PageHeader, Panel, Skeleton, Tabs, fmtDateTime, toast } from "./ui";

const BOARD: OrderStatus[] = ["new", "payment_review", "processing", "stitching", "qc", "shipped", "delivered"];
const waLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/[^\d]/g, "").replace(/^(\d{10})$/, "91$1")}?text=${encodeURIComponent(text)}`;

export function Orders({ openId }: { openId?: string }) {
  const { data, setData, loading } = useLoad(async () => {
    const [orders, products] = await Promise.all([fetchOrders(1000), fetchProducts()]);
    return { orders, products };
  });
  const [view, setView] = useState<"pipeline" | "list">("pipeline");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<OrderStatus | "all">("all");
  const [open, setOpen] = useState<string | null>(openId ?? null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<OrderStatus | null>(null);

  const thumbs = useMemo(() => new Map((data?.products ?? []).map((p: Product) => [p.id, p.images[0]?.url ?? ""])), [data]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader section="Orders" subtitle="From checkout to doorstep" />
        <Skeleton className="h-32" />
        <Skeleton className="h-[480px]" />
      </div>
    );
  }

  const { orders } = data;
  const ist = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
  const today = ist.format(new Date());
  const month = today.slice(0, 7);
  const t = q.trim().toLowerCase();
  const listed = orders.filter(
    (o) => (filter === "all" || o.status === filter) && (!t || o.order_no.toLowerCase().includes(t) || o.customer_name.toLowerCase().includes(t) || o.phone.includes(t) || o.city.toLowerCase().includes(t)),
  );
  const current = orders.find((o) => o.id === open) ?? null;

  async function update(id: string, patch: Partial<Order>, ok = "Order updated") {
    const before = orders.find((o) => o.id === id);
    setData((x) => (x ? { ...x, orders: x.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) } : x));
    try {
      must(await db().from("orders").update(patch).eq("id", id).select("id"));
      toast(ok);
    } catch (e) {
      if (before) setData((x) => (x ? { ...x, orders: x.orders.map((o) => (o.id === id ? before : o)) } : x));
      toast(e instanceof Error ? e.message : "Could not update", "error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        section="Orders"
        subtitle="From checkout to doorstep"
        actions={
          <div className="w-64">
            <Tabs
              value={view}
              onChange={setView}
              options={[
                { value: "pipeline", label: "Pipeline", icon: ICONS.layers },
                { value: "list", label: "List", icon: ICONS.draft },
              ]}
            />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Orders Today" value={orders.filter((o) => ist.format(new Date(o.created_at)) === today).length} icon={ICONS.orders} />
        <Kpi label="New — to confirm" value={orders.filter((o) => o.status === "new").length} icon={ICONS.bell} tone="wine" onClick={() => { setView("list"); setFilter("new"); }} delay={0.08} />
        <Kpi label="In Progress" value={orders.filter((o) => ["processing", "stitching", "qc"].includes(o.status)).length} icon={ICONS.clock} delay={0.16} />
        <Kpi
          label="Revenue This Month"
          value={orders.filter((o) => o.status !== "cancelled" && ist.format(new Date(o.created_at)).startsWith(month)).reduce((s, o) => s + o.total, 0)}
          format={(n) => inr(Math.round(n))}
          icon={ICONS.rupee}
          delay={0.24}
        />
      </div>

      {orders.length === 0 ? (
        <Panel>
          <Empty icon={ICONS.orders} title="No orders yet">
            When a customer checks out on the website, the order appears here instantly.
          </Empty>
        </Panel>
      ) : view === "pipeline" ? (
        <Panel title="Orders Pipeline" icon={ICONS.layers} subtitle="Drag a card to move the order to the next stage">
          <div className="crm-scroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
            {BOARD.map((st, ci) => {
              const list = orders.filter((o) => o.status === st);
              return (
                <motion.div
                  key={st}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: ci * 0.05, ease: EASE }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(st);
                  }}
                  onDragLeave={() => setOver(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOver(null);
                    const id = e.dataTransfer.getData("text/plain");
                    const o = orders.find((x) => x.id === id);
                    if (o && o.status !== st) void update(id, { status: st }, `Moved to ${ORDER_STATUS_LABELS[st]}`);
                  }}
                  className="crm-panel-soft flex w-[220px] shrink-0 flex-col p-2.5 transition-colors"
                  style={over === st ? { borderColor: "var(--crm-accent)", background: "color-mix(in srgb, var(--crm-accent) 8%, var(--crm-panel-2))" } : undefined}
                >
                  <div className="flex items-center justify-between px-1.5 py-1">
                    <span className="crm-serif text-base">{ORDER_STATUS_LABELS[st]}</span>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.62rem] font-bold" style={{ background: "var(--crm-accent)", color: "var(--crm-accent-ink)" }}>
                      {list.length}
                    </span>
                  </div>
                  <div className="crm-scroll mt-1.5 max-h-[520px] min-h-[120px] space-y-2 overflow-y-auto">
                    {list.map((o) => (
                      <div
                        key={o.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", o.id);
                          setDragging(o.id);
                        }}
                        onDragEnd={() => setDragging(null)}
                        onClick={() => setOpen(o.id)}
                        className="crm-panel cursor-grab p-2.5 active:cursor-grabbing"
                        style={{ opacity: dragging === o.id ? 0.4 : 1 }}
                      >
                        <div className="flex gap-2.5">
                          <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded-md" style={{ background: "var(--crm-wash)" }}>
                            {thumbs.get(o.items[0]?.productId ?? "") && <Image src={thumbs.get(o.items[0]?.productId ?? "") as string} alt="" fill sizes="40px" className="object-cover" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate font-mono text-[0.68rem]">{o.order_no}</span>
                            <span className="block truncate text-sm">{o.customer_name}</span>
                            <span className="text-xs crm-accent">{inr(o.total)}</span>
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-[0.64rem] crm-muted">
                          <span>{o.payment_method === "cod" ? "COD" : "UPI"} · {o.payment_status}</span>
                          <span>{fmtDateTime(o.created_at).split(",")[0]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
          {orders.some((o) => o.status === "cancelled") && (
            <button type="button" className="mt-2 text-xs crm-muted hover:text-[var(--crm-accent)]" onClick={() => { setView("list"); setFilter("cancelled"); }}>
              {orders.filter((o) => o.status === "cancelled").length} cancelled orders →
            </button>
          )}
        </Panel>
      ) : (
        <Panel>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Icon d={ICONS.search} className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 crm-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order number, name, phone or city" className="crm-input !mt-0 pl-10" />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["all", ...ORDER_STATUSES] as const).map((s) => (
              <button key={s} type="button" data-on={filter === s} onClick={() => setFilter(s)} className="crm-chip">
                {s === "all" ? "All" : ORDER_STATUS_LABELS[s]} ({s === "all" ? orders.length : orders.filter((o) => o.status === s).length})
              </button>
            ))}
          </div>
          <div className="crm-scroll mt-4 overflow-x-auto">
            <table className="crm-table w-full min-w-[760px]">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {listed.map((o) => (
                  <tr key={o.id} className="cursor-pointer" onClick={() => setOpen(o.id)}>
                    <td>
                      <span className="block font-mono text-xs">{o.order_no}</span>
                      <span className="text-[0.7rem] crm-muted">{fmtDateTime(o.created_at)}</span>
                    </td>
                    <td>
                      <span className="block">{o.customer_name}</span>
                      <span className="text-[0.7rem] crm-muted">
                        {o.phone} · {o.city}
                      </span>
                    </td>
                    <td className="max-w-[220px] truncate">{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</td>
                    <td className="font-semibold">{inr(o.total)}</td>
                    <td>
                      <span className="block text-xs uppercase">{o.payment_method}</span>
                      <Badge status={o.payment_status} />
                    </td>
                    <td>
                      <Badge status={o.status} />
                    </td>
                    <td className="text-right crm-accent">→</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {listed.length === 0 && <p className="py-8 text-center text-sm crm-muted">No orders match.</p>}
          </div>
        </Panel>
      )}

      <OrderDrawer order={current} thumbs={thumbs} onClose={() => setOpen(null)} onUpdate={update} />
    </div>
  );
}

function OrderDrawer({
  order,
  thumbs,
  onClose,
  onUpdate,
}: {
  order: Order | null;
  thumbs: Map<string, string>;
  onClose: () => void;
  onUpdate: (id: string, patch: Partial<Order>, ok?: string) => Promise<void>;
}) {
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");
  const [payments, setPayments] = useState<Payment[] | null>(null);

  useEffect(() => {
    if (!order) return;
    setTracking(order.tracking);
    setNote(order.internal_note);
    setPayments(null);
    let alive = true;
    void (async () => {
      try {
        const rows = must(await db().from("payments").select("*").eq("order_id", order.id).order("created_at", { ascending: false })) as Payment[];
        if (alive) setPayments(rows);
      } catch {
        if (alive) setPayments([]);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id]);

  return (
    <Drawer
      open={Boolean(order)}
      onClose={onClose}
      wide
      title={
        order && (
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-lg">{order.order_no}</span>
            <Badge status={order.status} />
          </span>
        )
      }
      footer={
        order && (
          <>
            <a href={`tel:${order.phone}`} className="crm-btn">
              <Icon d={ICONS.phone} /> Call
            </a>
            <a href={waLink(order.phone, `Hi ${order.customer_name}, this is SAVLINO about your order ${order.order_no}.`)} target="_blank" rel="noreferrer" className="crm-btn">
              <Icon d={ICONS.whatsapp} /> WhatsApp
            </a>
            <button type="button" className="crm-btn crm-btn-gold ml-auto" onClick={() => void onUpdate(order.id, { tracking: tracking.trim(), internal_note: note.trim() }, "Saved")}>
              Save notes
            </button>
          </>
        )
      }
    >
      <AnimatePresence mode="wait">
        {order && (
          <motion.div key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <section>
              <p className="crm-label">Move to</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ORDER_STATUSES.map((s) => (
                  <button key={s} type="button" data-on={order.status === s} onClick={() => void onUpdate(order.id, { status: s }, `Moved to ${ORDER_STATUS_LABELS[s]}`)} className="crm-chip">
                    {ORDER_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="crm-panel-soft p-4 text-sm">
                <p className="crm-serif text-lg">{order.customer_name}</p>
                <p className="mt-1 crm-muted">{order.phone}</p>
                {order.email && <p className="crm-muted">{order.email}</p>}
                <p className="mt-3">
                  {order.address}, {order.city}, {order.state} – {order.pincode}
                </p>
                {order.notes && <p className="mt-3 italic crm-muted">“{order.notes}”</p>}
                <p className="mt-3 text-xs crm-muted">Placed {fmtDateTime(order.created_at)}</p>
              </div>
              <div className="crm-panel-soft p-4 text-sm">
                <p className="crm-label">Payment</p>
                <p className="mt-1 flex items-center gap-2">
                  {order.payment_method === "cod" ? "Cash on delivery" : "UPI"} <Badge status={order.payment_status} />
                </p>
                <ul className="mt-3 space-y-1.5">
                  {payments === null && <li className="crm-muted">Loading…</li>}
                  {payments?.length === 0 && <li className="crm-muted">No payment recorded yet.</li>}
                  {payments?.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs">{p.reference || p.method.toUpperCase()}</span>
                      <span>{inr(p.amount)}</span>
                      <Badge status={p.status} />
                    </li>
                  ))}
                </ul>
                {order.payment_status === "pending" && order.payment_method === "upi" && (
                  <Link href="/admin/payments" className="mt-3 inline-block text-xs crm-accent hover:underline">
                    Verify in Payments →
                  </Link>
                )}
              </div>
            </section>

            <section className="crm-panel-soft p-4">
              <p className="crm-label">Items</p>
              <ul className="mt-3 space-y-3">
                {order.items.map((it, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <span className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg" style={{ background: "var(--crm-wash)" }}>
                      {thumbs.get(it.productId) && <Image src={thumbs.get(it.productId) as string} alt="" fill sizes="48px" className="object-cover" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{it.name}</span>
                      <span className="text-xs crm-muted">{[it.color, it.size && `Size ${it.size}`, `× ${it.qty}`].filter(Boolean).join(" · ")}</span>
                    </span>
                    <span>{inr(it.price * it.qty)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1 border-t pt-3 text-sm" style={{ borderColor: "var(--crm-border-soft)" }}>
                <div className="flex justify-between crm-muted">
                  <dt>Subtotal</dt>
                  <dd>{inr(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between crm-muted">
                  <dt>Shipping</dt>
                  <dd>{order.shipping ? inr(order.shipping) : "Free"}</dd>
                </div>
                <div className="flex justify-between text-base font-semibold">
                  <dt>Total</dt>
                  <dd className="crm-accent">{inr(order.total)}</dd>
                </div>
              </dl>
            </section>

            <section className="grid gap-4">
              <Field label="Tracking number / courier link" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="e.g. Delhivery 1234567890" />
              <Area label="Internal note (only the team sees this)" value={note} onChange={(e) => setNote(e.target.value)} />
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </Drawer>
  );
}
