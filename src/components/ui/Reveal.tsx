"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fades and lifts content into view once. No-op motion for reduced-motion users. */
export function Reveal({ children, delay = 0, y = 28, className }: RevealProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? { opacity: 1 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: reduce ? 0 : 1.1, delay: reduce ? 0 : delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Image reveal: a noir curtain lifts away while the image settles from a slight zoom. */
export function ImageReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <motion.div
        className="relative h-full w-full"
        initial={reduce ? false : { scale: 1.18 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: "0px 0px -10% 0px" }}
        transition={{ duration: 1.8, delay, ease: EASE }}
      >
        {children}
      </motion.div>
      {!reduce && (
        <motion.div
          aria-hidden
          className="absolute inset-0 origin-top bg-noir"
          initial={{ scaleY: 1 }}
          whileInView={{ scaleY: 0 }}
          viewport={{ once: true, margin: "0px 0px -10% 0px" }}
          transition={{ duration: 1.2, delay, ease: EASE }}
        />
      )}
    </div>
  );
}
