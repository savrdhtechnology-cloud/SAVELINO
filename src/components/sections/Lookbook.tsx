"use client";

import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { images } from "@/lib/collections";

type Look = { img: StaticImageData; title: string; caption: string; href: string };

const looks: Look[] = [
  { img: images.heritage, title: "Candlelight", caption: "Noir saree, zardozi blouse", href: "/collections/sarees" },
  { img: images.salwar, title: "Durbar", caption: "Burgundy anarkali", href: "/collections/salwar-suits" },
  { img: images.sarees, title: "Gilded Hour", caption: "Tissue-gold saree", href: "/collections/sarees" },
  { img: images.blouses, title: "The Back Story", caption: "Embroidered designer blouse", href: "/collections/designer-blouses" },
  { img: images.lingerie, title: "Bordeaux", caption: "Lace lingerie set", href: "/collections/lingerie" },
  { img: images.loungewear, title: "Slow Morning", caption: "Ivory satin lounge set", href: "/collections/loungewear" },
];

export function Lookbook() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const mm = gsap.matchMedia();

    mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
      const section = sectionRef.current;
      const track = trackRef.current;
      if (!section || !track) return;
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Each look drifts gently against the scroll for depth.
      const drifts = gsap.utils.toArray<HTMLElement>("[data-drift]", track).map((el) =>
        gsap.fromTo(
          el,
          { xPercent: -6 },
          {
            xPercent: 6,
            ease: "none",
            scrollTrigger: { trigger: el, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
          },
        ),
      );

      return () => {
        drifts.forEach((d) => d.kill());
        tween.kill();
      };
    });

    const onLoad = () => ScrollTrigger.refresh();
    window.addEventListener("load", onLoad);
    return () => {
      window.removeEventListener("load", onLoad);
      mm.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="lookbook"
      aria-label="Editorial lookbook"
      className="relative overflow-hidden bg-noir py-24 lg:flex lg:h-screen lg:items-center lg:py-0"
    >
      <div
        ref={trackRef}
        className="no-scrollbar flex snap-x snap-mandatory items-center gap-5 overflow-x-auto px-5 will-change-transform md:gap-8 md:px-10 lg:snap-none lg:overflow-visible"
      >
        <div className="w-[78vw] shrink-0 snap-start sm:w-[420px] lg:w-[460px] lg:pr-10">
          <p className="eyebrow flex items-center gap-4">
            <span aria-hidden className="h-px w-10 bg-gold/70" />
            Editorial lookbook
          </p>
          <h2 className="mt-6 font-display text-[clamp(2.6rem,5vw,4.6rem)] leading-[1] text-ivory">
            For every <em className="text-gold-foil">shade</em> of a woman
          </h2>
          <p className="mt-6 font-serif text-xl leading-relaxed text-ivory/70">
            Six moods from the house of SAVLINO — from candlelit celebrations to slow, satin mornings.
          </p>
          <p className="mt-10 hidden text-[0.65rem] uppercase tracking-[0.35em] text-gold/70 lg:block" aria-hidden>
            Scroll to turn the page →
          </p>
        </div>

        {looks.map((look, i) => (
          <Link
            key={look.title}
            href={look.href}
            className={`group relative shrink-0 snap-center ${
              i % 2 === 0 ? "w-[70vw] sm:w-[360px] lg:w-[380px]" : "w-[62vw] sm:w-[300px] lg:mt-24 lg:w-[320px]"
            }`}
          >
            <div className="relative aspect-[3/4] overflow-hidden border border-gold/20">
              <div data-drift className="absolute -inset-x-[8%] inset-y-0">
                <Image
                  src={look.img}
                  alt={`${look.title} — ${look.caption}`}
                  fill
                  sizes="(min-width: 1024px) 400px, 72vw"
                  placeholder="blur"
                  className="object-cover object-top transition-transform duration-[1400ms] group-hover:scale-105"
                />
              </div>
            </div>
            <div className="mt-4 flex items-baseline justify-between gap-4">
              <p className="font-display text-2xl italic text-ivory transition-colors duration-500 group-hover:text-gold">
                {look.title}
              </p>
              <span className="font-display text-sm text-gold/70">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <p className="mt-1 text-[0.65rem] uppercase tracking-[0.28em] text-ivory/50">{look.caption}</p>
          </Link>
        ))}
        <div aria-hidden className="w-5 shrink-0 md:w-10 lg:w-[8vw]" />
      </div>
    </section>
  );
}
