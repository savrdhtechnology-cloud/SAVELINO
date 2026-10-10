import type { ReactNode } from "react";

export type ProseSection = { heading: string; body: ReactNode };

/** Long-form text layout for policy and help pages. */
export function Prose({ sections, note }: { sections: ProseSection[]; note?: string }) {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 md:px-10 md:py-24">
      {note && (
        <p className="mb-12 border border-gold/30 bg-gold/5 px-5 py-4 text-xs leading-relaxed text-gold-light">{note}</p>
      )}
      <div className="space-y-12">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-display text-2xl text-ivory md:text-3xl">{s.heading}</h2>
            <div className="mt-4 space-y-4 text-[0.95rem] leading-relaxed text-ivory/70 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">
              {s.body}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export const DRAFT_NOTE =
  "This policy is a working draft and will be finalised (and reviewed for legal compliance) before online ordering opens.";
