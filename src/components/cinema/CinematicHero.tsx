"use client";

import Image, { type StaticImageData } from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useMotionStyle } from "@/components/site/Motion";
import { HERO_PREVIEW_EVENT } from "@/components/site/StudioBridge";
import { DEFAULT_CINEMA_SLIDES, type CinemaSlide, type CinemaStyle, type SiteSettings } from "@/lib/settings";
import { site } from "@/lib/site";
import lookDurbar from "@/assets/images/look-durbar.webp";
import lookCandlelight from "@/assets/images/look-candlelight.webp";
import heritage from "@/assets/images/editorial-heritage.webp";
import blouses from "@/assets/images/blouses.webp";
import { CinemaIcon, Flourish, GoldParticles, type CinemaIconName } from "./icons";

const EASE = [0.22, 1, 0.36, 1] as const;
const AUTOPLAY_MS = 6500;

/** Built-in placeholder photos, used for a slide until an admin uploads its own image in Hero Studio. */
const PLACEHOLDERS: StaticImageData[] = [lookDurbar, lookCandlelight, heritage, blouses];

/** Per-style colour mood: the overlay that carries the text, the glow and the accent. */
const LOOKS: Record<CinemaStyle, { overlay: string; mobile: string; glow: string; accent: string; title: string }> = {
  palace: {
    overlay: "linear-gradient(90deg, rgba(57,7,17,0.94) 0%, rgba(57,7,17,0.62) 36%, rgba(57,7,17,0.12) 68%, transparent 100%)",
    mobile: "linear-gradient(0deg, rgba(36,5,12,0.96) 0%, rgba(57,7,17,0.7) 45%, transparent 85%)",
    glow: "rgba(243,209,139,0.28)",
    accent: "#F3D18B",
    title: "",
  },
  noir: {
    overlay: "linear-gradient(90deg, rgba(5,4,5,0.97) 0%, rgba(8,6,7,0.7) 38%, rgba(8,6,7,0.1) 70%, transparent 100%)",
    mobile: "linear-gradient(0deg, rgba(5,4,5,0.97) 0%, rgba(8,6,7,0.72) 48%, transparent 88%)",
    glow: "rgba(212,175,55,0.22)",
    accent: "#D4AF37",
    title: "uppercase tracking-[0.05em] text-[clamp(2.1rem,5vw,4.7rem)]!",
  },
  festive: {
    overlay: "linear-gradient(90deg, rgba(104,10,14,0.93) 0%, rgba(130,28,18,0.6) 38%, rgba(130,28,18,0.1) 70%, transparent 100%)",
    mobile: "linear-gradient(0deg, rgba(80,8,12,0.96) 0%, rgba(120,24,16,0.7) 46%, transparent 86%)",
    glow: "rgba(255,176,64,0.3)",
    accent: "#FFC670",
    title: "italic",
  },
  ivory: {
    overlay: "linear-gradient(90deg, rgba(58,40,26,0.9) 0%, rgba(86,62,42,0.55) 38%, rgba(86,62,42,0.08) 70%, transparent 100%)",
    mobile: "linear-gradient(0deg, rgba(48,32,20,0.95) 0%, rgba(86,62,42,0.66) 46%, transparent 86%)",
    glow: "rgba(255,240,214,0.3)",
    accent: "#F6E2B8",
    title: "",
  },
};

const POINTS: { icon: CinemaIconName; label: string }[] = [
  { icon: "fabric", label: "Premium Fabrics" },
  { icon: "fit", label: "Perfect Fit" },
  { icon: "needle", label: "Custom Stitching" },
  { icon: "truck", label: "Pan India Delivery" },
];

/**
 * Royal Cinema hero: a full-bleed photo slider. Each slide has its own photograph, copy and colour
 * mood (Hero Studio). Images, text and buttons come from settings — nothing is taken from the shop's products.
 */
export function CinematicHero({ content }: { content: SiteSettings["hero"] }) {
  const reduced = useReducedMotion();
  const still = useMotionStyle() === "still" || Boolean(reduced);
  const ref = useRef<HTMLElement>(null);
  const [preview, setPreview] = useState<CinemaSlide[] | null>(null);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  // Hero Studio previews unsaved slide edits inside the website frame.
  useEffect(() => {
    const on = (e: Event) => {
      const slides = (e as CustomEvent<{ slides?: CinemaSlide[] }>).detail?.slides;
      if (Array.isArray(slides) && slides.length) setPreview(slides);
    };
    window.addEventListener(HERO_PREVIEW_EVENT, on);
    return () => window.removeEventListener(HERO_PREVIEW_EVENT, on);
  }, []);

  const slides = preview ?? (content.slides?.length ? content.slides : DEFAULT_CINEMA_SLIDES);
  const count = slides.length;
  const index = Math.min(active, count - 1);
  const go = useCallback((n: number) => setActive((a) => (a + n + count) % count), [count]);

  useEffect(() => {
    if (still || paused || count < 2) return;
    const t = window.setInterval(() => setActive((a) => (a + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(t);
  }, [still, paused, count]);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], still ? ["0%", "0%"] : ["0%", "14%"]);
  const textY = useTransform(scrollYProgress, [0, 1], still ? ["0%", "0%"] : ["0%", "26%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const rise = (on: boolean, i: number) =>
    still
      ? { animate: { opacity: on ? 1 : 0 }, transition: { duration: 0 } }
      : { animate: { opacity: on ? 1 : 0, y: on ? 0 : 26 }, transition: { duration: on ? 1 : 0.35, delay: on ? 0.35 + i * 0.12 : 0, ease: EASE } };

  return (
    <section
      ref={ref}
      id="top"
      aria-roledescription="carousel"
      aria-label={`${site.name} — featured collections`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
      className="cin-hero grain relative isolate w-full overflow-hidden"
      style={{ height: `${Math.min(content.height || 92, 100)}svh`, minHeight: 640 }}
    >
      {/* Photographs: crossfade, with a slow push-in on the one showing */}
      <motion.div aria-hidden style={{ y: imgY }} className="absolute inset-[-4%_0_-4%_0] -z-10 bg-noir">
        {slides.map((sl, i) => {
          const on = i === index;
          const src: StaticImageData | string = sl.image || PLACEHOLDERS[i % PLACEHOLDERS.length];
          return (
            <div key={i} className="absolute inset-0 transition-opacity duration-[1400ms] ease-out" style={{ opacity: on ? 1 : 0 }}>
              <motion.div className="absolute inset-0" animate={still ? undefined : { scale: on ? 1.07 : 1 }} transition={{ duration: on ? 9 : 1.4, ease: "linear" }}>
                <Image src={src} alt="" fill priority={i === 0} sizes="100vw" className="object-cover" style={{ objectPosition: "72% 26%" }} />
              </motion.div>
            </div>
          );
        })}
      </motion.div>
      {/* Colour mood per slide: overlay carries the text, soft glow behind the subject */}
      {slides.map((sl, i) => {
        const look = LOOKS[sl.style] ?? LOOKS.palace;
        return (
          <div key={i} aria-hidden className="pointer-events-none absolute inset-0 -z-[5] transition-opacity duration-[1400ms]" style={{ opacity: i === index ? 1 : 0 }}>
            <div className="absolute inset-0 hidden md:block" style={{ background: look.overlay }} />
            <div className="absolute inset-0 md:hidden" style={{ background: look.mobile }} />
            <div className="cin-sun absolute right-[18%] top-[22%] h-[60vmin] w-[60vmin] rounded-full" style={{ background: `radial-gradient(circle, ${look.glow}, transparent 66%)` }} />
          </div>
        );
      })}
      <div aria-hidden className="cin-vignette pointer-events-none absolute inset-0 -z-[4]" />
      <GoldParticles count={22} />

      <div className="relative mx-auto flex h-full max-w-[1440px] flex-col justify-end px-5 pb-24 pt-[calc(var(--header-h)+2rem)] md:justify-center md:px-10 md:pb-20">
        <motion.div style={{ y: textY, opacity: fade }} className="relative min-h-[360px] max-w-[640px] md:min-h-[430px]">
          {slides.map((sl, i) => {
            const on = i === index;
            const look = LOOKS[sl.style] ?? LOOKS.palace;
            const words = sl.title.trim().split(/\s+/);
            const lead = words.slice(0, -1).join(" ");
            const last = words[words.length - 1] ?? "";
            return (
              <div
                key={i}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={!on}
                className={`absolute inset-x-0 bottom-0 md:bottom-auto md:top-1/2 md:-translate-y-1/2 ${on ? "" : "pointer-events-none"}`}
              >
                <motion.p {...rise(on, 0)} className="flex items-center gap-4 text-[0.66rem] uppercase tracking-[0.42em]" style={{ color: look.accent }}>
                  <span aria-hidden className="h-px w-10" style={{ background: look.accent }} />
                  {sl.eyebrow}
                </motion.p>
                <motion.h2
                  role="heading"
                  aria-level={i === 0 ? 1 : 2}
                  {...rise(on, 1)}
                  className={`mt-5 font-display text-[clamp(2.5rem,6.2vw,5.8rem)] leading-[0.98] tracking-[-0.01em] text-ivory ${look.title}`}
                >
                  {lead && <span>{lead} </span>}
                  <span className="cin-shimmer inline-block italic">{last}</span>
                </motion.h2>
                <motion.div {...rise(on, 2)}>
                  <Flourish className="mt-5" />
                  <p className="mt-5 max-w-md font-serif text-lg italic leading-relaxed text-ivory/85 md:text-[1.35rem]">{sl.subtitle}</p>
                </motion.div>
                <motion.div {...rise(on, 3)} className="mt-8 flex flex-wrap gap-3">
                  {sl.primaryLabel && <Button href={sl.primaryHref || "/shop"}>{sl.primaryLabel}</Button>}
                  {sl.secondaryLabel && (
                    <Button href={sl.secondaryHref || "/custom-stitching"} variant="outline">
                      {sl.secondaryLabel}
                    </Button>
                  )}
                </motion.div>
              </div>
            );
          })}
        </motion.div>

        <ul className="mt-8 hidden max-w-xl grid-cols-4 gap-5 md:grid">
          {POINTS.map((p, i) => (
            <li key={p.label} className="flex flex-col items-center gap-2 text-center">
              <span className="cin-icon-ring flex h-11 w-11 items-center justify-center rounded-full text-gold" style={{ animationDelay: `${i * 0.6}s` }}>
                <CinemaIcon name={p.icon} className="h-5 w-5" />
              </span>
              <span className="text-[0.58rem] uppercase leading-snug tracking-[0.2em] text-ivory/75">{p.label}</span>
            </li>
          ))}
        </ul>
      </div>

      {count > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="Previous slide" className="cin-arrow absolute left-3 top-1/2 z-10 hidden -translate-y-1/2 md:flex lg:left-6">
            <CinemaIcon name="arrowL" className="h-4 w-4" strokeWidth={1.6} />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="Next slide" className="cin-arrow absolute right-3 top-1/2 z-10 hidden -translate-y-1/2 md:flex lg:right-6">
            <CinemaIcon name="arrowR" className="h-4 w-4" strokeWidth={1.6} />
          </button>
          <div className="absolute inset-x-0 bottom-7 z-10 flex items-center justify-center gap-3" role="tablist" aria-label="Choose slide">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Show slide ${i + 1}`}
                  onClick={() => setActive(i)}
                  className={`h-2.5 rounded-full border border-gold/70 transition-all duration-500 ${i === index ? "w-8 bg-gold" : "w-2.5 bg-transparent hover:bg-gold/40"}`}
                />
              ))}
          </div>
        </>
      )}
    </section>
  );
}
