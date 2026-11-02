import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { ImageReveal, Reveal } from "@/components/ui/Reveal";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { CategoryImage } from "@/components/ui/CategoryImage";
import { categoryImageUrl, resolveCategories } from "@/lib/catalogue";
import { getLiveProducts, getUpcomingProducts, getVisibleCategories } from "@/lib/data/catalog-server";
import { UpcomingSection } from "@/components/sections/UpcomingSection";
import { ProductGrid } from "@/components/store/ProductCard";

type Params = { params: Promise<{ slug: string }> };

const findCategory = async (slug: string) => resolveCategories(await getVisibleCategories()).find((c) => c.slug === slug);


export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const c = await findCategory(slug);
  if (!c) return {};
  return {
    title: c.title,
    description: c.summary,
    alternates: { canonical: `/collections/${c.slug}` },
    openGraph: { title: `${c.title} · SAVLINO`, description: c.summary, images: [{ url: categoryImageUrl(c) }] },
  };
}

export default async function CollectionPage({ params }: Params) {
  const { slug } = await params;
  const all = resolveCategories(await getVisibleCategories());
  const c = all.find((x) => x.slug === slug);
  if (!c) notFound();
  const others = all
    .filter((o) => o.slug !== c.slug)
    .slice(0, 4);
  const products = await getLiveProducts(c.id);
  const upcoming = (await getUpcomingProducts()).filter((u) => !u.category_id || u.category_id === c.id);

  return (
    <PageShell>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-[1440px] items-center gap-12 px-5 py-14 md:px-10 md:py-24 lg:grid-cols-2 lg:gap-24">
          <div className="order-2 lg:order-1">
            <nav aria-label="Breadcrumb" className="text-[0.62rem] uppercase tracking-[0.28em] text-ivory/50">
              <Link href="/" className="hover:text-gold">
                Home
              </Link>
              <span className="mx-3 text-gold/50">/</span>
              <Link href="/collections" className="hover:text-gold">
                Collections
              </Link>
            </nav>
            <p className="eyebrow mt-8">{c.kicker}</p>
            <SplitHeadline
              as="h1"
              trigger="mount"
              text={c.title}
              className="mt-5 font-display text-[clamp(2.8rem,6.5vw,5.6rem)] leading-[1] text-ivory"
            />
            <Reveal delay={0.2}>
              <p className="mt-6 font-serif text-2xl leading-relaxed text-ivory/75">{c.summary}</p>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-ivory/60">{c.story}</p>
              <ul className="mt-8 flex flex-wrap gap-2">
                {c.highlights.map((h) => (
                  <li key={h} className="border border-gold/25 px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.22em] text-ivory/70">
                    {h}
                  </li>
                ))}
              </ul>
            </Reveal>
            {products.length === 0 && (
            <Reveal delay={0.3} className="mt-10 border border-gold/20 bg-noir-soft p-6">
              <p className="eyebrow">Shopping opens soon</p>
              <p className="mt-3 text-sm leading-relaxed text-ivory/65">
                New pieces for this collection are being finished by hand. Explore the shop or ask us about custom
                stitching in the meantime.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button href="/shop">Visit the shop</Button>
                {c.slug.includes("blouse") && (
                  <Button href="/custom-stitching" variant="outline">
                    Custom stitching
                  </Button>
                )}
              </div>
            </Reveal>
            )}
            {products.length > 0 && (
              <Reveal delay={0.3} className="mt-10">
                <a href="#pieces" className="inline-flex items-center gap-4 text-[0.68rem] uppercase tracking-[0.32em] text-gold">
                  <span className="h-px w-10 bg-gold" />
                  See {products.length} {products.length === 1 ? "piece" : "pieces"}
                </a>
              </Reveal>
            )}
          </div>
          <div className="order-1 mx-auto w-full max-w-[460px] lg:order-2">
            <ImageReveal className="aspect-[3/4] border border-gold/25">
              <CategoryImage src={c.image} alt={c.title} priority sizes="(min-width: 1024px) 460px, 90vw" className="object-cover object-top" />
            </ImageReveal>
          </div>
        </div>
      </section>

      {products.length > 0 && (
        <section id="pieces" aria-label={`${c.title} pieces`} className="scroll-mt-28 border-t border-gold/10 py-16 md:py-24">
          <div className="mx-auto max-w-[1440px] px-5 md:px-10">
            <p className="eyebrow">The pieces</p>
            <h2 className="mt-3 font-display text-4xl text-ivory md:text-5xl">{c.title}</h2>
            <div className="mt-10">
              <ProductGrid products={products} />
            </div>
          </div>
        </section>
      )}

      <UpcomingSection products={upcoming} limit={12} title={`Upcoming in ${c.title}`} id="upcoming" />

      {others.length > 0 && (
      <section aria-label="More collections" className="border-t border-gold/10 py-16 md:py-24">
        <div className="mx-auto max-w-[1440px] px-5 md:px-10">
          <p className="eyebrow">Continue exploring</p>
          <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/collections/${o.slug}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden border border-gold/20">
                    <CategoryImage
                      src={o.image}
                      alt={o.title}
                      sizes="(min-width: 768px) 25vw, 48vw"
                      className="object-cover object-top transition-transform duration-1000 group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-3 font-display text-xl italic text-ivory group-hover:text-gold">{o.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
      )}
    </PageShell>
  );
}
