import { BACKEND_PENDING, PortalNotice } from "@/components/portal/PortalNotice";
import { SectionGrid } from "@/components/portal/SectionPage";
import { adminModules } from "@/lib/portals";
import { getSessionContext } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const session = await getSessionContext();
  return (
    <div className="space-y-10">
      <header className="border-b border-gold/15 pb-8">
        <h1 className="font-display text-4xl text-ivory md:text-5xl">CRM dashboard</h1>
        <p className="mt-3 font-serif text-xl text-ivory/65">
          Products, inventory, orders, customers, partners, commission, payments, shipping, analytics and content.
        </p>
      </header>
      {!session.configured && <PortalNotice title="Admin CRM architecture" body={BACKEND_PENDING} />}
      <SectionGrid basePath="/admin" sections={adminModules} />
    </div>
  );
}
