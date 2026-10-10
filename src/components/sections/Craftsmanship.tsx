import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const pillars = [
  {
    title: "Hand embroidery",
    body: "Zardozi, aari, dabka and sequin work placed by hand — the slow way, the right way.",
    icon: (
      <path d="M24 6c4 6 4 12 0 18-4-6-4-12 0-18Zm0 18c6-2 12 0 16 6-6 2-12 0-16-6Zm0 0c-6-2-12 0-16 6 6 2 12 0 16-6Zm0 0v18" />
    ),
  },
  {
    title: "Fabric selection",
    body: "Silks, georgettes, cottons and laces chosen for hand-feel, breathability and drape.",
    icon: <path d="M8 14 24 6l16 8-16 8-16-8Zm0 10 16 8 16-8M8 34l16 8 16-8" />,
  },
  {
    title: "Precision fit",
    body: "Graded patterns, princess seams and fittings that respect real bodies.",
    icon: <path d="M10 38 38 10M14 34l3 3M19 29l3 3M24 24l3 3M29 19l3 3M34 14l3 3" />,
  },
  {
    title: "Finishing",
    body: "Clean inner seams, soft linings and finishing checked piece by piece.",
    icon: <path d="M24 6 28.5 18H41l-10 8 4 13-11-8-11 8 4-13-10-8h12.5L24 6Z" />,
  },
];

export function Craftsmanship() {
  return (
    <section id="craftsmanship" aria-label="Luxury craftsmanship" className="relative bg-noir-soft py-24 md:py-36">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <SectionHeading
          align="center"
          eyebrow="Craftsmanship"
          title="The hand behind every stitch"
          intro="Luxury is not a label. It is hundreds of small decisions made carefully, by hand."
        />
        <ul className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 md:mt-20">
          {pillars.map((p, i) => (
            <li key={p.title}>
              <Reveal
                delay={0.1 * i}
                className="group relative h-full border border-gold/15 bg-noir p-8 transition-all duration-700 hover:-translate-y-2 hover:border-gold/50 hover:shadow-[0_30px_80px_-30px_rgba(212,175,55,0.35)]"
              >
                <svg
                  viewBox="0 0 48 48"
                  aria-hidden
                  className="h-12 w-12 fill-none stroke-gold stroke-[1.2] transition-transform duration-700 group-hover:rotate-[8deg] group-hover:scale-110"
                >
                  {p.icon}
                </svg>
                <p className="mt-8 font-display text-2xl text-ivory">{p.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-ivory/60">{p.body}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
