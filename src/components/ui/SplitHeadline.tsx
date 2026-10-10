"use client";

import { motion, useReducedMotion } from "motion/react";

type SplitHeadlineProps = {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p";
  delay?: number;
  /** Animate when scrolled into view (default) or immediately on mount. */
  trigger?: "view" | "mount";
  stagger?: number;
  /** Classes applied to every word (use for background-clip effects such as gold foil). */
  wordClassName?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Editorial headline that reveals word by word from behind a mask.
 * The full text stays in the DOM as one accessible label.
 */
export function SplitHeadline({
  text,
  className,
  as = "h2",
  delay = 0,
  trigger = "view",
  stagger = 0.08,
  wordClassName,
}: SplitHeadlineProps) {
  const reduce = useReducedMotion();
  const Tag = as;
  const words = text.split(" ");

  const animateProps =
    trigger === "mount"
      ? { animate: "show" as const }
      : { whileInView: "show" as const, viewport: { once: true, margin: "0px 0px -10% 0px" } };

  return (
    <Tag className={className} aria-label={text}>
      <motion.span
        aria-hidden
        className="inline"
        initial={reduce ? "show" : "hidden"}
        {...animateProps}
        variants={{ hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : stagger, delayChildren: delay } } }}
      >
        {words.map((word, i) => (
          <span key={`${word}-${i}`} className="inline-block overflow-hidden -mb-[0.1em] pb-[0.22em] pr-[0.06em] align-bottom">
            <motion.span
              className={`-mb-[0.2em] -mr-[0.08em] inline-block pb-[0.2em] pr-[0.08em] ${wordClassName ?? ""}`}
              variants={{
                hidden: { y: "110%", rotate: 4, opacity: 0 },
                show: { y: "0%", rotate: 0, opacity: 1, transition: { duration: reduce ? 0 : 1.1, ease: EASE } },
              }}
            >
              {word}
            </motion.span>
            {i < words.length - 1 ? " " : null}
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
