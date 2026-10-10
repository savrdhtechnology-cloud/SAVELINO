import type { Metadata } from "next";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/Button";
import { TryOnResult, type TryOnBundle } from "@/components/tryon/TryOnResult";
import { getSessionContext } from "@/lib/supabase/server";
import { TRYON_COLORS } from "@/lib/tryon/config";
import { isUuid, readGuestId, tryonRpc } from "@/lib/tryon/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your try-on preview",
  robots: { index: false, follow: false },
};

function Unavailable({ title, body }: { title: string; body: string }) {
  return (
    <PageShell>
      <section className="mx-auto max-w-xl px-5 py-28 text-center">
        <p className="eyebrow">Virtual Try-On</p>
        <h1 className="mt-4 font-display text-4xl text-ivory">{title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-ivory/60">{body}</p>
        <div className="mt-8 flex justify-center">
          <Button href="/virtual-try-on">Start a new try-on</Button>
        </div>
      </section>
    </PageShell>
  );
}

export default async function TryOnResultPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params;
  if (!isUuid(sessionId)) return <Unavailable title="Preview not found" body="This link doesn’t look right." />;

  const { data, error } = await tryonRpc("tryon_get", { p_session: sessionId, p_guest: await readGuestId() });
  if (error?.message === "backend_unavailable") {
    return <Unavailable title="Try-On is being connected" body="Virtual Try-On will be available here shortly." />;
  }
  const bundle = data as TryOnBundle | null;
  if (!bundle) {
    return (
      <Unavailable
        title="Preview not available"
        body="This preview is private to the person who created it, or it has been deleted. Sign in, or open it on the device you used."
      />
    );
  }
  const ctx = await getSessionContext();
  const signedIn = ctx.configured && !!ctx.user;
  const colors = TRYON_COLORS[bundle.session.category as keyof typeof TRYON_COLORS] ?? [];

  return (
    <PageShell>
      <div className="pt-10 md:pt-14">
        <TryOnResult bundle={bundle} colors={colors} signedIn={signedIn} />
      </div>
    </PageShell>
  );
}
