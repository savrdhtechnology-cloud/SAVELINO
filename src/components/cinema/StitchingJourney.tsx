"use client";

import { motion, useScroll, useTransform } from "motion/react";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { useMotionStyle } from "@/components/site/Motion";
import { CinemaIcon, Flourish, type CinemaIconName } from "./icons";

const STEPS: { icon: CinemaIconName; title: string; text: string }[] = [
  { icon: "design", title: "Choose Design", text: "Pick a neckline, sleeve and back from our designs — or share your own idea." },
  { icon: "tape", title: "Share Measurements", text: "Send your measurements or a well-fitting blouse; our size guide helps." },
  { icon: "needle", title: "Crafting", text: "Our tailors cut, stitch and hand-finish your piece in the atelier." },
  { icon: "box", title: "Delivery", text: "Packed with care and delivered to your door." },
];

/** Custom stitching journey: four glass panels joined by a gold line that draws as you scroll. */
export function StitchingJourney() {
  const ref = useRef<HTMLElement>(null);
  const still = useMotionStyle() === "still";
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "center 55%"] });
  const draw = useTransform(scrollYProgress, [0, 1], still ? [1, 1] : [0, 1]);

  return (
    <section ref={ref} id="custom-stitching" aria-labelledby="cin-stitch" className="cin-band relative overflow-hidden py-20 md:py-28">
      <div className="mx-auto max-w-[1300px] px-5 md:px-10">
        <Reveal className="flex flex-col items-center text-center">
          <p className="text-[0.76rem] uppercase tracking-[0.42em] text-gold-light">Made for you</p>
          <h2 id="cin-stitch" className="mt-4 font-display text-[clamp(2rem,4.4vw,3.6rem)] text-ivory">
            Luxury <span className="cin-shimmer italic">Custom Stitching</span>
          </h2>
          <Flourish className="mt-5" />
        </Reveal>

        <div className="relative mt-16">
          {/* Connecting gold line (desktop) */}
          <svg aria-hidden viewBox="0 0 1000 4" preserveAspectRatio="none" className="absolute left-[12.5%] right-[12.5%] top-[70px] hidden h-1 w-[75%] md:block">
            <line x1="0" y1="2" x2="1000" y2="2" stroke="color-mix(in srgb, var(--color-gold) 22%, transparent)" strokeWidth="2" strokeDasharray="6 8" />
            <motion.line x1="0" y1="2" x2="1000" y2="2" stroke="var(--color-gold)" strokeWidth="2" style={{ pathLength: draw }} />
          </svg>
          <ol className="relative grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <Reveal delay={i * 0.12}>
                  <div className="cin-glass group flex h-full flex-col items-center rounded-[1.4rem] px-6 pb-8 pt-6 text-center transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-2">
                    <span className="cin-step-badge relative flex h-[92px] w-[92px] items-center justify-center rounded-full text-gold">
                      <CinemaIcon name={s.icon} className="h-8 w-8 transition-transform duration-700 group-hover:scale-110" strokeWidth={1.1} />
                      <span className="absolute -right-1 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gold font-sans text-[0.74rem] font-semibold text-noir">{i + 1}</span>
                    </span>
                    <h3 className="mt-5 font-display text-2xl text-ivory">{s.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-ivory/60">{s.text}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
        <div className="mt-14 flex justify-center">
          <Button href="/custom-stitching">Start Custom Stitching</Button>
        </div>
      </div>
    </section>
  );
}
