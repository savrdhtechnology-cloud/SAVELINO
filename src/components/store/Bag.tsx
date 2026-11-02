"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { BAG_OPEN_EVENT, openBag, useBag } from "@/lib/store/cart";
import { inr } from "@/lib/data/types";
import { BagIcon } from "./ProductCard";

const EASE = [0.22, 1, 0.36, 1] as const;

export function BagButton() {
  const { count } = useBag();
  return (
    <button type="button" onClick={openBag} aria-label={`Shopping bag, ${count} items`} className="relative flex h-10 w-10 items-center justify-center text-ivory/85 transition-colors hover:text-gold">
      <BagIcon className="h-5 w-5" />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[0.7rem] font-semibold text-noir"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/** Slide-in shopping bag, available on every website page. */
export function BagDrawer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { lines, subtotal, setQty, remove } = useBag();

  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(BAG_OPEN_EVENT, on);
    return () => window.removeEventListener(BAG_OPEN_EVENT, on);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (pathname.startsWith("/admin") || pathname.startsWith("/worker")) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90]">
          <motion.button
            type="button"
            aria-label="Close bag"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            role="dialog"
            aria-label="Shopping bag"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-gold/20 bg-noir"
          >
            <header className="flex items-center justify-between border-b border-gold/15 px-6 py-5">
              <p className="font-display text-2xl text-ivory">Your bag</p>
              <button type="button" onClick={() => setOpen(false)} className="text-[0.74rem] uppercase tracking-[0.25em] text-ivory/72 hover:text-gold">
                Close
              </button>
            </header>
            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 text-center">
                <BagIcon className="h-10 w-10 text-gold/50" />
                <p className="font-serif text-xl text-ivory/70">Your bag is waiting for something beautiful.</p>
                <Link href="/shop" className="rounded-full bg-gold px-6 py-3 text-[0.65rem] uppercase tracking-[0.28em] text-noir">
                  Shop the collection
                </Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
                  {lines.map((l) => (
                    <li key={l.key} className="flex gap-4 rounded-xl border border-gold/15 p-3">
                      <Link href={`/shop/${l.slug}`} className="relative h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-noir-soft">
                        {l.image && <Image src={l.image} alt="" fill sizes="80px" className="object-cover" style={{ objectPosition: "28% 50%" }} />}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link href={`/shop/${l.slug}`} className="line-clamp-2 font-display text-lg leading-tight text-ivory hover:text-gold">
                          {l.name}
                        </Link>
                        <p className="mt-1 text-xs text-ivory/70">{[l.color, l.size && `Size ${l.size}`].filter(Boolean).join(" · ")}</p>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center rounded-full border border-gold/30 text-sm">
                            <button type="button" onClick={() => setQty(l.key, l.qty - 1)} className="h-7 w-7 text-ivory/70 hover:text-gold" aria-label="Fewer">
                              −
                            </button>
                            <span className="w-5 text-center text-ivory">{l.qty}</span>
                            <button type="button" onClick={() => setQty(l.key, l.qty + 1)} className="h-7 w-7 text-ivory/70 hover:text-gold" aria-label="More">
                              +
                            </button>
                          </div>
                          <span className="text-sm text-gold">{inr(l.price * l.qty)}</span>
                        </div>
                        <button type="button" onClick={() => remove(l.key)} className="mt-2 text-[0.72rem] uppercase tracking-[0.2em] text-ivory/60 hover:text-gold">
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <footer className="space-y-4 border-t border-gold/15 px-6 py-6">
                  <p className="flex items-center justify-between text-sm text-ivory/70">
                    <span>Subtotal</span>
                    <span className="font-display text-2xl text-ivory">{inr(subtotal)}</span>
                  </p>
                  <p className="text-xs text-ivory/60">Shipping is calculated at checkout.</p>
                  <Link href="/checkout" className="block rounded-full bg-burgundy py-4 text-center text-[0.78rem] font-medium uppercase tracking-[0.28em] text-ivory hover:bg-burgundy-deep">
                    Checkout
                  </Link>
                </footer>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
