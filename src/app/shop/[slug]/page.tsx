import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ProductCard } from "@/components/store/ProductCard";
import { BuyBox, FeatureBadges, ProductGallery } from "@/components/store/ProductDetail";
import { findCategory } from "@/lib/catalogue";
import { getSiteSettings } from "@/lib/settings-server";
import { getLiveProduct, getLiveProducts } from "@/lib/store/products-server";
import { imageUrl, inr } from "@/lib/store/types";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getLiveProduct(slug);
  if (!p) return {};
  return {
    title: p.name,
    description: p.subtitle || p.description.slice(0, 160),
    alternates: { canonical: `/shop/${p.slug}` },
    openGraph: { title: `${p.name} · SAVLINO`, description: p.subtitle, images: p.images[0] ? [{ url: imageUrl(p.images[0].id) }] : [] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getLiveProduct(slug);
  if (!product) notFound();
  const settings = await getSiteSettings();
  const category = findCategory(settings.catalogue, product.category);
  const related = (await getLiveProducts(product.category)).filter((p) => p.id !== product.id).slice(0, 4);
  const off = product.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.subtitle,
    image: product.images.map((i) => `${site.url}${imageUrl(i.id)}`),
    brand: { "@type": "Brand", name: site.name },
    offers: { "@type": "Offer", priceCurrency: "INR", price: product.price, availability: "https://schema.org/InStock", url: `${site.url}/shop/${product.slug}` },
  };

  return (
    <PageShell>
      <section className="mx-auto max-w-[1440px] px-5 py-10 md:px-10 md:py-16">
        <nav aria-label="Breadcrumb" className="mb-8 text-[0.62rem] uppercase tracking-[0.28em] text-ivory/50">
          <Link href="/shop" className="hover:text-gold">
            Shop
          </Link>
          {category && (
            <>
              <span className="mx-3 text-gold/50">/</span>
              <Link href={`/shop?category=${category.slug}`} className="hover:text-gold">
                {category.title}
              </Link>
            </>
          )}
        </nav>
        <div className="grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
          <ProductGallery product={product} />
          <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
            <p className="eyebrow">{category?.title ?? "SAVLINO"}</p>
            <h1 className="mt-4 font-display text-[clamp(2.2rem,4.5vw,3.6rem)] leading-[1.02] text-ivory">{product.name}</h1>
            {product.subtitle && <p className="mt-3 font-serif text-xl text-ivory/65">{product.subtitle}</p>}
            <p className="mt-6 flex items-baseline gap-3">
              <span className="font-display text-3xl text-gold">{inr(product.price)}</span>
              {product.compare_at_price && <span className="text-ivory/40 line-through">{inr(product.compare_at_price)}</span>}
              {off > 0 && <span className="rounded-full bg-burgundy px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.18em] text-ivory">{off}% off</span>}
            </p>
            <p className="mt-1 text-xs text-ivory/40">Inclusive of all taxes</p>
            <div className="mt-8 border-y border-gold/15 py-8">
              <BuyBox product={product} whatsapp={settings.brand.whatsapp} />
            </div>
            <div className="mt-8">
              <FeatureBadges features={product.features} />
            </div>
            {product.description && <p className="mt-8 whitespace-pre-line text-sm leading-relaxed text-ivory/65">{product.description}</p>}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section aria-label="You may also like" className="border-t border-gold/10 py-16 md:py-24">
          <div className="mx-auto max-w-[1440px] px-5 md:px-10">
            <p className="eyebrow">You may also like</p>
            <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-4 md:gap-x-7">
              {related.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </PageShell>
  );
}
