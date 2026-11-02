import Image from "next/image";
import type { Product, ProductImage } from "@/lib/data/types";
import { site } from "@/lib/site";

/**
 * Builds the SAVLINO product creative from plain product photos: logo, a large hero shot,
 * framed side angles, a strip of detail shots, feature icons, a script title and a cream bar
 * with colours, sizes and Shop Now. Fixed brand colours, so it looks the same in every site theme.
 */

const C = { gold: "#D8B25A", ivory: "#FFF6E8", maroon: "#6B0F1A", cream: "#F7EFE3", ink: "#2A1D17" };
const BG = "radial-gradient(ellipse at 22% 30%, #b48d72 0%, #8a644f 38%, #4a3126 78%, #36231b 100%)";

const ICONS: { match: RegExp; d: string }[] = [
  { match: /fabric|silk|cotton|material|premium/i, d: "M6 3h12l3 6-9 12L3 9l3-6Zm-3 6h18M9 3l3 18M15 3l-3 18" },
  { match: /stitch|craft|hand|finish/i, d: "M4 20 18 6m-3-3 6 6-3 1-4-4 1-3ZM4 20l3-1-2-2-1 3Z" },
  { match: /fit|size|tailor/i, d: "M9 3h6l1 3-2 2v3l3 2v8H7v-8l3-2V8L8 6l1-3Z" },
  { match: /smooth|soft|texture|comfort|cotton/i, d: "M12 21c-1-3-1-6 0-9m0 0c-3-1-5-3-5-6 3 0 5 2 5 6Zm0 0c3-1 5-3 5-6-3 0-5 2-5 6Zm0 0c-2 1-5 1-7-1 2-2 5-1 7 1Zm0 0c2 1 5 1 7-1-2-2-5-1-7 1Z" },
  { match: /mirror|work|embroider|pearl|bead|zari|tassel/i, d: "M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5L12 3Z" },
];
const iconFor = (f: string) => ICONS.find((x) => x.match.test(f))?.d ?? ICONS[4].d;

const singular = (w: string) => (/ies$/i.test(w) ? `${w.slice(0, -3)}y` : /(ss|us)$/i.test(w) ? w : /s$/i.test(w) ? w.slice(0, -1) : w);

function Photo({ img, alt, sizes, priority, className, framed }: { img: ProductImage; alt: string; sizes: string; priority?: boolean; className?: string; framed?: boolean }) {
  return (
    <div
      className={`relative overflow-hidden ${framed ? "rounded-2xl" : "rounded-xl"} ${className ?? ""}`}
      style={framed ? { boxShadow: `0 0 0 2px ${C.cream}, 0 0 0 3.5px ${C.gold}, 0 18px 40px -18px rgba(0,0,0,.6)` } : undefined}
    >
      <Image quality={90} src={img.url} alt={alt} fill priority={priority} sizes={sizes} unoptimized={img.url.startsWith("blob:")} className="object-cover" />
    </div>
  );
}

export function ProductCreative({ product, categoryTitle }: { product: Product; categoryTitle: string }) {
  const [hero, ...rest] = product.images;
  if (!hero) return null;
  const sides = rest.slice(0, 2);
  const details = rest.slice(2, 6);
  const words = categoryTitle.trim().split(/\s+/);
  const last = singular(words[words.length - 1] ?? "");
  const first = words.slice(0, -1).join(" ") || "SAVLINO";
  const kicker = `${[...words.slice(0, -1), last].join(" ")} collection`;
  const features = product.features.slice(0, 4);

  const title = (
    <p className="leading-[0.9]" style={{ fontFamily: "var(--font-display)" }}>
      <span className="block italic" style={{ color: C.ivory }}>
        {first}
      </span>
      <span
        className="block italic"
        style={{ background: `linear-gradient(180deg, #f3d98f, ${C.gold} 55%, #a9802f)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}
      >
        {last}
      </span>
    </p>
  );

  const bar = (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-full px-5 py-3 shadow-[0_18px_40px_-20px_rgba(0,0,0,.7)]" style={{ background: C.cream, color: C.ink }}>
      {product.colors.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-[0.7rem] font-semibold leading-tight">
            Available
            <br />
            Colors
          </span>
          <span className="flex gap-1.5">
            {product.colors.slice(0, 6).map((c) => (
              <span key={c.name} title={c.name} className="h-6 w-6 rounded-full ring-1 ring-black/10" style={{ background: c.hex }} />
            ))}
          </span>
        </div>
      )}
      {product.colors.length > 0 && product.sizes.length > 0 && <span className="hidden h-8 w-px bg-black/15 sm:block" />}
      {product.sizes.length > 0 && (
        <div className="flex items-center gap-2.5">
          <span className="text-[0.7rem] font-semibold">Sizes</span>
          <span className="flex flex-wrap gap-1">
            {product.sizes.slice(0, 7).map((s) => (
              <span key={s} className="flex h-7 min-w-7 items-center justify-center rounded-full border px-1.5 text-[0.65rem] font-semibold" style={{ borderColor: "rgba(42,29,23,.35)" }}>
                {s}
              </span>
            ))}
          </span>
        </div>
      )}
      <a href="#buy" className="ml-auto flex items-center gap-2 rounded-full px-5 py-2.5 text-[0.72rem] font-semibold" style={{ background: C.maroon, color: C.ivory }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-4 w-4" aria-hidden>
          <path d="M6 7h12l1 14H5L6 7Zm3 0V5a3 3 0 0 1 6 0v2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Shop Now
      </a>
    </div>
  );

  const featureList = (vertical: boolean) => (
    <ul className={vertical ? "flex flex-col items-center gap-6" : "grid grid-cols-4 gap-2"}>
      {features.map((f) => (
        <li key={f} className="flex flex-col items-center gap-1.5 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full xl:h-14 xl:w-14" style={{ border: `1.5px solid ${C.gold}`, color: C.gold }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.4} className="h-5 w-5 xl:h-6 xl:w-6" aria-hidden>
              <path d={iconFor(f)} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="text-[0.65rem] leading-tight xl:text-[0.72rem]" style={{ color: C.ivory }}>
            {f}
          </span>
        </li>
      ))}
    </ul>
  );

  const logo = (
    <div className="flex flex-col items-start">
      <Image quality={90} src={site.logo.lockup} alt={site.name} width={220} height={110} className="h-auto w-[150px] xl:w-[190px]" />
      <span className="mt-1 text-[0.55rem] font-medium uppercase tracking-[0.28em] xl:text-[0.62rem]" style={{ color: C.ivory }}>
        {kicker}
      </span>
    </div>
  );

  return (
    <section aria-label={`${product.name} photos`} className="overflow-hidden rounded-3xl" style={{ background: BG, boxShadow: `inset 0 0 0 1px ${C.gold}55` }}>
      {/* Phones & tablets */}
      <div className="space-y-4 p-4 lg:hidden">
        {logo}
        <Photo img={hero} alt={product.name} sizes="100vw" priority className="aspect-[4/5]" />
        {rest.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {rest.slice(0, 6).map((im, i) => (
              <Photo key={im.id} img={im} alt={`${product.name} — view ${i + 2}`} sizes="50vw" framed className="aspect-square" />
            ))}
          </div>
        )}
        {features.length > 0 && <div className="pt-2">{featureList(false)}</div>}
        <div className="text-5xl">{title}</div>
        {bar}
      </div>

      {/* Desktop: the creative layout */}
      <div className="relative hidden aspect-[3/2] gap-4 p-5 lg:grid xl:p-6" style={{ gridTemplateColumns: "12% 48% 1fr", gridTemplateRows: "1fr auto" }}>
        <div className="row-span-2 flex flex-col justify-between pb-24 pt-1">
          <div className="relative z-10 w-[260%]">{logo}</div>
          {features.length > 0 && featureList(true)}
          <span />
        </div>

        <div className="relative row-span-2">
          <Photo img={hero} alt={product.name} sizes="48vw" priority className="h-full" />
          <div
            className="absolute -left-[26%] bottom-0 w-[85%] rounded-tr-[48px] px-6 pb-5 pt-8 text-[clamp(2.4rem,4.6vw,4.6rem)]"
            style={{ background: `linear-gradient(135deg, ${C.maroon}f2, #3e0910e6)` }}
          >
            {title}
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-4">
          {sides.length > 0 ? (
            sides.map((im, i) => <Photo key={im.id} img={im} alt={`${product.name} — view ${i + 2}`} sizes="38vw" framed className="min-h-0 flex-1" />)
          ) : (
            <div className="flex-1" />
          )}
          {details.length > 0 && (
            <div className="grid h-[24%] shrink-0 gap-3" style={{ gridTemplateColumns: `repeat(${details.length}, minmax(0, 1fr))` }}>
              {details.map((im, i) => (
                <Photo key={im.id} img={im} alt={`${product.name} — detail ${i + 1}`} sizes="10vw" framed className="h-full" />
              ))}
            </div>
          )}
        </div>
        <div>{bar}</div>
      </div>
    </section>
  );
}
