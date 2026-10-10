import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "Custom blouse stitching",
  description: "Made-to-measure designer blouses by SAVLINO — choose your design, share your measurements and we craft it for you.",
  alternates: { canonical: "/custom-stitching" },
};

const measurements = [
  { name: "Bust", how: "Around the fullest part of the bust, tape level across the back." },
  { name: "Under bust", how: "Snugly around the ribcage, directly below the bust." },
  { name: "Waist", how: "Around the natural waist, where the blouse will end." },
  { name: "Shoulder", how: "From the edge of one shoulder to the other, across the back." },
  { name: "Blouse length", how: "From the highest point of the shoulder down to where the blouse should end." },
  { name: "Armhole", how: "Around the arm where it meets the shoulder, loosely." },
  { name: "Sleeve length", how: "From the shoulder edge to the desired sleeve end." },
  { name: "Sleeve round", how: "Around the arm at the point where the sleeve will end." },
  { name: "Front neck depth", how: "From the shoulder point straight down to the desired neckline." },
  { name: "Back neck depth", how: "From the shoulder point down the back to the desired back neckline." },
];

const options = ["Lining & padding", "Hooks, zip or dori", "Sleeve style", "Neckline shape", "Latkans & tassels", "Embroidery placement"];

export default function CustomStitchingPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Custom stitching"
        title="Your blouse, drafted for you"
        intro="A guide to the measurements and choices that go into every made-to-measure SAVLINO blouse."
      />

      <section className="mx-auto grid max-w-[1200px] gap-14 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <h2 className="font-display text-3xl text-ivory md:text-4xl">Measurement guide</h2>
          <p className="mt-3 text-sm text-ivory/60">Use a soft tape, wear a well-fitting bra, and keep the tape snug but not tight.</p>
          <ol className="mt-10 divide-y divide-gold/10 border-y border-gold/15">
            {measurements.map((m, i) => (
              <li key={m.name}>
                <Reveal delay={Math.min(i * 0.04, 0.3)} className="flex gap-6 py-5">
                  <span className="w-8 shrink-0 font-display text-lg italic text-gold">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="font-display text-xl text-ivory">{m.name}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ivory/60">{m.how}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </div>

        <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
          <div className="border border-gold/20 bg-noir-soft p-8">
            <h2 className="font-display text-2xl text-ivory">Choices we will ask about</h2>
            <ul className="mt-6 space-y-3">
              {options.map((o) => (
                <li key={o} className="flex items-center gap-3 text-sm text-ivory/75">
                  <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-gold" />
                  {o}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-gold/40 bg-burgundy-deep p-8">
            <p className="eyebrow">Ordering</p>
            <p className="mt-3 font-serif text-xl leading-relaxed text-ivory/80">
              Online custom orders open soon. Create an account now and your measurements will be ready to save.
            </p>
            <div className="mt-6">
              <Button href="/register">Create account</Button>
            </div>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}
