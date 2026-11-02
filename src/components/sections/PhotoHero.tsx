import Image from "next/image";
import type { ReactNode } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { productCover } from "@/lib/product-image";
import type { Product } from "@/lib/data/types";

/** Split page hero: copy on one side, a real product photo fading in from the other. */
export function PhotoHero({ eyebrow, title, intro, product, side = "right", children }: { eyebrow: string; title: string; intro: string; product?: Product; side?: "left" | "right"; children?: ReactNode }) {
  const { cover, fit } = product ? productCover(product.images) : { cover: undefined, fit: "50% 50%" };
  const photo = cover && (
    <div className={`relative min-h-[280px] md:min-h-[420px] ${side === "left" ? "md:order-first" : ""}`}>
      <Image quality={90} src={cover.url} alt={product?.name ?? ""} fill priority sizes="(min-width: 768px) 46vw, 100vw" className="object-cover" style={{ objectPosition: fit }} />
      <div aria-hidden className={`absolute inset-0 bg-gradient-to-t from-noir via-transparent to-transparent ${side === "left" ? "md:bg-gradient-to-l" : "md:bg-gradient-to-r"} md:from-noir md:via-transparent`} />
    </div>
  );
  return (
    <section className="relative overflow-hidden border-b border-gold/10 bg-noir">
      <div className={`mx-auto grid max-w-[1440px] items-center ${cover ? "md:grid-cols-[1.1fr_1fr]" : ""}`}>
        <div className={`px-5 py-10 md:px-12 md:py-16 ${cover ? "" : "text-center"} ${side === "left" ? "md:order-last" : ""}`}>
          <Reveal y={10}><p className="eyebrow">{eyebrow}</p></Reveal>
          <SplitHeadline as="h1" text={title} trigger="mount" delay={0.1} className="mt-3 font-display text-[clamp(2.1rem,5vw,3.8rem)] uppercase leading-[1.05] tracking-[0.02em] text-ivory" />
          <Reveal delay={0.3} y={14}><p className={`mt-4 max-w-xl font-serif text-lg italic text-ivory/80 md:text-xl ${cover ? "" : "mx-auto"}`}>{intro}</p></Reveal>
          {children && <Reveal delay={0.45} y={14} className="mt-6">{children}</Reveal>}
        </div>
        {photo}
      </div>
    </section>
  );
}
