"use client";

import dynamic from "next/dynamic";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Monogram } from "@/components/ui/Logo";
import { SplitHeadline } from "@/components/ui/SplitHeadline";
import { Button } from "@/components/ui/Button";

const MonogramScene = dynamic(() => import("@/components/three/MonogramScene"), { ssr: false });

const EASE = [0.22, 1, 0.36, 1] as const;

class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function Hero() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<"pending" | "3d" | "static">("pending");
  const [mobile, setMobile] = useState(false);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  // Decide once on the client: real 3D, or the static approved monogram.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setMobile(mq.matches);
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reduce === null) return;
    setMode(reduce || !supportsWebGL() ? "static" : "3d");
  }, [reduce]);

  // Pause rendering entirely when the hero is off-screen.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const textY = useTransform(scrollYProgress, [0, 1], reduce ? ["0%", "0%"] : ["0%", "40%"]);
  const sceneScale = useTransform(scrollYProgress, [0, 1], reduce ? [1, 1] : [1, 0.86]);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  const showStatic = mode !== "3d" || !ready;

  return (
    <section
      ref={sectionRef}
      id="top"
      aria-label="SAVLINO — A Legacy of Elegance"
      className="grain relative h-[100svh] min-h-[620px] w-full overflow-hidden bg-noir"
    >
      {/* Soft gold light */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[38%] h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.22)_0%,rgba(212,175,55,0.06)_40%,transparent_70%)] blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-noir via-noir/60 to-transparent"
      />

      <motion.div style={{ scale: sceneScale, opacity: fade }} className="absolute inset-0">
        {/* Static approved monogram: SSR placeholder, reduced-motion and no-WebGL view. */}
        <div
          className={`absolute left-1/2 top-[36.8%] aspect-square h-[38.3%] -translate-x-1/2 -translate-y-1/2 transition-opacity duration-1000 md:top-[38.1%] md:h-[58.1%] ${
            showStatic ? "opacity-100" : "opacity-0"
          }`}
        >
          <Monogram size={774} priority className="h-full! w-full! object-contain" />
        </div>

        {mode === "3d" && (
          <div className={`absolute inset-0 transition-opacity duration-1000 ${ready ? "opacity-100" : "opacity-0"}`}>
            <SceneBoundary onError={() => setMode("static")}>
              <MonogramScene active={visible} mobile={mobile} onReady={() => setReady(true)} />
            </SceneBoundary>
          </div>
        )}
      </motion.div>

      <motion.div
        style={{ y: textY, opacity: fade }}
        className="absolute inset-x-0 bottom-0 z-10 px-5 pb-[max(2.5rem,env(safe-area-inset-bottom))] text-center md:pb-14"
      >
        <motion.p
          initial={reduce ? false : { opacity: 0, letterSpacing: "0.9em" }}
          animate={{ opacity: 1, letterSpacing: "0.42em" }}
          transition={{ duration: 2, delay: 0.5, ease: EASE }}
          className="eyebrow"
        >
          Timeless women’s luxury
        </motion.p>
        <SplitHeadline
          as="h1"
          trigger="mount"
          delay={0.7}
          stagger={0.12}
          text="A Legacy of Elegance"
          wordClassName="text-gold-foil is-shimmer"
          className="mx-auto mt-4 max-w-4xl font-display text-[clamp(2.4rem,7vw,5.6rem)] italic leading-[1] tracking-[-0.01em]"
        />
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.4, ease: EASE }}
          className="mx-auto mt-4 max-w-xl font-serif text-lg text-ivory/75 md:text-xl"
        >
          Designer blouses, heirloom sarees and intimate essentials — tradition in style, always.
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.7, ease: EASE }}
          className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-5"
        >
          <Button href="/#collections">Explore collections</Button>
          <Button href="/#custom-stitching" variant="outline">
            Custom stitching
          </Button>
        </motion.div>
      </motion.div>

      <ScrollCue />
    </section>
  );
}

function ScrollCue() {
  return (
    <div aria-hidden className="absolute bottom-6 right-6 z-10 hidden flex-col items-center gap-3 md:flex">
      <span className="text-[0.6rem] uppercase tracking-[0.4em] text-gold/70 [writing-mode:vertical-rl]">Scroll</span>
      <span className="relative h-14 w-px overflow-hidden bg-gold/20">
        <span className="absolute inset-x-0 top-0 h-1/2 animate-[cue_2.4s_ease-in-out_infinite] bg-gold" />
      </span>
      <style>{`@keyframes cue{0%{transform:translateY(-100%)}100%{transform:translateY(200%)}}`}</style>
    </div>
  );
}
