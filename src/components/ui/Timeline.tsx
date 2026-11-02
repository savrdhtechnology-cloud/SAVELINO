"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { useRef } from "react";

export type TimelineStep = { title: string; text: string; tag?: string };

/** Vertical timeline: the gold line draws itself as you scroll and each step slides in. */
export function Timeline({ steps }: { steps: TimelineStep[] }) {
  const ref = useRef<HTMLOListElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 80%", "end 60%"] });
  const grow = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });
  return (
    <ol ref={ref} className="relative mx-auto max-w-3xl space-y-8 pl-10 md:space-y-10 md:pl-14">
      <span aria-hidden className="absolute bottom-2 left-[0.95rem] top-2 w-px bg-gold/20 md:left-[1.35rem]" />
      <motion.span aria-hidden className="absolute left-[0.95rem] top-2 w-px origin-top bg-gradient-to-b from-gold-light to-gold md:left-[1.35rem]" style={{ bottom: "0.5rem", scaleY: reduce ? 1 : grow }} />
      {steps.map((s, i) => (
        <motion.li
          key={s.title}
          className="relative"
          initial={reduce ? false : { opacity: 0, x: 28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "0px 0px -12% 0px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        >
          <span className="absolute -left-10 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-gold bg-noir font-display text-sm italic text-gold md:-left-14 md:h-11 md:w-11 md:text-base">{i + 1}</span>
          {s.tag && <p className="text-[0.74rem] uppercase tracking-[0.28em] text-gold/85">{s.tag}</p>}
          <h3 className="font-display text-xl text-ivory md:text-2xl">{s.title}</h3>
          <p className="mt-1.5 max-w-xl text-[0.95rem] leading-relaxed text-ivory/72">{s.text}</p>
        </motion.li>
      ))}
    </ol>
  );
}
