import Image from "next/image";
import Link from "next/link";
import { TiltCard } from "@/components/ui/TiltCard";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { expectedLabel } from "@/components/store/ProductCard";
import { productCover } from "@/lib/product-image";
import { inr, type Product } from "@/lib/data/types";

/** One product as a leaning photo tile — everything shown (name, line, price, colours, status) comes from the product itself. */
export function StyleTile({ product, priority }: { product: Product; priority?: boolean }) {
  const { cover, fit } = productCover(product.images);
  const soon = product.status === "upcoming";
  return (
    <TiltCard className="rounded-2xl">
      <Link href={`/shop/${product.slug}`} className="group block overflow-hidden rounded-2xl border border-gold/25 bg-noir-soft transition-colors duration-500 hover:border-gold/70">
        <div className="relative aspect-[4/5] overflow-hidden bg-noir">
          {cover ? (
            <Image quality={90} src={cover.url} alt={product.name} fill priority={priority} sizes="(min-width: 1024px) 24vw, (min-width: 640px) 33vw, 48vw" className="object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]" style={{ objectPosition: fit }} />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center font-display text-6xl italic text-gold/25">S</span>
          )}
          <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-noir/90 via-noir/10 to-transparent" />
          {soon && <span className="absolute left-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-noir">Coming soon</span>}
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="font-display text-xl leading-tight text-ivory [text-shadow:0_2px_12px_rgba(0,0,0,0.6)] md:text-2xl">{product.name}</h3>
            {product.subtitle && <p className="mt-1 line-clamp-1 text-[0.82rem] text-ivory/80">{product.subtitle}</p>}
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-base font-semibold text-gold">{inr(product.price)}</span>
              {soon ? (
                <span className="text-[0.7rem] uppercase tracking-[0.16em] text-gold-light">{product.expected_at ? `Expected ${expectedLabel(product.expected_at)}` : "Pre-order"}</span>
              ) : (
                product.colors.length > 0 && (
                  <span className="flex -space-x-1" aria-label={`${product.colors.length} colours`}>
                    {product.colors.slice(0, 5).map((c) => (
                      <span key={c.name} title={c.name} className="h-4 w-4 rounded-full border border-noir ring-1 ring-gold/40" style={{ background: c.hex }} />
                    ))}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </Link>
    </TiltCard>
  );
}

/** "Shop by style": a grid of real products. Hidden when there are none. */
export function StyleTiles({ products, limit = 8, eyebrow = "Shop by style", title = "Find your blouse", intro, href = "/shop", id = "styles" }: { products: Product[]; limit?: number; eyebrow?: string; title?: string; intro?: string; href?: string; id?: string }) {
  if (products.length === 0) return null;
  const shown = products.slice(0, limit);
  return (
    <section id={id} aria-label={title} className="relative bg-noir py-14 md:py-20">
      <div className="mx-auto max-w-[1280px] px-5 md:px-10">
        <div className="flex flex-col items-start justify-between gap-5 md:flex-row md:items-end">
          <SectionHeading eyebrow={eyebrow} title={title} intro={intro} />
          {products.length > limit && (
            <Reveal>
              <Link href={href} className="group inline-flex shrink-0 items-center gap-4 text-[0.74rem] uppercase tracking-[0.3em] text-gold">
                <span className="h-px w-10 bg-gold transition-all duration-500 group-hover:w-16" />
                View all {products.length}
              </Link>
            </Reveal>
          )}
        </div>
        <ul className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
          {shown.map((p, i) => (
            <li key={p.id}>
              <Reveal delay={(i % 4) * 0.06} y={20}>
                <StyleTile product={p} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
