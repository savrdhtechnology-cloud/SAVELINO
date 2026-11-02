"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { addToBag, openBag, replaceBag } from "@/lib/store/cart";
import { inr, type Product } from "@/lib/data/types";
import { BagIcon } from "./ProductCard";

const EASE = [0.22, 1, 0.36, 1] as const;

export function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const img = product.images[active] ?? product.images[0];
  const ratio = img?.width && img?.height ? img.width / img.height : 4 / 5;
  return (
    <div>
      <div className="relative mx-auto overflow-hidden rounded-2xl border border-gold/30 bg-noir-soft p-1.5" style={{ width: `min(100%, calc(76svh * ${ratio}))` }}>
        <div className="relative overflow-hidden rounded-xl bg-noir" style={{ aspectRatio: String(ratio) }}>
          <AnimatePresence mode="wait">
            {img ? (
              <motion.div key={img.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }} className="absolute inset-0">
                <Image src={img.url} alt={product.name} fill priority sizes="(min-width: 1024px) 58vw, 100vw" className="object-contain" />
              </motion.div>
            ) : (
              <span className="absolute inset-0 flex items-center justify-center font-display text-7xl italic text-gold/25">S</span>
            )}
          </AnimatePresence>
        </div>
      </div>
      {product.images.length > 1 && (
        <ul className="mt-2 flex justify-center gap-2 overflow-x-auto pb-1">
          {product.images.map((im, i) => (
            <li key={im.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Photo ${i + 1}`}
                className={`relative block h-14 w-14 overflow-hidden rounded-lg border transition-colors md:h-16 md:w-16 ${i === active ? "border-gold" : "border-gold/20 hover:border-gold/60"}`}
              >
                <Image src={im.url} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const FEATURE_ICONS: { match: RegExp; d: string }[] = [
  { match: /fabric|silk|cotton|material/i, d: "M6 3h12l3 6-9 12L3 9l3-6Zm-3 6h18M9 3l3 18M15 3l-3 18" },
  { match: /stitch|craft|hand/i, d: "M4 20 18 6m-3-3 6 6-3 1-4-4 1-3ZM4 20l3-1-2-2-1 3Z" },
  { match: /fit|size|tailor/i, d: "M9 3h6l1 3-2 2v3l3 2v8H7v-8l3-2V8L8 6l1-3Z" },
  { match: /mirror|work|embroider|pearl|bead|zari/i, d: "M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5L12 3Z" },
  { match: /smooth|soft|texture|comfort/i, d: "M12 21c-4-3-8-6-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 5-4 8-8 11Z" },
];

export function FeatureBadges({ features }: { features: string[] }) {
  if (features.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {features.map((f) => {
        const d = FEATURE_ICONS.find((x) => x.match.test(f))?.d ?? FEATURE_ICONS[3].d;
        return (
          <li key={f} className="flex flex-col items-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/50 text-gold">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.3} className="h-5 w-5" aria-hidden>
                <path d={d} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="text-[0.72rem] leading-tight text-ivory/70">{f}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function BuyBox({ product, whatsapp }: { product: Product; whatsapp: string }) {
  const router = useRouter();
  const preorder = product.status === "upcoming";
  const [color, setColor] = useState(product.colors.length === 1 ? product.colors[0].name : "");
  const [size, setSize] = useState(product.sizes.length === 1 ? product.sizes[0] : "");
  const [qty, setQty] = useState(1);
  const [hint, setHint] = useState("");

  function add(goToCheckout: boolean) {
    if (product.colors.length > 0 && !color) return setHint("Please choose a colour");
    if (product.sizes.length > 0 && !size) return setHint("Please choose your size");
    setHint("");
    const line = {
      productId: product.id,
      slug: product.slug,
      name: preorder ? `${product.name} (Pre-order)` : product.name,
      price: product.price,
      image: (product.images.find((i) => !i.width || !i.height || i.height >= i.width) ?? product.images[0])?.url ?? null,
      size,
      color,
      qty,
    };
    if (preorder) {
      replaceBag(line);
      router.push("/checkout");
      return;
    }
    addToBag(line);
    if (goToCheckout) router.push("/checkout");
    else openBag();
  }

  const wa = whatsapp.replace(/[^\d]/g, "");
  const enquiry = `Hi SAVLINO, I'm interested in "${product.name}"${color ? ` in ${color}` : ""}${size ? `, size ${size}` : ""}.`;

  return (
    <div className="space-y-5">
      {product.colors.length > 0 && (
        <fieldset>
          <legend className="text-[0.74rem] uppercase tracking-[0.28em] text-ivory/72">
            Colour{color && <span className="ml-2 normal-case tracking-normal text-gold">{color}</span>}
          </legend>
          <div className="mt-3 flex flex-wrap gap-2.5">
            {product.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                title={c.name}
                aria-label={c.name}
                aria-pressed={color === c.name}
                onClick={() => setColor(c.name)}
                className={`h-10 w-10 rounded-full border-2 transition-transform ${color === c.name ? "scale-110 border-gold" : "border-transparent hover:scale-105"}`}
              >
                <span className="block h-full w-full rounded-full ring-1 ring-ivory/20" style={{ background: c.hex }} />
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {product.sizes.length > 0 && (
        <fieldset>
          <legend className="flex w-full items-center justify-between text-[0.74rem] uppercase tracking-[0.28em] text-ivory/72">
            <span>Size</span>
            <Link href="/size-guide" className="normal-case tracking-normal text-gold underline-offset-4 hover:underline">
              Size guide
            </Link>
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={size === s}
                onClick={() => setSize(s)}
                className={`min-w-12 rounded-full border px-4 py-2.5 text-sm transition-colors ${size === s ? "border-gold bg-gold text-noir" : "border-gold/35 text-ivory hover:border-gold"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex items-center gap-4">
        <span className="text-[0.74rem] uppercase tracking-[0.28em] text-ivory/72">Qty</span>
        <div className="flex items-center rounded-full border border-gold/35">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="h-10 w-10 text-lg text-ivory/70 hover:text-gold" aria-label="Fewer">
            −
          </button>
          <span className="w-8 text-center text-sm text-ivory">{qty}</span>
          <button type="button" onClick={() => setQty((q) => Math.min(10, q + 1))} className="h-10 w-10 text-lg text-ivory/70 hover:text-gold" aria-label="More">
            +
          </button>
        </div>
      </div>

      <AnimatePresence>
        {hint && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="alert" className="text-sm text-gold">
            {hint}
          </motion.p>
        )}
      </AnimatePresence>

      {preorder ? (
        <div className="space-y-3">
          <p className="rounded-2xl border border-gold/25 bg-gold/5 p-4 text-sm leading-relaxed text-ivory/75">
            This piece is being stitched now. Pre-order to reserve it
            {product.expected_at ? ` — expected ${new Date(`${product.expected_at}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}` : ""}. We ship it as soon as it is finished. A pre-order is placed on its own (not together with other items).
          </p>
          <button
            type="button"
            onClick={() => add(true)}
            className="w-full rounded-full bg-burgundy py-4 text-[0.78rem] font-medium uppercase tracking-[0.28em] text-ivory shadow-[0_12px_40px_-12px_var(--color-burgundy)] transition-colors hover:bg-burgundy-deep"
          >
            Pre-order now · {inr(product.price * qty)}
          </button>
        </div>
      ) : (
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => add(false)}
          className="flex items-center justify-center gap-2.5 rounded-full border border-gold/60 py-4 text-[0.78rem] font-medium uppercase tracking-[0.28em] text-gold transition-colors hover:bg-gold hover:text-noir"
        >
          <BagIcon className="h-4 w-4" /> Add to bag
        </button>
        <button
          type="button"
          onClick={() => add(true)}
          className="rounded-full bg-burgundy py-4 text-[0.78rem] font-medium uppercase tracking-[0.28em] text-ivory shadow-[0_12px_40px_-12px_var(--color-burgundy)] transition-colors hover:bg-burgundy-deep"
        >
          Buy now · {inr(product.price * qty)}
        </button>
      </div>
      )}

      {wa && (
        <a
          href={`https://wa.me/${wa}?text=${encodeURIComponent(enquiry)}`}
          target="_blank"
          rel="noreferrer"
          className="block text-center text-[0.78rem] uppercase tracking-[0.25em] text-ivory/72 hover:text-gold"
        >
          Questions? Ask us on WhatsApp
        </a>
      )}
    </div>
  );
}
