"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ImageReveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { MotionCard } from "@/components/site/Motion";
import { images } from "@/lib/collections";
import { productCover } from "@/lib/product-image";
import { inr, type Product } from "@/lib/data/types";
import type { SignatureTileLink } from "@/lib/settings";

type Tile = { img: StaticImageData | string; title: string; note: string; href: string; tall?: boolean; pos?: string };

const tiles: Tile[] = [
  { img: images.heritage, title: "Noir & Gold", note: "Signature drape", href: "/collections/sarees", tall: true, pos: "object-left" },
  { img: images.sarees, title: "Tissue Gold", note: "Saree", href: "/collections/sarees" },
  { img: images.salwar, title: "Maharani Anarkali", note: "Salwar suit", href: "/collections/salwar-suits", tall: true },
  { img: images.blouses, title: "Zardozi Back", note: "Designer blouse", href: "/collections/designer-blouses" },
  { img: images.loungewear, title: "Ivory Satin", note: "Loungewear", href: "/collections/loungewear", tall: true },
  { img: images.lingerie, title: "Bordeaux Lace", note: "Lingerie", href: "/collections/lingerie" },
];

type ResolvedTile = Tile & { imgs: (StaticImageData | string)[]; price?: number; isProduct: boolean; soon?: string };

export function SignatureGallery({
  enabled,
  images = [],
  products = [],
  links = [],
  upcoming = [],
}: {
  enabled?: string[];
  images?: string[];
  /** Live products — resolved against `links[i].productId` to turn a card into a product spotlight. */
  products?: Product[];
  /** Admin-picked product (and optional title/note overrides) per card — see CRM → Appearance → Homepage. */
  links?: SignatureTileLink[];
  /** "Coming soon" pieces — they fill every card the admin has not linked to a product, so the gallery always shows real pieces. */
  upcoming?: Product[];
}) {
  const linkedIds = new Set(links.map((l) => l?.productId).filter(Boolean));
  const spare = upcoming.filter((p) => !linkedIds.has(p.id));

  const byId = new Map(products.map((p) => [p.id, p]));
  const customized: ResolvedTile[] = tiles.map((tile, index) => {
    const link = links[index];
    const product = link?.productId ? byId.get(link.productId) : undefined;
    if (product) {
      const { cover } = productCover(product.images);
      const extra = (link.images ?? []).filter(Boolean);
      const mainImg = images[index] || cover?.url || tile.img;
      return {
        ...tile,
        img: mainImg,
        imgs: extra.length >= 2 ? extra : [mainImg],
        title: link.title || product.name,
        note: link.note || product.subtitle || "From the catalogue",
        href: `/shop/${product.slug}`,
        price: product.price,
        isProduct: true,
      };
    }
    const soon = spare.shift();
    if (soon) {
      const { cover } = productCover(soon.images);
      const extra = soon.images.filter((i) => i.url && i.url !== cover?.url).slice(0, 2).map((i) => i.url);
      const mainImg = cover?.url || tile.img;
      return {
        ...tile,
        img: mainImg,
        imgs: extra.length ? [mainImg, ...extra] : [mainImg],
        title: soon.name,
        note: soon.subtitle || "Coming soon",
        href: `/shop/${soon.slug}`,
        price: soon.price,
        isProduct: true,
        soon: soon.expected_at ? `Expected ${new Date(`${soon.expected_at}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : "In production",
      };
    }
    const soloImg = images[index] || tile.img;
    return { ...tile, img: soloImg, imgs: [soloImg], isProduct: false };
  });
  const visible = enabled ? customized.filter((t) => t.isProduct || enabled.includes(t.href.replace("/collections/", ""))) : customized;
  if (visible.length === 0) return null;
  return (
    <section id="signature" aria-label="Signature collection gallery" className="relative bg-noir-soft py-24 md:py-36">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading
            eyebrow="Signature collection"
            title="Pieces that become memories"
            intro="Our most-loved silhouettes — the ones that open weddings, festivals and first anniversaries."
          />
        </div>

        <div className="mt-14 columns-2 gap-3 md:mt-20 md:columns-3 md:gap-6">
          {visible.map((t, i) => (
            <MotionCard key={`${t.title}-${i}`} className="mb-3 block break-inside-avoid md:mb-6">
              <div className="group relative overflow-hidden rounded-xl">
                <Link href={t.href} aria-label={t.title} className="absolute inset-0 z-0">
                  <span className="sr-only">{t.isProduct ? `View ${t.title}` : t.title}</span>
                </Link>
                <div className="pointer-events-none">
                  <ImageReveal delay={(i % 3) * 0.12} className={t.tall ? "aspect-[3/4.4]" : "aspect-[3/3.6]"}>
                    <CyclingImage images={t.imgs} alt={`${t.title} — ${t.note}`} className={`object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07] ${t.pos ?? "object-top"}`} />
                  </ImageReveal>
                  <div className="absolute inset-0 bg-gradient-to-t from-noir/85 via-noir/10 to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
                  <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 transition-transform duration-700 group-hover:translate-y-0 md:p-6">
                    <p className="line-clamp-2 text-[0.78rem] font-medium uppercase leading-snug tracking-[0.16em] text-gold-light md:text-[0.84rem]">{t.note}</p>
                    <p className="mt-1.5 font-display text-2xl italic leading-tight text-ivory [text-shadow:0_2px_14px_rgba(0,0,0,0.55)] md:text-4xl">{t.title}</p>
                    {t.isProduct && t.price != null && <p className="mt-1.5 text-base font-semibold text-gold md:text-lg">{inr(t.price)}</p>}
                    <span className="mt-2 flex items-center gap-3">
                      <span className="block h-px w-0 bg-gold transition-all duration-700 group-hover:w-16" />
                      {t.isProduct && (
                        <span className="translate-y-1 text-[0.7rem] uppercase tracking-[0.22em] text-ivory/0 transition-all duration-700 group-hover:translate-y-0 group-hover:text-gold">
                          {t.soon ? "Pre-order now →" : "Shop this piece →"}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
                {t.soon && (
                  <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-gold px-3 py-1 text-[0.78rem] font-semibold uppercase tracking-[0.16em] text-noir">Coming soon · {t.soon}</span>
                )}
                <LikeButton title={t.title} />
              </div>
            </MotionCard>
          ))}
        </div>
      </div>
    </section>
  );
}

/** A single photo, or — when a card has 2–3 photos — a slow cross-fade between them. */
function CyclingImage({ images: imgs, alt, className }: { images: (StaticImageData | string)[]; alt: string; className: string }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (imgs.length < 2) return;
    const id = setInterval(() => setActive((n) => (n + 1) % imgs.length), 3200);
    return () => clearInterval(id);
  }, [imgs.length]);
  return (
    <>
      {imgs.map((src, i) => (
        <Image
          key={typeof src === "string" ? src : i}
          src={src}
          alt={alt}
          fill
          sizes="(min-width: 768px) 30vw, 48vw"
          className={`${className} transition-opacity duration-[1100ms] ${i === active ? "opacity-100" : "opacity-0"}`}
        />
      ))}
    </>
  );
}

/** Decorative wishlist heart — visual only, no persistence (see Appearance Studio → Homepage). */
function LikeButton({ title }: { title: string }) {
  const [liked, setLiked] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={liked}
      aria-label={liked ? `Remove ${title} from favourites` : `Add ${title} to favourites`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setLiked((v) => !v);
      }}
      className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-noir/40 text-ivory backdrop-blur transition-all duration-300 hover:bg-noir/70"
    >
      <svg viewBox="0 0 24 24" strokeWidth={1.6} className="h-4 w-4" aria-hidden fill={liked ? "#D4AF37" : "none"} stroke={liked ? "#D4AF37" : "currentColor"}>
        <path d="M12 20.5s-7.5-4.6-10-9.2C.5 7.8 2.3 4.5 5.7 4c2-.3 3.9.7 6.3 3.1C14.4 4.7 16.3 3.7 18.3 4c3.4.5 5.2 3.8 3.7 7.3-2.5 4.6-10 9.2-10 9.2Z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
