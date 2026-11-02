"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const phrases = [
  "Ready-made elegance",
  "Standard sizes, luxe finish",
  "Crafted for saree lovers",
  "Made for every occasion",
];

export function ReadyMadeAnimatedLine() {
  const [index, setIndex] = useState(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % phrases.length), 4200);
    return () => window.clearInterval(timer);
  }, [reduced]);
  return (
    <div className="mt-5 flex min-h-8 items-center gap-3" aria-label="Ready-made luxury: standard sizes and premium craftsmanship">
      <span aria-hidden className="h-px w-9 shrink-0 bg-gold" />
      <div className="relative min-h-7 overflow-hidden text-sm font-medium uppercase tracking-[0.17em] text-burgundy sm:tracking-[0.24em]">
        {reduced ? phrases[0] : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={phrases[index]}
              className="block"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              {phrases[index]}
            </motion.span>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
