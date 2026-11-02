"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, type PointerEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useMotionStyle } from "@/components/site/Motion";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/settings";
import { site } from "@/lib/site";
import { CinemaIcon, Flourish, GoldParticles, type CinemaIconName } from "./icons";

const EASE = [0.22, 1, 0.36, 1] as const;

export type HeroPhoto = { url: string; alt: string; fit: string; href: string; name: string };

const POINTS: { icon: CinemaIconName; label: string }[] = [
  { icon: "fabric", label: "Premium Fabrics" },
  { icon: "fit", label: "Perfect Fit" },
  { icon: "needle", label: "Handcrafted Finish" },
  { icon: "truck", label: "Pan India Delivery" },
];

/** Hero text: the Royal Cinema copy unless the admin has written their own in Hero Studio. */
function copy(h: SiteSettings["hero"]) {
  const d = DEFAULT_SETTINGS.hero;
  const pick = (v: string, def: string, cinema: string) => (v.trim() && v !== def ? v : cinema);
  return {
    eyebrow: pick(h.eyebrow, d.eyebrow, "The SAVLINO Edit"),
    title: pick(h.title, d.title, "Designer Blouse Collection"),
    subtitle: pick(h.subtitle, d.subtitle, "Sculpted silhouettes, hand-finished details — crafted to be remembered."),
    primaryLabel: pick(h.primaryLabel, d.primaryLabel, "Shop Collection"),
    primaryHref: h.primaryHref || "/shop",
    secondaryLabel: h.secondaryLabel || "Custom Stitching",
    secondaryHref: h.secondaryHref || "/custom-stitching",
  };
}

/** Royal Cinema hero: editorial split layout, palace light, floating gold, mouse-responsive 3D photo frame. */
export function CinematicHero({ content, photo }: { content: SiteSettings["hero"]; photo?: HeroPhoto }) {
  const c = copy(content);
  const reduced = useReducedMotion();
  const still = useMotionStyle() === "still" || Boolean(reduced);
  const ref = useRef<HTMLElement>(null);

  // Gentle 3D follow of the pointer (desktop pointers only; nothing for reduced motion).
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 80, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 80, damping: 18 });
  const glowX = useTransform(mx, [-0.5, 0.5], ["35%", "65%"]);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], still ? ["0%", "0%"] : ["0%", "18%"]);
  const frameY = useTransform(scrollYProgress, [0, 1], still ? ["0%", "0%"] : ["0%", "-10%"]);
  const tiltBack = useTransform(scrollYProgress, [0, 1], still ? [0, 0] : [0, 14]);
  const textY = useTransform(scrollYProgress, [0, 1], still ? ["0%", "0%"] : ["0%", "30%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const words = c.title.split(/\s+/);
  const lead = words.slice(0, -1);
  const last = words[words.length - 1];

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (still || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const rise = (i: number) =>
    still ? {} : { initial: { opacity: 0, y: "0.6em" }, animate: { opacity: 1, y: 0 }, transition: { duration: 1.1, delay: 0.25 + i * 0.09, ease: EASE } };

  return (
    <section
      ref={ref}
      id="top"
      aria-label={`${site.name} — ${c.title}`}
      onPointerMove={onMove}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className="cin-hero grain relative isolate w-full overflow-hidden"
      style={{ minHeight: `max(640px, ${Math.min(content.height || 92, 100)}svh)` }}
    >
      {/* Palace light: maroon velvet, arches, warm spots — parallax layer */}
      <motion.div aria-hidden style={{ y: bgY }} className="absolute inset-[-8%_0_-8%_0] -z-10">
        <div className="cin-palace absolute inset-0" />
        <div className="cin-arches absolute inset-y-0 right-0 w-full md:w-[62%]" />
        <motion.div style={{ left: glowX }} className="cin-sun absolute top-[18%] h-[70vmin] w-[70vmin] -translate-x-1/2 rounded-full" />
        <div className="cin-silk absolute inset-0" />
      </motion.div>
      <GoldParticles />
      <div aria-hidden className="cin-vignette pointer-events-none absolute inset-0 -z-[1]" />

      <div className="relative mx-auto grid min-h-[inherit] max-w-[1440px] items-center gap-12 px-5 pb-20 pt-[calc(var(--header-h)+2.5rem)] md:grid-cols-[1.05fr_1fr] md:gap-8 md:px-10 md:pb-24">
        {/* Left: editorial copy */}
        <motion.div style={{ y: textY, opacity: fade }} className="relative z-10 order-2 md:order-1">
          <motion.p {...rise(0)} className="flex items-center gap-4 text-[0.66rem] uppercase tracking-[0.42em] text-gold-light">
            <span aria-hidden className="h-px w-10 bg-gold/70" />
            <span data-studio="hero-eyebrow">{c.eyebrow}</span>
          </motion.p>
          <h1 data-studio="hero-title" className="mt-6 font-display text-[clamp(2.7rem,6.6vw,6.4rem)] leading-[0.98] tracking-[-0.01em] text-ivory">
            {lead.map((w, i) => (
              <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
                <motion.span {...rise(i + 1)} className="inline-block">
                  {w}&nbsp;
                </motion.span>
              </span>
            ))}
            <span className="block overflow-hidden pb-[0.12em]">
              <motion.span {...rise(lead.length + 1)} className="cin-shimmer inline-block italic">
                {last}
              </motion.span>
            </span>
          </h1>
          <motion.div {...rise(lead.length + 2)}>
            <Flourish className="mt-6" />
            <p data-studio="hero-subtitle" className="mt-6 max-w-md font-serif text-lg leading-relaxed text-ivory/75 md:text-xl">
              {c.subtitle}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button href={c.primaryHref}>{c.primaryLabel}</Button>
              <Button href={c.secondaryHref} variant="outline">
                {c.secondaryLabel}
              </Button>
            </div>
            <ul className="mt-12 grid max-w-xl grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              {POINTS.map((p, i) => (
                <li key={p.label} className="flex flex-col items-start gap-2 sm:items-center sm:text-center">
                  <span className="cin-icon-ring flex h-11 w-11 items-center justify-center rounded-full text-gold" style={{ animationDelay: `${i * 0.6}s` }}>
                    <CinemaIcon name={p.icon} className="h-5 w-5" />
                  </span>
                  <span className="text-[0.6rem] uppercase leading-snug tracking-[0.2em] text-ivory/70">{p.label}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>

        {/* Right: framed fashion photograph in 3D */}
        <div className="relative order-1 md:order-2" style={{ perspective: 1400 }}>
          <motion.div
            initial={still ? false : { opacity: 0, scale: 0.94, rotateY: -12 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.6, ease: EASE, delay: 0.15 }}
            style={{ y: frameY, rotateX: still ? 0 : rx, rotateY: still ? 0 : ry, transformStyle: "preserve-3d" }}
            className="relative mx-auto w-[min(86vw,520px)]"
          >
            <motion.div style={{ rotateX: tiltBack }} className="relative">
              <div aria-hidden className="cin-frame-glow absolute -inset-10 -z-10 rounded-[40%]" />
              <div className="cin-arch-frame relative aspect-[4/5] overflow-hidden">
                {photo ? (
                  <Image src={photo.url} alt={photo.alt} fill priority sizes="(min-width: 768px) 520px, 86vw" className="object-cover" style={{ objectPosition: photo.fit }} />
                ) : (
                  <Image src={site.logo.monogram} alt="" fill priority sizes="520px" className="object-contain p-16 opacity-80" />
                )}
                <div aria-hidden className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,7,9,0.75),transparent_42%)]" />
                <div aria-hidden className="cin-sheen absolute inset-0" />
              </div>
              {photo && (
                <Link href={photo.href} className="absolute inset-x-6 bottom-6 flex items-center justify-between gap-3 text-ivory" style={{ transform: "translateZ(40px)" }}>
                  <span className="min-w-0">
                    <span className="block text-[0.55rem] uppercase tracking-[0.3em] text-gold-light">From the collection</span>
                    <span className="mt-1 block truncate font-display text-lg">{photo.name}</span>
                  </span>
                  <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/60 text-gold">
                    <CinemaIcon name="arrowR" className="h-4 w-4" strokeWidth={1.6} />
                  </span>
                </Link>
              )}
            </motion.div>
            <div aria-hidden className="cin-floor mx-auto mt-6 h-8 w-4/5 rounded-[50%]" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
