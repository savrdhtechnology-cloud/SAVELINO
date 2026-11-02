import { Reveal } from "@/components/ui/Reveal";

const stats = [
  { icon: "dress", value: "500+", label: "Unique Designs" },
  { icon: "people", value: "10,000+", label: "Happy Customers" },
  { icon: "scissors", value: "Custom Fit", label: "Your Size, Your Style" },
  { icon: "truck", value: "Pan India", label: "Safe & Reliable Delivery" },
  { icon: "shield", value: "Trusted", label: "Premium Fabrics Only" },
];

/** A trust/stats strip under the hero — part of the "Pearl Celebration" website theme. */
export function StatsStrip() {
  return (
    <section aria-label="Why shop SAVLINO" className="relative border-y border-gold/15 bg-noir-soft py-10">
      <Reveal>
        <ul className="mx-auto grid max-w-[1200px] grid-cols-2 gap-6 px-5 sm:grid-cols-3 md:grid-cols-5 md:px-10">
          {stats.map((s) => (
            <li key={s.label} className="flex flex-col items-center gap-2 text-center">
              <StatIcon name={s.icon} />
              <span className="font-display text-lg text-ivory md:text-xl">{s.value}</span>
              <span className="text-[0.74rem] uppercase tracking-[0.18em] text-ivory/72">{s.label}</span>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}

function StatIcon({ name }: { name: string }) {
  const common = { viewBox: "0 0 24 24", fill: "none" as const, stroke: "currentColor", strokeWidth: 1.4, className: "h-6 w-6 text-gold", "aria-hidden": true };
  switch (name) {
    case "dress":
      return (
        <svg {...common}>
          <path d="M9 3h6l1 3-2 1v1l3 11H7L10 8V7L8 6l1-3Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "people":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <circle cx="16" cy="9" r="2.4" />
          <path d="M3.5 20c.6-3.3 2.9-5 5.5-5s4.9 1.7 5.5 5" strokeLinecap="round" />
          <path d="M14.5 20c.4-2.3 1.8-3.7 4-3.9" strokeLinecap="round" />
        </svg>
      );
    case "scissors":
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2.2" />
          <circle cx="6" cy="18" r="2.2" />
          <path d="M7.8 7.4 20 18M7.8 16.6 20 6" strokeLinecap="round" />
        </svg>
      );
    case "truck":
      return (
        <svg {...common}>
          <path d="M3 7h10v9H3z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13 10h4l3 3v3h-7z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="7" cy="18" r="1.6" />
          <circle cx="17" cy="18" r="1.6" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3.5 19 6v6c0 4.5-3 7.5-7 8.5-4-1-7-4-7-8.5V6l7-2.5Z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return null;
  }
}
