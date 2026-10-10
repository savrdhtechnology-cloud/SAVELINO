"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import type { ModuleConfig, Row } from "@/lib/admin/types";
import { EASE, formatINR } from "./ui";

type Props = {
  cfg: ModuleConfig & { kanban: NonNullable<ModuleConfig["kanban"]> };
  rows: Row[];
  onMove: (id: string, column: string) => void;
  onOpen: (id: string) => void;
};

/** Drag-and-drop pipeline board. Dropping a card on a column updates its stage. */
export function KanbanBoard({ cfg, rows, onMove, onOpen }: Props) {
  const reduce = useReducedMotion();
  const { key, columns, title, subtitle, amountKey } = cfg.kanban;
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);

  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
      {columns.map((col, ci) => {
        const items = rows.filter((r) => String(r[key]) === col);
        const total = amountKey ? items.reduce((s, r) => s + Number(r[amountKey] ?? 0), 0) : 0;
        return (
          <motion.section
            key={col}
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ci * 0.05, duration: 0.6, ease: EASE }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(col);
            }}
            onDragLeave={() => setOver((o) => (o === col ? null : o))}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain") || dragId;
              setOver(null);
              setDragId(null);
              if (id) onMove(id, col);
            }}
            className={`flex w-72 shrink-0 flex-col border bg-noir-soft/40 backdrop-blur transition-colors ${
              over === col ? "border-gold/70 bg-gold/[0.06]" : "border-gold/12"
            }`}
            aria-label={col.replace(/_/g, " ")}
          >
            <header className="flex items-center justify-between border-b border-gold/12 px-4 py-3">
              <p className="text-[0.6rem] uppercase tracking-[0.25em] text-gold">{col.replace(/_/g, " ")}</p>
              <span className="flex h-6 min-w-6 items-center justify-center bg-gold/10 px-1.5 text-[0.65rem] text-gold-light">{items.length}</span>
            </header>
            {amountKey && total > 0 && <p className="px-4 pt-2 text-xs text-ivory/45">{formatINR(total)}</p>}
            <div className="flex min-h-40 flex-1 flex-col gap-2 p-3">
              <AnimatePresence initial={false}>
                {items.map((r) => (
                  <motion.button
                    key={r.id}
                    type="button"
                    layout={!reduce}
                    layoutId={reduce ? undefined : `card-${cfg.slug}-${r.id}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: dragId === r.id ? 0.4 : 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    whileHover={reduce ? undefined : { y: -2 }}
                    draggable
                    onDragStartCapture={(e: React.DragEvent<HTMLButtonElement>) => {
                      e.dataTransfer.setData("text/plain", r.id);
                      e.dataTransfer.effectAllowed = "move";
                      setDragId(r.id);
                    }}
                    onDragEndCapture={() => setDragId(null)}
                    onClick={() => onOpen(r.id)}
                    className="group cursor-grab border border-gold/12 bg-noir/80 p-3.5 text-left transition-colors hover:border-gold/45 active:cursor-grabbing"
                  >
                    <p className="text-sm text-ivory">{String(r[title] ?? "Untitled")}</p>
                    {subtitle && <p className="mt-1 line-clamp-2 text-xs text-ivory/50">{subtitle(r)}</p>}
                    <div className="mt-3 flex items-center justify-between text-[0.65rem] text-ivory/40">
                      {r.due_date || r.follow_up ? <span>{String(r.due_date ?? r.follow_up)}</span> : <span />}
                      {amountKey && r[amountKey] != null && <span className="text-gold-light">{formatINR(Number(r[amountKey]))}</span>}
                    </div>
                  </motion.button>
                ))}
              </AnimatePresence>
              {items.length === 0 && <p className="py-8 text-center text-xs text-ivory/25">Drop here</p>}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
