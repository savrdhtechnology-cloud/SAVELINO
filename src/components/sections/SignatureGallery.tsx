import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { ImageReveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { images } from "@/lib/collections";

type Tile = { img: StaticImageData; title: string; note: string; href: string; tall?: boolean; pos?: string };

const tiles: Tile[] = [
  { img: images.heritage, title: "Noir & Gold", note: "Signature drape", href: "/collections/sarees", tall: true, pos: "object-left" },
  { img: images.sarees, title: "Tissue Gold", note: "Saree", href: "/collections/sarees" },
  { img: images.salwar, title: "Maharani Anarkali", note: "Salwar suit", href: "/collections/salwar-suits", tall: true },
  { img: images.blouses, title: "Zardozi Back", note: "Designer blouse", href: "/collections/designer-blouses" },
  { img: images.loungewear, title: "Ivory Satin", note: "Loungewear", href: "/collections/loungewear", tall: true },
  { img: images.lingerie, title: "Bordeaux Lace", note: "Lingerie", href: "/collections/lingerie" },
];

export function SignatureGallery() {
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
          {tiles.map((t, i) => (
            <Link
              key={t.title}
              href={t.href}
              className="group relative mb-3 block break-inside-avoid overflow-hidden md:mb-6"
            >
              <ImageReveal delay={(i % 3) * 0.12} className={t.tall ? "aspect-[3/4.4]" : "aspect-[3/3.6]"}>
                <Image
                  src={t.img}
                  alt={`${t.title} — ${t.note}`}
                  fill
                  sizes="(min-width: 768px) 30vw, 48vw"
                  placeholder="blur"
                  className={`object-cover transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.07] ${t.pos ?? "object-top"}`}
                />
              </ImageReveal>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-noir/85 via-noir/10 to-transparent opacity-80 transition-opacity duration-700 group-hover:opacity-100" />
              <div className="absolute inset-x-0 bottom-0 translate-y-2 p-4 transition-transform duration-700 group-hover:translate-y-0 md:p-6">
                <p className="eyebrow text-[0.58rem]!">{t.note}</p>
                <p className="mt-1 font-display text-xl italic text-ivory md:text-3xl">{t.title}</p>
                <span className="mt-2 block h-px w-0 bg-gold transition-all duration-700 group-hover:w-16" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
