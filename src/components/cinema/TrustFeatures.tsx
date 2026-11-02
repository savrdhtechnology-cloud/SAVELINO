import { Reveal } from "@/components/ui/Reveal";
import { CinemaIcon, type CinemaIconName } from "./icons";

const ITEMS: { icon: CinemaIconName; title: string; text: string }[] = [
  { icon: "fabric", title: "Premium Fabrics", text: "Silks, brocades and cottons chosen by hand" },
  { icon: "fit", title: "Perfect Fit", text: "Your size, or stitched to your measurements" },
  { icon: "needle", title: "Handcrafted Finish", text: "Every piece finished by our tailors" },
  { icon: "truck", title: "Pan India Delivery", text: "Packed with care, delivered to your door" },
];

/** Brand advantages strip for the Royal Cinema theme — fine line icons with a slow glow. */
export function TrustFeatures() {
  return (
    <section aria-label="Why SAVLINO" className="cin-trust relative border-y border-gold/20 py-12">
      <ul className="mx-auto grid max-w-[1300px] grid-cols-2 gap-x-6 gap-y-10 px-5 md:grid-cols-4 md:px-10">
        {ITEMS.map((it, i) => (
          <li key={it.title}>
            <Reveal delay={i * 0.08} className="flex flex-col items-center gap-3 text-center md:flex-row md:items-start md:text-left">
              <span className="cin-icon-ring flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-gold" style={{ animationDelay: `${i * 0.7}s` }}>
                <CinemaIcon name={it.icon} className="h-6 w-6" />
              </span>
              <span>
                <span className="block font-display text-lg text-ivory">{it.title}</span>
                <span className="mt-1 block text-[0.78rem] leading-snug text-ivory/55">{it.text}</span>
              </span>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}
