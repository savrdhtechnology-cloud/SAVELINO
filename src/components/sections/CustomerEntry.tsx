import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { SplitHeadline } from "@/components/ui/SplitHeadline";

const features = ["Order history & tracking", "Wishlist", "Saved addresses", "Returns & exchanges"];

export function CustomerEntry() {
  return (
    <section id="account" aria-label="Customer login" className="relative overflow-hidden bg-ivory py-24 text-noir md:py-32">
      <div className="mx-auto max-w-[1100px] px-5 text-center md:px-10">
        <Reveal>
          <p className="eyebrow text-burgundy!">Your SAVLINO account</p>
        </Reveal>
        <SplitHeadline
          text="Your wardrobe, remembered"
          className="mt-6 font-display text-[clamp(2.4rem,5.4vw,4.6rem)] italic leading-[1.02]"
        />
        <Reveal delay={0.15}>
          <p className="mx-auto mt-6 max-w-2xl font-serif text-xl text-noir/70 md:text-2xl">
            Sign in to keep your measurements, wishlist and orders in one quiet, private place.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <ul className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-x-8 gap-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-[0.68rem] uppercase tracking-[0.26em] text-noir/70">
                <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-gold" />
                {f}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal delay={0.3} className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="w-full bg-noir px-10 py-4 text-[0.7rem] uppercase tracking-[0.32em] text-gold transition-colors duration-500 hover:bg-burgundy sm:w-auto"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="w-full border border-noir/30 px-10 py-4 text-[0.7rem] uppercase tracking-[0.32em] text-noir transition-colors duration-500 hover:border-noir sm:w-auto"
          >
            Create account
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
