"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ICONS, navGroups } from "@/lib/admin/modules";
import { EASE, Icon } from "./ui";

type Command = { id: string; label: string; hint: string; icon: string; href: string };

const quickActions: Command[] = [
  { id: "new-stitching", label: "New stitching order", hint: "Action", icon: ICONS.stitching, href: "/admin/stitching?new=1" },
  { id: "new-lead", label: "Add a lead", hint: "Action", icon: ICONS.leads, href: "/admin/leads?new=1" },
  { id: "new-expense", label: "Log an expense", hint: "Action", icon: ICONS.expenses, href: "/admin/expenses?new=1" },
  { id: "new-product", label: "Add a product", hint: "Action", icon: ICONS.products, href: "/admin/products?new=1" },
  { id: "new-task", label: "Add a task", hint: "Action", icon: ICONS.tasks, href: "/admin/tasks?new=1" },
  { id: "site", label: "Open the website", hint: "Website", icon: ICONS.content, href: "/" },
];

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const all = useMemo<Command[]>(
    () => [
      ...navGroups.flatMap((g) =>
        g.items.map((i) => ({ id: `app-${i.slug}`, label: i.title, hint: g.title, icon: i.icon, href: i.slug ? `/admin/${i.slug}` : "/admin" })),
      ),
      ...quickActions,
    ],
    [],
  );

  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? all.filter((c) => c.label.toLowerCase().includes(t) || c.hint.toLowerCase().includes(t)) : all;
  }, [q, all]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => setActive(0), [q]);

  function go(c: Command | undefined) {
    if (!c) return;
    onClose();
    router.push(c.href);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-start justify-center bg-noir/70 px-4 pt-[12vh] backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden border border-gold/30 bg-noir-soft/95 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)]"
          >
            <div className="flex items-center gap-3 border-b border-gold/15 px-5">
              <Icon d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35" className="h-4 w-4 text-gold" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(a + 1, results.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(a - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    go(results[active]);
                  } else if (e.key === "Escape") onClose();
                }}
                placeholder="Search apps or run an action…"
                className="h-14 flex-1 bg-transparent text-ivory placeholder:text-ivory/35 outline-none"
              />
              <kbd className="border border-gold/25 px-1.5 py-0.5 text-[0.6rem] text-ivory/45">ESC</kbd>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto py-2" role="listbox">
              {results.length === 0 && <li className="px-5 py-8 text-center text-sm text-ivory/45">No matches</li>}
              {results.map((c, i) => (
                <li key={c.id} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(c)}
                    className="relative flex w-full items-center gap-3 px-5 py-2.5 text-left text-sm"
                  >
                    {i === active && (
                      <motion.span layoutId="palette-active" className="absolute inset-x-2 inset-y-0 bg-gold/12" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
                    )}
                    <span className={`relative ${i === active ? "text-gold" : "text-ivory/60"}`}>
                      <Icon d={c.icon} className="h-4 w-4" />
                    </span>
                    <span className="relative text-ivory">{c.label}</span>
                    <span className="relative ml-auto text-[0.58rem] uppercase tracking-[0.25em] text-ivory/35">{c.hint}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
