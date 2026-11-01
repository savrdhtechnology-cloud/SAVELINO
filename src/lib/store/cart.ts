"use client";

import { useCallback, useEffect, useState } from "react";

/** The shopping bag lives in this browser; prices are re-checked on the server at checkout. */
export type BagLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  size: string;
  color: string;
  qty: number;
};

const KEY = "savlino-bag-v1";
const EVENT = "savlino:bag";
export const BAG_OPEN_EVENT = "savlino:bag-open";

function read(): BagLine[] {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as unknown;
    return Array.isArray(v) ? (v as BagLine[]).filter((l) => l && typeof l.productId === "string" && l.qty > 0) : [];
  } catch {
    return [];
  }
}

function write(lines: BagLine[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // storage unavailable — the bag lasts for this page only
  }
  memory = lines;
  window.dispatchEvent(new Event(EVENT));
}

let memory: BagLine[] | null = null;
const current = () => memory ?? (memory = read());

export function addToBag(line: Omit<BagLine, "key">) {
  const key = `${line.productId}|${line.size}|${line.color}`;
  const lines = current();
  const existing = lines.find((l) => l.key === key);
  write(existing ? lines.map((l) => (l.key === key ? { ...l, qty: Math.min(10, l.qty + line.qty), price: line.price } : l)) : [...lines, { ...line, key }]);
}

export const openBag = () => window.dispatchEvent(new Event(BAG_OPEN_EVENT));

export function useBag() {
  const [lines, setLines] = useState<BagLine[]>([]);
  useEffect(() => {
    memory = read();
    setLines(memory);
    const sync = () => setLines([...current()]);
    const fromStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        memory = read();
        sync();
      }
    };
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", fromStorage);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", fromStorage);
    };
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    write(qty <= 0 ? current().filter((l) => l.key !== key) : current().map((l) => (l.key === key ? { ...l, qty: Math.min(10, qty) } : l)));
  }, []);
  const remove = useCallback((key: string) => write(current().filter((l) => l.key !== key)), []);
  const clear = useCallback(() => write([]), []);

  return {
    lines,
    count: lines.reduce((s, l) => s + l.qty, 0),
    subtotal: lines.reduce((s, l) => s + l.price * l.qty, 0),
    setQty,
    remove,
    clear,
  };
}
