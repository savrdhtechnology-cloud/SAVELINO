import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { Craftsmanship } from "@/components/sections/Craftsmanship";
import { Heritage } from "@/components/sections/Heritage";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Our story",
  description: "SAVLINO — a legacy of elegance. Indian heritage craft, made for the modern woman.",
  alternates: { canonical: "/our-story" },
};

const values = [
  { t: "Heritage first", d: "We keep India’s embroidery and tailoring traditions alive in every collection." },
  { t: "Made with care", d: "Every piece is finished and checked by hand before it reaches you." },
  { t: "For every woman", d: "From bridal occasionwear to everyday essentials — designed for real bodies and real lives." },
];

export default function OurStoryPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Our story"
        title="A legacy of elegance"
        intro="The house of SAVLINO was born from a love of Indian craft — and a belief that every woman deserves to feel it."
      />
      <Heritage />
      <section className="border-y border-gold/10 bg-noir py-20 md:py-28">
        <ul className="mx-auto grid max-w-[1200px] gap-10 px-5 md:grid-cols-3 md:px-10">
          {values.map((v, i) => (
            <li key={v.t}>
              <Reveal delay={i * 0.1}>
                <span className="font-display text-5xl italic text-gold/70">{String(i + 1).padStart(2, "0")}</span>
                <h2 className="mt-4 font-display text-2xl text-ivory">{v.t}</h2>
                <p className="mt-3 text-sm leading-relaxed text-ivory/65">{v.d}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>
      <Craftsmanship />
      <section className="py-20 text-center md:py-28">
        <Reveal>
          <p className="mx-auto max-w-2xl font-display text-3xl italic text-ivory md:text-4xl">
            Tradition in style, always.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button href="/collections">Explore collections</Button>
            <Button href="/contact" variant="outline">
              Get in touch
            </Button>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
}
