"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { collections } from "@/lib/collections";

const ProductCarousel = dynamic(() => import("@/components/three/ProductCarousel"), { ssr: false });

const showcase = collections.filter((c) => c.slug !== "ready-made-blouses");

export function ProductShowcase() {
  const reduce = useReducedMotion();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [webgl, setWebgl] = useState(true);
  const [focus, setFocus] = useState(0);

  useEffect(() => {
    setMobile(window.matchMedia("(max-width: 767px)").matches);
    try {
      const c = document.createElement("canvas");
      setWebgl(Boolean(c.getContext("webgl2") || c.getContext("webgl")));
    } catch {
      setWebgl(false);
    }
    const el = ref.current;
    if (!el) return;
    const nearIo = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "400px 0px" });
    const visIo = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    nearIo.observe(el);
    visIo.observe(el);
    return () => {
      nearIo.disconnect();
      visIo.disconnect();
    };
  }, []);

  const items = useMemo(
    () =>
      showcase.map((c) => ({
        slug: c.slug,
        title: c.title,
        src: c.image.src,
        aspect: c.image.width / c.image.height,
      })),
    [],
  );

  const use3D = near && webgl && reduce === false;
  const current = showcase[focus] ?? showcase[0];

  return (
    <section id="showcase" aria-labelledby="showcase-title" className="relative overflow-hidden bg-noir py-24 md:py-36">
      <div className="mx-auto max-w-[1440px] px-5 md:px-10">
        <SectionHeading
          align="center"
          eyebrow="The SAVLINO salon"
          title="Every piece, in the round"
          intro="A slow turn through the house — tap any piece to step inside its collection."
        />
      </div>

      <div ref={ref} className="relative mx-auto mt-12 h-[460px] max-w-[1440px] md:mt-16 md:h-[600px]">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.16),transparent_65%)] blur-3xl"
        />
        {use3D ? (
          <ProductCarousel
            items={items}
            active={visible}
            mobile={mobile}
            onFocusChange={setFocus}
            onSelect={(slug) => router.push(`/collections/${slug}`)}
          />
        ) : (
          <ul className="no-scrollbar flex h-full snap-x snap-mandatory items-center gap-5 overflow-x-auto px-5 md:justify-center md:px-10">
            {showcase.map((c) => (
              <li key={c.slug} className="snap-center">
                <Link href={`/collections/${c.slug}`} className="group block w-[200px] md:w-[210px]">
                  <div className="overflow-hidden border border-gold/40 p-1">
                    <Image
                      src={c.image}
                      alt={c.title}
                      sizes="210px"
                      placeholder="blur"
                      className="aspect-[3/4] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <p className="mt-3 text-center text-[0.65rem] uppercase tracking-[0.3em] text-gold">{c.title}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {use3D && (
        <div className="mt-4 flex h-24 flex-col items-center text-center" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.slug}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5 }}
            >
              <p className="font-display text-3xl italic text-ivory">{current.title}</p>
              <Link
                href={`/collections/${current.slug}`}
                className="mt-2 inline-block text-[0.65rem] uppercase tracking-[0.32em] text-gold underline-offset-8 hover:underline"
              >
                Discover the collection
              </Link>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
