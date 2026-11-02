"use client";

import Link from "next/link";
import type { StaticImageData } from "next/image";
import { useRef, type PointerEvent } from "react";
import { CategoryImage } from "@/components/ui/CategoryImage";
import { Reveal } from "@/components/ui/Reveal";
import { useMotionStyle } from "@/components/site/Motion";
import { CinemaIcon, Flourish } from "./icons";

export type CategoryCard = { slug: string; title: string; kicker: string; image: StaticImageData | string; href: string };

/** Floating category cards: horizontal snap carousel, perspective tilt on hover, swipe on touch. */
export function LuxuryCategoryCarousel({ items }: { items: CategoryCard[] }) {
  const track = useRef<HTMLUListElement>(null);
  const still = useMotionStyle() === "still";
  if (items.length === 0) return null;

  const scrollBy = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector("li");
    el.scrollBy({ left: dir * ((card?.clientWidth ?? 300) + 20), behavior: still ? "auto" : "smooth" });
  };

  const tilt = (e: PointerEvent<HTMLAnchorElement>) => {
    if (still || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--tx", `${((e.clientY - r.top) / r.height - 0.5) * -10}deg`);
    e.currentTarget.style.setProperty("--ty", `${((e.clientX - r.left) / r.width - 0.5) * 12}deg`);
  };
  const reset = (e: PointerEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.setProperty("--tx", "0deg");
    e.currentTarget.style.setProperty("--ty", "0deg");
  };

  return (
    <section aria-labelledby="cin-cats" className="cin-band relative overflow-hidden py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <Reveal className="flex flex-col items-center text-center">
          <p className="text-[0.76rem] uppercase tracking-[0.42em] text-gold-light">Explore</p>
          <h2 id="cin-cats" className="mt-4 font-display text-[clamp(2rem,4.4vw,3.6rem)] text-ivory">
            Shop by <span className="cin-shimmer italic">Category</span>
          </h2>
          <Flourish className="mt-5" />
        </Reveal>
      </div>
      <div className="relative mt-12">
        <ul ref={track} className="cin-track flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-10 pt-4 md:px-10" style={{ perspective: 1200 }}>
          {items.map((c, i) => (
            <li key={c.slug} className="w-[68vw] shrink-0 snap-center sm:w-[42vw] md:w-[30vw] lg:w-[22vw] xl:w-[19vw]">
              <Reveal delay={Math.min(i, 5) * 0.08}>
                <Link href={c.href} onPointerMove={tilt} onPointerLeave={reset} className="cin-cat group block">
                  <span className="cin-cat-inner relative block aspect-[3/4] overflow-hidden rounded-[1.4rem]">
                    <CategoryImage src={c.image} alt={c.title} sizes="(min-width: 1280px) 19vw, (min-width: 768px) 30vw, 68vw" className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-110" />
                    <span aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,7,9,0.92)_8%,rgba(57,7,17,0.35)_48%,transparent)]" />
                    <span className="absolute inset-x-0 bottom-0 flex flex-col items-center p-5 text-center">
                      <span className="text-[0.68rem] uppercase tracking-[0.3em] text-gold-light/80 transition-all duration-500 group-hover:tracking-[0.38em]">{c.kicker}</span>
                      <span className="mt-2 font-display text-2xl leading-tight text-ivory">{c.title}</span>
                      <span className="mt-3 h-px w-8 bg-gold transition-all duration-500 group-hover:w-20" />
                    </span>
                  </span>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
        {items.length > 3 && (
          <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-3 md:flex">
            <button type="button" onClick={() => scrollBy(-1)} aria-label="Previous categories" className="cin-arrow pointer-events-auto">
              <CinemaIcon name="arrowL" className="h-4 w-4" strokeWidth={1.6} />
            </button>
            <button type="button" onClick={() => scrollBy(1)} aria-label="More categories" className="cin-arrow pointer-events-auto">
              <CinemaIcon name="arrowR" className="h-4 w-4" strokeWidth={1.6} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
