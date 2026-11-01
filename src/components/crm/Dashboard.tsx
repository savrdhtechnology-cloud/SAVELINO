"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { ORDER_STATUS_LABELS, inr, type Order, type OrderStatus, type Product } from "@/lib/data/types";
import { AreaChart, byDay } from "./charts";
import { fetchOrders, fetchProducts, useLoad } from "./data";
import { Badge, EASE, Empty, ICONS, Icon, Kpi, PageHeader, Panel, Skeleton, compactInr, fmtDateTime } from "./ui";

const PIPELINE: OrderStatus[] = ["new", "payment_review", "processing", "stitching", "qc", "shipped", "delivered"];
const STEPS = [
  { label: "Raw Upload", icon: ICONS.upload },
  { label: "Auto Analyze", icon: ICONS.sparkle },
  { label: "Details", icon: ICONS.draft },
  { label: "Creative Preview", icon: ICONS.image },
  { label: "Approve & Publish", icon: ICONS.check },
];

export function Dashboard() {
  const { data, loading } = useLoad(async () => {
    const [products, orders] = await Promise.all([fetchProducts(), fetchOrders(500)]);
    return { products, orders };
  });
  const [chart, setChart] = useState<"sales" | "orders">("sales");

  const stats = useMemo(() => {
    if (!data) return null;
    const ist = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
    const today = ist.format(new Date());
    const weekAgo = Date.now() - 7 * 86400000;
    const counted = data.orders.filter((o) => o.status !== "cancelled");
    return {
      live: data.products.filter((p) => p.status === "live").length,
      drafts: data.products.filter((p) => p.status === "draft"),
      today: data.orders.filter((o) => ist.format(new Date(o.created_at)) === today).length,
      week: counted.filter((o) => new Date(o.created_at).getTime() >= weekAgo).reduce((s, o) => s + o.total, 0),
      counted,
    };
  }, [data]);

  const thumbs = useMemo(() => new Map((data?.products ?? []).map((p) => [p.id, p.images[0]?.url ?? ""])), [data]);

  if (loading || !data || !stats) {
    return (
      <div className="space-y-6">
        <PageHeader section="Dashboard" subtitle="Create, review, publish and fulfil from one workspace" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const draft: Product | undefined = stats.drafts[0];
  const points =
    chart === "sales"
      ? byDay(stats.counted, 7, (o) => o.created_at, (o) => o.total)
      : byDay(stats.counted, 7, (o) => o.created_at, () => 1);
  const total7 = points.reduce((s, p) => s + p.value, 0);

  return (
    <div className="space-y-6">
      <PageHeader section="Dashboard" subtitle="Create, review, publish and fulfil from one workspace" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Products Live" value={stats.live} icon={ICONS.products} note={`${data.products.length} in catalogue`} />
        <Kpi label="Drafts Pending Approval" value={stats.drafts.length} icon={ICONS.draft} tone="wine" note="Add a price, then publish" delay={0.08} />
        <Kpi label="Orders Today" value={stats.today} icon={ICONS.orders} note={`${data.orders.filter((o) => o.status === "new").length} new to confirm`} delay={0.16} />
        <Kpi label="Revenue This Week" value={stats.week} format={(n) => inr(Math.round(n))} icon={ICONS.rupee} note="Excludes cancelled orders" delay={0.24} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Panel title="Product Studio" icon={ICONS.studio} subtitle="Turn raw blouse photos into shop-ready products" delay={0.1}>
          <ol className="flex flex-wrap items-center justify-between gap-2">
            {STEPS.map((s, i) => (
              <motion.li key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08, ease: EASE }} className="flex items-center gap-2">
                <Link href="/admin/studio" className="group flex flex-col items-center gap-1.5 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border transition-transform group-hover:scale-110 crm-accent" style={{ borderColor: "var(--crm-accent)", background: i === 0 ? "color-mix(in srgb, var(--crm-accent) 14%, transparent)" : undefined }}>
                    <Icon d={s.icon} className="h-5 w-5" />
                  </span>
                  <span className="text-[0.74rem]">
                    {i + 1}. {s.label}
                  </span>
                </Link>
                {i < STEPS.length - 1 && <Icon d={ICONS.arrow} className="hidden h-4 w-4 crm-muted md:block" />}
              </motion.li>
            ))}
          </ol>

          <div className="crm-panel-soft mt-5 p-4">
            <p className="crm-serif text-lg">Product draft review</p>
            {draft ? (
              <div className="mt-3 grid gap-4 md:grid-cols-[1.2fr_1fr]">
                <div className="grid grid-cols-3 gap-2">
                  {draft.images.slice(0, 3).map((im, i) => (
                    <div key={im.id} className={`relative overflow-hidden rounded-xl ${i === 0 ? "col-span-2 row-span-2 aspect-[3/4]" : "aspect-square"}`} style={{ boxShadow: "0 0 0 1px var(--crm-border)" }}>
                      <Image src={im.url} alt="" fill sizes="200px" className="object-cover" />
                    </div>
                  ))}
                  {draft.images.length === 0 && <div className="col-span-3 flex aspect-video items-center justify-center rounded-xl text-sm crm-muted crm-panel-soft">No photos yet</div>}
                </div>
                <dl className="space-y-2.5 text-sm">
                  <Row k="Product" v={draft.name} />
                  <Row k="Price" v={draft.price > 0 ? inr(draft.price) : "Not set"} />
                  <Row k="Colours" v={draft.colors.map((c) => c.name).join(", ") || "—"} />
                  <Row k="Sizes" v={draft.sizes.join(" · ") || "—"} />
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Link href={`/admin/studio?id=${draft.id}`} className="crm-btn crm-btn-gold">
                      <Icon d={ICONS.check} /> Review & publish
                    </Link>
                    <Link href="/admin/products?status=draft" className="crm-btn">
                      All drafts ({stats.drafts.length})
                    </Link>
                  </div>
                </dl>
              </div>
            ) : (
              <Empty title="No drafts waiting">Upload raw photos in Product Studio to create your next product.</Empty>
            )}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Quick Actions" icon={ICONS.bolt} delay={0.15}>
            <div className="grid gap-2.5">
              <Link href="/admin/studio" className="crm-btn crm-btn-gold py-3">
                <Icon d={ICONS.plus} /> Add Product
              </Link>
              <Link href="/admin/studio" className="crm-btn py-3">
                <Icon d={ICONS.upload} /> Upload Raw Photos
              </Link>
              <Link href="/admin/payments" className="crm-btn py-3">
                <Icon d={ICONS.shield} /> Verify Payments
              </Link>
              <Link href="/shop" target="_blank" rel="noreferrer" className="crm-btn py-3">
                <Icon d={ICONS.external} /> View Shop
              </Link>
            </div>
          </Panel>
          <Panel
            title="Sales & Orders"
            icon={ICONS.chart}
            delay={0.2}
            action={
              <div className="flex rounded-full border p-0.5 text-xs" style={{ borderColor: "var(--crm-border-soft)" }}>
                {(["sales", "orders"] as const).map((c) => (
                  <button key={c} type="button" onClick={() => setChart(c)} className="rounded-full px-3 py-1 capitalize" style={chart === c ? { background: "var(--crm-wash)", color: "#fff1e0" } : undefined}>
                    {c}
                  </button>
                ))}
              </div>
            }
          >
            <AreaChart key={chart} points={points} height={190} format={(n) => (chart === "sales" ? compactInr(n) : String(Math.round(n)))} />
            <p className="mt-2 text-sm crm-muted">
              Last 7 days: <span className="crm-accent">{chart === "sales" ? inr(total7) : `${total7} orders`}</span>
            </p>
          </Panel>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Orders Pipeline" icon={ICONS.layers} delay={0.2} action={<Link href="/admin/orders" className="text-xs crm-accent hover:underline">View all orders →</Link>}>
          <div className="crm-scroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
            {PIPELINE.map((st, i) => {
              const list = data.orders.filter((o) => o.status === st);
              return (
                <motion.div key={st} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.05 }} className="crm-panel-soft w-[150px] shrink-0 p-2.5">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <span className="crm-serif text-[0.95rem] leading-tight">{ORDER_STATUS_LABELS[st]}</span>
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[0.62rem] font-bold" style={{ background: "var(--crm-accent)", color: "var(--crm-accent-ink)" }}>
                      {list.length}
                    </span>
                  </div>
                  <div className="mt-2 space-y-2">
                    {list.slice(0, 2).map((o) => (
                      <OrderMini key={o.id} order={o} thumb={thumbs.get(o.items[0]?.productId ?? "") ?? ""} />
                    ))}
                    {list.length === 0 && <p className="px-1 py-3 text-center text-[0.7rem] crm-muted">—</p>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Recent Orders" icon={ICONS.clock} delay={0.25} action={<Link href="/admin/orders" className="text-xs crm-accent hover:underline">View all →</Link>}>
          {data.orders.length === 0 ? (
            <Empty icon={ICONS.orders} title="No orders yet">They appear here the moment a customer checks out.</Empty>
          ) : (
            <div className="crm-scroll overflow-x-auto">
              <table className="crm-table w-full min-w-[420px]">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.slice(0, 6).map((o) => (
                    <tr key={o.id}>
                      <td className="font-mono text-xs">{o.order_no}</td>
                      <td>
                        <span className="block">{o.customer_name}</span>
                        <span className="text-[0.7rem] crm-muted">{fmtDateTime(o.created_at)}</span>
                      </td>
                      <td>{inr(o.total)}</td>
                      <td>
                        <Badge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 crm-muted">{k}</dt>
      <dd className="min-w-0 flex-1 truncate">{v}</dd>
    </div>
  );
}

function OrderMini({ order, thumb }: { order: Order; thumb: string }) {
  return (
    <Link href={`/admin/orders?open=${order.id}`} className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-[var(--crm-panel)]">
      <span className="relative h-10 w-9 shrink-0 overflow-hidden rounded-md" style={{ background: "var(--crm-wash)" }}>
        {thumb && <Image src={thumb} alt="" fill sizes="36px" className="object-cover" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-mono text-[0.66rem]">{order.order_no}</span>
        <span className="block text-[0.72rem] crm-accent">{inr(order.total)}</span>
      </span>
    </Link>
  );
}
