import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { Reveal } from "@/components/ui/Reveal";
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
            <Reveal y={10}><p className="eyebrow">Handpicked by SAVLINO</p></Reveal>
            <SplitHeadline as="h2" className="mt-3 font-display text-4xl text-ivory md:text-5xl" text="Featured Products" />
          </div>
          <Link href="/shop" className="text-sm uppercase tracking-widest text-gold hover:underline">View all</Link>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 md:gap-x-7">
          {products.map((p, i) => <li key={p.id}><Reveal delay={(i % 4) * 0.07}><ProductCard product={p} priority={i < 2} /></Reveal></li>)}
        </ul>
      </div>
    </section>
  );
}
