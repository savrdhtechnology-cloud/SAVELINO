import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/contact/ContactForm";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { isBackendConfigured } from "@/lib/supabase/env";
import { getSiteSettings } from "@/lib/settings-server";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with SAVLINO about custom stitching, sizing, orders or the partner program.",
  alternates: { canonical: "/contact" },
};

const quick = [
  { t: "Custom stitching", d: "Measurements, design references and timelines.", href: "/custom-stitching" },
  { t: "Size help", d: "Find your standard size before you order.", href: "/size-guide" },
  { t: "Partners", d: "Boutiques, stylists and creators.", href: "/partner" },
  { t: "FAQ", d: "Quick answers to common questions.", href: "/faq" },
];

export default async function ContactPage() {
  const configured = isBackendConfigured();
  const { brand } = await getSiteSettings();
  const details = [
    brand.contactEmail && { label: "Email", value: brand.contactEmail, href: `mailto:${brand.contactEmail}` },
    brand.phone && { label: "Phone", value: brand.phone, href: `tel:${brand.phone.replace(/\s/g, "")}` },
    brand.whatsapp && { label: "WhatsApp", value: brand.whatsapp, href: `https://wa.me/${brand.whatsapp.replace(/\D/g, "")}` },
    brand.address && { label: "Studio", value: brand.address, href: "" },
  ].filter(Boolean) as { label: string; value: string; href: string }[];
  return (
    <PageShell>
      <PageIntro eyebrow="Contact" title="We would love to hear from you" intro="Questions about a piece, a fit or a collaboration — write to us." />
      <section className="mx-auto grid max-w-[1200px] gap-14 px-5 py-16 md:px-10 md:py-24 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
        <div className="border border-gold/20 bg-noir-soft p-7 md:p-10">
          {!configured && (
            <p className="mb-6 border border-gold/25 bg-gold/5 px-4 py-3 text-xs leading-relaxed text-gold-light">
              Our messaging inbox is being connected. Until then, nothing you enter here is stored or sent.
            </p>
          )}
          <ContactForm configured={configured} />
        </div>
        <ul className="space-y-4">
          {details.length > 0 && (
            <li className="border border-gold/30 bg-noir-soft p-6">
              <p className="eyebrow">Reach us</p>
              <dl className="mt-4 space-y-3">
                {details.map((d) => (
                  <div key={d.label}>
                    <dt className="text-[0.58rem] uppercase tracking-[0.25em] text-ivory/45">{d.label}</dt>
                    <dd className="mt-1 text-ivory">
                      {d.href ? (
                        <a href={d.href} className="hover:text-gold">
                          {d.value}
                        </a>
                      ) : (
                        d.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          )}
          {quick.map((q) => (
            <li key={q.t}>
              <Link href={q.href} className="group block border border-gold/15 p-6 transition-colors hover:border-gold/50">
                <p className="font-display text-2xl text-ivory group-hover:text-gold">{q.t}</p>
                <p className="mt-1 text-sm text-ivory/60">{q.d}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </PageShell>
  );
}
