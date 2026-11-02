"use client";

import Image, { type StaticImageData } from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

export type HeroSlide = {
  kicker: string;
  title: string;
  summary: string;
  image: StaticImageData | string;
  href: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;
const AUTOPLAY_MS = 5500;

/**
 * Full-bleed photo hero slider for the "Pearl Celebration" website theme — arrows, dot
 * navigation, autoplay with pause-on-hover, and a slow Ken-Burns drift on the active photo.
 * Slides are built from real collection/category photography (see page.tsx).
 */
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (reduce || paused || count < 2) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [reduce, paused, count]);

  if (!count) return null;
  const slide = slides[index];

  return (
    <section
      id="top"
      aria-label="SAVLINO — featured collections"
      className="grain relative h-[82svh] min-h-[480px] w-full overflow-hidden bg-noir md:h-[85svh]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={index}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: EASE }}
          className="absolute inset-0"
        >
          <motion.div
            initial={reduce ? false : { scale: 1 }}
            animate={{ scale: reduce ? 1 : 1.08 }}
            transition={{ duration: AUTOPLAY_MS / 1000 + 1, ease: "linear" }}
            className="absolute inset-0"
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              priority={index === 0}
              quality={92}
              sizes="100vw"
              className="object-cover object-center"
            />
          </motion.div>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(0deg, rgba(11,11,11,0.86) 0%, rgba(11,11,11,0.35) 48%, rgba(11,11,11,0.15) 68%, rgba(11,11,11,0.55) 100%)",
            }}
          />
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-24 text-center md:pb-28">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <p className="eyebrow" data-studio="hero-slide-kicker">
              {slide.kicker}
            </p>
            <h1 className="mx-auto mt-4 max-w-4xl font-display text-[clamp(2.2rem,6.4vw,5rem)] italic leading-[1.02] tracking-[-0.01em] text-ivory">
              {slide.title}
            </h1>
            <p className="mx-auto mt-4 max-w-xl font-serif text-lg text-ivory/75 md:text-xl">{slide.summary}</p>
            <div className="mt-7 flex items-center justify-center gap-3 sm:gap-5">
              <Button href={slide.href}>Shop now</Button>
              <Button href="/custom-stitching" variant="outline">
                Custom stitching
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(index - 1)}
            className="group absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-ivory/30 bg-noir/30 text-ivory backdrop-blur transition-colors duration-300 hover:border-gold hover:bg-noir/60 md:left-6 md:h-12 md:w-12"
          >
            <ArrowIcon className="rotate-180" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(index + 1)}
            className="group absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-ivory/30 bg-noir/30 text-ivory backdrop-blur transition-colors duration-300 hover:border-gold hover:bg-noir/60 md:right-6 md:h-12 md:w-12"
          >
            <ArrowIcon />
          </button>

          <div className="absolute inset-x-0 bottom-8 z-10 flex items-center justify-center gap-2.5 md:bottom-10">
            {slides.map((s, i) => (
              <button
                key={s.title}
                type="button"
                aria-label={`Go to slide ${i + 1}: ${s.title}`}
                aria-current={i === index}
                onClick={() => go(i)}
                className="group relative h-2.5 w-2.5 rounded-full"
              >
                <span className={`absolute inset-0 rounded-full transition-colors duration-300 ${i === index ? "bg-gold" : "bg-ivory/40 group-hover:bg-ivory/70"}`} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={`h-4.5 w-4.5 ${className}`} aria-hidden>
      <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
