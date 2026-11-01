"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useBag } from "@/lib/store/cart";
import { inr } from "@/lib/store/types";

const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const input = "mt-1.5 w-full rounded-xl border border-gold/25 bg-noir-soft px-4 py-3 text-sm text-ivory outline-none transition-colors placeholder:text-ivory/30 focus:border-gold";

export function CheckoutForm({ shippingFee, freeShippingAbove, whatsapp }: { shippingFee: number; freeShippingAbove: number; whatsapp: string }) {
  const { lines, subtotal, clear } = useBag();
  const [payment, setPayment] = useState<"cod" | "whatsapp">("cod");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ orderNo: string; total: number } | null>(null);
  const shipping = freeShippingAbove > 0 && subtotal >= freeShippingAbove ? 0 : shippingFee;

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "");
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/store/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: get("website"),
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
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; orderNo?: string; total?: number };
      if (!res.ok || !data.orderNo) throw new Error(data.error ?? "Could not place the order");
      setDone({ orderNo: data.orderNo, total: data.total ?? subtotal + shipping });
      clear();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place the order");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const wa = whatsapp.replace(/[^\d]/g, "");
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-10 max-w-2xl rounded-2xl border border-gold/30 bg-noir-soft p-8 md:p-10">
        <p className="eyebrow">Order received</p>
        <p className="mt-4 font-display text-4xl text-ivory">Thank you!</p>
        <p className="mt-4 text-ivory/70">
          Your order number is <span className="font-medium text-gold">{done.orderNo}</span> for {inr(done.total)}. Our team will call you shortly to confirm
          {payment === "whatsapp" ? " and share the UPI payment details." : " — you pay in cash when it arrives."}
        </p>
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
              <span className="text-[0.6rem] uppercase tracking-[0.25em] text-ivory/55">State</span>
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
              <span className="text-[0.6rem] uppercase tracking-[0.25em] text-ivory/55">Note for us (optional)</span>
              <textarea name="notes" rows={2} className={input} placeholder="Landmark, preferred delivery time…" />
            </label>
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
          </div>
        </Section>
        <Section title="Payment">
          <div className="grid gap-3 sm:grid-cols-2">
            <PayOption active={payment === "cod"} onClick={() => setPayment("cod")} title="Cash on delivery" note="Pay in cash when your order arrives." />
            <PayOption active={payment === "whatsapp"} onClick={() => setPayment("whatsapp")} title="UPI / bank transfer" note="We call or WhatsApp you with payment details." />
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
        <p className="mt-3 text-center text-[0.68rem] text-ivory/40">
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
      <span className="text-[0.6rem] uppercase tracking-[0.25em] text-ivory/55">{label}</span>
      <input {...props} className={input} />
    </label>
  );
}

function PayOption({ active, onClick, title, note }: { active: boolean; onClick: () => void; title: string; note: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`rounded-xl border p-4 text-left transition-colors ${active ? "border-gold bg-gold/10" : "border-gold/20 hover:border-gold/50"}`}>
      <span className={`block text-sm ${active ? "text-gold" : "text-ivory"}`}>{title}</span>
      <span className="mt-1 block text-xs text-ivory/50">{note}</span>
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
