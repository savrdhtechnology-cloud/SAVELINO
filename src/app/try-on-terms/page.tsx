import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { DRAFT_NOTE, Prose } from "@/components/layout/Prose";
import { TRYON_DISCLAIMER } from "@/lib/tryon/config";

export const metadata: Metadata = {
  title: "Virtual Try-On terms",
  description: "Terms for using the SAVLINO AI Virtual Try-On Studio.",
  alternates: { canonical: "/try-on-terms" },
};

export default function TryOnTermsPage() {
  return (
    <PageShell>
      <PageIntro eyebrow="Legal" title="Virtual Try-On terms" />
      <Prose
        note={DRAFT_NOTE}
        sections={[
          {
            heading: "What the preview is",
            body: (
              <>
                <p>{TRYON_DISCLAIMER}</p>
                <p>
                  The Virtual Try-On Studio creates an illustrative styling preview. It is not a measurement, a fitting or
                  a guarantee of how a garment will fit, drape or look on you. It makes no medical or body-accuracy claims.
                  Side and back views may be estimated by AI when you haven’t provided a photo of that angle.
                </p>
                <p>
                  For an exact fit, use our <Link href="/size-guide">size guide</Link> or{" "}
                  <Link href="/custom-stitching">custom stitching</Link>.
                </p>
              </>
            ),
          },
          {
            heading: "Your photos",
            body: (
              <ul>
                <li>Only upload photos of yourself, or of someone who has given you permission.</li>
                <li>Do not upload photos of minors, nudity or anything unlawful.</li>
                <li>Your photos are used only to generate your preview and are handled as described in our <Link href="/image-consent">image consent policy</Link>.</li>
              </ul>
            ),
          },
          {
            heading: "Availability",
            body: (
              <p>
                Virtual Try-On is available for selected collections — designer and ready-made blouses, salwar suits,
                sarees and loungewear. Previews may be labelled as samples while our AI provider is being connected.
              </p>
            ),
          },
          {
            heading: "Purchases",
            body: (
              <p>
                Adding a piece to your bag from a preview records your interest. A purchase happens only when you place
                and pay for an order; our usual <Link href="/shipping-returns">shipping and returns</Link> terms apply.
              </p>
            ),
          },
        ]}
      />
    </PageShell>
  );
}
