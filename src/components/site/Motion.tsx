"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { MOTION_STYLES, type MotionStyle } from "@/lib/settings";

export { MOTION_STYLES, type MotionStyle };

const MotionStyleContext = createContext<MotionStyle>("cinematic");

export const MOTION_PREVIEW_EVENT = "savlino:motion-preview";

/** Provides the site's motion style to MotionCard below it; listens for live Studio preview changes. */
export function MotionStyleProvider({ style, children }: { style: MotionStyle; children: ReactNode }) {
  const [preview, setPreview] = useState<MotionStyle | null>(null);
  useEffect(() => {
    const on = (e: Event) => setPreview((e as CustomEvent<MotionStyle>).detail);
    window.addEventListener(MOTION_PREVIEW_EVENT, on);
    return () => window.removeEventListener(MOTION_PREVIEW_EVENT, on);
  }, []);
  return <MotionStyleContext.Provider value={preview ?? style}>{children}</MotionStyleContext.Provider>;
}

export function useMotionStyle(): MotionStyle {
  const style = useContext(MotionStyleContext);
  const reduced = useReducedMotion();
  return reduced ? "still" : style;
}

/**
 * Wraps a product/collection card. Under "cinematic" it lifts, scales and tilts slightly on hover with a
 * soft gold glow behind it; under "still"/"reveal" it is a plain, unanimated wrapper (the card's own hover
 * states — image crossfade, "Shop now" pill — still work either way).
 */
export function MotionCard({ children, className }: { children: ReactNode; className?: string }) {
  const style = useMotionStyle();
  if (style !== "cinematic") return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={`group/mcard relative ${className ?? ""}`}
      whileHover={{ y: -8, scale: 1.015, rotate: -0.25 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, mass: 0.6 }}
      style={{ transformPerspective: 900 }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-2 -z-10 rounded-[inherit] opacity-0 blur-xl transition-opacity duration-500 group-hover/mcard:opacity-60"
        style={{ background: "radial-gradient(60% 60% at 50% 40%, color-mix(in srgb, var(--color-gold) 55%, transparent), transparent 70%)" }}
      />
      {children}
    </motion.div>
  );
}
