import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PageShell } from "@/components/layout/PageShell";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about SAVLINO blouses, custom stitching, sizing, orders and the partner program.",
  alternates: { canonical: "/faq" },
};

const groups: { title: string; items: { q: string; a: React.ReactNode }[] }[] = [
  {
    title: "Shopping",
    items: [
      {
        q: "When can I order online?",
        a: "Our online catalogue and checkout are being connected. Create an account now and you will be ready the moment ordering opens.",
      },
      {
        q: "Which collections does SAVLINO offer?",
        a: (
          <>
            Designer blouses, ready-made blouses, salwar suits, sarees, shapewear, lingerie and loungewear. See{" "}
            <Link href="/collections" className="text-gold underline-offset-4 hover:underline">
              all collections
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    title: "Fit & stitching",
    items: [
      {
        q: "What is the difference between ready-made and custom stitching?",
        a: "Ready-made blouses come in standard sizes 32–44. Custom blouses are drafted to your own measurements, neckline and detailing choices.",
      },
      {
        q: "How do I find my size?",
        a: (
          <>
            Use our{" "}
            <Link href="/size-guide" className="text-gold underline-offset-4 hover:underline">
              size guide
            </Link>{" "}
            for standard sizes, or the{" "}
            <Link href="/custom-stitching" className="text-gold underline-offset-4 hover:underline">
              measurement guide
            </Link>{" "}
            for custom orders.
          </>
        ),
      },
      {
        q: "Can ready-made blouses be altered?",
        a: "Yes. Our ready-made blouses are cut with seam allowances so small alterations stay simple.",
      },
    ],
  },
  {
    title: "Orders & returns",
    items: [
      {
        q: "How will I track my order?",
        a: "Once ordering opens, every order will appear in your account with live shipment tracking.",
      },
      {
        q: "What is your returns policy?",
        a: (
          <>
            Read our{" "}
            <Link href="/shipping-returns" className="text-gold underline-offset-4 hover:underline">
              shipping &amp; returns
            </Link>{" "}
            page. Custom-stitched pieces are made for you and follow separate terms.
          </>
        ),
      },
    ],
  },
  {
    title: "Partner program",
    items: [
      {
        q: "Who can become a SAVLINO partner?",
        a: "Boutiques, stylists, tailors and creators. Every application is reviewed by our team.",
      },
      {
        q: "How is commission paid?",
        a: "Commission is credited on verified, delivered orders placed with your referral code or link. Rates and payout terms are shared with approved partners.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <PageShell>
      <PageIntro eyebrow="Help" title="Frequently asked questions" />
      <div className="mx-auto max-w-3xl px-5 py-16 md:px-10 md:py-24">
        {groups.map((g) => (
          <section key={g.title} className="mb-14">
            <h2 className="eyebrow">{g.title}</h2>
            <div className="mt-6 divide-y divide-gold/15 border-y border-gold/15">
              {g.items.map((item) => (
                <details key={item.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-display text-xl text-ivory transition-colors hover:text-gold [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <span aria-hidden className="text-2xl text-gold transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="mt-3 max-w-2xl leading-relaxed text-ivory/70">{item.a}</div>
                </details>
              ))}
            </div>
          </section>
        ))}
        <p className="text-center text-ivory/60">
          Still have a question?{" "}
          <Link href="/contact" className="text-gold underline-offset-4 hover:underline">
            Contact us
          </Link>
        </p>
      </div>
    </PageShell>
  );
}
