import type { Metadata } from "next";
import Link from "next/link";
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
                <li>To provide your account, order tracking, wishlist and returns.</li>
                <li>To calculate partner commission on referred orders (partners never see customer contact details or addresses).</li>
                <li>To reply to your questions.</li>
              </ul>
            ),
          },
          {
            heading: "Virtual Try-On photos",
            body: (
              <>
                <p>
                  If you use the AI Virtual Try-On Studio, the photos you upload are used only to generate your styling
                  preview. They are resized in your browser, stored privately (never in a public folder) and can be seen
                  only by you and authorised SAVLINO staff who support your order.
                </p>
                <ul>
                  <li>We ask for your consent before every try-on and record the consent version you accepted.</li>
                  <li>You can delete your try-on photos and previews at any time from the preview page.</li>
                  <li>We never publish or share your photos without your permission.</li>
                </ul>
                <p>
                  See the <Link href="/try-on-terms">Virtual Try-On terms</Link> and{" "}
                  <Link href="/image-consent">image consent policy</Link>.
                </p>
              </>
            ),
          },
          {
            heading: "How we protect it",
            body: (
              <p>
                Data is stored with access controls so that customers see only their own records and partners only their
                own referral data. Access to administrative tools is limited to authorised staff.
              </p>
            ),
          },
          {
            heading: "Your choices",
            body: (
              <p>
                You can view and update your profile and saved addresses in your account, and ask us to delete your
                account and personal data at any time by contacting us.
              </p>
            ),
          },
        ]}
      />
    </PageShell>
  );
}
