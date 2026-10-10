import Image from "next/image";
import Link from "next/link";
import { ImageReveal, Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { categorySlugs, getCollection, type Collection } from "@/lib/collections";

const tones: Record<string, string> = {
  "salwar-suits": "from-burgundy/40",
  sarees: "from-gold/15",
  shapewear: "from-noir-soft",
  lingerie: "from-burgundy/35",
  loungewear: "from-ivory/10",
};

export function Collections() {
  const items = categorySlugs.map((s) => getCollection(s)).filter((c): c is Collection => Boolean(c));

  return (
    <section id="collections" aria-label="Collections" className="relative bg-noir py-24 md:py-36">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <SectionHeading
          align="center"
          eyebrow="The collections"
          title="From the first drape to the last thread"
          intro="Occasionwear, foundations and intimates — one house, one standard of care."
        />

        <nav aria-label="Collection shortcuts" className="mt-10 flex flex-wrap justify-center gap-2">
          {items.map((c) => (
            <a
              key={c.slug}
              href={`#${c.slug}`}
              className="border border-gold/25 px-4 py-2 text-[0.62rem] uppercase tracking-[0.28em] text-ivory/75 transition-colors duration-500 hover:border-gold hover:text-gold"
            >
              {c.title}
            </a>
          ))}
        </nav>

        <div className="mt-16 space-y-24 md:mt-24 md:space-y-36">
          {items.map((c, i) => (
            <article
              key={c.slug}
              id={c.slug}
              aria-labelledby={`${c.slug}-title`}
              className={`relative grid scroll-mt-28 items-center gap-10 md:grid-cols-2 md:gap-20 ${
                i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div className="relative mx-auto w-full max-w-[440px]">
                <div
                  aria-hidden
                  className={`absolute -inset-6 bg-gradient-to-br ${tones[c.slug] ?? "from-gold/10"} to-transparent blur-2xl`}
                />
                <Link href={`/collections/${c.slug}`} className="group relative block" tabIndex={-1} aria-hidden>
                  <ImageReveal className="aspect-[3/4] border border-gold/25">
                    <Image
                      src={c.image}
                      alt=""
                      fill
                      sizes="(min-width: 768px) 440px, 90vw"
                      placeholder="blur"
                      className="object-cover object-top transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-105"
                    />
                  </ImageReveal>
                </Link>
                <span className="absolute -top-5 right-4 font-display text-6xl italic text-gold/25 md:-right-8 md:text-8xl">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <div>
                <Reveal>
                  <p className="eyebrow">{c.kicker}</p>
                  <h3 id={`${c.slug}-title`} className="mt-4 font-display text-[clamp(2.2rem,4.4vw,3.8rem)] leading-[1.02] text-ivory">
                    {c.title}
                  </h3>
                  <p className="mt-5 font-serif text-xl leading-relaxed text-ivory/75 md:text-2xl">{c.summary}</p>
                </Reveal>
                <Reveal delay={0.12}>
                  <ul className="mt-8 flex flex-wrap gap-2">
                    {c.highlights.map((h) => (
                      <li key={h} className="border border-gold/20 px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.22em] text-ivory/65">
                        {h}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={`/collections/${c.slug}`}
                    className="group mt-10 inline-flex items-center gap-4 text-[0.68rem] uppercase tracking-[0.32em] text-gold"
                  >
                    <span className="h-px w-10 bg-gold transition-all duration-500 group-hover:w-16" />
                    Explore {c.title}
                  </Link>
                </Reveal>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
