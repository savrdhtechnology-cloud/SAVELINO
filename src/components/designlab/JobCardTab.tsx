"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Panel, Field, Area, Empty, Skeleton, ICONS, toast, fmtDate, fmtDateTime } from "@/components/crm/ui";
import { useLoad } from "@/components/crm/data";
import { errMsg, fetchApprovals, fetchEvents, fetchOrders, fetchRevisions, rpc, type DlDesign, type TailorOrder } from "./data";
import { ErrorBox, OrderPill } from "./shared";

export const totalQty = (o: Pick<TailorOrder, "designlab_order_items">) => (o.designlab_order_items ?? []).reduce((n, i) => n + i.quantity, 0);

/** Creates a tailor job card for ONE design from its approved, sample-verified pattern revisions. */
export function CreateOrderForm({ design, onCreated }: { design: DlDesign; onCreated: (id: string) => void }) {
  const revs = useLoad(() => fetchRevisions(design.id), [design.id]);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [f, setF] = useState({ fabric: design.fabric, lining: design.lining, color: design.color, tailor: "", phone: "", delivery: "", instructions: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const usable = useMemo(() => (revs.data ?? []).filter((r) => r.status === "approved" && r.sample_verified), [revs.data]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((s) => ({ ...s, [k]: e.target.value }));
  const items = usable.map((r) => ({ revision_id: r.id, quantity: Math.floor(Number(qty[r.id] || 0)) })).filter((i) => i.quantity > 0);
  const total = items.reduce((n, i) => n + i.quantity, 0);

  const create = async () => {
    if (items.length === 0) return toast("Enter a quantity for at least one size", "error");
    setBusy(true);
    try {
      const id = await rpc<string>("designlab_create_order", { p_design: design.id, p_items: items, p_fabric: f.fabric, p_lining: f.lining, p_color: f.color, p_tailor: f.tailor, p_phone: f.phone, p_delivery: f.delivery || null, p_instructions: f.instructions, p_notes: f.notes });
      toast("Job card created");
      setQty({});
      onCreated(id);
    } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  };

  if (revs.loading && !revs.data) return <Skeleton className="h-64" />;
  if (revs.error) return <ErrorBox message={revs.error} retry={revs.reload} />;
  return (
    <Panel title={`New job card · ${design.design_code}`} icon={ICONS.draft}>
      {usable.length === 0 ? (
        <Empty icon={ICONS.shield} title="No approved pattern yet">
          A job card can only use a pattern that a tailor has verified against a physical sample and an admin has approved. Open the <b>Measurements</b> and <b>Pattern & Cutting</b> tabs of this design.
        </Empty>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="crm-label">Approved pattern revisions — quantity per size</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {usable.map((r) => (
                <label key={r.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm" style={{ borderColor: "var(--crm-border)" }}>
                  <span>Size <b>{r.size_label}</b> <span className="crm-muted">· rev {r.revision}</span></span>
                  <input type="number" min={0} max={10000} className="crm-input !w-24 !py-1.5" aria-label={`Quantity size ${r.size_label}`} value={qty[r.id] ?? ""} onChange={(e) => setQty({ ...qty, [r.id]: e.target.value })} placeholder="0" />
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Fabric" value={f.fabric} onChange={set("fabric")} />
            <Field label="Lining" value={f.lining} onChange={set("lining")} />
            <Field label="Colour" value={f.color} onChange={set("color")} />
            <Field label="Assigned tailor" value={f.tailor} onChange={set("tailor")} />
            <Field label="Tailor phone" value={f.phone} onChange={set("phone")} inputMode="tel" />
            <Field label="Delivery date" type="date" value={f.delivery} onChange={set("delivery")} />
            <Area label="Special instructions" value={f.instructions} onChange={set("instructions")} className="sm:col-span-3" />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm crm-muted">{total} piece{total === 1 ? "" : "s"} in total</p>
            <button className="crm-btn crm-btn-gold" disabled={busy || total === 0} onClick={create}>{busy ? "Creating…" : "Create job card"}</button>
          </div>
        </div>
      )}
    </Panel>
  );
}

export function JobCardTab({ design }: { design: DlDesign }) {
  const orders = useLoad(() => fetchOrders({ designId: design.id }), [design.id]);
  const open = !["approved", "in_production", "completed"].includes(design.status);
  return (
    <div className="space-y-5">
      {open && <div role="note" className="crm-panel p-4 text-sm" style={{ borderColor: "#e0a83a88" }}>This design is <b>{design.status.replace("_", " ")}</b>. You can prepare a draft job card, but it cannot be released to the tailor until the design is approved (Design Details tab).</div>}
      <CreateOrderForm design={design} onCreated={() => void orders.reload()} />
      <Panel title="Job cards for this design" icon={ICONS.orders}>
        {orders.error && <ErrorBox message={orders.error} retry={orders.reload} />}
        {orders.data?.length === 0 && <p className="text-sm crm-muted">None yet.</p>}
        <ul className="space-y-3">
          {(orders.data ?? []).map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-sm" style={{ borderColor: "var(--crm-border)" }}>
              <div>
                <p><b>{o.order_no}</b> · {totalQty(o)} pcs <span className="crm-muted">({(o.designlab_order_items ?? []).map((i) => `${i.size_label}×${i.quantity}`).join(", ")})</span></p>
                <p className="text-xs crm-muted">{o.tailor_name || "No tailor yet"}{o.delivery_date ? ` · due ${fmtDate(o.delivery_date)}` : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <OrderPill status={o.status} />
                <Link className="crm-btn" href={`/admin/designlab/tracker?order=${o.id}`}>Track</Link>
                <a className="crm-btn" href={`/admin/print/designlab/${o.id}`} target="_blank" rel="noreferrer">Print / PDF</a>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

export function HistoryTab({ design }: { design: DlDesign }) {
  const events = useLoad(() => fetchEvents({ designId: design.id }), [design.id]);
  const approvals = useLoad(() => fetchApprovals(design.id), [design.id]);
  const rows = useMemo(() => {
    const a = (approvals.data ?? []).map((x) => ({ id: x.id, at: x.created_at, title: x.action, note: x.note, by: x.by_name, kind: x.entity_type.replace("_", " ") }));
    const e = (events.data ?? []).map((x) => ({ id: x.id, at: x.created_at, title: x.to_status && x.from_status !== x.to_status ? `${x.event_type}: ${x.from_status ?? "—"} → ${x.to_status}` : x.event_type.replace("_", " "), note: x.note, by: x.by_name, kind: "production" }));
    return [...a, ...e].sort((x, y) => y.at.localeCompare(x.at));
  }, [events.data, approvals.data]);
  if ((events.loading || approvals.loading) && !events.data) return <Skeleton className="h-60" />;
  return (
    <Panel title="Production history" icon={ICONS.clock} subtitle="Every approval and production status change for this design">
      {(events.error || approvals.error) && <ErrorBox message={events.error ?? approvals.error ?? ""} />}
      {rows.length === 0 ? <Empty icon={ICONS.clock} title="No history yet" /> : (
        <ol className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="border-l-2 pl-4" style={{ borderColor: "var(--crm-accent)" }}>
              <p className="text-sm"><b>{r.title}</b> <span className="text-xs uppercase tracking-wider crm-muted">· {r.kind}</span></p>
              {r.note && <p className="text-sm crm-muted">{r.note}</p>}
              <p className="text-xs crm-muted">{r.by} · {fmtDateTime(r.at)}</p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
