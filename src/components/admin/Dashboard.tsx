"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { DEMO_REFERENCE_DATE } from "@/lib/admin/demo";
import { getModule } from "@/lib/admin/modules";
import { useModuleRows } from "@/lib/admin/store";
import type { ModuleConfig, Row } from "@/lib/admin/types";
import { AreaChart, BarList, Ring, type Point } from "./charts";
import { CountUp, EASE, Icon, StatusBadge, formatINR } from "./ui";

const DAY = 86400000;
const PAID = new Set(["confirmed", "in_production", "shipped", "delivered"]);
const dayFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

function mod(slug: string): ModuleConfig {
  const m = getModule(slug);
  if (!m) throw new Error(slug);
  return m;
}

function useCrmData(live: boolean) {
  const orders = useModuleRows(mod("orders"), live);
  const payments = useModuleRows(mod("payments"), live);
  const partners = useModuleRows(mod("partners"), live);
  const commissions = useModuleRows(mod("commissions"), live);
  const messages = useModuleRows(mod("messages"), live);
  const stitching = useModuleRows(mod("stitching"), live);
  const leads = useModuleRows(mod("leads"), live);
  return { orders, payments, partners, commissions, messages, stitching, leads };
}

function revenueSeries(orders: Row[], days: number, now: number): Point[] {
  const buckets = Array.from({ length: days }, (_, i) => ({ t: now - (days - 1 - i) * DAY, value: 0 }));
  for (const o of orders) {
    if (!PAID.has(String(o.status))) continue;
    const t = new Date(String(o.created_at)).getTime();
    const idx = days - 1 - Math.floor((now - t) / DAY);
    if (idx >= 0 && idx < days) buckets[idx].value += Number(o.total_amount ?? 0);
  }
  return buckets.map((b) => ({ label: dayFmt.format(new Date(b.t)), value: b.value }));
}

const card = "relative overflow-hidden border border-gold/15 bg-noir-soft/50 backdrop-blur";

export function Dashboard({ live, variant = "dashboard" }: { live: boolean; variant?: "dashboard" | "analytics" }) {
  const reduce = useReducedMotion();
  const { orders, payments, partners, commissions, messages, stitching, leads } = useCrmData(live);
  const now = live ? Date.now() : DEMO_REFERENCE_DATE;

  const stats = useMemo(() => {
    const o = orders.rows;
    const paid = o.filter((r) => PAID.has(String(r.status)));
    const recent = paid.filter((r) => now - new Date(String(r.created_at)).getTime() < 30 * DAY);
    const revenue = recent.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
    const byStatus: Record<string, number> = {};
    for (const r of o) byStatus[String(r.status)] = (byStatus[String(r.status)] ?? 0) + 1;
    const referred = o.filter((r) => r.partner_id).length;
    return {
      revenue,
      orders30: o.filter((r) => now - new Date(String(r.created_at)).getTime() < 30 * DAY).length,
      aov: recent.length ? revenue / recent.length : 0,
      pendingPayments: payments.rows.filter((r) => r.status === "pending").length,
      pendingPartners: partners.rows.filter((r) => r.status === "pending").length,
      pendingCommission: commissions.rows.filter((r) => r.status === "pending").reduce((s, r) => s + Number(r.amount ?? 0), 0),
      openMessages: messages.rows.filter((r) => !r.handled).length,
      byStatus: Object.entries(byStatus)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      referredShare: o.length ? referred / o.length : 0,
      deliveredShare: o.length ? (byStatus.delivered ?? 0) / o.length : 0,
    };
  }, [orders.rows, payments.rows, partners.rows, commissions.rows, messages.rows, now]);

  const series = useMemo(() => revenueSeries(orders.rows, 30, now), [orders.rows, now]);

  const kpis = [
    { label: "Revenue · 30 days", value: stats.revenue, currency: true, icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", href: "/admin/orders" },
    { label: "Orders · 30 days", value: stats.orders30, icon: "M6 2 3 6v14h18V6l-3-4H6Zm-3 4h18", href: "/admin/orders" },
    { label: "Payments to verify", value: stats.pendingPayments, icon: "M2 7h20v12H2zM2 11h20", href: "/admin/payments" },
    { label: "Partner applications", value: stats.pendingPartners, icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m15-10 2 2 4-4", href: "/admin/partners" },
  ];

  const tasks = [
    { n: stats.pendingPayments, t: "payments waiting for verification", href: "/admin/payments" },
    { n: stats.pendingPartners, t: "partner applications to review", href: "/admin/partners" },
    { n: commissions.rows.filter((r) => r.status === "pending").length, t: "commissions to approve", href: "/admin/commissions" },
    { n: stats.openMessages, t: "customer messages to answer", href: "/admin/messages" },
  ];

  const recentOrders = [...orders.rows]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 6);

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
  };

  return (
    <motion.div variants={container} initial={reduce ? "show" : "hidden"} animate="show" className="space-y-6">
      <motion.header variants={item} className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.4em] text-gold">SAVLINO CRM</p>
          <h1 className="mt-2 font-display text-4xl text-ivory md:text-5xl">
            {variant === "analytics" ? "Analytics" : <>Good day, <em className="text-gold-foil">Atelier</em></>}
          </h1>
          <p className="mt-2 font-serif text-lg text-ivory/60">
            {variant === "analytics" ? "Sales, fulfilment and partner performance." : "Here is how the house is doing today."}
          </p>
        </div>
      </motion.header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <motion.div key={k.label} variants={item} whileHover={reduce ? undefined : { y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}>
            <Link href={k.href} className={`${card} group block p-6 transition-colors hover:border-gold/45`}>
              <span aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-50" />
              <div className="flex items-center justify-between">
                <p className="text-[0.58rem] uppercase tracking-[0.28em] text-ivory/50">{k.label}</p>
                <span className="text-gold/70 transition-transform duration-500 group-hover:rotate-12 group-hover:text-gold">
                  <Icon d={k.icon} />
                </span>
              </div>
              <p className="mt-4 font-display text-4xl text-ivory">
                <CountUp value={k.value} currency={k.currency} />
              </p>
              <span className="mt-4 block h-px w-10 bg-gold/60 transition-all duration-700 group-hover:w-full" />
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <motion.section variants={item} className={`${card} p-6 xl:col-span-2`}>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[0.58rem] uppercase tracking-[0.28em] text-ivory/50">Revenue · last 30 days</p>
              <p className="mt-2 font-display text-3xl text-gold-light">
                <CountUp value={stats.revenue} currency />
              </p>
            </div>
            <p className="text-right text-xs text-ivory/45">
              Avg order
              <span className="block font-display text-lg text-ivory">{formatINR(Math.round(stats.aov))}</span>
            </p>
          </div>
          <div className="mt-6">
            <AreaChart data={series} />
          </div>
        </motion.section>

        <motion.section variants={item} className={`${card} p-6`}>
          <p className="text-[0.58rem] uppercase tracking-[0.28em] text-ivory/50">
            {variant === "analytics" ? "Orders by status" : "Needs your attention"}
          </p>
          {variant === "analytics" ? (
            <div className="mt-6">
              <BarList data={stats.byStatus} />
            </div>
          ) : (
            <ul className="mt-5 space-y-2">
              {tasks.map((t, i) => (
                <motion.li
                  key={t.t}
                  initial={reduce ? false : { opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08, duration: 0.5, ease: EASE }}
                >
                  <Link href={t.href} className="group flex items-center gap-4 border border-gold/10 px-4 py-3.5 transition-colors hover:border-gold/45 hover:bg-gold/5">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center font-display text-lg ${
                        t.n > 0 ? "bg-gold text-noir" : "border border-gold/20 text-ivory/40"
                      }`}
                    >
                      {t.n}
                    </span>
                    <span className="text-sm text-ivory/75">{t.t}</span>
                    <span className="ml-auto text-gold opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100">→</span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <motion.section variants={item} className={`${card} p-6 xl:col-span-2`}>
          <div className="flex items-center justify-between">
            <p className="text-[0.58rem] uppercase tracking-[0.28em] text-ivory/50">Recent orders</p>
            <Link href="/admin/orders" className="text-[0.58rem] uppercase tracking-[0.28em] text-gold hover:text-gold-light">
              View all →
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-gold/8">
            {recentOrders.length === 0 && <li className="py-10 text-center text-sm text-ivory/45">No orders yet.</li>}
            {recentOrders.map((o, i) => (
              <motion.li
                key={o.id}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.06, duration: 0.5, ease: EASE }}
                className="flex items-center gap-4 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-gold/25 font-display text-sm text-gold">
                  {String((o.shipping_address as { full_name?: string } | null)?.full_name ?? "?").charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ivory">{(o.shipping_address as { full_name?: string } | null)?.full_name ?? "Customer"}</p>
                  <p className="text-xs text-ivory/40">{String(o.order_number ?? o.id)}</p>
                </div>
                <StatusBadge value={String(o.status)} />
                <span className="hidden w-24 text-right tabular-nums text-sm text-ivory sm:block">{formatINR(Number(o.total_amount ?? 0))}</span>
              </motion.li>
            ))}
          </ul>
        </motion.section>

        <motion.section variants={item} className={`${card} p-6`}>
          <p className="text-[0.58rem] uppercase tracking-[0.28em] text-ivory/50">
            {variant === "analytics" ? "Partner performance" : "Fulfilment"}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <Ring value={stats.deliveredShare} label="Delivered" />
            <Ring value={stats.referredShare} label="Referred" />
          </div>
          <div className="mt-6 border-t border-gold/10 pt-5">
            <p className="text-[0.58rem] uppercase tracking-[0.28em] text-ivory/45">Commission awaiting approval</p>
            <p className="mt-2 font-display text-2xl text-gold-light">
              <CountUp value={stats.pendingCommission} currency />
            </p>
          </div>
        </motion.section>
      </div>

      {variant === "dashboard" && (
        <div className="grid gap-4 xl:grid-cols-2">
          <motion.section variants={item} className={`${card} p-6`}>
            <div className="flex items-center justify-between">
              <p className="text-[0.58rem] uppercase tracking-[0.28em] text-ivory/50">Atelier · stitching pipeline</p>
              <Link href="/admin/stitching" className="text-[0.58rem] uppercase tracking-[0.28em] text-gold hover:text-gold-light">Open board →</Link>
            </div>
            <div className="mt-6">
              <BarList
                data={(mod("stitching").kanban?.columns ?? []).map((c) => ({
                  label: c,
                  value: stitching.rows.filter((r) => r.stage === c).length,
                }))}
              />
            </div>
          </motion.section>
          <motion.section variants={item} className={`${card} p-6`}>
            <div className="flex items-center justify-between">
              <p className="text-[0.58rem] uppercase tracking-[0.28em] text-ivory/50">Sales pipeline · leads</p>
              <Link href="/admin/leads" className="text-[0.58rem] uppercase tracking-[0.28em] text-gold hover:text-gold-light">Open board →</Link>
            </div>
            <div className="mt-6">
              <BarList
                format={(n) => formatINR(n)}
                data={(mod("leads").kanban?.columns ?? []).map((c) => ({
                  label: c,
                  value: leads.rows.filter((r) => r.stage === c).reduce((s, r) => s + Number(r.value ?? 0), 0),
                }))}
              />
            </div>
          </motion.section>
        </div>
      )}

      {variant === "dashboard" && (
        <motion.section variants={item} className={`${card} p-6`}>
          <p className="text-[0.58rem] uppercase tracking-[0.28em] text-ivory/50">Orders by status</p>
          <div className="mt-6 grid gap-x-10 md:grid-cols-2">
            <BarList data={stats.byStatus.slice(0, Math.ceil(stats.byStatus.length / 2))} />
            <div className="mt-3.5 md:mt-0">
              <BarList data={stats.byStatus.slice(Math.ceil(stats.byStatus.length / 2))} />
            </div>
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}
