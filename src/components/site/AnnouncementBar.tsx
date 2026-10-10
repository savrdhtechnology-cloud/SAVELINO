import Link from "next/link";

export function AnnouncementBar({ text, href }: { text: string; href: string }) {
  const inner = (
    <span className="inline-flex items-center gap-3">
      <span aria-hidden className="h-1 w-1 rotate-45 bg-noir" />
      {text}
      <span aria-hidden className="h-1 w-1 rotate-45 bg-noir" />
    </span>
  );
  return (
    <div
      data-studio="announcement"
      className="relative z-[60] bg-gradient-to-r from-gold-deep via-gold to-gold-deep px-4 py-2 text-center text-[0.62rem] font-medium uppercase tracking-[0.3em] text-noir"
    >
      {href ? (
        <Link href={href} className="hover:underline">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  );
}
