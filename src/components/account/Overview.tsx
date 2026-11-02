"use client";

import Image from "next/image";
import Link from "next/link";
import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { inr } from "@/lib/data/types";
import { statusLabel, type Measurement, type MyOrder, type RecommendedProduct, type ReturnRequest } from "@/lib/account";
import { OrderTimeline } from "./OrderTimeline";

type Client = NonNullable<ReturnType<typeof createSupabaseBrowserClient>>;

const ICON: Record<string, string> = {
  box: "M3 7l9-4 9 4-9 4-9-4Zm0 0v10l9 4m0-14v14m9-14v10l-9 4",
  stitch: "M4 20V10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10M4 20h16M8 20v-6m8 6v-6",
  returns: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
  ruler: "M4 7h16v10H4zM8 7v4M12 7v6M16 7v4",
};

function StatIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" strokeWidth={1.5} className="h-5 w-5" fill="none" stroke="currentColor" aria-hidden>
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Overview({
  db,
  userId,
  orders,
  returns,
  measurements,
  recommended,
  wishlistIds,
  onTab,
  reload,
}: {
  db: Client;
  userId: string;
  orders: MyOrder[] | null;
  returns: ReturnRequest[];
  measurements: Measurement[];
  recommended: RecommendedProduct[];
  wishlistIds: Set<string>;
  onTab: (tab: "orders" | "returns" | "measurements") => void;
  reload: () => Promise<void>;
}) {
  const activeOrders = (orders ?? []).filter((o) => o.status !== "delivered" && o.status !== "cancelled").length;
  const stitchingRequests = (orders ?? []).filter((o) => o.preorder_state === "waiting").length;
  const returnsInProgress = returns.filter((r) => !["refunded", "replaced", "rejected"].includes(r.status)).length;
  const latest = (orders ?? []).find((o) => o.status !== "cancelled");

  async function toggleWishlist(productId: string) {
    if (wishlistIds.has(productId)) await db.from("customer_wishlist").delete().eq("user_id", userId).eq("product_id", productId);
    else await db.from("customer_wishlist").insert({ user_id: userId, product_id: productId });
    await reload();
  }

  const tiles: [string, number, string, () => void][] = [
    ["Active orders", activeOrders, "box", () => onTab("orders")],
    ["Custom stitching in progress", stitchingRequests, "stitch", () => onTab("orders")],
    ["Returns in progress", returnsInProgress, "returns", () => onTab("returns")],
    ["Saved measurements", measurements.length, "ruler", () => onTab("measurements")],
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(([t, n, icon, go]) => (
          <button key={t} type="button" onClick={go} className="rounded-2xl border border-gold/25 bg-noir-soft p-5 text-left transition-colors hover:border-gold">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/40 text-gold"><StatIcon d={ICON[icon]} /></span>
            <p className="mt-3 font-display text-3xl text-ivory">{n}</p>
            <p className="mt-1 text-[0.8rem] text-ivory/65">{t}</p>
          </button>
        ))}
      </div>

      {latest && (
        <div className="rounded-2xl border border-gold/25 bg-noir-soft p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Order tracking</p>
              <p className="mt-1 font-display text-xl text-ivory">{latest.order_no} · {statusLabel(latest)}</p>
            </div>
            <button type="button" onClick={() => onTab("orders")} className="text-[0.72rem] uppercase tracking-[0.2em] text-gold hover:underline">View order →</button>
          </div>
          <div className="mt-5"><OrderTimeline order={latest} /></div>
        </div>
      )}

      {(orders ?? []).length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <p className="eyebrow">Recent orders</p>
            <button type="button" onClick={() => onTab("orders")} className="text-[0.72rem] uppercase tracking-[0.2em] text-gold hover:underline">View all →</button>
          </div>
          <ul className="mt-3 divide-y divide-gold/10 rounded-2xl border border-gold/15">
            {(orders ?? []).slice(0, 3).map((o) => (
              <li key={o.order_no} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <span>
                  <span className="block text-ivory">{o.order_no}</span>
                  <span className="text-[0.8rem] text-ivory/60">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </span>
                <span className="rounded-full border border-gold/50 px-3 py-1 text-[0.72rem] uppercase tracking-[0.16em] text-gold">{statusLabel(o)}</span>
                <span className="font-display text-gold">{inr(o.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recommended.length > 0 && (
        <div>
          <p className="eyebrow">Suggested for you</p>
          <p className="mt-2 font-display text-2xl text-ivory">Recommended blouses</p>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((p) => {
              const liked = wishlistIds.has(p.id);
              return (
                <li key={p.id} className="overflow-hidden rounded-2xl border border-gold/25 bg-noir-soft">
                  <div className="group relative block aspect-[3/4] overflow-hidden bg-noir">
                    <Link href={`/shop/${p.slug}`} className="absolute inset-0">
                      {p.image_url ? (
                        <Image src={p.image_url} alt={p.name} fill sizes="260px" unoptimized className="object-cover transition-transform duration-700 group-hover:scale-105" />
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center font-display text-5xl italic text-gold/25">S</span>
                      )}
                    </Link>
                    <button
                      type="button"
                      aria-pressed={liked}
                      aria-label={liked ? `Remove ${p.name} from wishlist` : `Add ${p.name} to wishlist`}
                      onClick={() => toggleWishlist(p.id)}
                      className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-noir/50 text-ivory backdrop-blur transition-colors hover:bg-noir/80"
                    >
                      <svg viewBox="0 0 24 24" strokeWidth={1.6} className="h-4 w-4" aria-hidden fill={liked ? "#D4AF37" : "none"} stroke={liked ? "#D4AF37" : "currentColor"}>
                        <path d="M12 20.5s-7.5-4.6-10-9.2C.5 7.8 2.3 4.5 5.7 4c2-.3 3.9.7 6.3 3.1C14.4 4.7 16.3 3.7 18.3 4c3.4.5 5.2 3.8 3.7 7.3-2.5 4.6-10 9.2-10 9.2Z" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-4">
                    <p className="font-display text-lg text-ivory">{p.name}</p>
                    <p className="mt-1 text-gold">{inr(p.price)}</p>
                    <Link href={`/shop/${p.slug}`} className="mt-3 inline-block text-[0.72rem] uppercase tracking-[0.16em] text-gold hover:underline">View details</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
