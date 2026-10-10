"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { ImageReveal, Reveal } from "@/components/ui/Reveal";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { images } from "@/lib/collections";

export function Heritage() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const marqueeX = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["4%", "-28%"]);
  const imgY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-6%", "6%"]);

  return (
    <section ref={ref} id="heritage" aria-label="Indian heritage brand story" className="relative overflow-hidden bg-noir py-24 md:py-36">
      {/* Scroll-driven editorial type */}
      <motion.p
        aria-hidden
        style={{ x: marqueeX }}
        className="pointer-events-none whitespace-nowrap font-display text-[clamp(5rem,16vw,15rem)] italic leading-none text-transparent [-webkit-text-stroke:1px_rgba(212,175,55,0.28)]"
      >
        Heritage · Grace · Legacy · Heritage
      </motion.p>

      <div className="mx-auto mt-10 grid max-w-[1440px] items-center gap-14 px-5 md:mt-16 md:px-10 lg:grid-cols-2 lg:gap-24">
        <motion.div style={{ y: imgY }} className="relative">
          <ImageReveal className="aspect-[1200/896] border border-gold/25">
            <Image
              src={images.heritage}
              alt="A woman in a black saree with gold embroidery in a candlelit heritage interior"
              fill
              sizes="(min-width: 1024px) 50vw, 92vw"
              placeholder="blur"
              className="object-cover"
            />
          </ImageReveal>
        </motion.div>

        <div>
          <Reveal>
            <p className="eyebrow flex items-center gap-4">
              <span aria-hidden className="h-px w-10 bg-gold/70" />
              Our heritage
            </p>
          </Reveal>
          <SplitHeadline
            text="Rooted in India. Made for every shade of a woman."
            className="mt-6 font-display text-[clamp(2.2rem,4.6vw,4rem)] leading-[1.05] text-ivory"
          />
          <Reveal delay={0.15}>
            <p className="mt-8 font-serif text-xl leading-relaxed text-ivory/75 md:text-2xl">
              SAVLINO grew from a simple belief — that the clothes closest to a woman should carry the same care as the
              ones the world sees. Our blouses inherit the craft of India’s embroidery clusters; our intimates and
              loungewear inherit its softness and ease.
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <p className="mt-6 text-sm leading-relaxed text-ivory/60">
              Tradition is our foundation, not our limit. We work with artisans, tailors and fabric houses to keep
              heritage techniques alive in silhouettes made for today.
            </p>
          </Reveal>
          <Reveal delay={0.35}>
            <dl className="mt-12 grid grid-cols-3 gap-6 border-t border-gold/20 pt-8">
              {[
                ["Timeless", "designs"],
                ["Premium", "craftsmanship"],
                ["Modern", "woman"],
              ].map(([a, b]) => (
                <div key={a}>
                  <dt className="font-display text-2xl italic text-gold md:text-3xl">{a}</dt>
                  <dd className="mt-1 text-[0.65rem] uppercase tracking-[0.25em] text-ivory/55">{b}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
