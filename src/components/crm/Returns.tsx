"use client";

import { useState } from "react";
import { db, must, useLoad } from "./data";
import { Badge, Empty, ICONS, PageHeader, Panel, Select, Skeleton, fmtDateTime, toast } from "./ui";

type ReturnRow = {
  id: string;
  order_no: string;
  reason: string;
  preference: "refund" | "replacement";
  status: string;
  staff_notes: string;
  created_at: string;
  updated_at: string;
};

const STATUSES = ["requested", "approved", "pickup_scheduled", "in_transit", "quality_check", "refunded", "replaced", "rejected"] as const;
const STATUS_LABELS: Record<(typeof STATUSES)[number], string> = {
  requested: "Requested",
  approved: "Approved",
  pickup_scheduled: "Pickup scheduled",
  in_transit: "In transit",
  quality_check: "Quality check",
  refunded: "Refunded",
  replaced: "Replaced",
  rejected: "Rejected",
};

/** Customers request these from their account (My Account → Returns). Update the status here — they see it live. */
export function Returns() {
  const { data, setData, loading } = useLoad(async () => {
    const res = must(await db().from("order_returns").select("*").order("created_at", { ascending: false }));
    return { rows: res as ReturnRow[] };
  });

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <PageHeader section="Returns & Exchanges" subtitle="Customer-requested returns and exchanges, from My Account" />
        <Skeleton className="h-[480px]" />
      </div>
    );
  }

  async function update(id: string, status: string) {
    const before = data!.rows;
    setData((x) => (x ? { ...x, rows: x.rows.map((r) => (r.id === id ? { ...r, status } : r)) } : x));
    try {
      must(await db().from("order_returns").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select("id"));
      toast("Status updated — the customer sees this live");
    } catch (e) {
      setData((x) => (x ? { ...x, rows: before } : x));
      toast(e instanceof Error ? e.message : "Could not update", "error");
    }
  }

  const open = data.rows.filter((r) => !["refunded", "replaced", "rejected"].includes(r.status));
  const closed = data.rows.filter((r) => ["refunded", "replaced", "rejected"].includes(r.status));

  return (
    <div className="space-y-6 pb-24">
      <PageHeader section="Returns & Exchanges" subtitle="Customer-requested returns and exchanges, from My Account" />
      <Panel title={`Open requests (${open.length})`} icon={ICONS.truck}>
        {open.length === 0 ? (
          <Empty title="No open requests">Return and exchange requests customers submit from their account will show up here.</Empty>
        ) : (
          <div className="space-y-3">
            {open.map((r) => (
              <ReturnCard key={r.id} row={r} onStatus={update} />
            ))}
          </div>
        )}
      </Panel>
      {closed.length > 0 && (
        <Panel title={`Closed (${closed.length})`} icon={ICONS.check}>
          <div className="space-y-3">
            {closed.map((r) => (
              <ReturnCard key={r.id} row={r} onStatus={update} />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function ReturnCard({ row, onStatus }: { row: ReturnRow; onStatus: (id: string, status: string) => void }) {
  const [status, setStatus] = useState(row.status);
  return (
    <div className="crm-panel-soft rounded-xl border p-4" style={{ borderColor: "var(--crm-border-soft)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">
            {row.order_no} <span className="ml-2"><Badge status={row.preference} label={row.preference === "refund" ? "Refund" : "Replacement"} /></span>
          </p>
          <p className="mt-1 text-xs crm-muted">Requested {fmtDateTime(row.created_at)}</p>
        </div>
        <Select
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            onStatus(row.id, e.target.value);
          }}
          className="w-56"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>
      <p className="mt-3 text-sm crm-muted">“{row.reason}”</p>
    </div>
  );
}
