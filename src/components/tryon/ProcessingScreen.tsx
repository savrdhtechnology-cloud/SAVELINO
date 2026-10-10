"use client";

import { motion, useReducedMotion } from "motion/react";

export const PROCESSING_STAGES = ["Uploading your photo", "Analysing pose", "Styling garment", "Generating views", "Finalising preview"];

/** The animated "atelier at work" screen shown while a preview is prepared. */
export function ProcessingScreen({ stage, productTitle, photo }: { stage: number; productTitle: string; photo?: string }) {
  const reduce = useReducedMotion();
  const pct = Math.round(((stage + 1) / PROCESSING_STAGES.length) * 100);
  return (
    <motion.section
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative mx-auto grid max-w-5xl items-center gap-12 px-5 py-16 md:grid-cols-[1fr_1.1fr] md:py-24"
    >
      <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden border border-gold/25 bg-noir-soft">
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 blur-[1px]" />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(11,11,11,0.65))]" />
        {!reduce && (
          <motion.div
            aria-hidden
            className="absolute inset-x-0 h-24 bg-[linear-gradient(180deg,transparent,rgba(212,175,55,0.45),transparent)]"
            animate={{ top: ["-20%", "100%"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 m-auto h-28 w-28">
          <motion.circle
            cx="50" cy="50" r="44" fill="none" stroke="#d4af37" strokeWidth="1.2" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: pct / 100 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{ rotate: -90, transformOrigin: "50% 50%" }}
          />
          <text x="50" y="55" textAnchor="middle" className="fill-[#f8f5eb] font-display text-[18px]">{pct}%</text>
        </svg>
      </div>
      <div>
        <p className="eyebrow">Virtual atelier</p>
        <h2 className="mt-4 font-display text-[clamp(2rem,4.4vw,3.4rem)] leading-[1.05] text-ivory">Styling your {productTitle}</h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-ivory/60">This usually takes a few moments. Please keep this page open.</p>
        <ol className="mt-10 space-y-4">
          {PROCESSING_STAGES.map((s, i) => {
            const state = i < stage ? "done" : i === stage ? "active" : "todo";
            return (
              <li key={s} className="flex items-center gap-4">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border text-[0.62rem] transition-colors duration-500 ${
                    state === "done" ? "border-gold bg-gold text-noir" : state === "active" ? "border-gold text-gold" : "border-ivory/20 text-ivory/30"
                  }`}
                >
                  {state === "done" ? "✓" : i + 1}
                </span>
                <span className={`text-sm tracking-wide transition-colors duration-500 ${state === "todo" ? "text-ivory/35" : "text-ivory"}`}>{s}</span>
                {state === "active" && !reduce && (
                  <motion.span aria-hidden className="h-1 w-1 rounded-full bg-gold" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.2, repeat: Infinity }} />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </motion.section>
  );
}
