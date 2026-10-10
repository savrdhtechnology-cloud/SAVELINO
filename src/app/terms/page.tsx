import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { DRAFT_NOTE, Prose } from "@/components/layout/Prose";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Terms that apply when you use the SAVLINO website, accounts and partner program.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PageShell>
      <PageIntro eyebrow="Legal" title="Terms of use" />
      <Prose
        note={DRAFT_NOTE}
        sections={[
          {
            heading: "Using this website",
            body: <p>By using the SAVLINO website you agree to use it lawfully and not to misuse or disrupt it.</p>,
          },
          {
            heading: "Accounts",
            body: (
              <p>
                You are responsible for keeping your login details secure and for activity on your account. Please
                provide accurate information, especially delivery details and measurements.
              </p>
            ),
          },
          {
            heading: "Products & orders",
            body: (
              <ul>
                <li>Colours may vary slightly from images because of screens and handcrafted finishes.</li>
                <li>An order is confirmed only after payment is verified.</li>
                <li>Custom-stitched pieces are made to the measurements you provide.</li>
              </ul>
            ),
          },
          {
            heading: "Partner program",
            body: (
              <p>
                Partner accounts are subject to approval. Commission applies only to verified, delivered orders
                attributed to a partner’s referral code or link, under the terms shared at onboarding. Misuse of referral
                codes may lead to suspension.
              </p>
            ),
          },
          {
            heading: "Intellectual property",
            body: (
              <p>
                The SAVLINO name, SL monogram, designs, photography and website content belong to SAVLINO and may not
                be copied or used without permission.
              </p>
            ),
          },
        ]}
      />
    </PageShell>
  );
}
