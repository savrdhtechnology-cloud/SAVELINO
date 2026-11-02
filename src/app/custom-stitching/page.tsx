import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Timeline } from "@/components/ui/Timeline";
import { TiltCard } from "@/components/ui/TiltCard";
import { StyleTiles } from "@/components/sections/StyleTiles";
import { getLiveProducts } from "@/lib/data/catalog-server";

export const metadata: Metadata = {
  title: "Custom blouse stitching",
  description: "Made-to-measure blouse customisation by SAVLINO — share your design and measurements, choose neckline, sleeves, back, lining and closure, and we craft it for you.",
  alternates: { canonical: "/custom-stitching" },
};

const perks = [
  { t: "Perfect fit", d: "Tailored to your measurements" },
  { t: "Personalised details", d: "From neckline to back design" },
  { t: "Careful finishing", d: "Clean, structured, precise" },
];

const measurements = [
  { name: "Bust", how: "Around the fullest part of the bust, tape level across the back." },
  { name: "Underbust", how: "Just below the bust, around the ribcage." },
  { name: "Waist", how: "Around the narrowest part of your waist." },
  { name: "Shoulder", how: "From the edge of one shoulder to the other, across the back." },
  { name: "Front length", how: "From the highest point of the shoulder (near the neck) to your desired blouse length." },
  { name: "Back length", how: "From the same shoulder point at the back to your desired length." },
  { name: "Sleeve length", how: "From the shoulder edge to the end of the sleeve." },
  { name: "Armhole", how: "Around the arm at the armhole (where the sleeve begins)." },
  { name: "Neck depth", how: "From the shoulder point to your desired neckline depth (front and/or back)." },
];

const choices = [
  { n: "Lining & padding", d: "Whether you prefer padding, light padding or no padding, with a comfortable lining of your choice." },
  { n: "Hooks / zip / dori", d: "Your preferred closure style for ease and fit." },
  { n: "Sleeve style", d: "Sleeveless, elbow, ¾, full sleeve and more." },
  { n: "Neckline shape", d: "From classic round and square to deep, sweetheart and custom shapes." },
  { n: "Latkans & tassels", d: "Add latkans, tassels or dori details." },
  { n: "Back design", d: "A closed, deep, keyhole or statement back." },
  { n: "Occasion", d: "So we can suggest the right structure, support and finishing." },
  { n: "Fabric preference", d: "Share your fabric choice, or ask for our recommendations." },
];

const steps = [
  { tag: "Step 1", title: "Share your design", text: "Tell us your idea, send a reference, or pick one of our designs below." },
  { tag: "Step 2", title: "Send your measurements", text: "Use the measurement guide on this page — a soft tape and a well-fitting bra are all you need." },
  { tag: "Step 3", title: "Confirm the details", text: "We review your choices, clarify anything unclear, and finalise the design with you." },
  { tag: "Step 4", title: "Tailoring", text: "Your blouse is carefully cut and stitched by our team to your measurements." },
  { tag: "Step 5", title: "Delivery", text: "Your custom-stitched blouse is delivered to you." },
];

const options = [
  { t: "Sleeve styles", d: "Sleeveless · Elbow · ¾ sleeve · Full sleeve · Custom" },
  { t: "Necklines", d: "Round · Square · V-neck · Sweetheart · Deep · Custom" },
  { t: "Back patterns", d: "Closed · Deep · Keyhole · Tie-up · Cut-out · Custom" },
  { t: "Padding", d: "With padding · Light padding · No padding" },
  { t: "Lining", d: "Cotton · Satin · Crepe · Breathable · Custom" },
  { t: "Closure options", d: "Hooks · Zip · Dori · Button · Custom" },
];

const finishing = [
  { t: "Curated fabrics", d: "Silk, Banarasi, Organza, Georgette, Crepe and more — or use your own fabric." },
  { t: "Refined finishing", d: "Clean stitching, structured fit and precise detailing." },
  { t: "Custom embellishments", d: "Add embroidery, borders, lace or handwork for a made-just-for-you look." },
];

function Heading({ title, intro }: { title: string; intro?: string }) {
  return (
    <div className="text-center">
      <Reveal>
        <div className="flex items-center justify-center gap-4">
          <span className="h-px w-12 bg-gold/40" />
          <h2 className="font-display text-2xl uppercase tracking-[0.12em] text-ivory md:text-3xl">{title}</h2>
          <span className="h-px w-12 bg-gold/40" />
        </div>
        {intro && <p className="mx-auto mt-3 max-w-xl text-[0.95rem] text-ivory/70">{intro}</p>}
      </Reveal>
    </div>
  );
}

export default async function CustomStitchingPage() {
  const products = await getLiveProducts();
  return (
    <PageShell>
      <PageIntro eyebrow="Custom stitching" title="Your blouse, drafted for you" intro="Made-to-measure blouse customisation with a perfect fit, refined detailing and choices that reflect your style." />

      <div className="mx-auto flex max-w-[1100px] flex-wrap justify-center gap-3 px-5 pt-8">
        <Button href="/contact">Start custom stitching</Button>
        <Button href="/contact" variant="ghost">Talk to our team</Button>
      </div>
      <ul className="mx-auto mt-8 grid max-w-[900px] grid-cols-1 gap-4 px-5 sm:grid-cols-3">
        {perks.map((p, i) => (
          <li key={p.t}>
            <Reveal delay={i * 0.08} y={16} className="text-center sm:text-left">
              <p className="font-display text-lg text-gold">{p.t}</p>
              <p className="text-[0.88rem] text-ivory/70">{p.d}</p>
            </Reveal>
          </li>
        ))}
      </ul>

      <section id="measurements" className="mx-auto mt-14 grid max-w-[1200px] gap-10 px-5 md:px-10 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <Reveal><h2 className="font-display text-2xl uppercase tracking-[0.1em] text-ivory md:text-3xl">Measurement guide</h2></Reveal>
          <p className="mt-2 text-[0.92rem] text-ivory/70">Use a soft tape, wear a well-fitting bra, and keep the tape snug but not tight.</p>
          <ol className="mt-6 divide-y divide-gold/10 border-y border-gold/15">
            {measurements.map((m, i) => (
              <li key={m.name}>
                <Reveal delay={Math.min(i * 0.04, 0.3)} y={14} className="grid grid-cols-[2rem_8rem_1fr] items-baseline gap-3 py-3 md:grid-cols-[2.5rem_10rem_1fr]">
                  <span className="font-display italic text-gold">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[0.85rem] font-medium uppercase tracking-[0.14em] text-ivory">{m.name}</span>
                  <span className="text-[0.9rem] leading-snug text-ivory/70">{m.how}</span>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <TiltCard className="rounded-sm">
            <div className="border border-gold/25 bg-noir-soft p-6 md:p-7">
              <h2 className="font-display text-xl uppercase tracking-[0.1em] text-ivory md:text-2xl">Choices we will ask about</h2>
              <ul className="mt-5 space-y-3.5">
                {choices.map((c) => (
                  <li key={c.n} className="flex gap-3">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
                    <div>
                      <p className="text-[0.95rem] font-medium text-ivory">{c.n}</p>
                      <p className="text-[0.85rem] leading-snug text-ivory/68">{c.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </TiltCard>
        </aside>
      </section>

      <section className="mt-16 px-5 md:px-10">
        <Heading title="How it works" intro="A simple and personal process to create your perfectly fitted SAVLINO blouse." />
        <div className="mt-10">
          <Timeline steps={steps} />
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-[1200px] px-5 md:px-10">
        <Heading title="Customisation options" intro="Make it truly yours with a choice for every detail." />
        <ul className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-6">
          {options.map((o, i) => (
            <li key={o.t}>
              <Reveal delay={i * 0.06} y={18} className="h-full">
                <TiltCard className="h-full rounded-sm">
                  <div className="h-full border border-gold/25 bg-noir-soft p-4 text-center transition-colors hover:border-gold/70">
                    <span aria-hidden className="mx-auto mb-3 block h-1.5 w-1.5 rotate-45 bg-gold" />
                    <p className="font-display text-base uppercase tracking-[0.1em] text-ivory">{o.t}</p>
                    <p className="mt-2 text-[0.8rem] leading-snug text-ivory/70">{o.d}</p>
                  </div>
                </TiltCard>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-16 max-w-[1200px] px-5 md:px-10">
        <Heading title="Fabric & finishing" intro="Premium materials and refined details for a luxurious, long-lasting fit." />
        <ul className="mt-8 grid gap-3 md:grid-cols-3 md:gap-4">
          {finishing.map((f, i) => (
            <li key={f.t}>
              <Reveal delay={i * 0.08} y={18}>
                <div className="h-full border border-gold/25 bg-gradient-to-br from-noir-soft to-burgundy-deep/60 p-6">
                  <p className="font-display text-lg uppercase tracking-[0.1em] text-gold">{f.t}</p>
                  <p className="mt-2 text-[0.92rem] leading-snug text-ivory/75">{f.d}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-10">
        <StyleTiles id="start-from-design" products={products} limit={4} eyebrow="Start from a design" title="Pick a blouse to customise" intro="Choose any of our designs as your starting point and tell us what to change." />
      </div>

      <section className="mx-auto my-16 max-w-[1100px] px-5 md:px-10">
        <Reveal>
          <div className="grid items-center gap-6 border border-gold/30 bg-burgundy-deep/70 p-7 md:grid-cols-[1fr_auto] md:p-10">
            <div>
              <h2 className="font-display text-2xl uppercase tracking-[0.1em] text-ivory md:text-3xl">Need help taking measurements?</h2>
              <p className="mt-2 max-w-xl text-[0.95rem] text-ivory/75">Our team is here to guide you — use the detailed guide above, or get one-on-one assistance.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button href="/contact">Start custom stitching</Button>
              <Button href="/contact" variant="ghost">Talk to our team</Button>
            </div>
          </div>
        </Reveal>
      </section>
    </PageShell>
  );
}
