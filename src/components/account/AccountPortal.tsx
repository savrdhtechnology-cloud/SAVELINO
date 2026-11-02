"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  safeNext,
  statusLabel,
  type CustomerAddress,
  type CustomerProfile,
  type Measurement,
  type MyOrder,
  type RecommendedProduct,
  type ReturnRequest,
} from "@/lib/account";
import { inr } from "@/lib/data/types";
import { INDIAN_STATES } from "@/lib/states";
import { images } from "@/lib/collections";
import { OrderTimeline } from "./OrderTimeline";
import { Overview } from "./Overview";
import { Wishlist } from "./Wishlist";
import { Measurements } from "./Measurements";
import { Returns } from "./Returns";

const input = "mt-1.5 w-full rounded-xl border border-gold/25 bg-noir-soft px-4 py-3 text-[0.95rem] text-ivory outline-none transition-colors placeholder:text-ivory/35 focus:border-gold";
const label = "text-[0.74rem] uppercase tracking-[0.22em] text-ivory/72";
const btn = "rounded-full bg-gold px-6 py-3 text-[0.72rem] font-medium uppercase tracking-[0.26em] text-noir transition-opacity hover:opacity-90 disabled:opacity-60";
const ghost = "rounded-full border border-gold/50 px-5 py-2.5 text-[0.7rem] uppercase tracking-[0.24em] text-gold transition-colors hover:bg-gold/10";

type Client = NonNullable<ReturnType<typeof createSupabaseBrowserClient>>;

export function AccountPortal() {
  const [db] = useState<Client | null>(() => createSupabaseBrowserClient());
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setReady(true);
      return;
    }
    db.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setReady(true);
    });
    const { data: sub } = db.auth.onAuthStateChange((_e, session) => setUserId(session?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, [db]);

  if (!db) return <p className="mx-auto max-w-xl px-5 py-20 text-center text-ivory/70">Accounts are not open yet — please try again soon.</p>;
  if (!ready) return <p className="px-5 py-20 text-center text-ivory/60">Loading…</p>;
  return userId ? <Dashboard db={db} userId={userId} /> : <AuthForms db={db} />;
}

/* ───────────────────────────── Sign in / create account — split screen ───────────────────────────── */

const PERKS: [string, string][] = [
  ["Track orders", "Get real-time updates on your purchases."],
  ["Returns & exchanges", "Hassle-free returns and size exchanges."],
  ["Custom stitching status", "Follow your custom blouse request from design to delivery."],
  ["Recommended for you", "Handpicked styles based on your taste and past orders."],
];

function AuthForms({ db }: { db: Client }) {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"in" | "up" | "reset">("in");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    setError("");
    setInfo("");
    setBusy(true);
    try {
      if (mode === "reset") {
        const { error: err } = await db.auth.resetPasswordForEmail(get("email"), { redirectTo: `${window.location.origin}/account` });
        if (err) throw err;
        setInfo("If this email has an account, a password-reset link is on its way.");
      } else if (mode === "up") {
        const phone = get("phone").replace(/[^\d+]/g, "");
        if (get("name").length < 2) throw new Error("Please enter your full name");
        if (!/^\+?\d{10,13}$/.test(phone)) throw new Error("Please enter a valid mobile number");
        if (f.get("password") !== f.get("password2")) throw new Error("The two passwords do not match");
        const { data, error: err } = await db.auth.signUp({
          email: get("email"),
          password: String(f.get("password") ?? ""),
          options: { data: { full_name: get("name"), phone }, emailRedirectTo: `${window.location.origin}/account` },
        });
        if (err) throw err;
        if (!data.session) setInfo("Account created — please confirm your email using the link we just sent, then sign in.");
        else router.replace(safeNext(params.get("next")));
      } else {
        const { error: err } = await db.auth.signInWithPassword({ email: get("email"), password: String(f.get("password") ?? "") });
        if (err) throw new Error(err.message === "Invalid login credentials" ? "Wrong email or password" : err.message);
        router.replace(safeNext(params.get("next")));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid md:min-h-[640px] md:grid-cols-2">
      <div className="relative hidden overflow-hidden md:block">
        <Image src={images.heritage} alt="" fill sizes="50vw" className="object-cover object-[30%_20%]" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/15 to-transparent" />
      </div>
      <div className="flex flex-col justify-center gap-5 px-5 py-8 md:px-10 lg:px-14">
        <div className="mx-auto w-full max-w-sm text-center">
          <p className="eyebrow">Customer portal</p>
          <h1 className="mt-1.5 font-display text-2xl text-ivory md:text-[1.9rem]">{mode === "up" ? "Create your account" : "Sign in to SAVLINO"}</h1>
          <p className="mt-1.5 text-[0.82rem] text-ivory/60">Track your orders and manage custom blouse requests.</p>
        </div>

        <form onSubmit={submit} className="mx-auto w-full max-w-sm rounded-2xl border border-gold/25 bg-noir-soft p-5">
          <div className="mb-4 flex gap-2 text-[0.7rem] uppercase tracking-[0.2em]">
            {(["in", "up"] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setError(""); setInfo(""); }} className={`flex-1 rounded-full border px-3 py-2 transition-colors ${mode === m || (mode === "reset" && m === "in") ? "border-gold bg-gold text-noir" : "border-gold/30 text-ivory/75 hover:border-gold"}`}>
                {m === "in" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {mode === "up" && (
              <>
                <label className="block"><span className={label}>Full name</span><input name="name" required autoComplete="name" className={input} /></label>
                <label className="block"><span className={label}>Mobile number</span><input name="phone" type="tel" inputMode="tel" required autoComplete="tel" placeholder="10-digit mobile" className={input} /></label>
              </>
            )}
            <label className="block"><span className={label}>Email</span><input name="email" type="email" required autoComplete="email" className={input} /></label>
            {mode !== "reset" && (
              <label className="block"><span className={label}>Password</span><input name="password" type="password" required minLength={8} autoComplete={mode === "up" ? "new-password" : "current-password"} className={input} /></label>
            )}
            {mode === "up" && (
              <label className="block"><span className={label}>Confirm password</span><input name="password2" type="password" required minLength={8} autoComplete="new-password" className={input} /></label>
            )}
          </div>
          {error && <p role="alert" className="mt-3 rounded-lg border border-burgundy bg-burgundy/30 px-4 py-2.5 text-sm text-ivory">{error}</p>}
          {info && <p role="status" className="mt-3 rounded-lg border border-gold/30 bg-gold/10 px-4 py-2.5 text-sm text-gold-light">{info}</p>}
          <button type="submit" disabled={busy} className={`${btn} mt-5 w-full`}>{busy ? "Please wait…" : mode === "up" ? "Create account" : mode === "reset" ? "Send reset link" : "Sign in"}</button>
          {mode !== "up" && (
            <button type="button" onClick={() => { setMode(mode === "reset" ? "in" : "reset"); setError(""); setInfo(""); }} className="mt-3 w-full text-center text-[0.8rem] text-ivory/70 underline-offset-2 hover:text-gold hover:underline">
              {mode === "reset" ? "Back to sign in" : "Forgot your password?"}
            </button>
          )}
        </form>

        <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-2.5">
          {PERKS.map(([t]) => (
            <div key={t} className="flex items-center gap-2 rounded-xl border border-gold/20 bg-[linear-gradient(160deg,rgba(101,13,32,0.25),rgba(10,7,9,0.4))] px-3 py-2.5">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
              <span className="text-[0.76rem] leading-tight text-ivory/85">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── Dashboard — sidebar layout ───────────────────────────── */

type Tab = "overview" | "orders" | "returns" | "wishlist" | "measurements" | "addresses" | "profile";
const TABS: [Tab, string][] = [
  ["overview", "Dashboard"],
  ["orders", "My Orders"],
  ["returns", "Returns"],
  ["wishlist", "Wishlist"],
  ["measurements", "Measurements"],
  ["addresses", "Addresses"],
  ["profile", "Profile"],
];

function Dashboard({ db, userId }: { db: Client; userId: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const tabParam = params.get("tab");
  const [tab, setTab] = useState<Tab>(TABS.some(([k]) => k === tabParam) ? (tabParam as Tab) : "overview");
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [orders, setOrders] = useState<MyOrder[] | null>(null);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [recommended, setRecommended] = useState<RecommendedProduct[]>([]);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    const [p, a, o, r, m, w, rec] = await Promise.all([
      db.from("customer_profiles").select("id, full_name, phone, email").eq("id", userId).maybeSingle(),
      db.from("customer_addresses").select("*").eq("user_id", userId).order("is_default", { ascending: false }).order("created_at"),
      db.rpc("my_orders"),
      db.rpc("my_returns"),
      db.from("customer_measurements").select("*").eq("user_id", userId).order("created_at"),
      db.from("customer_wishlist").select("product_id").eq("user_id", userId),
      db.from("products").select("id, slug, name, subtitle, price, product_images(url, position)").eq("status", "live").order("sort_order").limit(8),
    ]);
    if (p.error || a.error || o.error) setLoadError("We could not load your account details. Please refresh the page.");
    setProfile((p.data as CustomerProfile | null) ?? null);
    setAddresses((a.data as CustomerAddress[] | null) ?? []);
    setOrders((o.data as MyOrder[] | null) ?? []);
    setReturns((r.data as ReturnRequest[] | null) ?? []);
    setMeasurements((m.data as Measurement[] | null) ?? []);
    setWishlistIds(new Set(((w.data ?? []) as { product_id: string }[]).map((x) => x.product_id)));
    type RecRow = { id: string; slug: string; name: string; subtitle: string; price: number; product_images: { url: string; position: number }[] };
    setRecommended(
      ((rec.data ?? []) as RecRow[]).map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        subtitle: row.subtitle,
        price: row.price,
        image_url: [...(row.product_images ?? [])].sort((x, y) => x.position - y.position)[0]?.url ?? null,
      })),
    );
  }, [db, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  function goTab(t: Tab) {
    setTab(t);
    router.replace(`/account?tab=${t}`, { scroll: false });
  }

  async function signOut() {
    await db.auth.signOut();
    router.refresh();
  }

  return (
    <div className="mx-auto grid max-w-[1320px] gap-8 px-5 py-8 md:grid-cols-[220px_1fr] md:px-10 md:py-12">
      <aside className="md:sticky md:top-24 md:self-start">
        <div className="mb-6 hidden md:block">
          <p className="eyebrow">My Account</p>
        </div>
        <nav role="tablist" aria-label="Account sections" className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          {TABS.map(([k, t]) => (
            <button
              key={k}
              role="tab"
              aria-selected={tab === k}
              onClick={() => goTab(k)}
              className={`shrink-0 rounded-full px-4 py-2.5 text-left text-[0.78rem] uppercase tracking-[0.16em] transition-colors md:rounded-xl ${tab === k ? "bg-gold text-noir" : "text-ivory/70 hover:bg-gold/10 hover:text-ivory"}`}
            >
              {t}
              {k === "orders" && orders ? ` (${orders.length})` : ""}
            </button>
          ))}
        </nav>
        <button type="button" onClick={signOut} className={`${ghost} mt-4 w-full md:mt-6`}>Sign out</button>
      </aside>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">{TABS.find(([k]) => k === tab)?.[1]}</p>
            <h1 className="mt-2 font-display text-3xl text-ivory md:text-4xl">Hello{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}</h1>
          </div>
          <Link href="/shop" className={btn}>Shop &amp; order</Link>
        </div>
        {loadError && <p role="alert" className="mt-6 rounded-lg border border-burgundy bg-burgundy/30 px-4 py-3 text-sm text-ivory">{loadError}</p>}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-7">
            {tab === "overview" && (
              <Overview db={db} userId={userId} orders={orders} returns={returns} measurements={measurements} recommended={recommended} wishlistIds={wishlistIds} onTab={goTab} reload={load} />
            )}
            {tab === "orders" && <Orders orders={orders} />}
            {tab === "returns" && <Returns db={db} orders={orders} returns={returns} reload={load} />}
            {tab === "wishlist" && <Wishlist db={db} userId={userId} items={recommended.filter((p) => wishlistIds.has(p.id))} reload={load} />}
            {tab === "measurements" && <Measurements db={db} userId={userId} rows={measurements} reload={load} />}
            {tab === "addresses" && <Addresses db={db} userId={userId} profile={profile} addresses={addresses} reload={load} />}
            {tab === "profile" && <Profile db={db} profile={profile} reload={load} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ───────────────────────────── Orders ───────────────────────────── */

function Orders({ orders }: { orders: MyOrder[] | null }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!orders) return <p className="text-ivory/60">Loading your orders…</p>;
  if (orders.length === 0)
    return (
      <div className="rounded-2xl border border-gold/20 bg-noir-soft p-8 text-center">
        <p className="font-serif text-2xl text-ivory/80">No orders yet.</p>
        <p className="mt-2 text-sm text-ivory/65">Orders you place while signed in will show up here with their status.</p>
        <Link href="/shop" className={`${btn} mt-6 inline-block`}>Browse blouses</Link>
      </div>
    );
  return (
    <ul className="space-y-4">
      {orders.map((o) => {
        const isOpen = open === o.order_no;
        return (
          <li key={o.order_no} className="overflow-hidden rounded-2xl border border-gold/25 bg-noir-soft">
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : o.order_no)} className="flex w-full flex-wrap items-center justify-between gap-3 p-5 text-left">
              <span>
                <span className="block font-display text-xl text-ivory">{o.order_no}</span>
                <span className="text-[0.85rem] text-ivory/65">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {o.items.reduce((n, i) => n + i.qty, 0)} {o.items.reduce((n, i) => n + i.qty, 0) === 1 ? "item" : "items"}</span>
              </span>
              <span className="flex items-center gap-4">
                <span className={`rounded-full px-3 py-1 text-[0.72rem] uppercase tracking-[0.16em] ${o.status === "cancelled" ? "bg-burgundy/40 text-ivory" : o.status === "delivered" ? "bg-gold text-noir" : "border border-gold/50 text-gold"}`}>{statusLabel(o)}</span>
                <span className="font-display text-xl text-gold">{inr(o.total)}</span>
              </span>
            </button>
            {isOpen && (
              <div className="space-y-6 border-t border-gold/15 p-5">
                <OrderTimeline order={o} />
                {o.status === "payment_review" && <p className="text-sm text-ivory/75">We are verifying your UPI payment — this usually takes a short while.</p>}
                {o.preorder_state === "waiting" && <p className="text-sm text-ivory/75">This is a pre-order: your piece is being made and we will deliver as soon as it is finished.</p>}
                {o.tracking && <p className="text-sm text-ivory/80">Tracking: <span className="font-mono text-gold">{o.tracking}</span></p>}
                <ul className="divide-y divide-gold/10 text-sm">
                  {o.items.map((it, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                      <span>
                        {it.slug ? <Link href={`/shop/${it.slug}`} className="text-ivory hover:text-gold">{it.name}</Link> : <span className="text-ivory">{it.name}</span>}
                        <span className="block text-[0.82rem] text-ivory/60">{[it.color, it.size && `Size ${it.size}`, `Qty ${it.qty}`].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span className="text-ivory/85">{inr(it.price * it.qty)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="grid gap-1 text-sm text-ivory/75 sm:grid-cols-2">
                  <div><dt className="inline text-ivory/55">Delivering to: </dt><dd className="inline">{o.customer_name}, {o.address}, {o.city}, {o.state} {o.pincode}</dd></div>
                  <div className="sm:text-right"><dt className="inline text-ivory/55">Payment: </dt><dd className="inline">{o.payment_method === "cod" ? "Cash on delivery" : "UPI"} · {o.payment_status === "verified" ? "received" : o.payment_status === "refunded" ? "refunded" : o.payment_status === "rejected" ? "not received" : "pending"}</dd></div>
                  <div><dt className="inline text-ivory/55">Subtotal {inr(o.subtotal)} · Shipping {o.shipping === 0 ? "Free" : inr(o.shipping)}</dt></div>
                  <div className="sm:text-right"><dt className="inline text-ivory/55">Total: </dt><dd className="inline text-gold">{inr(o.total)}</dd></div>
                </dl>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ───────────────────────────── Addresses ───────────────────────────── */

function Addresses({ db, userId, profile, addresses, reload }: { db: Client; userId: string; profile: CustomerProfile | null; addresses: CustomerAddress[]; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<CustomerAddress | "new" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const phone = get("phone").replace(/[^\d+]/g, "");
    if (!/^\+?\d{10,13}$/.test(phone)) return setError("Please enter a valid mobile number");
    if (!/^\d{6}$/.test(get("pincode"))) return setError("Please enter a 6-digit PIN code");
    setBusy(true);
    setError("");
    const makeDefault = f.get("is_default") === "on" || (addresses.length === 0 && editing === "new");
    if (makeDefault) await db.from("customer_addresses").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
    const row = { label: get("label") || "Home", name: get("name"), phone, address: get("address"), city: get("city"), state: get("state"), pincode: get("pincode"), is_default: makeDefault };
    const res = editing && editing !== "new"
      ? await db.from("customer_addresses").update({ ...row, is_default: makeDefault || editing.is_default }).eq("id", editing.id)
      : await db.from("customer_addresses").insert({ ...row, user_id: userId });
    setBusy(false);
    if (res.error) return setError(res.error.message);
    setEditing(null);
    await reload();
  }

  async function setDefault(a: CustomerAddress) {
    await db.from("customer_addresses").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
    await db.from("customer_addresses").update({ is_default: true }).eq("id", a.id);
    await reload();
  }

  async function remove(a: CustomerAddress) {
    if (!window.confirm("Remove this address?")) return;
    await db.from("customer_addresses").delete().eq("id", a.id);
    await reload();
  }

  const cur = editing && editing !== "new" ? editing : null;
  return (
    <div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {addresses.map((a) => (
          <li key={a.id} className={`rounded-2xl border p-5 ${a.is_default ? "border-gold bg-gold/5" : "border-gold/25 bg-noir-soft"}`}>
            <p className="flex items-center gap-2 font-display text-lg text-ivory">{a.label}{a.is_default && <span className="rounded-full bg-gold px-2 py-0.5 text-[0.66rem] uppercase tracking-[0.14em] text-noir">Default</span>}</p>
            <p className="mt-2 text-[0.92rem] leading-relaxed text-ivory/80">{a.name}<br />{a.address}<br />{a.city}, {a.state} {a.pincode}<br />{a.phone}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-[0.78rem] uppercase tracking-[0.16em]">
              {!a.is_default && <button type="button" onClick={() => setDefault(a)} className="text-gold hover:underline">Make default</button>}
              <button type="button" onClick={() => setEditing(a)} className="text-ivory/75 hover:text-gold">Edit</button>
              <button type="button" onClick={() => remove(a)} className="text-ivory/55 hover:text-ivory">Remove</button>
            </div>
          </li>
        ))}
        {addresses.length === 0 && !editing && <li className="text-ivory/65 sm:col-span-2">No saved addresses yet. Add one and it will be filled in at checkout.</li>}
      </ul>
      {!editing && <button type="button" onClick={() => { setEditing("new"); setError(""); }} className={`${btn} mt-6`}>Add an address</button>}
      {editing && (
        <form key={cur?.id ?? "new"} onSubmit={save} className="mt-6 grid gap-4 rounded-2xl border border-gold/25 bg-noir-soft p-6 sm:grid-cols-2">
          <Field label="Label (Home, Work…)" name="label" defaultValue={cur?.label ?? "Home"} />
          <Field label="Full name" name="name" required defaultValue={cur?.name ?? profile?.full_name ?? ""} autoComplete="name" />
          <Field label="Mobile number" name="phone" required type="tel" defaultValue={cur?.phone ?? profile?.phone ?? ""} autoComplete="tel" />
          <Field label="PIN code" name="pincode" required inputMode="numeric" maxLength={6} defaultValue={cur?.pincode ?? ""} autoComplete="postal-code" />
          <Field label="House, street, area" name="address" required defaultValue={cur?.address ?? ""} className="sm:col-span-2" autoComplete="street-address" />
          <Field label="City" name="city" required defaultValue={cur?.city ?? ""} autoComplete="address-level2" />
          <label className="block"><span className={label}>State</span>
            <select name="state" required defaultValue={cur?.state ?? ""} className={input}>
              <option value="" disabled>Choose your state</option>
              {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-3 text-sm text-ivory/80 sm:col-span-2"><input type="checkbox" name="is_default" defaultChecked={cur?.is_default ?? addresses.length === 0} className="h-4 w-4 accent-[#d4af37]" />Use as my default delivery address</label>
          {error && <p role="alert" className="rounded-lg border border-burgundy bg-burgundy/30 px-4 py-3 text-sm text-ivory sm:col-span-2">{error}</p>}
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={busy} className={btn}>{busy ? "Saving…" : "Save address"}</button>
            <button type="button" onClick={() => setEditing(null)} className={ghost}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ───────────────────────────── Profile ───────────────────────────── */

function Profile({ db, profile, reload }: { db: Client; profile: CustomerProfile | null; reload: () => Promise<void> }) {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const phone = String(f.get("phone") ?? "").replace(/[^\d+]/g, "");
    setMsg("");
    setError("");
    if (name.length < 2) return setError("Please enter your full name");
    if (!/^\+?\d{10,13}$/.test(phone)) return setError("Please enter a valid mobile number");
    setBusy(true);
    const { error: err } = await db.from("customer_profiles").update({ full_name: name, phone, updated_at: new Date().toISOString() }).eq("id", profile.id);
    setBusy(false);
    if (err) return setError(err.message);
    setMsg("Profile saved.");
    await reload();
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    setMsg("");
    setError("");
    if (f.get("p1") !== f.get("p2")) return setError("The two passwords do not match");
    const { error: err } = await db.auth.updateUser({ password: String(f.get("p1") ?? "") });
    if (err) return setError(err.message);
    form.reset();
    setMsg("Password changed.");
  }

  if (!profile) return <p className="text-ivory/60">Loading…</p>;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form key={profile.full_name + profile.phone} onSubmit={saveProfile} className="space-y-4 rounded-2xl border border-gold/25 bg-noir-soft p-6">
        <h2 className="font-display text-xl text-ivory">Your details</h2>
        <Field label="Full name" name="name" required defaultValue={profile.full_name} />
        <Field label="Mobile number" name="phone" required type="tel" defaultValue={profile.phone} />
        <label className="block"><span className={label}>Email</span><input value={profile.email} readOnly className={`${input} opacity-70`} /></label>
        <button type="submit" disabled={busy} className={btn}>{busy ? "Saving…" : "Save"}</button>
      </form>
      <form onSubmit={changePassword} className="space-y-4 rounded-2xl border border-gold/25 bg-noir-soft p-6">
        <h2 className="font-display text-xl text-ivory">Change password</h2>
        <Field label="New password" name="p1" type="password" required minLength={8} autoComplete="new-password" />
        <Field label="Confirm new password" name="p2" type="password" required minLength={8} autoComplete="new-password" />
        <button type="submit" className={btn}>Update password</button>
      </form>
      {(msg || error) && (
        <p role={error ? "alert" : "status"} className={`rounded-lg px-4 py-3 text-sm md:col-span-2 ${error ? "border border-burgundy bg-burgundy/30 text-ivory" : "border border-gold/30 bg-gold/10 text-gold-light"}`}>{error || msg}</p>
      )}
    </div>
  );
}

function Field({ label: text, className, ...props }: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>): ReactNode {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className={label}>{text}</span>
      <input {...props} className={input} />
    </label>
  );
}
