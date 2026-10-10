import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { ImageReveal, Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { images } from "@/lib/collections";

const sizes = [
  { size: "32", label: "XS" },
  { size: "34", label: "S" },
  { size: "36", label: "M" },
  { size: "38", label: "L" },
  { size: "40", label: "XL" },
  { size: "42", label: "XXL" },
  { size: "44", label: "3XL" },
];

const promises = ["Graded on standard Indian size patterns", "Seam allowances for easy alteration", "Fabric & care details on every piece"];

export function ReadyMade() {
  return (
    <section id="ready-made" aria-label="Ready-made standard-size blouses" className="relative overflow-hidden bg-ivory py-24 text-noir md:py-36">
      <div className="mx-auto grid max-w-[1440px] items-center gap-14 px-5 md:px-10 lg:grid-cols-[1fr_0.8fr] lg:gap-24">
        <div>
          <SectionHeading
            tone="light"
            eyebrow="Ready-made blouses"
            title="Couture finish, standard sizes"
            intro="Designer detailing, ready to wear. Find your size, pair it with your saree, and you are dressed."
          />

          <Reveal delay={0.1} className="mt-12">
            <p className="text-[0.65rem] uppercase tracking-[0.32em] text-noir/60">Bust size (inches)</p>
            <ul className="mt-4 flex flex-wrap gap-2.5" aria-label="Available standard sizes">
              {sizes.map((s) => (
                <li
                  key={s.size}
                  className="group flex h-16 w-16 flex-col items-center justify-center border border-noir/20 transition-colors duration-500 hover:border-burgundy hover:bg-burgundy hover:text-ivory"
                >
                  <span className="font-display text-xl">{s.size}</span>
                  <span className="text-[0.55rem] tracking-[0.2em] text-noir/50 group-hover:text-gold-light">{s.label}</span>
                </li>
              ))}
            </ul>
          </Reveal>

          <ul className="mt-10 space-y-3">
            {promises.map((p, i) => (
              <li key={p}>
                <Reveal delay={0.08 * i} className="flex items-center gap-4 font-serif text-lg text-noir/80">
                  <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-gold" />
                  {p}
                </Reveal>
              </li>
            ))}
          </ul>

          <Reveal delay={0.2} className="mt-12 flex flex-wrap gap-4">
            <Button href="/collections/ready-made-blouses" variant="noir">
              Shop ready-made
            </Button>
            <Button href="/#custom-stitching" variant="outline-dark">
              Need a custom fit?
            </Button>
          </Reveal>
        </div>

        <div className="relative mx-auto w-full max-w-[460px]">
          <ImageReveal className="aspect-[4/5]">
            <Image
              src={images.blouses}
              alt="Ready-made designer blouse"
              fill
              sizes="(min-width: 1024px) 460px, 90vw"
              placeholder="blur"
              className="object-cover object-top"
            />
          </ImageReveal>
          <div aria-hidden className="absolute -left-4 -top-4 h-24 w-24 border-l border-t border-gold" />
          <div aria-hidden className="absolute -bottom-4 -right-4 h-24 w-24 border-b border-r border-gold" />
        </div>
      </div>
    </section>
  );
}
