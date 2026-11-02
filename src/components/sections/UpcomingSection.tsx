import Link from "next/link";
import { ProductCard } from "@/components/store/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { Product } from "@/lib/data/types";

/** "Upcoming" — designs being made right now. Customers can pre-order; nothing is taken from stock. */
export function UpcomingSection({ products, limit = 8, title = "Upcoming collection", id = "upcoming" }: { products: Product[]; limit?: number; title?: string; id?: string }) {
  if (products.length === 0) return null;
  return (
    <section id={id} aria-label="Upcoming pieces" className="relative overflow-hidden bg-noir py-20 md:py-28">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,color-mix(in_srgb,var(--color-burgundy)_40%,transparent),transparent_70%)]" />
      <div className="relative mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading eyebrow="In the atelier now" title={title} intro="These pieces are being stitched by hand. Reserve yours today — pre-order, and we deliver as soon as they are finished." />
          {products.length > limit && (
            <Link href="/shop#upcoming" className="group inline-flex shrink-0 items-center gap-4 text-[0.68rem] uppercase tracking-[0.32em] text-gold">
              <span className="h-px w-10 bg-gold transition-all duration-500 group-hover:w-16" />
              See all upcoming
            </Link>
          )}
        </div>
        <ul className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-7 xl:grid-cols-4">
          {products.slice(0, limit).map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
