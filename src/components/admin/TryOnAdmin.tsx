"use client";

import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BarList, Ring, type Point } from "./charts";
import { CountUp, Drawer, EASE, StatusBadge } from "./ui";

type Output = { output_view: string; image_url: string | null; provider_response_meta: { sample?: boolean; estimated?: boolean } | null };
type Session = {
  id: string;
  customer_id: string | null;
  guest_id: string | null;
  product_id: string;
  product_name: string | null;
  category: string | null;
  selected_size: string | null;
  selected_color: string | null;
  mode: string;
  consent_accepted: boolean;
  consent_version: string;
  status: string;
  processing_provider: string | null;
  created_at: string;
  virtual_try_on_outputs: Output[];
  virtual_try_on_conversion: { added_to_cart: boolean; converted_to_order: boolean; order_id: string | null } | { added_to_cart: boolean; converted_to_order: boolean; order_id: string | null }[] | null;
  virtual_try_on_saved_looks: { id: string }[];
};
type Event = { session_id: string; event_type: string; created_at: string; event_data?: Record<string, unknown> };
type Input = { image_type: string; image_url: string; image_width: number | null; image_height: number | null; uploaded_at: string };

type Q = PromiseLike<{ data: unknown; error: { message: string } | null }> & {
  order(c: string, o: { ascending: boolean }): Q;
  limit(n: number): Q;
  eq(c: string, v: unknown): Q;
};
type Loose = { from(t: string): { select(c: string): Q } };

const card = "relative overflow-hidden border border-gold/15 bg-noir-soft/50 backdrop-blur";
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
const conv = (s: Session) => (Array.isArray(s.virtual_try_on_conversion) ? s.virtual_try_on_conversion[0] : s.virtual_try_on_conversion) ?? null;

/** Clearly-labelled sample data for when the database isn't connected. */
function demoData(): { sessions: Session[]; events: Event[] } {
  const products = [
    ["designer-blouses", "Designer Blouses", ["Noir & gold", "Emerald", "Burgundy"]],
    ["sarees", "Sarees", ["Tissue gold", "Wine"]],
    ["salwar-suits", "Salwar Suits", ["Burgundy", "Emerald"]],
    ["loungewear", "Loungewear", ["Champagne", "Blush"]],
    ["ready-made-blouses", "Ready-Made Blouses", ["Rose", "Noir"]],
  ] as const;
  const statuses = ["completed", "completed", "completed", "processing", "failed", "uploaded"];
  const base = Date.UTC(2026, 9, 9, 12);
  const sessions: Session[] = Array.from({ length: 18 }, (_, i) => {
    const [slug, name, colors] = products[i % products.length];
    const status = statuses[i % statuses.length];
    return {
      id: `demo-${String(i + 1).padStart(4, "0")}`,
      customer_id: i % 3 ? "demo-customer" : null,
      guest_id: i % 3 ? null : "demo-guest",
      product_id: slug,
      product_name: name,
      category: slug,
      selected_size: ["34", "36", "38", "40"][i % 4],
      selected_color: colors[i % colors.length],
      mode: i % 4 === 0 ? "premium" : "quick",
      consent_accepted: true,
      consent_version: "2026-10-v1",
      status,
      processing_provider: "mock",
      created_at: new Date(base - i * 5.5 * 3600000).toISOString(),
      virtual_try_on_outputs: [],
      virtual_try_on_conversion: { added_to_cart: i % 4 === 1, converted_to_order: false, order_id: null },
      virtual_try_on_saved_looks: i % 5 === 0 ? [{ id: "s" }] : [],
    };
  });
  const types = ["compare_original", "try_other_color", "try_other_size", "download", "share", "custom_stitching_request"];
  const events = sessions.flatMap((s, i) => types.filter((_, j) => (i + j) % 3 === 0).map((t) => ({ session_id: s.id, event_type: t, created_at: s.created_at })));
  return { sessions, events };
}

function count<T>(rows: T[], key: (r: T) => string | null | undefined): Point[] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

export function TryOnAdmin({ live }: { live: boolean }) {
  const [sessions, setSessions] = useState<Session[]>(() => (live ? [] : demoData().sessions));
  const [events, setEvents] = useState<Event[]>(() => (live ? [] : demoData().events));
  const [loading, setLoading] = useState(live);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Session | null>(null);
  const [inputs, setInputs] = useState<Input[] | null>(null);

  const db = useCallback(() => createSupabaseBrowserClient() as unknown as Loose | null, []);

  useEffect(() => {
    if (!live) return;
    const sb = db();
    if (!sb) return;
    (async () => {
      const [s, e] = await Promise.all([
        sb
          .from("virtual_try_on_sessions")
          .select(
            "id,customer_id,guest_id,product_id,product_name,category,selected_size,selected_color,mode,consent_accepted,consent_version,status,processing_provider,created_at,virtual_try_on_outputs(output_view,image_url,provider_response_meta),virtual_try_on_conversion(added_to_cart,converted_to_order,order_id),virtual_try_on_saved_looks(id)",
          )
          .order("created_at", { ascending: false })
          .limit(500),
        sb.from("virtual_try_on_events").select("session_id,event_type,created_at").order("created_at", { ascending: false }).limit(5000),
      ]);
      if (s.error) setError(s.error.message);
      setSessions((s.data as Session[] | null) ?? []);
      setEvents((e.data as Event[] | null) ?? []);
      setLoading(false);
    })();
  }, [live, db]);

  // Customer photos load only when an admin opens a specific session.
  useEffect(() => {
    setInputs(null);
    if (!open || !live) return;
    const sb = db();
    if (!sb) return;
    sb.from("virtual_try_on_inputs")
      .select("image_type,image_url,image_width,image_height,uploaded_at")
      .eq("session_id", open.id)
      .then(({ data }) => setInputs((data as Input[] | null) ?? []));
  }, [open, live, db]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const completed = sessions.filter((s) => s.status === "completed").length;
    const cart = sessions.filter((s) => conv(s)?.added_to_cart).length;
    const saved = sessions.filter((s) => s.virtual_try_on_saved_looks?.length).length;
    const ev = (t: string) => events.filter((e) => e.event_type === t).length;
    return {
      total,
      completed,
      cart,
      saved,
      premium: sessions.filter((s) => s.mode === "premium").length,
      completion: total ? completed / total : 0,
      cartRate: total ? cart / total : 0,
      byProduct: count(sessions, (s) => s.product_name),
      byCategory: count(sessions, (s) => s.category?.replace(/-/g, " ")),
      byColor: count(sessions, (s) => s.selected_color),
      bySize: count(sessions, (s) => s.selected_size),
      usage: [
        { label: "Compare with original", value: ev("compare_original") },
        { label: "Try another colour", value: ev("try_other_color") },
        { label: "Try another size", value: ev("try_other_size") },
        { label: "Download", value: ev("download") },
        { label: "Share", value: ev("share") },
        { label: "Custom stitching request", value: ev("custom_stitching_request") },
      ],
    };
  }, [sessions, events]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter(
      (s) => (filter === "all" || s.status === filter) && (!q || `${s.product_name} ${s.selected_color} ${s.selected_size} ${s.id}`.toLowerCase().includes(q)),
    );
  }, [sessions, filter, query]);

  const kpis = [
    { label: "Try-on sessions", value: stats.total },
    { label: "Previews generated", value: stats.completed },
    { label: "Add-to-bag intents", value: stats.cart },
    { label: "Saved looks", value: stats.saved },
    { label: "Premium sessions", value: stats.premium },
  ];
  const sessionEvents = open ? events.filter((e) => e.session_id === open.id) : [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.6rem] uppercase tracking-[0.3em] text-gold">Website · Virtual Try-On</p>
          <h1 className="mt-2 font-display text-4xl italic text-ivory">Virtual Try-Ons</h1>
          <p className="mt-2 max-w-2xl text-sm text-ivory/55">
            Sessions, consent, previews and conversion from the AI Virtual Try-On Studio. Customer photos are private and load only when you open a session.
          </p>
        </div>
        {!live && <span className="border border-gold/40 bg-gold/10 px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.22em] text-gold">Demo data — database not connected</span>}
      </header>

      {error && <p className="border border-red-300/40 bg-red-400/5 px-4 py-3 text-sm text-red-200">{error}</p>}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.6, ease: EASE }} className={`${card} p-5`}>
            <p className="text-[0.55rem] uppercase tracking-[0.25em] text-ivory/50">{k.label}</p>
            <p className="mt-3 font-display text-3xl text-ivory">{loading ? "—" : <CountUp value={k.value} />}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${card} p-6`}>
          <p className="text-[0.6rem] uppercase tracking-[0.28em] text-ivory/60">Funnel</p>
          <div className="mt-4 grid grid-cols-2">
            <Ring value={stats.completion} label="Completed" />
            <Ring value={stats.cartRate} label="To bag" />
          </div>
          <p className="mt-4 text-[0.7rem] text-ivory/45">Add-to-bag records intent only until checkout is live. Orders are linked only from real orders.</p>
        </div>
        <div className={`${card} p-6`}>
          <p className="mb-4 text-[0.6rem] uppercase tracking-[0.28em] text-ivory/60">Most tried products</p>
          <BarList data={stats.byProduct.slice(0, 6)} />
        </div>
        <div className={`${card} p-6`}>
          <p className="mb-4 text-[0.6rem] uppercase tracking-[0.28em] text-ivory/60">Result actions</p>
          <BarList data={stats.usage} />
        </div>
        <div className={`${card} p-6`}>
          <p className="mb-4 text-[0.6rem] uppercase tracking-[0.28em] text-ivory/60">Sessions by category</p>
          <BarList data={stats.byCategory} />
        </div>
        <div className={`${card} p-6`}>
          <p className="mb-4 text-[0.6rem] uppercase tracking-[0.28em] text-ivory/60">Colours tried</p>
          <BarList data={stats.byColor.slice(0, 6)} />
        </div>
        <div className={`${card} p-6`}>
          <p className="mb-4 text-[0.6rem] uppercase tracking-[0.28em] text-ivory/60">Sizes tried</p>
          <BarList data={stats.bySize.slice(0, 6)} />
        </div>
      </div>

      <div className={card}>
        <div className="flex flex-wrap items-center gap-3 border-b border-gold/15 p-4">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product, colour, size…" aria-label="Search sessions" className="min-w-[200px] flex-1 border border-gold/20 bg-transparent px-3 py-2 text-sm text-ivory placeholder:text-ivory/35 focus:border-gold focus:outline-none" />
          <div className="flex flex-wrap gap-1">
            {["all", "completed", "processing", "uploaded", "failed", "deleted"].map((s) => (
              <button key={s} onClick={() => setFilter(s)} className="relative px-3 py-1.5 text-[0.55rem] uppercase tracking-[0.22em]">
                {filter === s && <motion.span layoutId="tryon-admin-filter" className="absolute inset-0 border border-gold/60 bg-gold/10" />}
                <span className={`relative ${filter === s ? "text-gold" : "text-ivory/55"}`}>{s}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="text-[0.55rem] uppercase tracking-[0.22em] text-ivory/45">
              <tr className="border-b border-gold/10">
                {["Created", "Product", "Colour / size", "Mode", "Shopper", "Consent", "Status", "Bag"].map((h) => (
                  <th key={h} className="px-4 py-3 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} onClick={() => setOpen(s)} className="cursor-pointer border-b border-gold/[0.07] text-ivory/80 transition-colors hover:bg-gold/[0.05]">
                  <td className="px-4 py-3 tabular-nums text-ivory/60">{dateFmt.format(new Date(s.created_at))}</td>
                  <td className="px-4 py-3 text-ivory">{s.product_name}</td>
                  <td className="px-4 py-3">{s.selected_color} · {s.selected_size}</td>
                  <td className="px-4 py-3 capitalize">{s.mode}</td>
                  <td className="px-4 py-3">{s.customer_id ? "Customer" : "Guest"}</td>
                  <td className="px-4 py-3 text-xs">{s.consent_accepted ? `✓ ${s.consent_version}` : "—"}</td>
                  <td className="px-4 py-3"><StatusBadge value={s.status} /></td>
                  <td className="px-4 py-3">{conv(s)?.added_to_cart ? "Yes" : "—"}</td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-ivory/45">{loading ? "Loading sessions…" : "No try-on sessions yet."}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={open?.product_name ?? "Session"}>
        {open && (
          <div className="space-y-6 text-sm">
            <dl className="grid grid-cols-2 gap-4">
              {[
                ["Status", <StatusBadge key="s" value={open.status} />],
                ["Mode", open.mode],
                ["Colour", open.selected_color ?? "—"],
                ["Size", open.selected_size ?? "—"],
                ["Shopper", open.customer_id ? "Signed-in customer" : "Guest"],
                ["Provider", open.processing_provider ?? "—"],
                ["Consent", open.consent_accepted ? `Accepted · ${open.consent_version}` : "Not accepted"],
                ["Saved look", open.virtual_try_on_saved_looks?.length ? "Yes" : "No"],
                ["Added to bag", conv(open)?.added_to_cart ? "Yes (intent)" : "No"],
                ["Order", conv(open)?.converted_to_order ? conv(open)?.order_id ?? "Yes" : "Not converted"],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <dt className="text-[0.55rem] uppercase tracking-[0.22em] text-ivory/45">{k}</dt>
                  <dd className="mt-1 text-ivory">{v}</dd>
                </div>
              ))}
            </dl>

            <section>
              <p className="text-[0.6rem] uppercase tracking-[0.28em] text-gold">Customer photos (private)</p>
              {!live ? (
                <p className="mt-2 text-ivory/45">Demo session — no photos.</p>
              ) : inputs === null ? (
                <p className="mt-2 text-ivory/45">Loading…</p>
              ) : inputs.length ? (
                <ul className="mt-3 grid grid-cols-2 gap-3">
                  {inputs.map((i) => (
                    <li key={i.image_type} className="border border-gold/15">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={i.image_url} alt={`${i.image_type} input`} className="aspect-[3/4] w-full object-cover" />
                      <p className="px-2 py-1 text-[0.55rem] uppercase tracking-[0.2em] text-ivory/60">{i.image_type} · {i.image_width}×{i.image_height}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-ivory/45">No photos (erased or not uploaded).</p>
              )}
            </section>

            <section>
              <p className="text-[0.6rem] uppercase tracking-[0.28em] text-gold">Generated views</p>
              {open.virtual_try_on_outputs?.length ? (
                <ul className="mt-3 grid grid-cols-4 gap-2">
                  {open.virtual_try_on_outputs.map((o) => (
                    <li key={o.output_view} className="border border-gold/15">
                      {o.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={o.image_url} alt={`${o.output_view} view`} className="aspect-[3/4] w-full object-cover" />
                      ) : (
                        <span className="grid aspect-[3/4] place-items-center text-[0.5rem] text-ivory/40">erased</span>
                      )}
                      <p className="px-1.5 py-1 text-[0.5rem] uppercase tracking-[0.18em] text-ivory/60">
                        {o.output_view}{o.provider_response_meta?.sample ? " · sample" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-ivory/45">No views generated yet.</p>
              )}
            </section>

            <section>
              <p className="text-[0.6rem] uppercase tracking-[0.28em] text-gold">Activity</p>
              <ol className="mt-3 space-y-2 border-l border-gold/20 pl-4">
                {sessionEvents.length ? (
                  sessionEvents.map((e, i) => (
                    <li key={i} className="text-ivory/75">
                      <span className="capitalize">{e.event_type.replace(/_/g, " ")}</span>
                      <span className="ml-2 text-[0.65rem] text-ivory/40">{dateFmt.format(new Date(e.created_at))}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-ivory/45">No activity recorded.</li>
                )}
              </ol>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}
