import Link from "next/link";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { UpcomingCarousel, type UpcomingItem } from "@/components/sections/UpcomingCarousel";
import { expectedLabel } from "@/components/store/ProductCard";
import { productCover } from "@/lib/product-image";
import type { Product } from "@/lib/data/types";

/** "Coming soon" — designs being made right now, shown as a sliding row. Customers can pre-order; nothing is taken from stock. */
export function UpcomingSection({ products, limit = 12, title = "Coming soon", id = "upcoming" }: { products: Product[]; limit?: number; title?: string; id?: string }) {
  if (products.length === 0) return null;
  const items: UpcomingItem[] = products.slice(0, limit).map((p) => {
    const { cover, fit } = productCover(p.images);
    return { id: p.id, slug: p.slug, name: p.name, subtitle: p.subtitle, price: p.price, image: cover ? { url: cover.url, fit } : null, expected: p.expected_at ? expectedLabel(p.expected_at) : "" };
  });
  return (
    <section id={id} aria-label="Coming soon" className="relative overflow-hidden bg-noir py-20 md:py-28">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,color-mix(in_srgb,var(--color-burgundy)_40%,transparent),transparent_70%)]" />
      <div className="relative mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading eyebrow="In the atelier now" title={title} intro="These pieces are being stitched by hand. Pre-order yours today — we deliver as soon as they are finished." />
          {products.length > limit && (
            <Link href="/shop#upcoming" className="group inline-flex shrink-0 items-center gap-4 text-[0.68rem] uppercase tracking-[0.32em] text-gold">
              <span className="h-px w-10 bg-gold transition-all duration-500 group-hover:w-16" />
              See all
            </Link>
          )}
        </div>
        <UpcomingCarousel items={items} />
      </div>
    </section>
  );
}
