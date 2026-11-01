import Link from "next/link";
import { ProductCard } from "@/components/store/ProductCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { StoreProduct } from "@/lib/store/types";

/** Homepage "Shop the collection": the newest live products, straight from the store. */
export function ShopSection({ products }: { products: StoreProduct[] }) {
  if (products.length === 0) return null;
  return (
    <section id="shop" aria-label="Shop the collection" className="relative overflow-hidden bg-noir py-24 md:py-32">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,color-mix(in_srgb,var(--color-burgundy)_45%,transparent),transparent_70%)]" />
      <div className="relative mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading eyebrow="New in the atelier" title="Shop the collection" intro="Choose your colour and size — each piece is finished by hand and delivered to your door." />
          <Link href="/shop" className="group inline-flex shrink-0 items-center gap-4 text-[0.68rem] uppercase tracking-[0.32em] text-gold">
            <span className="h-px w-10 bg-gold transition-all duration-500 group-hover:w-16" />
            View all
          </Link>
        </div>
        <ul className="mt-14 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-7 xl:grid-cols-4">
          {products.slice(0, 8).map((p, i) => (
            <li key={p.id}>
              <ProductCard product={p} priority={i < 2} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
