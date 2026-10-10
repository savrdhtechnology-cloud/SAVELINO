import Link from "next/link";
import type { ReactNode } from "react";
import { PageShell } from "@/components/layout/PageShell";

type PortalShellProps = {
  title: string;
  eyebrow: string;
  basePath: string;
  overviewLabel: string;
  links: { slug: string; title: string }[];
  children: ReactNode;
};

export function PortalShell({ title, eyebrow, basePath, overviewLabel, links, children }: PortalShellProps) {
  return (
    <PageShell>
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-12 md:px-10 md:py-16 lg:grid-cols-[260px_1fr] lg:gap-16">
        <aside>
          <p className="eyebrow">{eyebrow}</p>
          <p className="mt-3 font-display text-3xl italic text-ivory">{title}</p>
          <nav aria-label={title} className="mt-8">
            <ul className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col lg:gap-0">
              <li>
                <PortalLink href={basePath}>{overviewLabel}</PortalLink>
              </li>
              {links.map((l) => (
                <li key={l.slug}>
                  <PortalLink href={`${basePath}/${l.slug}`}>{l.title}</PortalLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </PageShell>
  );
}

function PortalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="block whitespace-nowrap border border-gold/15 px-4 py-2.5 text-[0.65rem] uppercase tracking-[0.25em] text-ivory/70 transition-colors duration-500 hover:border-gold/60 hover:text-gold lg:border-x-0 lg:border-t-0 lg:px-0 lg:py-3.5"
    >
      {children}
    </Link>
  );
}
