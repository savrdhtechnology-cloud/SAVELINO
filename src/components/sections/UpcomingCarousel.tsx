"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { inr } from "@/lib/data/types";

export type UpcomingItem = { id: string; slug: string; name: string; subtitle: string; price: number; image: { url: string; fit: string } | null; expected: string };

/** Sliding row of "Coming soon" cards: auto-glides, swipe / arrows / drag-scroll, pauses on hover and for reduced motion. */
export function UpcomingCarousel({ items }: { items: UpcomingItem[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [paused, setPaused] = useState(false);

  const step = useCallback((dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const w = (card?.offsetWidth ?? 300) + 24;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else el.scrollBy({ left: dir * w, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (paused || items.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => step(1), 3800);
    return () => window.clearInterval(t);
  }, [paused, items.length, step]);

  return (
    <div className="relative mt-12" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
      <ul ref={track} role="list" aria-label="Coming soon pieces" className="flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((p) => (
          <li key={p.id} className="w-[72vw] shrink-0 snap-start sm:w-[300px] lg:w-[320px]">
            <Link href={`/shop/${p.slug}`} className="group block rounded-[1.6rem] border border-gold/25 bg-noir/60 p-2 transition-[transform,border-color] duration-500 hover:-translate-y-1 hover:border-gold/60">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.2rem] bg-noir">
                {p.image ? (
                  <Image src={p.image.url} alt={p.name} fill sizes="320px" className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105" style={{ objectPosition: p.image.fit }} />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center font-display text-6xl italic text-gold/25">S</span>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-gold px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-noir">Coming soon</span>
                <span className="absolute bottom-3 left-3 right-3 rounded-full border border-gold/40 bg-noir/70 px-3 py-1.5 text-center text-[0.7rem] uppercase tracking-[0.22em] text-gold-light backdrop-blur">
                  In production{p.expected ? ` · ${p.expected}` : ""}
                </span>
              </div>
              <div className="px-3 pb-3 pt-4 text-center">
                <h3 className="line-clamp-1 font-display text-xl text-ivory">{p.name}</h3>
                {p.subtitle && <p className="mt-1 line-clamp-1 text-[0.78rem] text-ivory/70">{p.subtitle}</p>}
                <p className="mt-2 text-base font-medium text-gold">{inr(p.price)}</p>
                <span className="mt-4 block rounded-full border border-gold/50 py-2.5 text-[0.74rem] uppercase tracking-[0.24em] text-gold transition-colors group-hover:bg-gold group-hover:text-noir">Pre-order now</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {items.length > 1 && (
        <>
          <button type="button" onClick={() => step(-1)} aria-label="Previous" className="absolute left-1 top-[40%] z-10 hidden h-11 w-11 items-center justify-center rounded-full border border-gold/50 bg-noir/80 text-gold backdrop-blur hover:bg-gold hover:text-noir md:flex">‹</button>
          <button type="button" onClick={() => step(1)} aria-label="Next" className="absolute right-1 top-[40%] z-10 hidden h-11 w-11 items-center justify-center rounded-full border border-gold/50 bg-noir/80 text-gold backdrop-blur hover:bg-gold hover:text-noir md:flex">›</button>
        </>
      )}
    </div>
  );
}
