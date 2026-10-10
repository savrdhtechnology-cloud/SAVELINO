import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const steps = [
  { n: "I", t: "Choose your design", d: "Start from a SAVLINO design or share a reference — neckline, sleeve and back." },
  { n: "II", t: "Share measurements", d: "Follow our guided measurement chart, or send a well-fitting blouse as a sample." },
  { n: "III", t: "Fabric & detailing", d: "Select lining, padding, hooks or zip, latkans and embroidery placement." },
  { n: "IV", t: "Crafted for you", d: "Cut and stitched by our tailors, quality-checked, then carefully packed." },
];

export function CustomStitching() {
  return (
    <section
      id="custom-stitching"
      aria-label="Custom stitching"
      className="grain relative overflow-hidden bg-burgundy-deep py-24 md:py-36"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-0 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.14),transparent_65%)]"
      />
      <div className="relative mx-auto max-w-[1440px] px-5 md:px-10">
        <SectionHeading
          eyebrow="Custom stitching"
          title="Made to your measure, not a standard"
          intro="Bring your fabric or choose ours. We draft every custom blouse to your measurements and your idea of perfect."
        />

        <ol className="mt-16 grid gap-px overflow-hidden border border-gold/20 bg-gold/20 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.n} className="bg-burgundy-deep">
              <Reveal delay={0.1 * i} className="group relative h-full p-8 transition-colors duration-700 hover:bg-burgundy md:p-10">
                <span className="font-display text-5xl italic text-gold/80 transition-colors duration-700 group-hover:text-gold">
                  {s.n}
                </span>
                <p className="mt-8 font-display text-2xl text-ivory">{s.t}</p>
                <p className="mt-3 text-sm leading-relaxed text-ivory/65">{s.d}</p>
                <span
                  aria-hidden
                  className="absolute bottom-0 left-0 h-px w-0 bg-gold transition-all duration-700 group-hover:w-full"
                />
              </Reveal>
            </li>
          ))}
        </ol>

        <Reveal delay={0.2} className="mt-14 flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl font-serif text-xl text-ivory/75">
            Not sure about your measurements? Our measurement guide walks you through each one, step by step.
          </p>
          <Button href="/custom-stitching">Start a custom order</Button>
        </Reveal>
      </div>
    </section>
  );
}
