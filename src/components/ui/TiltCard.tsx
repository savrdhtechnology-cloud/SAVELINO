"use client";

import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { ReactNode } from "react";
import { useMotionStyle } from "@/components/site/Motion";

/** Card that leans toward the pointer with a soft gold sheen; plain wrapper for "still" motion or reduced motion. */
export function TiltCard({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const style = useMotionStyle();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [6, -6]), { stiffness: 220, damping: 22 });
  const ry = useSpring(useTransform(mx, [0, 1], [-7, 7]), { stiffness: 220, damping: 22 });
  const sheen = useTransform([mx, my], ([x, y]) => `radial-gradient(420px circle at ${(x as number) * 100}% ${(y as number) * 100}%, rgba(243,209,139,0.16), transparent 60%)`);
  if (reduce || style === "still") return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={`relative [transform-style:preserve-3d] ${className ?? ""}`}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width);
        my.set((e.clientY - r.top) / r.height);
      }}
      onPointerLeave={() => {
        mx.set(0.5);
        my.set(0.5);
      }}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
      {children}
      <motion.span aria-hidden className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] opacity-0 transition-opacity duration-300 [div:hover>&]:opacity-100" style={{ background: sheen }} />
    </motion.div>
  );
}
