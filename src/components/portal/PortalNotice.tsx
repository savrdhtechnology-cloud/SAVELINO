import Link from "next/link";

export function PortalNotice({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <div className="border border-gold/25 bg-noir-soft p-8 md:p-12">
      <p className="eyebrow">Preparing your portal</p>
      <h2 className="mt-4 font-display text-3xl text-ivory md:text-4xl">{title}</h2>
      <p className="mt-4 max-w-2xl font-serif text-xl leading-relaxed text-ivory/70">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-8 inline-block bg-gold px-7 py-3.5 text-[0.7rem] uppercase tracking-[0.3em] text-noir transition-colors hover:bg-gold-light"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

export const BACKEND_PENDING =
  "Accounts are not yet connected to the SAVLINO backend. Once they are, this page will show your own records — nothing here is simulated.";
