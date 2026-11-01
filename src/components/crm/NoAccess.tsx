"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SiteSettings } from "@/lib/settings";
import { crmStyle } from "./theme";

export function NoAccess({ crm, reason, email }: { crm: SiteSettings["crm"]; reason: "setup" | "role"; email?: string | null }) {
  const router = useRouter();
  return (
    <div className="crm flex items-center justify-center px-5" style={crmStyle(crm)}>
      <div aria-hidden className="crm-silk" />
      <div className="crm-panel relative max-w-lg p-8 text-center">
        <p className="crm-heading crm-gold-text text-2xl tracking-[0.1em]">SAVLINO</p>
        {reason === "setup" ? (
          <>
            <h1 className="crm-serif mt-4 text-3xl">Database not connected</h1>
            <p className="mt-3 text-sm crm-muted">Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then redeploy.</p>
          </>
        ) : (
          <>
            <h1 className="crm-serif mt-4 text-3xl">No CRM access yet</h1>
            <p className="mt-3 text-sm crm-muted">
              {email} is signed in but isn’t a team member. An admin can grant access in Settings → Team (or run the admin SQL once).
            </p>
            <button
              type="button"
              className="crm-btn mt-6"
              onClick={async () => {
                await createSupabaseBrowserClient()?.auth.signOut();
                router.replace("/admin/login");
              }}
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
