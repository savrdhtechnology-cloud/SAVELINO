/** Fine gold line icons for the "Royal Cinema" website theme. Stroke follows currentColor. */
const PATHS = {
  fabric: "M4 7c3-2 5 2 8 0s5-2 8 0v10c-3-2-5 2-8 0s-5-2-8 0V7Z M4 11c3-2 5 2 8 0s5-2 8 0",
  fit: "M8 3h8l3 4-3 2v12H8V9L5 7l3-4Z M10 3c0 1.5.9 2.5 2 2.5S14 4.5 14 3",
  needle: "M19 5 9.5 14.5 M17 4.5a1.5 1.5 0 1 1 2.5 2 M9.5 14.5 6 18 M4 20c4-1 6-3 7-6 M14 8c3 1 4 3 4 6",
  truck: "M3 6h11v10H3V6Z M14 9h4l3 3.5V16h-7V9Z M7 18.5a1.5 1.5 0 1 0 0-.01 M17.5 18.5a1.5 1.5 0 1 0 0-.01",
  design: "M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.4 7.2 17.9l.9-5.4L4.2 8.7l5.4-.8L12 3Z",
  tape: "M12 4a8 8 0 1 0 0 16h8v-4h-4 M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z M16 16v2 M18 16v2",
  box: "M3 8l9-4 9 4-9 4-9-4Z M3 8v8l9 4 9-4V8 M12 12v8 M7.5 6l9 4",
  arrowL: "M15 5l-7 7 7 7",
  arrowR: "M9 5l7 7-7 7",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z",
} as const;

export type CinemaIconName = keyof typeof PATHS;

export function CinemaIcon({ name, className = "h-6 w-6", strokeWidth = 1.3 }: { name: CinemaIconName; className?: string; strokeWidth?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATHS[name].split(" M").map((d, i) => (
        <path key={i} d={i === 0 ? d : `M${d}`} />
      ))}
    </svg>
  );
}

/** Thin ornamental divider: gold rule · diamond · gold rule. */
export function Flourish({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`cin-flourish flex items-center gap-3 text-gold ${className}`}>
      <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold/80" />
      <svg viewBox="0 0 24 12" className="h-3 w-6" fill="none" stroke="currentColor" strokeWidth={1}>
        <path d="M0 6h7M17 6h7M12 1l5 5-5 5-5-5 5-5Z" />
        <circle cx="12" cy="6" r="1.2" fill="currentColor" />
      </svg>
      <span className="h-px w-12 bg-gradient-to-l from-transparent to-gold/80" />
    </span>
  );
}

/** Slow floating gold motes — pure CSS, hidden for reduced motion. Deterministic positions (no hydration mismatch). */
export function GoldParticles({ count = 26 }: { count?: number }) {
  return (
    <div aria-hidden className="cin-particles pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => {
        const left = (i * 37.7) % 100;
        const size = 1.5 + ((i * 7) % 5) * 0.6;
        const dur = 14 + ((i * 11) % 13);
        const delay = -((i * 5.3) % dur);
        return <span key={i} style={{ left: `${left}%`, width: size, height: size, animationDuration: `${dur}s`, animationDelay: `${delay}s` }} />;
      })}
    </div>
  );
}
