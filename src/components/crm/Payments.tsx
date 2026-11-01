"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { inr, type Order, type Payment, type PaymentStatus } from "@/lib/data/types";
import { AreaChart, Donut, byDay } from "./charts";
import { db, fetchOrders, fetchPayments, must, useLoad } from "./data";
import { Area, Badge, Drawer, Empty, Field, ICONS, Icon, Kpi, PageHeader, Panel, Select, Skeleton, compactInr, fmtDateTime, toast } from "./ui";

type Tab = "verified" | "pending" | "cod" | "refunded" | "rejected";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "verified", label: "Verified", icon: ICONS.check },
  { id: "pending", label: "Pending verification", icon: ICONS.clock },
  { id: "cod", label: "COD", icon: ICONS.truck },
  { id: "refunded", label: "Refunds", icon: ICONS.rupee },
  { id: "rejected", label: "Rejected", icon: ICONS.x },
];
const METHOD: Record<string, string> = { upi: "UPI", cod: "Cash on delivery", bank: "Bank transfer", card: "Card", cash: "Cash" };

export function Payments() {
  const { data, loading, reload } = useLoad(async () => {
    const [payments, orders] = await Promise.all([fetchPayments(), fetchOrders(1000)]);
    return { payments, orders };
  });
  const [tab, setTab] = useState<Tab>("pending");
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);

  const groups = useMemo(() => {
    const p = data?.payments ?? [];
    return {
      verified: p.filter((x) => x.status === "verified"),
      pending: p.filter((x) => x.status === "pending" && x.method !== "cod"),
      cod: p.filter((x) => x.method === "cod" && x.status === "pending"),
      refunded: p.filter((x) => x.status === "refunded"),
      rejected: p.filter((x) => x.status === "rejected"),
    } satisfies Record<Tab, Payment[]>;
  }, [data]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader section="Payments" subtitle="Payment management" />
        <Skeleton className="h-32" />
        <Skeleton className="h-[480px]" />
      </div>
    );
  }

  const ist = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
  const today = ist.format(new Date());
  const sum = (l: Payment[]) => l.reduce((s, x) => s + x.amount, 0);
  const todays = groups.verified.filter((p) => ist.format(new Date(p.verified_at ?? p.created_at)) === today);
  const list = groups[tab];
  const current = data.payments.find((p) => p.id === selected) ?? list[0] ?? null;
  const byMethod = Object.entries(groups.verified.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.method]: (acc[p.method] ?? 0) + p.amount }), {})).map(([k, v]) => ({ label: METHOD[k] ?? k, value: v }));

  async function review(p: Payment, verified: boolean) {
    setBusy(true);
    try {
      const { error } = await db().rpc("review_payment", { p_payment: p.id, p_verified: verified, p_note: note });
      if (error) throw new Error(error.message);
      toast(verified ? "Payment verified — order moved to Processing" : "Payment rejected");
      setNote("");
      setSelected(null);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not update", "error");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(p: Payment, status: PaymentStatus) {
    try {
      must(await db().from("payments").update({ status }).eq("id", p.id).select("id"));
      if (status === "refunded") must(await db().from("orders").update({ payment_status: "refunded" }).eq("id", p.order_id).select("id"));
      toast(status === "refunded" ? "Marked as refunded" : "Updated");
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not update", "error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        section="Payments"
        subtitle="Payment management"
        actions={
          <button type="button" onClick={() => setRecording(true)} className="crm-btn crm-btn-gold">
            <Icon d={ICONS.plus} /> Record payment
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Collections Today" value={sum(todays)} format={(n) => inr(Math.round(n))} icon={ICONS.rupee} note={`${todays.length} verified today`} />
        <Kpi label="Pending Verification" value={sum(groups.pending)} format={(n) => inr(Math.round(n))} icon={ICONS.clock} tone="wine" note={`${groups.pending.length} payments`} onClick={() => setTab("pending")} delay={0.08} />
        <Kpi label="Refunds" value={sum(groups.refunded)} format={(n) => inr(Math.round(n))} icon={ICONS.archive} note={`${groups.refunded.length} refunds`} onClick={() => setTab("refunded")} delay={0.16} />
        <Kpi label="Net Received" value={sum(groups.verified) - sum(groups.refunded)} format={(n) => inr(Math.round(n))} icon={ICONS.shield} note="Verified minus refunds" delay={0.24} />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setTab(t.id);
              setSelected(null);
            }}
            className={`crm-btn ${tab === t.id ? "crm-btn-gold" : ""}`}
          >
            <Icon d={t.icon} /> {t.label} ({groups[t.id].length})
            {t.id === "pending" && groups.pending.length > 0 && <span className="h-2 w-2 rounded-full bg-[#ef4565]" />}
          </motion.button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel title={`Payments — ${TABS.find((t) => t.id === tab)?.label}`} icon={ICONS.payments}>
          {list.length === 0 ? (
            <Empty icon={ICONS.payments} title="Nothing here">
              {tab === "pending" ? "UPI payments customers submit appear here for you to verify." : "No payments in this list yet."}
            </Empty>
          ) : (
            <div className="crm-scroll overflow-x-auto">
              <table className="crm-table w-full min-w-[640px]">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Order</th>
                    <th>Amount</th>
                    <th>Mode</th>
                    <th>UTR / Reference</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id} onClick={() => setSelected(p.id)} className="cursor-pointer" style={current?.id === p.id ? { background: "color-mix(in srgb, var(--crm-accent) 9%, transparent)" } : undefined}>
                      <td>
                        <span className="block">{p.orders?.customer_name ?? "—"}</span>
                        <span className="text-[0.7rem] crm-muted">{fmtDateTime(p.created_at)}</span>
                      </td>
                      <td className="font-mono text-xs">{p.orders?.order_no ?? "—"}</td>
                      <td className="font-semibold">{inr(p.amount)}</td>
                      <td>{METHOD[p.method] ?? p.method}</td>
                      <td className="font-mono text-xs">{p.reference || "—"}</td>
                      <td>
                        <Badge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel title="Payment Verification" icon={ICONS.shield} subtitle="Check the UTR in your bank / UPI app, then verify">
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div key={current.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <Info k="Order" v={current.orders?.order_no ?? "—"} mono />
                  <Info k="Customer" v={current.orders?.customer_name ?? "—"} />
                  <Info k="Amount" v={inr(current.amount)} />
                  <Info k="Mode" v={METHOD[current.method] ?? current.method} />
                  <Info k="Order total" v={inr(current.orders?.total ?? 0)} />
                  <Info k="Phone" v={current.orders?.phone ?? "—"} />
                </div>
                <div className="crm-panel-soft p-3">
                  <p className="crm-label">UTR / Reference</p>
                  <p className="mt-1 break-all font-mono text-base">{current.reference || "—"}</p>
                </div>
                {current.amount !== current.orders?.total && current.orders && (
                  <p className="flex items-center gap-2 text-xs" style={{ color: "var(--crm-danger)" }}>
                    <Icon d={ICONS.warn} /> Amount differs from the order total
                  </p>
                )}
                {current.status === "pending" ? (
                  <>
                    <Area label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" disabled={busy} onClick={() => void review(current, true)} className="crm-btn crm-btn-gold py-3">
                        <Icon d={ICONS.check} /> {current.method === "cod" ? "Cash received" : "Verify payment"}
                      </button>
                      <button type="button" disabled={busy} onClick={() => void review(current, false)} className="crm-btn crm-btn-wine py-3">
                        <Icon d={ICONS.x} /> Reject
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge status={current.status} />
                    {current.note && <span className="text-xs crm-muted">“{current.note}”</span>}
                    {current.status === "verified" && (
                      <button type="button" onClick={() => {
                          if (window.confirm("Mark this payment as refunded?")) void setStatus(current, "refunded");
                        }} className="crm-btn ml-auto">
                        Mark refunded
                      </button>
                    )}
                  </div>
                )}
                {current.orders && (
                  <Link href={`/admin/orders?open=${current.order_id}`} className="inline-block text-xs crm-accent hover:underline">
                    Open order →
                  </Link>
                )}
              </motion.div>
            ) : (
              <Empty icon={ICONS.shield} title="Select a payment">Choose a row to review it here.</Empty>
            )}
          </AnimatePresence>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Collections Trend" icon={ICONS.chart} subtitle="Verified payments, last 7 days">
          <AreaChart points={byDay(groups.verified, 7, (p) => p.verified_at ?? p.created_at, (p) => p.amount)} height={200} format={compactInr} />
        </Panel>
        <Panel title="Payment Mode Breakdown" icon={ICONS.palette} subtitle="Verified">
          {byMethod.length ? <Donut slices={byMethod} center={compactInr(sum(groups.verified))} sub="Total collections" /> : <Empty title="No verified payments yet" />}
        </Panel>
      </div>

      <RecordPayment open={recording} orders={data.orders} onClose={() => setRecording(false)} onDone={() => void reload()} />
    </div>
  );
}

function Info({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div>
      <p className="crm-label">{k}</p>
      <p className={`mt-0.5 truncate ${mono ? "font-mono text-xs" : ""}`}>{v}</p>
    </div>
  );
}

function RecordPayment({ open, orders, onClose, onDone }: { open: boolean; orders: Order[]; onClose: () => void; onDone: () => void }) {
  const [orderId, setOrderId] = useState("");
  const [method, setMethod] = useState("upi");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const order = orders.find((o) => o.id === orderId);

  async function submit() {
    if (!order) return toast("Choose an order", "error");
    setBusy(true);
    try {
      const client = db();
      const row = must(
        await client.from("payments").insert({ order_id: order.id, method, amount: Number(amount) || order.total, reference: reference.trim() }).select("id").single(),
      ) as { id: string };
      const { error } = await client.rpc("review_payment", { p_payment: row.id, p_verified: true, p_note: "Recorded in CRM" });
      if (error) throw new Error(error.message);
      toast("Payment recorded and verified");
      onDone();
      onClose();
      setOrderId("");
      setAmount("");
      setReference("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not record", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Record payment"
      footer={
        <button type="button" disabled={busy} onClick={() => void submit()} className="crm-btn crm-btn-gold ml-auto">
          {busy ? "Saving…" : "Record & verify"}
        </button>
      }
    >
      <div className="space-y-4">
        <Select
          label="Order"
          value={orderId}
          onChange={(e) => {
            setOrderId(e.target.value);
            setAmount(String(orders.find((o) => o.id === e.target.value)?.total ?? ""));
          }}
        >
          <option value="">Choose an order…</option>
          {orders
            .filter((o) => o.status !== "cancelled" && o.payment_status !== "verified")
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_no} · {o.customer_name} · {inr(o.total)}
              </option>
            ))}
        </Select>
        <Select label="Payment mode" value={method} onChange={(e) => setMethod(e.target.value)}>
          {Object.entries(METHOD).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <Field label="Amount (₹)" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Field label="UTR / Reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional for cash" />
        <p className="text-xs crm-muted">The order’s payment becomes Verified and the order moves to Processing.</p>
      </div>
    </Drawer>
  );
}
