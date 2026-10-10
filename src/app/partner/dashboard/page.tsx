import { redirect } from "next/navigation";
import { BACKEND_PENDING, PortalNotice } from "@/components/portal/PortalNotice";
import { SectionGrid } from "@/components/portal/SectionPage";
import { ReferralLink } from "@/components/portal/ReferralLink";
import { partnerSections } from "@/lib/portals";
import { createSupabaseServerClient, getSessionContext } from "@/lib/supabase/server";
import { site } from "@/lib/site";
import { table } from "@/lib/supabase/loose";

type PartnerRow = { referral_code: string | null; status: string };

export default async function PartnerDashboard() {
  const session = await getSessionContext();
  if (session.configured && !session.user) redirect("/partner/login?next=/partner/dashboard");

  let partner: PartnerRow | null = null;
  if (session.configured && session.user) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { data } = await table(supabase, "partners")
        .select("referral_code,status")
        .eq("user_id", session.user.id)
        .maybeSingle();
      partner = data as PartnerRow | null;
    }
  }

  return (
    <div className="space-y-10">
      <header className="border-b border-gold/15 pb-8">
        <h1 className="font-display text-4xl text-ivory md:text-5xl">Partner dashboard</h1>
        <p className="mt-3 font-serif text-xl text-ivory/65">Your referral code, referred orders, commission and payouts.</p>
      </header>

      {!session.configured && <PortalNotice title="The partner portal is being prepared" body={BACKEND_PENDING} />}

      {session.configured && session.user && !partner && (
        <PortalNotice
          title="Application not found"
          body="We could not find a partner application for this account. Register as a partner to apply."
          cta={{ href: "/partner/register", label: "Apply to partner" }}
        />
      )}

      {partner && partner.status !== "approved" && (
        <PortalNotice
          title="Your application is under review"
          body="Our team reviews every partner application. Your referral code and link will appear here once approved."
        />
      )}

      {partner?.status === "approved" && partner.referral_code && (
        <ReferralLink code={partner.referral_code} link={`${site.url}/?ref=${encodeURIComponent(partner.referral_code)}`} />
      )}

      <SectionGrid basePath="/partner/dashboard" sections={partnerSections} />
    </div>
  );
}
