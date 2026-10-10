import "server-only";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/supabase/server";
import type { PortalSection } from "@/lib/portals";
import { BACKEND_PENDING, PortalNotice } from "./PortalNotice";
import { SectionData } from "./SectionData";

/** Shared renderer for a single portal section (customer, partner or admin). */
export async function SectionPage({ section, loginPath }: { section: PortalSection; loginPath: string }) {
  const session = await getSessionContext();
  if (session.configured && !session.user) redirect(loginPath);
  return (
    <div>
      <header className="border-b border-gold/15 pb-8">
        <h1 className="font-display text-4xl text-ivory md:text-5xl">{section.title}</h1>
        <p className="mt-3 font-serif text-xl text-ivory/65">{section.description}</p>
      </header>
      <div className="mt-10">
        {!session.configured ? (
          <PortalNotice title={section.title} body={BACKEND_PENDING} />
        ) : session.user ? (
          <SectionData section={section} userId={session.user.id} />
        ) : null}
      </div>
    </div>
  );
}

export function SectionGrid({ basePath, sections }: { basePath: string; sections: PortalSection[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sections.map((s) => (
        <li key={s.slug}>
          <Link
            href={`${basePath}/${s.slug}`}
            className="group block h-full border border-gold/15 bg-noir-soft p-7 transition-all duration-500 hover:-translate-y-1 hover:border-gold/50"
          >
            <p className="font-display text-2xl text-ivory transition-colors group-hover:text-gold">{s.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-ivory/60">{s.description}</p>
            <span className="mt-6 inline-block text-[0.62rem] uppercase tracking-[0.3em] text-gold">Open →</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
