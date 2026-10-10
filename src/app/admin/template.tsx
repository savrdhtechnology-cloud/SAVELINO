"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Re-mounts on every CRM navigation, giving each screen a soft entrance. */
export default function AdminTemplate({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
