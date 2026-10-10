import Link from "next/link";
import type { ReactNode } from "react";

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variants;
  className?: string;
};

const base =
  "group relative inline-flex items-center justify-center gap-3 overflow-hidden px-7 py-3.5 text-[0.7rem] font-medium uppercase tracking-[0.32em] transition-colors duration-500";

const variants = {
  gold: "bg-gold text-noir hover:text-noir",
  outline: "border border-gold/60 text-gold hover:text-noir",
  ghost: "text-ivory/80 hover:text-gold px-0",
  noir: "bg-noir text-gold hover:text-noir",
  "outline-dark": "border border-noir/40 text-noir hover:text-ivory",
} as const;

const sweep: Record<keyof typeof variants, string> = {
  gold: "bg-gold-light",
  outline: "bg-gold",
  ghost: "",
  noir: "bg-gold",
  "outline-dark": "bg-noir",
};

export function Button({ href, children, variant = "gold", className }: ButtonProps) {
  return (
    <Link href={href} className={`${base} ${variants[variant]} ${className ?? ""}`}>
      {variant !== "ghost" && (
        <span
          aria-hidden
          className={`absolute inset-0 -translate-x-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 ${sweep[variant]}`}
        />
      )}
      <span className="relative">{children}</span>
      <span aria-hidden className="relative transition-transform duration-500 group-hover:translate-x-1">
        →
      </span>
    </Link>
  );
}
