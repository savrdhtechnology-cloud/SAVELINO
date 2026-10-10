"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, type ReactNode } from "react";

export function SidePanel({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title: string; subtitle?: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="scrim" className="fixed inset-0 z-[60] bg-noir/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            key="panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 32 }}
            className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-2xl flex-col border-l border-gold/20 bg-noir-soft shadow-[-40px_0_80px_-20px_rgba(0,0,0,0.8)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-gold/15 px-6 py-5">
              <div className="min-w-0">
                <p className="truncate font-display text-2xl italic text-ivory">{title}</p>
                {subtitle && <div className="mt-1 text-xs text-ivory/55">{subtitle}</div>}
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="h-9 w-9 shrink-0 text-xl text-gold transition-transform hover:rotate-90">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
