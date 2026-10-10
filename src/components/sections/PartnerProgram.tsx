import { Button } from "@/components/ui/Button";
import { Monogram } from "@/components/ui/Logo";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";

const flow = [
  { t: "Apply", d: "Register as a SAVLINO partner. Every application is reviewed by our team." },
  { t: "Receive your code", d: "Approved partners get a personal referral code and shareable referral link." },
  { t: "Share the legacy", d: "Recommend SAVLINO to your clients, community or followers." },
  { t: "Earn commission", d: "Commission is credited on verified, delivered orders and paid out on schedule." },
];

export function PartnerProgram() {
  return (
    <section id="partners" aria-label="Partner referral program" className="relative overflow-hidden bg-noir py-24 md:py-36">
      <div className="mx-auto grid max-w-[1440px] gap-16 px-5 md:px-10 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
        <div className="relative">
          <SectionHeading
            eyebrow="Partner referral program"
            title="Grow with the house of SAVLINO"
            intro="For boutiques, stylists, tailors and creators who share our love for craft."
          />
          <Reveal delay={0.2} className="mt-12 flex flex-wrap gap-4">
            <Button href="/partner/register">Become a partner</Button>
            <Button href="/partner/login" variant="outline">
              Partner login
            </Button>
          </Reveal>
          <Reveal delay={0.3}>
            <p className="mt-8 max-w-md text-xs leading-relaxed text-ivory/45">
              Commission rates, eligibility and payout terms are shared with approved partners during onboarding.
            </p>
          </Reveal>
          <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-24 opacity-[0.07] max-lg:hidden">
            <Monogram size={420} />
          </div>
        </div>

        <div className="relative">
          <span aria-hidden className="absolute bottom-6 left-[35px] top-6 w-px bg-gradient-to-b from-gold/60 via-gold/20 to-transparent" />
          <ol className="relative space-y-4">
          {flow.map((f, i) => (
            <li key={f.t}>
              <Reveal delay={0.1 * i} className="group relative flex gap-6 p-2 md:gap-8">
                <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-noir font-display text-lg italic text-gold transition-colors duration-500 group-hover:bg-gold group-hover:text-noir">
                  {i + 1}
                </span>
                <div className="border-b border-gold/10 pb-8 pt-2">
                  <p className="font-display text-2xl text-ivory">{f.t}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ivory/60">{f.d}</p>
                </div>
              </Reveal>
            </li>
          ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
