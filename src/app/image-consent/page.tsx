import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro, PageShell } from "@/components/layout/PageShell";
import { DRAFT_NOTE, Prose } from "@/components/layout/Prose";
import { TRYON_CONSENT_POINTS, TRYON_CONSENT_VERSION } from "@/lib/tryon/config";

export const metadata: Metadata = {
  title: "Image consent policy",
  description: "How SAVLINO handles the photos you upload to the Virtual Try-On Studio.",
  alternates: { canonical: "/image-consent" },
};

export default function ImageConsentPage() {
  return (
    <PageShell>
      <PageIntro eyebrow="Legal" title="Image consent policy" />
      <Prose
        note={DRAFT_NOTE}
        sections={[
          {
            heading: "What you agree to",
            body: (
              <>
                <ul>
                  {TRYON_CONSENT_POINTS.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                <p className="text-xs text-ivory/50">Consent version {TRYON_CONSENT_VERSION}. We record the version you accepted with each try-on.</p>
              </>
            ),
          },
          {
            heading: "How photos are stored",
            body: (
              <ul>
                <li>Photos are checked for file type and size, then resized in your browser before upload.</li>
                <li>They are stored privately — never in a public folder or public link.</li>
                <li>Only you (through your account, or the private browser token for guest try-ons) and authorised SAVLINO staff can open them.</li>
                <li>Shared links to SAVLINO pieces never include your photo.</li>
              </ul>
            ),
          },
          {
            heading: "Deleting your images",
            body: (
              <p>
                Choose “Delete my images” on any preview to erase your photos and generated views straight away. You can
                also find your previews under <Link href="/account/try-ons">My Try-On Previews</Link>, or{" "}
                <Link href="/contact">contact us</Link> to request deletion.
              </p>
            ),
          },
        ]}
      />
    </PageShell>
  );
}
