import Link from "next/link";
import { ProductCard } from "@/components/store/ProductCard";
import type { Product } from "@/lib/data/types";

export function FeaturedProducts({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <section id="featured-products" aria-label="Featured products" className="bg-noir-soft py-20 md:py-28">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Handpicked by SAVLINO</p>
            <h2 className="mt-3 font-display text-4xl text-ivory md:text-5xl">Featured Products</h2>
          </div>
          <Link href="/shop" className="text-sm uppercase tracking-widest text-gold hover:underline">View all</Link>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 md:gap-x-7">
          {products.map((p, i) => <li key={p.id}><ProductCard product={p} priority={i < 2} /></li>)}
        </ul>
      </div>
    </section>
  );
}
