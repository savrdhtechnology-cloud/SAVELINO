import Image from "next/image";
import Link from "next/link";
import { inr, type Product } from "@/lib/data/types";
import { MotionCard } from "@/components/site/Motion";

/** Product tile styled after the SAVLINO product creatives: framed photo, colour dots, size chips and a Shop Now pill. */
export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  // Portrait images fill the 4:5 tile best (the single creatives); the wide combined creative is for the product page.
  const portrait = product.images.filter((i) => !i.width || !i.height || i.height >= i.width);
  const [cover, second] = portrait.length ? portrait : product.images;
  const fit = product.generated ? "50% 50%" : "28% 50%";
  const off = product.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0;
  return (
    <MotionCard>
    <Link href={`/shop/${product.slug}`} className="group block">
      <div className="relative overflow-hidden rounded-2xl border border-gold/30 bg-noir-soft p-1.5 transition-colors duration-500 group-hover:border-gold/70">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-noir">
          {cover ? (
            <>
              <Image
                src={cover.url}
                alt={product.name}
                fill
                priority={priority}
                sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
                className={`object-cover transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105 ${second ? "group-hover:opacity-0" : ""}`}
                style={{ objectPosition: fit }}
              />
              {second && (
                <Image
                  src={second.url}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
                  className="object-cover opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                  style={{ objectPosition: fit }}
                />
              )}
            </>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center font-display text-6xl italic text-gold/25">S</span>
          )}
          {off > 0 && (
            <span className="absolute left-3 top-3 rounded-full bg-burgundy px-2.5 py-1 text-[0.6rem] font-medium uppercase tracking-[0.18em] text-ivory">
              {off}% off
            </span>
          )}
          <span className="absolute inset-x-3 bottom-3 flex translate-y-2 items-center justify-center gap-2 rounded-full bg-burgundy/95 py-2.5 text-[0.62rem] font-medium uppercase tracking-[0.25em] text-ivory opacity-0 shadow-lg backdrop-blur transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <BagIcon /> Shop now
          </span>
        </div>
      </div>
      <div className="mt-4 px-1">
        <h3 className="font-display text-xl leading-tight text-ivory transition-colors group-hover:text-gold md:text-2xl">{product.name}</h3>
        {product.subtitle && <p className="mt-1 line-clamp-1 text-[0.8rem] text-ivory/50">{product.subtitle}</p>}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-baseline gap-2">
            <span className="text-base font-medium text-gold">{inr(product.price)}</span>
            {product.compare_at_price && <span className="text-xs text-ivory/40 line-through">{inr(product.compare_at_price)}</span>}
          </p>
          {product.colors.length > 0 && (
            <span className="flex -space-x-1" aria-label={`${product.colors.length} colours`}>
              {product.colors.slice(0, 5).map((c) => (
                <span key={c.name} title={c.name} className="h-4 w-4 rounded-full border border-noir ring-1 ring-gold/30" style={{ background: c.hex }} />
              ))}
              {product.colors.length > 5 && <span className="pl-2 text-[0.65rem] text-ivory/45">+{product.colors.length - 5}</span>}
            </span>
          )}
        </div>
      </div>
    </Link>
    </MotionCard>
  );
}

export function BagIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className} aria-hidden>
      <path d="M6 7h12l1 14H5L6 7Zm3 0V5a3 3 0 0 1 6 0v2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-7 xl:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
