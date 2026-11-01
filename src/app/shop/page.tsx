import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { ProductGrid } from "@/components/store/ProductCard";
import { enabledCategories } from "@/lib/catalogue";
import { getSiteSettings } from "@/lib/settings-server";
import { getLiveProducts } from "@/lib/store/products-server";

export const metadata: Metadata = {
  title: "Shop",
  description: "Shop SAVLINO designer blouses and sarees — choose your colour and size, delivered to your door.",
  alternates: { canonical: "/shop" },
};

type Props = { searchParams: Promise<{ category?: string }> };

export default async function ShopPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const settings = await getSiteSettings();
  const categories = enabledCategories(settings.catalogue);
  const visible = new Set(categories.map((c) => c.slug));
  const all = (await getLiveProducts()).filter((p) => visible.has(p.category));
  const active = category && visible.has(category) ? category : "";
  const products = active ? all.filter((p) => p.category === active) : all;
  const withProducts = categories.filter((c) => all.some((p) => p.category === c.slug));

  return (
    <PageShell>
      <PageIntro eyebrow="The SAVLINO shop" title="Made to be remembered" intro="Designer blouses and sarees, finished by hand — pick your colour and size." />
      <section className="mx-auto max-w-[1440px] px-5 py-12 md:px-10 md:py-16">
        {withProducts.length > 1 && (
          <nav aria-label="Categories" className="mb-12 flex flex-wrap justify-center gap-2">
            <Chip href="/shop" active={!active}>
              All
            </Chip>
            {withProducts.map((c) => (
              <Chip key={c.slug} href={`/shop?category=${c.slug}`} active={active === c.slug}>
                {c.title}
              </Chip>
            ))}
          </nav>
        )}
        {products.length > 0 ? (
          <ProductGrid products={products} />
        ) : (
          <div className="mx-auto max-w-xl rounded-2xl border border-gold/20 bg-noir-soft p-10 text-center">
            <p className="eyebrow">New pieces arriving</p>
            <p className="mt-4 font-serif text-2xl text-ivory/75">Our next drop is being finished by hand. Check back soon.</p>
          </div>
        )}
      </section>
    </PageShell>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-5 py-2.5 text-[0.62rem] uppercase tracking-[0.25em] transition-colors ${
        active ? "border-gold bg-gold text-noir" : "border-gold/30 text-ivory/75 hover:border-gold hover:text-gold"
      }`}
    >
      {children}
    </Link>
  );
}
