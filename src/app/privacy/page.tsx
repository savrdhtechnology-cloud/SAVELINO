import type { Metadata } from "next";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { DRAFT_NOTE, Prose } from "@/components/layout/Prose";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How SAVLINO collects, uses and protects your personal information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PageShell>
      <PageIntro eyebrow="Legal" title="Privacy policy" />
      <Prose
        note={DRAFT_NOTE}
        sections={[
          {
            heading: "What we collect",
            body: (
              <ul>
                <li>Account details: name, email address and mobile number.</li>
                <li>Order details: delivery addresses, items ordered and payment status (we do not store card numbers).</li>
                <li>Measurements you choose to save for custom stitching.</li>
                <li>Messages you send us through the contact form.</li>
              </ul>
            ),
          },
          {
            heading: "How we use it",
            body: (
              <ul>
                <li>To create and deliver your orders, including custom-stitched pieces.</li>
                <li>To confirm payments, ship your order and handle returns.</li>
                <li>To reply to your questions.</li>
              </ul>
            ),
          },
          {
            heading: "How we protect it",
            body: (
              <p>
                Order and payment data is stored with strict access controls and is visible only to authorised SAVLINO
                staff. Card or UPI credentials are never stored by us.
              </p>
            ),
          },
          {
            heading: "Your choices",
            body: (
              <p>
                You can ask us to correct or delete your order details and personal data at any time by contacting us.
              </p>
            ),
          },
        ]}
      />
    </PageShell>
  );
}
