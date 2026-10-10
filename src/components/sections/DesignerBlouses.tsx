"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { ImageReveal, Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { images } from "@/lib/collections";

const details = [
  { k: "01", t: "Sculpted backs", d: "Deep U, keyhole and potli-button backs balanced for every drape." },
  { k: "02", t: "Hand embroidery", d: "Zardozi, aari and sequin work finished by master karigars." },
  { k: "03", t: "Considered fit", d: "Princess-cut panels and soft padding options for all-day ease." },
];

export function DesignerBlouses() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["-8%", "8%"]);
  const yBack = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["10%", "-10%"]);

  return (
    <section
      ref={ref}
      id="designer-blouses"
      aria-label="Designer blouse collection"
      className="relative overflow-hidden bg-noir py-24 md:py-36"
    >
      <div className="mx-auto grid max-w-[1440px] items-center gap-16 px-5 md:px-10 lg:grid-cols-[1.05fr_1fr] lg:gap-24">
        <div className="relative mx-auto w-full max-w-[520px]">
          <motion.div
            style={{ y: yBack }}
            aria-hidden
            className="absolute -right-6 -top-8 h-[85%] w-[78%] border border-gold/30 md:-right-10"
          />
          <motion.div style={{ y }} className="relative">
            <ImageReveal className="aspect-[4/5] border border-gold/30 bg-noir-soft">
              <Image
                src={images.blouses}
                alt="Black designer blouse with gold zardozi embroidery and a sculpted back"
                fill
                sizes="(min-width: 1024px) 520px, 90vw"
                placeholder="blur"
                className="object-cover object-top"
              />
            </ImageReveal>
          </motion.div>
          <Reveal delay={0.3} className="absolute -bottom-8 left-4 bg-burgundy px-6 py-5 md:-left-8">
            <p className="eyebrow text-gold-light!">Signature</p>
            <p className="mt-1 font-display text-2xl italic text-ivory">The Noir Zardozi</p>
          </Reveal>
        </div>

        <div>
          <SectionHeading
            eyebrow="Designer blouse collection"
            title="The blouse, elevated to an heirloom"
            intro="The heart of SAVLINO. Each blouse is drafted, embroidered and finished to make a saree feel entirely new."
          />
          <ul className="mt-12 space-y-7">
            {details.map((d, i) => (
              <li key={d.k}>
                <Reveal delay={0.1 * i} className="flex gap-6 border-t border-gold/15 pt-6">
                  <span className="font-display text-sm text-gold">{d.k}</span>
                  <div>
                    <p className="font-display text-2xl text-ivory">{d.t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ivory/60">{d.d}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
          <Reveal delay={0.3} className="mt-12">
            <Button href="/collections/designer-blouses">View designer blouses</Button>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
