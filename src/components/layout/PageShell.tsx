import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { Footer } from "./Footer";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="min-h-[70vh] pt-[calc(var(--header-h)+var(--announce-h,0px))]">
        {children}
      </main>
      <Footer />
    </>
  );
}

export function PageIntro({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="relative overflow-hidden border-b border-gold/10 px-5 py-16 text-center md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(212,175,55,0.14),transparent_70%)]"
      />
      <p className="eyebrow relative">{eyebrow}</p>
      <h1 className="relative mx-auto mt-5 max-w-3xl font-display text-[clamp(2.4rem,6vw,4.8rem)] leading-[1.02] text-ivory">
        {title}
      </h1>
      {intro && <p className="relative mx-auto mt-5 max-w-2xl font-serif text-xl text-ivory/70">{intro}</p>}
    </div>
  );
}
