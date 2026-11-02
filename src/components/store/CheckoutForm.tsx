"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useBag } from "@/lib/store/cart";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { inr } from "@/lib/data/types";

const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const input = "mt-1.5 w-full rounded-xl border border-gold/25 bg-noir-soft px-4 py-3 text-sm text-ivory outline-none transition-colors placeholder:text-ivory/30 focus:border-gold";

type Props = { shippingFee: number; freeShippingAbove: number; whatsapp: string; codEnabled: boolean; upiId: string; upiName: string };
type Done = { orderNo: string; total: number; phone: string; method: "cod" | "upi" };

export function CheckoutForm({ shippingFee, freeShippingAbove, whatsapp, codEnabled, upiId, upiName }: Props) {
  const { lines, subtotal, clear } = useBag();
  const upiReady = upiId.includes("@");
  const [payment, setPayment] = useState<"cod" | "upi">(codEnabled || !upiReady ? "cod" : "upi");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Done | null>(null);
  const shipping = freeShippingAbove > 0 && subtotal >= freeShippingAbove ? 0 : shippingFee;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    if (get("website")) return;
    const db = createSupabaseBrowserClient();
    if (!db) return setError("Ordering is not open yet — please try again soon.");
    setBusy(true);
    setError("");
    try {
      const { data, error: err } = await db.rpc("place_order", {
        payload: {
          payment,
          customer: {
            name: get("name"),
            phone: get("phone"),
            email: get("email"),
            address: get("address"),
            city: get("city"),
            state: get("state"),
            pincode: get("pincode"),
            notes: get("notes"),
          },
          items: lines.map((l) => ({ productId: l.productId, size: l.size, color: l.color, qty: l.qty })),
        },
      });
      if (err) throw new Error(err.message);
      const res = data as { orderNo: string; total: number };
      setDone({ orderNo: res.orderNo, total: res.total, phone: get("phone"), method: payment });
      clear();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place the order");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <OrderPlaced done={done} whatsapp={whatsapp} upiId={upiId} upiName={upiName} />;

  if (lines.length === 0) {
    return (
      <div className="mt-10 max-w-xl rounded-2xl border border-gold/20 bg-noir-soft p-10">
        <p className="font-serif text-2xl text-ivory/75">Your bag is empty.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-gold px-6 py-3 text-[0.65rem] uppercase tracking-[0.28em] text-noir">
          Shop the collection
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-10 grid gap-10 lg:grid-cols-[1fr_400px]">
      <div className="space-y-8">
        <Section title="Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="name" required autoComplete="name" />
            <Field label="Mobile number" name="phone" required type="tel" inputMode="tel" autoComplete="tel" placeholder="10-digit mobile" />
            <Field label="Email (optional)" name="email" type="email" autoComplete="email" className="sm:col-span-2" />
          </div>
        </Section>
        <Section title="Delivery address">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="House, street, area" name="address" required autoComplete="street-address" className="sm:col-span-2" />
            <Field label="City" name="city" required autoComplete="address-level2" />
            <Field label="PIN code" name="pincode" required inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="postal-code" />
            <label className="block sm:col-span-2">
              <span className="text-[0.72rem] uppercase tracking-[0.25em] text-ivory/72">State</span>
              <select name="state" required defaultValue="" className={input}>
                <option value="" disabled>
                  Choose your state
                </option>
                {STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[0.72rem] uppercase tracking-[0.25em] text-ivory/72">Note for us (optional)</span>
              <textarea name="notes" rows={2} className={input} placeholder="Landmark, preferred delivery time…" />
            </label>
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          </div>
        </Section>
        <Section title="Payment">
          <div className="grid gap-3 sm:grid-cols-2">
            {codEnabled && <PayOption active={payment === "cod"} onClick={() => setPayment("cod")} title="Cash on delivery" note="Pay in cash when your order arrives." />}
            {upiReady && <PayOption active={payment === "upi"} onClick={() => setPayment("upi")} title="Pay by UPI" note="GPay, PhonePe, Paytm — pay right after placing the order." />}
            {!codEnabled && !upiReady && <p className="text-sm text-ivory/60">We’ll call you to arrange payment.</p>}
          </div>
        </Section>
      </div>

      <aside className="h-fit rounded-2xl border border-gold/25 bg-noir-soft p-6 lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
        <p className="font-display text-2xl text-ivory">Order summary</p>
        <ul className="mt-5 space-y-4">
          {lines.map((l) => (
            <li key={l.key} className="flex gap-3">
              <span className="relative h-16 w-14 shrink-0 overflow-hidden rounded-lg bg-noir">
                {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" style={{ objectPosition: "28% 50%" }} />}
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="line-clamp-1 text-ivory">{l.name}</span>
                <span className="block text-xs text-ivory/45">{[l.color, l.size && `Size ${l.size}`, `Qty ${l.qty}`].filter(Boolean).join(" · ")}</span>
              </span>
              <span className="text-sm text-ivory/80">{inr(l.price * l.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-6 space-y-2 border-t border-gold/15 pt-5 text-sm">
          <Row label="Subtotal" value={inr(subtotal)} />
          <Row label="Shipping" value={shipping === 0 ? "Free" : inr(shipping)} />
          <div className="flex items-center justify-between pt-2">
            <dt className="text-ivory">Total</dt>
            <dd className="font-display text-3xl text-gold">{inr(subtotal + shipping)}</dd>
          </div>
        </dl>
        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-burgundy bg-burgundy/30 px-4 py-3 text-sm text-ivory">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-6 w-full rounded-full bg-burgundy py-4 text-[0.7rem] font-medium uppercase tracking-[0.28em] text-ivory transition-colors hover:bg-burgundy-deep disabled:opacity-60"
        >
          {busy ? "Placing order…" : "Place order"}
        </button>
        <p className="mt-3 text-center text-[0.78rem] text-ivory/60">
          By ordering you agree to our <Link href="/terms" className="underline-offset-2 hover:underline">terms</Link> and{" "}
          <Link href="/shipping-returns" className="underline-offset-2 hover:underline">returns policy</Link>.
        </p>
      </aside>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-gold/15 p-6">
      <legend className="px-2 font-display text-xl text-ivory">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({ label, className, ...props }: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-[0.72rem] uppercase tracking-[0.25em] text-ivory/72">{label}</span>
      <input {...props} className={input} />
    </label>
  );
}

function PayOption({ active, onClick, title, note }: { active: boolean; onClick: () => void; title: string; note: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-xl border p-4 text-left transition-colors ${active ? "border-gold bg-gold/10" : "border-gold/20 hover:border-gold/50"}`}>
      <span className={`block text-sm ${active ? "text-gold" : "text-ivory"}`}>{title}</span>
      <span className="mt-1 block text-xs text-ivory/70">{note}</span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-ivory/65">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function OrderPlaced({ done, whatsapp, upiId, upiName }: { done: Done; whatsapp: string; upiId: string; upiName: string }) {
  const [utr, setUtr] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const wa = whatsapp.replace(/[^\d]/g, "");
  const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName || "SAVLINO")}&am=${done.total}&cu=INR&tn=${encodeURIComponent(done.orderNo)}`;

  async function sendUtr(e: FormEvent) {
    e.preventDefault();
    const db = createSupabaseBrowserClient();
    if (!db) return;
    setState("sending");
    setError("");
    const { error: err } = await db.rpc("submit_payment_reference", { p_order_no: done.orderNo, p_phone: done.phone, p_reference: utr });
    if (err) {
      setError(err.message);
      setState("idle");
    } else setState("sent");
  }

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-10 max-w-2xl rounded-2xl border border-gold/30 bg-noir-soft p-8 md:p-10">
      <p className="eyebrow">Order received</p>
      <p className="mt-4 font-display text-4xl text-ivory">Thank you!</p>
      <p className="mt-4 text-ivory/70">
        Order <span className="font-medium text-gold">{done.orderNo}</span> · {inr(done.total)}
      </p>

      {done.method === "upi" ? (
        <div className="mt-8 space-y-5 rounded-xl border border-gold/25 p-5">
          <p className="text-sm text-ivory/75">
            Pay <span className="text-gold">{inr(done.total)}</span> to <span className="font-mono text-ivory">{upiId}</span> ({upiName || "SAVLINO"}).
          </p>
          <a href={upiLink} className="block rounded-full bg-burgundy py-3.5 text-center text-[0.78rem] font-medium uppercase tracking-[0.25em] text-ivory md:hidden">
            Pay with UPI app
          </a>
          {state === "sent" ? (
            <p className="rounded-lg bg-gold/10 px-4 py-3 text-sm text-gold">Thanks — we’ve received your reference and will confirm your payment shortly.</p>
          ) : (
            <form onSubmit={sendUtr} className="space-y-3">
              <label className="block">
                <span className="text-[0.72rem] uppercase tracking-[0.25em] text-ivory/72">After paying, enter the UTR / reference number</span>
                <input value={utr} onChange={(e) => setUtr(e.target.value)} required minLength={6} maxLength={40} className={input} placeholder="e.g. 427386591204" />
              </label>
              {error && <p className="text-sm text-gold">{error}</p>}
              <button type="submit" disabled={state === "sending"} className="w-full rounded-full border border-gold/60 py-3 text-[0.65rem] uppercase tracking-[0.25em] text-gold disabled:opacity-60">
                {state === "sending" ? "Sending…" : "Submit payment reference"}
              </button>
            </form>
          )}
        </div>
      ) : (
        <p className="mt-4 text-ivory/70">We’ll call you shortly to confirm. You pay in cash when it arrives.</p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {wa && (
          <a
            href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hi SAVLINO, I just placed order ${done.orderNo}.`)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-burgundy px-6 py-3.5 text-[0.65rem] uppercase tracking-[0.25em] text-ivory"
          >
            Message us on WhatsApp
          </a>
        )}
        <Link href="/shop" className="rounded-full border border-gold/50 px-6 py-3.5 text-[0.65rem] uppercase tracking-[0.25em] text-gold">
          Continue shopping
        </Link>
      </div>
    </motion.div>
  );
}
