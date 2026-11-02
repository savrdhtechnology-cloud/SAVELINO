import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { ProductCard } from "@/components/store/ProductCard";
import { BuyBox, FeatureBadges, ProductGallery } from "@/components/store/ProductDetail";
import { ProductCreative } from "@/components/store/ProductCreative";
import { resolveCategories } from "@/lib/catalogue";
import { getSiteSettings } from "@/lib/settings-server";
import { getLiveProduct, getLiveProducts, getUpcomingProduct, getVisibleCategories } from "@/lib/data/catalog-server";
import { inr } from "@/lib/data/types";
import { site } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getLiveProduct(slug)) ?? (await getUpcomingProduct(slug));
  if (!p) return {};
  return {
    title: p.name,
    description: p.subtitle || p.description.slice(0, 160),
    alternates: { canonical: `/shop/${p.slug}` },
    openGraph: { title: `${p.name} · SAVLINO`, description: p.subtitle, images: p.images[0] ? [{ url: p.images[0].url }] : [] },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = (await getLiveProduct(slug)) ?? (await getUpcomingProduct(slug));
  if (!product) notFound();
  const upcoming = product.status === "upcoming";
  const settings = await getSiteSettings();
  const category = resolveCategories(await getVisibleCategories()).find((c) => c.id === product.category_id);
  const related = product.category_id ? (await getLiveProducts(product.category_id)).filter((p) => p.id !== product.id).slice(0, 4) : [];
  const off = product.compare_at_price ? Math.round((1 - product.price / product.compare_at_price) * 100) : 0;
  // Generated creatives: the wide combined creative leads the page, the rest go in the gallery.
  const combo = product.generated ? product.images.find((i) => i.width && i.height && i.width > i.height) : undefined;
  const galleryImages = combo && product.images.length > 1 ? product.images.filter((i) => i.id !== combo.id) : product.images;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.subtitle,
    image: product.images.map((i) => (i.url.startsWith("http") ? i.url : `${site.url}${i.url}`)),
    brand: { "@type": "Brand", name: site.name },
    offers: { "@type": "Offer", priceCurrency: "INR", price: product.price, availability: upcoming ? "https://schema.org/PreOrder" : "https://schema.org/InStock", url: `${site.url}/shop/${product.slug}` },
  };

  return (
    <PageShell>
      <section className="mx-auto max-w-[1180px] px-5 py-6 md:px-10 md:py-8">
        <nav aria-label="Breadcrumb" className="mb-4 text-[0.74rem] uppercase tracking-[0.28em] text-ivory/70">
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
        <div id="buy" className="grid scroll-mt-28 gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-12">
          <ProductGallery product={{ ...product, images: galleryImages }} />
          <div className="lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:self-start">
            <p className="eyebrow">{upcoming ? "Coming soon · Pre-order" : (category?.title ?? "SAVLINO")}</p>
            <h1 className="mt-2 font-display text-[clamp(1.8rem,3.2vw,2.7rem)] leading-[1.05] text-ivory">{product.name}</h1>
            {product.subtitle && <p className="mt-1 font-serif text-lg text-ivory/65">{product.subtitle}</p>}
            <p className="mt-3 flex items-baseline gap-3">
              <span className="font-display text-3xl text-gold">{inr(product.price)}</span>
              {product.compare_at_price && <span className="text-ivory/60 line-through">{inr(product.compare_at_price)}</span>}
              {off > 0 && <span className="rounded-full bg-burgundy px-2.5 py-1 text-[0.72rem] uppercase tracking-[0.18em] text-ivory">{off}% off</span>}
            </p>
            <p className="mt-1 text-xs text-ivory/60">Inclusive of all taxes</p>
            <div className="mt-5 border-y border-gold/15 py-5">
              <BuyBox product={product} whatsapp={settings.brand.whatsapp} />
            </div>
            <div className="mt-5">
              <FeatureBadges features={product.features} />
            </div>
            {product.description && <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-ivory/65">{product.description}</p>}
          </div>
        </div>
        {combo ? (
          <div className="mx-auto mt-14 max-w-[980px] overflow-hidden rounded-2xl border border-gold/30" style={{ aspectRatio: `${combo.width} / ${combo.height}` }}>
            <div className="relative h-full w-full">
              <Image src={combo.url} alt={`${product.name} — SAVLINO`} fill sizes="(min-width: 1280px) 1200px, 100vw" className="object-cover" />
            </div>
          </div>
        ) : (
          !product.generated &&
          product.images.length >= 2 && (
            <div className="mx-auto mt-14 max-w-[980px]">
              <ProductCreative product={product} categoryTitle={category?.title ?? "Designer Blouses"} />
            </div>
          )
        )}
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
