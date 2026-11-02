"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { useMotionStyle } from "@/components/site/Motion";
import { addToBag, openBag } from "@/lib/store/cart";
import { inr } from "@/lib/data/types";
import { CinemaIcon, Flourish } from "./icons";

/** Only what a carousel card needs — every value comes straight from the product row. */
export type ShowcaseItem = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  price: number;
  compareAt: number | null;
  sizes: string[];
  colors: { name: string; hex: string }[];
  image: { url: string; fit: string } | null;
  bagImage: string | null;
};

/** 3D perspective product showcase: centre card lifted, neighbours turned away, swipe/keys/arrows to move. */
export function PerspectiveProductCarousel({ items }: { items: ShowcaseItem[] }) {
  const [active, setActive] = useState(() => Math.min(1, Math.max(0, items.length - 1)));
  const still = useMotionStyle() === "still";
  const startX = useRef<number | null>(null);
  const [hold, setHold] = useState(false);
  const count = items.length;

  // Glides on its own, loops back to the first card, and stops while the visitor is hovering, touching or focused on it.
  useEffect(() => {
    if (still || hold || count < 2) return;
    const t = window.setInterval(() => setActive((a) => (a + 1) % count), 3600);
    return () => window.clearInterval(t);
  }, [still, hold, count]);

  if (items.length === 0) return null;

  const go = (n: number) => setActive((a) => (a + n + items.length) % items.length);

  return (
    <section aria-labelledby="cin-featured" className="cin-band-deep relative overflow-hidden py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <Reveal className="flex flex-col items-center text-center">
          <p className="text-[0.76rem] uppercase tracking-[0.42em] text-gold-light">Featured</p>
          <h2 id="cin-featured" className="mt-4 font-display text-[clamp(2rem,4.4vw,3.6rem)] text-ivory">
            Featured <span className="cin-shimmer italic">Collections</span>
          </h2>
          <Flourish className="mt-5" />
        </Reveal>
      </div>

      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Featured products"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
        }}
        onMouseEnter={() => setHold(true)}
        onMouseLeave={() => setHold(false)}
        onFocus={() => setHold(true)}
        onBlur={() => setHold(false)}
        onPointerDown={(e) => {
          startX.current = e.clientX;
        }}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
        }}
        className="relative mx-auto mt-14 h-[560px] max-w-[1400px] touch-pan-y select-none outline-none sm:h-[600px]"
        style={{ perspective: 1600 }}
      >
        <div aria-hidden className="cin-reflection absolute bottom-6 left-1/2 h-16 w-[min(80vw,420px)] -translate-x-1/2 rounded-[50%]" />
        {items.map((p, i) => {
          const d = i - active;
          const ad = Math.abs(d);
          if (ad > 2) return null;
          const centre = d === 0;
          return (
            <div
              key={p.id}
              className="cin-pcard absolute left-1/2 top-0 w-[min(76vw,340px)]"
              style={{
                transform: `translateX(calc(-50% + ${d * 72}%)) translateZ(${-ad * 170}px) rotateY(${d * -26}deg) scale(${centre ? 1.04 : 1})`,
                zIndex: 10 - ad,
                opacity: ad === 2 ? 0.35 : ad === 1 ? 0.8 : 1,
                filter: centre ? "none" : `brightness(${ad === 1 ? 0.62 : 0.4})`,
                transition: still ? "none" : "transform 0.9s cubic-bezier(0.22,1,0.36,1), opacity 0.9s, filter 0.9s",
              }}
              aria-hidden={!centre}
            >
              <ProductCardCinema item={p} centre={centre} />
              {!centre && <button type="button" tabIndex={-1} aria-label={`Show ${p.name}`} onClick={() => setActive(i)} className="absolute inset-0 cursor-pointer" />}
            </div>
          );
        })}
        <button type="button" onClick={() => go(-1)} aria-label="Previous product" className="cin-arrow absolute left-3 top-[40%] z-20 md:left-10">
          <CinemaIcon name="arrowL" className="h-4 w-4" strokeWidth={1.6} />
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Next product" className="cin-arrow absolute right-3 top-[40%] z-20 md:right-10">
          <CinemaIcon name="arrowR" className="h-4 w-4" strokeWidth={1.6} />
        </button>
      </div>

      <div className="mt-2 flex justify-center gap-2" aria-hidden>
        {items.map((p, i) => (
          <span key={p.id} className={`h-1 rounded-full transition-all duration-500 ${i === active ? "w-8 bg-gold" : "w-2 bg-gold/30"}`} />
        ))}
      </div>
      <div className="mt-10 flex justify-center">
        <Link href="/shop" className="group inline-flex items-center gap-4 text-[0.78rem] uppercase tracking-[0.32em] text-gold">
          <span className="h-px w-10 bg-gold transition-all duration-500 group-hover:w-16" />
          View all pieces
        </Link>
      </div>
    </section>
  );
}

/** PremiumProductCard — gold-framed card with real price, compare-at price, discount, quick view and add to bag. */
function ProductCardCinema({ item: p, centre }: { item: ShowcaseItem; centre: boolean }) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const off = p.compareAt && p.compareAt > p.price ? Math.round((1 - p.price / p.compareAt) * 100) : 0;
  // Pieces with one size and one colour can go straight in the bag; otherwise the customer chooses on the product page.
  const direct = p.sizes.length <= 1 && p.colors.length <= 1;
  const tab = centre ? 0 : -1;

  const add = () => {
    if (!direct) return router.push(`/shop/${p.slug}`);
    addToBag({ productId: p.id, slug: p.slug, name: p.name, price: p.price, image: p.bagImage, size: p.sizes[0] ?? "", color: p.colors[0]?.name ?? "", qty: 1 });
    setAdded(true);
    openBag();
  };

  return (
    <article className={`cin-card rounded-[1.6rem] p-2 ${centre ? "cin-card-on" : ""}`}>
      <Link href={`/shop/${p.slug}`} tabIndex={tab} className="group relative block aspect-[4/5] overflow-hidden rounded-[1.2rem] bg-noir">
        {p.image ? (
          <Image src={p.image.url} alt={p.name} fill sizes="340px" className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105" style={{ objectPosition: p.image.fit }} />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center font-display text-6xl italic text-gold/25">S</span>
        )}
        {off > 0 && <span className="absolute left-3 top-3 rounded-full bg-burgundy px-2.5 py-1 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-ivory">{off}% off</span>}
        <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-gold/40 bg-noir/70 px-2.5 py-1 text-[0.7rem] uppercase tracking-[0.2em] text-gold-light opacity-0 backdrop-blur transition-opacity duration-500 group-hover:opacity-100">
          <CinemaIcon name="eye" className="h-3 w-3" /> Quick view
        </span>
      </Link>
      <div className="px-3 pb-3 pt-4 text-center">
        <h3 className="line-clamp-1 font-display text-xl text-ivory">{p.name}</h3>
        {p.subtitle && <p className="mt-1 line-clamp-1 text-[0.78rem] text-ivory/70">{p.subtitle}</p>}
        <p className="mt-2 flex items-baseline justify-center gap-2">
          <span className="text-base font-medium text-gold">{inr(p.price)}</span>
          {off > 0 && p.compareAt && <span className="text-xs text-ivory/60 line-through">{inr(p.compareAt)}</span>}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link href={`/shop/${p.slug}`} tabIndex={tab} className="rounded-full border border-gold/40 py-2.5 text-[0.72rem] uppercase tracking-[0.22em] text-gold transition-colors hover:bg-gold/10">
            Quick view
          </Link>
          <button type="button" tabIndex={tab} onClick={add} className="cin-gold-btn rounded-full py-2.5 text-[0.72rem] font-medium uppercase tracking-[0.22em] text-noir">
            {direct ? (added ? "In your bag" : "Add to bag") : "Choose size"}
          </button>
        </div>
      </div>
    </article>
  );
}
