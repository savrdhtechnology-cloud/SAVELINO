import { redirect } from "next/navigation";
import { BACKEND_PENDING, PortalNotice } from "@/components/portal/PortalNotice";
import { SectionGrid } from "@/components/portal/SectionPage";
import { customerSections } from "@/lib/portals";
import { getSessionContext } from "@/lib/supabase/server";

export default async function AccountOverview() {
  const session = await getSessionContext();
  if (session.configured && !session.user) redirect("/login?next=/account");

  return (
    <div className="space-y-10">
      <header className="border-b border-gold/15 pb-8">
        <h1 className="font-display text-4xl text-ivory md:text-5xl">
          {session.configured && session.user ? "Welcome back" : "Your account"}
        </h1>
        {session.configured && session.user?.email && (
          <p className="mt-3 text-sm text-ivory/60">Signed in as {session.user.email}</p>
        )}
      </header>
      {!session.configured && (
        <PortalNotice title="Customer accounts are on their way" body={BACKEND_PENDING} cta={{ href: "/", label: "Back to the house" }} />
      )}
      <SectionGrid basePath="/account" sections={customerSections} />
    </div>
  );
}
