import { Reveal } from "./Reveal";
import { SplitHeadline } from "./SplitHeadline";

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
  tone?: "dark" | "light";
  id?: string;
};

export function SectionHeading({ eyebrow, title, intro, align = "left", tone = "dark", id }: SectionHeadingProps) {
  const center = align === "center";
  return (
    <div className={`max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      <Reveal>
        <p className={`eyebrow flex items-center gap-4 ${center ? "justify-center" : ""}`}>
          <span aria-hidden className="h-px w-10 bg-gold/70" />
          {eyebrow}
          {center && <span aria-hidden className="h-px w-10 bg-gold/70" />}
        </p>
      </Reveal>
      <SplitHeadline
        text={title}
        as="h2"
        className={`mt-6 font-display text-[clamp(2.2rem,5.2vw,4.4rem)] leading-[1.02] tracking-[-0.01em] ${
          tone === "dark" ? "text-ivory" : "text-noir"
        }`}
      />
      {intro && (
        <Reveal delay={0.15}>
          <p
            id={id}
            className={`mt-6 font-serif text-xl leading-relaxed md:text-2xl ${
              tone === "dark" ? "text-ivory/70" : "text-noir/70"
            }`}
          >
            {intro}
          </p>
        </Reveal>
      )}
    </div>
  );
}
