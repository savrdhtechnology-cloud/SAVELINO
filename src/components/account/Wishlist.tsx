"use client";

import Image from "next/image";
import Link from "next/link";
import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { inr } from "@/lib/data/types";
import type { RecommendedProduct } from "@/lib/account";

type Client = NonNullable<ReturnType<typeof createSupabaseBrowserClient>>;

const btn = "rounded-full bg-gold px-6 py-3 text-[0.72rem] font-medium uppercase tracking-[0.26em] text-noir transition-opacity hover:opacity-90 disabled:opacity-60";

export function Wishlist({ db, userId, items, reload }: { db: Client; userId: string; items: RecommendedProduct[]; reload: () => Promise<void> }) {
  async function remove(productId: string) {
    await db.from("customer_wishlist").delete().eq("user_id", userId).eq("product_id", productId);
    await reload();
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-gold/20 bg-noir-soft p-8 text-center">
        <p className="font-serif text-2xl text-ivory/80">Your wishlist is empty.</p>
        <p className="mt-2 text-sm text-ivory/65">Tap the heart on any piece to save it here.</p>
        <Link href="/shop" className={`${btn} mt-6 inline-block`}>Browse blouses</Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((p) => (
        <li key={p.id} className="overflow-hidden rounded-2xl border border-gold/25 bg-noir-soft">
          <Link href={`/shop/${p.slug}`} className="group relative block aspect-[3/4] overflow-hidden bg-noir">
            {p.image_url ? (
              <Image src={p.image_url} alt={p.name} fill sizes="260px" unoptimized className="object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center font-display text-5xl italic text-gold/25">S</span>
            )}
          </Link>
          <div className="p-4">
            <Link href={`/shop/${p.slug}`} className="font-display text-lg text-ivory hover:text-gold">{p.name}</Link>
            <p className="mt-1 text-gold">{inr(p.price)}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-[0.72rem] uppercase tracking-[0.16em]">
              <Link href={`/shop/${p.slug}`} className="text-gold hover:underline">View details</Link>
              <button type="button" onClick={() => remove(p.id)} className="text-ivory/55 hover:text-ivory">Remove</button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
