"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { RETURN_STEPS, returnStage, type MyOrder, type ReturnRequest } from "@/lib/account";

type Client = NonNullable<ReturnType<typeof createSupabaseBrowserClient>>;

const btn = "rounded-full bg-gold px-6 py-3 text-[0.72rem] font-medium uppercase tracking-[0.26em] text-noir transition-opacity hover:opacity-90 disabled:opacity-60";
const ghost = "rounded-full border border-gold/50 px-5 py-2.5 text-[0.7rem] uppercase tracking-[0.24em] text-gold transition-colors hover:bg-gold/10";
const input = "mt-1.5 w-full rounded-xl border border-gold/25 bg-noir-soft px-4 py-3 text-[0.95rem] text-ivory outline-none transition-colors placeholder:text-ivory/35 focus:border-gold";
const label = "text-[0.74rem] uppercase tracking-[0.22em] text-ivory/72";

export function Returns({ db, orders, returns, reload }: { db: Client; orders: MyOrder[] | null; returns: ReturnRequest[]; reload: () => Promise<void> }) {
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const returnedOrderNos = new Set(returns.filter((r) => r.status !== "rejected").map((r) => r.order_no));
  const eligible = (orders ?? []).filter((o) => o.status === "delivered" && !returnedOrderNos.has(o.order_no));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
    setBusy(true);
    const { error: err } = await db.rpc("request_return", {
      p_order_no: String(f.get("order_no") ?? ""),
      p_reason: String(f.get("reason") ?? ""),
      p_preference: String(f.get("preference") ?? "refund"),
    });
    setBusy(false);
    if (err) return setError(err.message);
    setRequesting(false);
    await reload();
  }

  return (
    <div>
      <p className="mb-5 text-sm text-ivory/70">Within 15 days of delivery. Pickup is arranged from your address and refunds go back to your original payment method.</p>
      {returns.length === 0 && !requesting && (
        <div className="rounded-2xl border border-gold/20 bg-noir-soft p-8 text-center">
          <p className="font-serif text-2xl text-ivory/80">No return requests yet.</p>
          {eligible.length === 0 ? (
            <p className="mt-2 text-sm text-ivory/65">Returns open up once a delivered order is inside its 15-day window.</p>
          ) : (
            <button type="button" onClick={() => setRequesting(true)} className={`${btn} mt-6`}>Request a return or exchange</button>
          )}
        </div>
      )}
      {returns.length > 0 && (
        <ul className="space-y-4">
          {returns.map((r) => (
            <li key={r.id} className="rounded-2xl border border-gold/25 bg-noir-soft p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>
                  <span className="block font-display text-xl text-ivory">{r.order_no}</span>
                  <span className="text-[0.85rem] text-ivory/65">{r.preference === "refund" ? "Refund" : "Replacement"} · requested {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                </span>
                <span className={`rounded-full px-3 py-1 text-[0.72rem] uppercase tracking-[0.16em] ${r.status === "rejected" ? "bg-burgundy/40 text-ivory" : r.status === "refunded" || r.status === "replaced" ? "bg-gold text-noir" : "border border-gold/50 text-gold"}`}>
                  {r.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-2 text-sm text-ivory/70">“{r.reason}”</p>
              <div className="mt-4">
                <ReturnTimeline status={r.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {eligible.length > 0 && !requesting && returns.length > 0 && (
        <button type="button" onClick={() => setRequesting(true)} className={`${ghost} mt-6`}>Request another return</button>
      )}
      {requesting && (
        <form onSubmit={submit} className="mt-6 grid gap-4 rounded-2xl border border-gold/25 bg-noir-soft p-6 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={label}>Which order?</span>
            <select name="order_no" required className={input}>
              {eligible.map((o) => (
                <option key={o.order_no} value={o.order_no}>
                  {o.order_no} — {o.items.map((i) => i.name).join(", ")}
                </option>
              ))}
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className={label}>Reason for return</span>
            <textarea name="reason" required minLength={3} rows={3} className={input} placeholder="e.g. size didn't fit, wrong colour, damaged in transit…" />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className={label}>Preference</legend>
            <div className="mt-2 flex gap-4 text-sm text-ivory/85">
              <label className="flex items-center gap-2"><input type="radio" name="preference" value="refund" defaultChecked className="h-4 w-4 accent-[#d4af37]" />Refund</label>
              <label className="flex items-center gap-2"><input type="radio" name="preference" value="replacement" className="h-4 w-4 accent-[#d4af37]" />Replacement (same or different size)</label>
            </div>
          </fieldset>
          {error && <p role="alert" className="rounded-lg border border-burgundy bg-burgundy/30 px-4 py-3 text-sm text-ivory sm:col-span-2">{error}</p>}
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={busy} className={btn}>{busy ? "Submitting…" : "Submit return request"}</button>
            <button type="button" onClick={() => setRequesting(false)} className={ghost}>Cancel</button>
          </div>
        </form>
      )}
      <p className="mt-8 text-sm text-ivory/60">Questions about a return? <Link href="/contact" className="text-gold hover:underline">Contact us</Link>.</p>
    </div>
  );
}

function ReturnTimeline({ status }: { status: ReturnRequest["status"] }) {
  const reduce = useReducedMotion();
  if (status === "rejected") return <p className="text-sm text-ivory/65">This request was not approved. Contact us for details.</p>;
  const stage = returnStage(status);
  return (
    <ol className="grid gap-3 sm:grid-cols-6">
      {RETURN_STEPS.map((text, i) => {
        const done = i <= stage;
        const now = i === stage;
        return (
          <motion.li key={text} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : i * 0.06 }} className="flex items-center gap-3 sm:flex-col sm:text-center">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[0.7rem] ${done ? "border-gold bg-gold text-noir" : "border-gold/30 text-ivory/50"} ${now ? "ring-4 ring-gold/25" : ""}`}>
              {done ? "✓" : i + 1}
            </span>
            <span className={`text-[0.72rem] leading-tight ${done ? "text-ivory" : "text-ivory/50"}`}>{text}</span>
          </motion.li>
        );
      })}
    </ol>
  );
}
