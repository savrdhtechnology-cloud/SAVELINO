import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { DRAFT_NOTE, Prose } from "@/components/layout/Prose";

export const metadata: Metadata = {
  title: "Shipping & returns",
  description: "How SAVLINO ships orders across India and handles returns and exchanges.",
  alternates: { canonical: "/shipping-returns" },
};

export default function ShippingReturnsPage() {
  return (
    <PageShell>
      <PageIntro eyebrow="Help" title="Shipping & returns" />
      <Prose
        note={DRAFT_NOTE}
        sections={[
          {
            heading: "Shipping",
            body: (
              <>
                <p>Every order is quality-checked and packed by hand before dispatch.</p>
                <ul>
                  <li>Ready-made pieces are dispatched once payment is verified.</li>
                  <li>Custom-stitched pieces are dispatched after they are made to your measurements.</li>
                  <li>You will receive a tracking number, and live status in your account under Order tracking.</li>
                </ul>
                <p>Delivery timelines and shipping charges are shown at checkout.</p>
              </>
            ),
          },
          {
            heading: "Returns & exchanges",
            body: (
              <>
                <p>
                  Unworn ready-made pieces with original tags and packaging can be returned or exchanged within the
                  window shown on your order. Requests are raised from your account under Returns &amp; exchanges.
                </p>
                <ul>
                  <li>Custom-stitched pieces are made for you and are not eligible for return; fit alterations may be offered.</li>
                  <li>For hygiene reasons, lingerie and shapewear can be exchanged only if unopened.</li>
                  <li>Refunds are processed to the original payment method once the return is received and checked.</li>
                </ul>
              </>
            ),
          },
          {
            heading: "Need help?",
            body: (
              <p>
                <Link href="/contact" className="text-gold underline-offset-4 hover:underline">
                  Contact us
                </Link>{" "}
                with your order number and we will help.
              </p>
            ),
          },
        ]}
      />
    </PageShell>
  );
}
