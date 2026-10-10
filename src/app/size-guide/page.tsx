import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Size guide",
  description: "SAVLINO standard blouse size guide and how to measure yourself.",
  alternates: { canonical: "/size-guide" },
};

// Indicative body measurements in inches for standard ready-made blouse sizes.
const rows = [
  { size: "32", label: "XS", bust: "32", underBust: "27", waist: "26", shoulder: "13.5" },
  { size: "34", label: "S", bust: "34", underBust: "29", waist: "28", shoulder: "14" },
  { size: "36", label: "M", bust: "36", underBust: "31", waist: "30", shoulder: "14.5" },
  { size: "38", label: "L", bust: "38", underBust: "33", waist: "32", shoulder: "15" },
  { size: "40", label: "XL", bust: "40", underBust: "35", waist: "34", shoulder: "15.5" },
  { size: "42", label: "XXL", bust: "42", underBust: "37", waist: "36", shoulder: "16" },
  { size: "44", label: "3XL", bust: "44", underBust: "39", waist: "38", shoulder: "16.5" },
];

const tips = [
  "Measure over a well-fitting, non-padded bra.",
  "Keep the tape level and snug, but not tight.",
  "Between two sizes? Choose the larger — our seams allow easy alteration.",
  "For a perfect fit, choose custom stitching instead.",
];

export default function SizeGuidePage() {
  return (
    <PageShell>
      <PageIntro eyebrow="Size guide" title="Find your size" intro="Standard sizes for SAVLINO ready-made blouses, in inches." />
      <section className="mx-auto max-w-[1100px] px-5 py-16 md:px-10 md:py-24">
        <div className="overflow-x-auto border border-gold/20">
          <table className="w-full min-w-[620px] text-left text-sm">
            <caption className="sr-only">Standard blouse sizes in inches</caption>
            <thead>
              <tr className="border-b border-gold/25 bg-noir-soft">
                {["Size", "Label", "Bust", "Under bust", "Waist", "Shoulder"].map((h) => (
                  <th key={h} scope="col" className="px-5 py-4 text-[0.62rem] font-medium uppercase tracking-[0.25em] text-gold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.size} className="border-b border-gold/10 last:border-0 hover:bg-gold/5">
                  <th scope="row" className="px-5 py-4 font-display text-lg text-ivory">
                    {r.size}
                  </th>
                  <td className="px-5 py-4 text-ivory/70">{r.label}</td>
                  <td className="px-5 py-4 text-ivory/70">{r.bust}</td>
                  <td className="px-5 py-4 text-ivory/70">{r.underBust}</td>
                  <td className="px-5 py-4 text-ivory/70">{r.waist}</td>
                  <td className="px-5 py-4 text-ivory/70">{r.shoulder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-ivory/45">
          Indicative chart. Each product page will list its own garment measurements once the catalogue is live.
        </p>

        <div className="mt-16 grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl text-ivory">Measuring tips</h2>
            <ul className="mt-6 space-y-3">
              {tips.map((t) => (
                <li key={t} className="flex gap-3 text-ivory/70">
                  <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-gold/25 bg-burgundy-deep p-8">
            <h2 className="font-display text-2xl text-ivory">Want it made for you?</h2>
            <p className="mt-3 font-serif text-lg text-ivory/75">
              Our custom stitching guide walks you through all ten measurements we use.
            </p>
            <div className="mt-6">
              <Button href="/custom-stitching">Measurement guide</Button>
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
