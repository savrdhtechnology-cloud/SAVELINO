"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHeader, Panel, Field, Area, Select, Drawer, Empty, Skeleton, ICONS, toast, fmtDate, fmtDateTime } from "@/components/crm/ui";
import { db, must, useLoad } from "@/components/crm/data";
import { ORDER_FLOW, ORDER_LABEL, coverOf, errMsg, fetchEvents, fetchOrders, rpc, type OrderItem, type OrderStatus, type TailorOrder } from "./data";
import { DesignLabNav, ErrorBox, OrderPill, Photo } from "./shared";
import { totalQty } from "./JobCardTab";

type ProductLite = { id: string; name: string; sku: string | null; stock: number };
const fetchProducts = async () => must(await db().from("products").select("id, name, sku, stock").order("name")) as unknown as ProductLite[];

export function Tracker() {
  const orders = useLoad(() => fetchOrders(), []);
  const params = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(params.get("order"));
  const [showCancelled, setShowCancelled] = useState(false);
  const list = orders.data ?? [];
  const open = list.find((o) => o.id === openId) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader section="DesignLab" subtitle="Production Tracker" actions={<Link href="/admin/designlab/orders" className="crm-btn crm-btn-gold"><span>+ New job card</span></Link>} />
      <DesignLabNav />
      {orders.error && <ErrorBox message={orders.error} retry={orders.reload} />}
      {orders.loading && !orders.data && <Skeleton className="h-96" />}
      {orders.data && list.length === 0 && <Panel><Empty icon={ICONS.truck} title="Nothing in production">Create a tailor job card from a design with an approved pattern.</Empty></Panel>}

      <div className="flex gap-4 overflow-x-auto pb-3">
        {ORDER_FLOW.map((s) => {
          const col = list.filter((o) => o.status === s);
          return (
            <section key={s} className="crm-panel w-72 shrink-0 p-3" aria-label={ORDER_LABEL[s]}>
              <h2 className="mb-3 flex items-center justify-between text-sm font-semibold"><span className="crm-serif text-lg">{ORDER_LABEL[s]}</span><span className="crm-muted">{col.length}</span></h2>
              <div className="space-y-3">
                {col.map((o) => <Card key={o.id} o={o} onOpen={() => setOpenId(o.id)} />)}
                {col.length === 0 && <p className="py-6 text-center text-xs crm-muted">—</p>}
              </div>
            </section>
          );
        })}
      </div>

      {list.some((o) => o.status === "cancelled") && (
        <Panel title="Cancelled" action={<button className="crm-btn" onClick={() => setShowCancelled((v) => !v)}>{showCancelled ? "Hide" : "Show"}</button>}>
          {showCancelled && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{list.filter((o) => o.status === "cancelled").map((o) => <Card key={o.id} o={o} onOpen={() => setOpenId(o.id)} />)}</div>}
        </Panel>
      )}

      <Drawer open={!!open} onClose={() => setOpenId(null)} title={open ? `${open.order_no} · ${open.designlab_designs?.design_code ?? ""}` : ""} wide>
        {open && <OrderDetail key={open.id} order={open} onChanged={() => orders.reload()} />}
      </Drawer>
    </div>
  );
}

function Card({ o, onOpen }: { o: TailorOrder; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="flex w-full gap-3 rounded-xl border p-2 text-left transition-colors hover:border-[var(--crm-accent)]" style={{ borderColor: "var(--crm-border)" }}>
      <span className="h-20 w-16 shrink-0 overflow-hidden rounded-lg"><Photo src={o.designlab_designs ? coverOf(o.designlab_designs) : null} alt="" className="h-full w-full object-cover" /></span>
      <span className="min-w-0 text-xs">
        <b className="block text-sm">{o.order_no}</b>
        <span className="block truncate crm-accent">{o.designlab_designs?.design_code}</span>
        <span className="block truncate">{o.designlab_designs?.name}</span>
        <span className="block crm-muted">{totalQty(o)} pcs · {o.tailor_name || "no tailor"}</span>
        {o.delivery_date && <span className="block crm-muted">due {fmtDate(o.delivery_date)}</span>}
        {o.stock_posted_at && <span style={{ color: "#58c48a" }}>in stock ✓</span>}
      </span>
    </button>
  );
}

function OrderDetail({ order: o, onChanged }: { order: TailorOrder; onChanged: () => Promise<void> }) {
  const events = useLoad(() => fetchEvents({ orderId: o.id }), [o.id]);
  const products = useLoad(fetchProducts, []);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState({ tailor_name: o.tailor_name, tailor_phone: o.tailor_phone, delivery_date: o.delivery_date ?? "", notes: o.notes, instructions: o.instructions });
  const items = o.designlab_order_items ?? [];
  const [q, setQ] = useState<Record<string, { produced: string; accepted: string; rejected: string; rework: string }>>({});
  useEffect(() => setQ(Object.fromEntries(items.map((i) => [i.id, { produced: String(i.produced_qty), accepted: String(i.accepted_qty), rejected: String(i.rejected_qty), rework: String(i.rework_qty) }]))), [o]); // eslint-disable-line react-hooks/exhaustive-deps

  const idx = ORDER_FLOW.indexOf(o.status);
  const next = idx >= 0 && idx < ORDER_FLOW.length - 1 ? ORDER_FLOW[idx + 1] : null;
  const prev = idx > 1 && o.status !== "completed" ? ORDER_FLOW[idx - 1] : null;
  const closed = o.status === "completed" || o.status === "cancelled";
  const locked = !!o.stock_posted_at;

  const act = async (job: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await job(); toast(ok); setNote(""); await Promise.all([onChanged(), events.reload()]); } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  };
  const move = (to: OrderStatus, needNote = false) => {
    if (needNote && !note.trim()) return toast("Write a note first", "error");
    void act(() => rpc("designlab_set_order_status", { p_order: o.id, p_to: to, p_note: note }), `Moved to ${ORDER_LABEL[to]}`);
  };
  const saveInfo = () => act(async () => {
    must(await db().from("designlab_tailor_orders").update({ tailor_name: info.tailor_name.trim(), tailor_phone: info.tailor_phone.trim(), delivery_date: info.delivery_date || null, notes: info.notes, instructions: info.instructions }).eq("id", o.id));
  }, "Order details saved");
  const saveQty = () => act(async () => {
    const payload = items.map((i) => ({ item_id: i.id, produced: Number(q[i.id]?.produced || 0), accepted: Number(q[i.id]?.accepted || 0), rejected: Number(q[i.id]?.rejected || 0), rework: Number(q[i.id]?.rework || 0) }));
    await rpc("designlab_record_quantities", { p_order: o.id, p_items: payload });
  }, "Quantities saved");
  const setProduct = (id: string) => act(async () => { must(await db().from("designlab_tailor_orders").update({ product_id: id || null }).eq("id", o.id)); }, "Product linked");
  const post = () => {
    const n = items.reduce((s, i) => s + i.accepted_qty, 0);
    if (!window.confirm(`Add ${n} QC-accepted piece(s) to the stock of the linked product? This can only be done once for ${o.order_no}.`)) return;
    void act(async () => {
      const r = await rpc<{ to_stock: number; to_preorders: number; preorders_covered: number }>("designlab_post_finished_stock", { p_order: o.id });
      if (r.to_preorders > 0) toast(`${r.to_preorders} pc reserved for ${r.preorders_covered} pre-order(s) · ${r.to_stock} pc added to stock`);
    }, "Stock updated");
  };

  const qtyEditable = ["cutting", "stitching", "finishing", "qc"].includes(o.status);
  const acceptedTotal = items.reduce((s, i) => s + i.accepted_qty, 0);
  const product = (products.data ?? []).find((p) => p.id === o.product_id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="h-24 w-20 overflow-hidden rounded-xl border" style={{ borderColor: "var(--crm-border)" }}><Photo src={o.designlab_designs ? coverOf(o.designlab_designs) : null} alt="" className="h-full w-full object-cover" /></span>
          <div className="text-sm"><p className="crm-serif text-xl">{o.designlab_designs?.name}</p><Link className="crm-accent underline" href={`/admin/designlab/designs/${o.designlab_designs?.design_code}`}>{o.designlab_designs?.design_code}</Link><p className="crm-muted">{totalQty(o)} pcs · {items.map((i) => `${i.size_label}×${i.quantity}`).join(", ")}</p></div>
        </div>
        <div className="flex items-center gap-2"><OrderPill status={o.status} /><a className="crm-btn" href={`/admin/print/designlab/${o.id}`} target="_blank" rel="noreferrer">Print / PDF</a></div>
      </div>

      <ol className="flex flex-wrap gap-1.5 text-[0.7rem]" aria-label="Progress">
        {ORDER_FLOW.map((s, i) => <li key={s} className="rounded-full px-2.5 py-1" style={{ background: i <= idx ? "var(--crm-accent)" : "var(--crm-border-soft)", color: i <= idx ? "var(--crm-accent-ink)" : "var(--crm-muted)" }}>{ORDER_LABEL[s]}</li>)}
      </ol>

      {!closed && (
        <Panel title="Move this order">
          <Area label="Note (required for rework and cancel)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2">
            {next && <button className="crm-btn crm-btn-gold" disabled={busy} onClick={() => move(next)}>Move to {ORDER_LABEL[next]} →</button>}
            {prev && <button className="crm-btn" disabled={busy} onClick={() => move(prev, true)}>← Send back to {ORDER_LABEL[prev]} (rework)</button>}
            <button className="crm-btn" disabled={busy} onClick={() => window.confirm("Cancel this order?") && move("cancelled", true)}>Cancel order</button>
          </div>
          <p className="mt-2 text-xs crm-muted">The database checks every move: the pattern must be approved and sample-verified before “Pattern approved”, a tailor before “Assigned”, and QC counts must add up before “Completed”.</p>
        </Panel>
      )}

      <Panel title="Tailor & delivery">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assigned tailor" value={info.tailor_name} disabled={locked} onChange={(e) => setInfo({ ...info, tailor_name: e.target.value })} />
          <Field label="Tailor phone" value={info.tailor_phone} disabled={locked} inputMode="tel" onChange={(e) => setInfo({ ...info, tailor_phone: e.target.value })} />
          <Field label="Delivery date" type="date" value={info.delivery_date} disabled={locked} onChange={(e) => setInfo({ ...info, delivery_date: e.target.value })} />
          <Field label="Completed on" value={o.completed_at ? fmtDateTime(o.completed_at) : "—"} disabled readOnly />
          <Area label="Instructions" rows={2} className="sm:col-span-2" value={info.instructions} disabled={locked} onChange={(e) => setInfo({ ...info, instructions: e.target.value })} />
          <Area label="Notes" rows={2} className="sm:col-span-2" value={info.notes} disabled={locked} onChange={(e) => setInfo({ ...info, notes: e.target.value })} />
        </div>
        {!locked && <div className="mt-3 flex justify-end"><button className="crm-btn" disabled={busy} onClick={saveInfo}>Save</button></div>}
      </Panel>

      <Panel title="Pieces" subtitle={qtyEditable ? (o.status === "qc" ? "Enter produced, accepted, rejected and rework" : "Enter produced pieces. Accepted / rejected are entered at QC.") : "Quantities are entered from Cutting to QC"}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider crm-muted"><th className="py-2">Size</th><th>Ordered</th><th>Produced</th><th>Accepted</th><th>Rejected</th><th>Rework</th></tr></thead>
            <tbody>
              {items.map((i: OrderItem) => (
                <tr key={i.id} className="border-t" style={{ borderColor: "var(--crm-border-soft)" }}>
                  <td className="py-1.5 font-medium">{i.size_label}</td><td>{i.quantity}</td>
                  {(["produced", "accepted", "rejected", "rework"] as const).map((k) => (
                    <td key={k} className="pr-2"><input type="number" min={0} className="crm-input !w-20 !py-1" aria-label={`${k} size ${i.size_label}`} disabled={!qtyEditable || ((k === "accepted" || k === "rejected") && o.status !== "qc")} value={q[i.id]?.[k] ?? ""} onChange={(e) => setQ({ ...q, [i.id]: { ...(q[i.id] ?? { produced: "0", accepted: "0", rejected: "0", rework: "0" }), [k]: e.target.value } })} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {qtyEditable && <div className="mt-3 flex justify-end"><button className="crm-btn crm-btn-gold" disabled={busy} onClick={saveQty}>Save quantities</button></div>}
      </Panel>

      {o.status === "completed" && (
        <Panel title="Finished stock" icon={ICONS.archive} subtitle="Only QC-accepted pieces go to inventory — once.">
          {locked ? (
            <p className="text-sm" style={{ color: "#58c48a" }}>{acceptedTotal} piece(s) were added to {product?.name ?? "the linked product"} on {fmtDateTime(o.stock_posted_at!)}. This order is locked.</p>
          ) : (
            <div className="space-y-3">
              <Select label="Product these pieces belong to" value={o.product_id ?? ""} onChange={(e) => void setProduct(e.target.value)}>
                <option value="">Choose a product…</option>
                {(products.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""} — stock {p.stock}</option>)}
              </Select>
              <p className="text-xs crm-muted">Products here have no separate size variants, so the total goes to the product&apos;s stock; the size split is kept in the stock history note and the order. Create the product from the design first (Design Workspace → Create Product Studio draft) if none exists.</p>
              <button className="crm-btn crm-btn-gold" disabled={busy || !o.product_id || acceptedTotal <= 0} onClick={post}>Add {acceptedTotal} accepted piece(s) to inventory</button>
            </div>
          )}
        </Panel>
      )}

      <Panel title="History">
        {events.error && <ErrorBox message={events.error} />}
        <ol className="space-y-3">
          {(events.data ?? []).map((e) => (
            <li key={e.id} className="border-l-2 pl-4 text-sm" style={{ borderColor: "var(--crm-accent)" }}>
              <p><b>{e.event_type.replace("_", " ")}</b>{e.to_status && e.from_status !== e.to_status ? <span className="crm-muted"> · {e.from_status ?? "—"} → {e.to_status}</span> : null}</p>
              {e.note && <p className="crm-muted">{e.note}</p>}
              <p className="text-xs crm-muted">{e.by_name} · {fmtDateTime(e.created_at)}</p>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
