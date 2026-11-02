"use client";

import { motion, useReducedMotion } from "motion/react";
import { ORDER_STEPS, orderStage, type MyOrder } from "@/lib/account";

/** Horizontal (vertical on phones) progress for one order. */
export function OrderTimeline({ order }: { order: MyOrder }) {
  const reduce = useReducedMotion();
  if (order.status === "cancelled") return <p className="rounded-lg border border-burgundy bg-burgundy/30 px-4 py-3 text-sm text-ivory">This order was cancelled.</p>;
  const stage = orderStage(order.status);
  return (
    <ol className="grid gap-3 sm:grid-cols-6">
      {ORDER_STEPS.map((label, i) => {
        const done = i <= stage;
        const now = i === stage;
        return (
          <motion.li
            key={label}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reduce ? 0 : i * 0.06 }}
            className="flex items-center gap-3 sm:flex-col sm:text-center"
          >
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs ${done ? "border-gold bg-gold text-noir" : "border-gold/30 text-ivory/50"} ${now ? "ring-4 ring-gold/25" : ""}`}>
              {done ? "✓" : i + 1}
            </span>
            <span className={`text-[0.82rem] leading-tight ${done ? "text-ivory" : "text-ivory/50"}`}>{label}</span>
          </motion.li>
        );
      })}
    </ol>
  );
}
