import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { Reveal } from "@/components/ui/Reveal";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="min-h-[70vh] pt-[calc(var(--header-h)+var(--announce-h,0px))]">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}

export function PageIntro({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="relative overflow-hidden border-b border-gold/10 px-5 py-10 text-center md:py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[300px] w-[680px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(212,175,55,0.14),transparent_70%)]"
      />
      <Reveal y={12}>
        <p className="eyebrow relative">{eyebrow}</p>
      </Reveal>
      <SplitHeadline as="h1" text={title} trigger="mount" delay={0.1} className="relative mx-auto mt-3 max-w-3xl font-display text-[clamp(2rem,4.8vw,3.6rem)] leading-[1.05] text-ivory" />
      {intro && (
        <Reveal delay={0.35} y={14}>
          <p className="relative mx-auto mt-4 max-w-2xl font-serif text-lg text-ivory/75 md:text-xl">{intro}</p>
        </Reveal>
      )}
    </div>
  );
}
