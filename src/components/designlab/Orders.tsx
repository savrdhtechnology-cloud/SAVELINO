"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader, Panel, Select, Field, Empty, Skeleton, ICONS, fmtDate } from "@/components/crm/ui";
import { useLoad } from "@/components/crm/data";
import { ORDER_FLOW, ORDER_LABEL, fetchDesigns, fetchOrders, coverOf, type OrderStatus } from "./data";
import { DesignLabNav, ErrorBox, OrderPill, Photo, useDebounced } from "./shared";
import { CreateOrderForm, totalQty } from "./JobCardTab";

export function Orders() {
  const orders = useLoad(() => fetchOrders(), []);
  const designs = useLoad(fetchDesigns, []);
  const [designId, setDesignId] = useState("");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [q, setQ] = useState("");
  const query = useDebounced(q.trim().toLowerCase());
  const design = (designs.data ?? []).find((d) => d.id === designId) ?? null;

  const rows = useMemo(() => (orders.data ?? []).filter((o) => (status === "all" || o.status === status) && (!query || [o.order_no, o.tailor_name, o.designlab_designs?.design_code ?? "", o.designlab_designs?.name ?? ""].some((s) => s.toLowerCase().includes(query)))), [orders.data, status, query]);

  return (
    <div className="space-y-6">
      <PageHeader section="DesignLab" subtitle="Tailor Job Orders" />
      <DesignLabNav />

      <Panel title="Create a job card" icon={ICONS.plus} subtitle="Pick the design first — everything below is then linked to that Design ID.">
        {designs.error && <ErrorBox message={designs.error} retry={designs.reload} />}
        <Select label="Design" value={designId} onChange={(e) => setDesignId(e.target.value)}>
          <option value="">Choose a design…</option>
          {(designs.data ?? []).filter((d) => !d.archived).map((d) => <option key={d.id} value={d.id}>{d.design_code} · {d.name} ({d.status.replace("_", " ")})</option>)}
        </Select>
      </Panel>
      {design && <CreateOrderForm key={design.id} design={design} onCreated={() => void orders.reload()} />}

      <Panel title="All job cards" icon={ICONS.orders}
        action={<div className="flex flex-wrap items-end gap-2">
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value as "all" | OrderStatus)}>
            <option value="all">All</option>
            {[...ORDER_FLOW, "cancelled" as const].map((s) => <option key={s} value={s}>{ORDER_LABEL[s]}</option>)}
          </Select>
          <Field label="Search" placeholder="Order, design, tailor" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>}>
        {orders.error && <ErrorBox message={orders.error} retry={orders.reload} />}
        {orders.loading && !orders.data && <Skeleton className="h-40" />}
        {orders.data && rows.length === 0 && <Empty icon={ICONS.orders} title="No job cards" />}
        <ul className="divide-y" style={{ borderColor: "var(--crm-border-soft)" }}>
          {rows.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-3">
                <div className="h-16 w-12 overflow-hidden rounded-lg border" style={{ borderColor: "var(--crm-border)" }}><Photo src={o.designlab_designs ? coverOf(o.designlab_designs) : null} alt="" className="h-full w-full object-cover" /></div>
                <div className="text-sm">
                  <p><b>{o.order_no}</b> <span className="crm-muted">· {o.designlab_designs?.design_code} {o.designlab_designs?.name}</span></p>
                  <p className="text-xs crm-muted">{totalQty(o)} pcs · {o.tailor_name || "no tailor yet"}{o.delivery_date ? ` · due ${fmtDate(o.delivery_date)}` : ""}</p>
                </div>
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
