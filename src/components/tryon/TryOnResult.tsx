"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TRYON_DISCLAIMER, TRYON_SIZES, TRYON_VIEWS, type TryOnView } from "@/lib/tryon/config";

export type TryOnBundle = {
  session: {
    id: string;
    product_id: string;
    product_name: string | null;
    category: string;
    selected_size: string | null;
    selected_color: string | null;
    mode: "quick" | "premium";
    status: string;
    created_at: string;
  };
  inputs: { type: string; image_url: string; width: number | null; height: number | null }[];
  outputs: { view: TryOnView; image_url: string | null; meta: { sample?: boolean; estimated?: boolean; label?: string } | null }[];
  saved: boolean;
  conversion: { added_to_cart: boolean } | null;
};

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEW_LABEL: Record<TryOnView, string> = { front: "Front", left: "Left", right: "Right", back: "Back" };

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

export function TryOnResult({ bundle, colors, signedIn }: { bundle: TryOnBundle; colors: string[]; signedIn: boolean }) {
  const router = useRouter();
  const { session } = bundle;
  const [view, setView] = useState<TryOnView>("front");
  const [compare, setCompare] = useState(false);
  const [split, setSplit] = useState(50);
  const [saved, setSaved] = useState(bundle.saved);
  const [inBag, setInBag] = useState(!!bundle.conversion?.added_to_cart);
  const [note, setNote] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);

  const api = `/api/virtual-try-on/${session.id}`;
  const log = (type: string, data: Record<string, unknown> = {}) =>
    fetch(`${api}/event`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, data }) }).catch(() => undefined);

  useEffect(() => {
    void log("view_result");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const input = (type: string) => bundle.inputs.find((i) => i.type === type)?.image_url;
  const output = bundle.outputs.find((o) => o.view === view);
  const original = input(view) ?? (view === "front" ? input("selfie") : undefined);
  const isSample = bundle.outputs.some((o) => o.meta?.sample);
  const estimated = !!output?.meta?.estimated;
  const flash = (m: string) => {
    setNote(m);
    setTimeout(() => setNote(null), 3200);
  };

  const call = async (path: string, method = "POST") => {
    const res = await fetch(path, { method });
    const json = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!res.ok) throw new Error(json.error ?? "Something went wrong.");
    return json;
  };

  const save = async () => {
    if (!signedIn) return router.push(`/login?next=/virtual-try-on/${session.id}`);
    try {
      await call(`${api}/save`);
      setSaved(true);
      flash("Saved to My Try-On Previews.");
    } catch (e) {
      flash((e as Error).message);
    }
  };

  const addToBag = async () => {
    try {
      const r = await call(`${api}/add-to-cart`);
      setInBag(true);
      flash(r.message ?? "Added.");
    } catch (e) {
      flash((e as Error).message);
    }
  };

  const download = async () => {
    void log("download", { view });
    const front = input("front") ?? input("selfie");
    const look = output?.image_url;
    if (!front || !look) return;
    const [a, b] = await Promise.all([loadImg(front), loadImg(look)]);
    const H = 1200;
    const wa = Math.round((a.width / a.height) * H);
    const wb = Math.round((b.width / b.height) * H);
    const c = document.createElement("canvas");
    c.width = wa + wb + 60;
    c.height = H + 140;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#0b0b0b";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(a, 20, 20, wa, H);
    ctx.drawImage(b, wa + 40, 20, wb, H);
    ctx.fillStyle = "#d4af37";
    ctx.font = "600 30px serif";
    ctx.fillText(`SAVLINO · ${session.product_name ?? ""}${isSample ? " · Sample preview" : ""}`, 20, H + 70);
    ctx.fillStyle = "#f8f5eb";
    ctx.font = "22px sans-serif";
    ctx.fillText(TRYON_DISCLAIMER, 20, H + 112);
    const link = document.createElement("a");
    link.href = c.toDataURL("image/jpeg", 0.9);
    link.download = `savlino-try-on-${session.id.slice(0, 8)}.jpg`;
    link.click();
  };

  const share = async () => {
    void log("share");
    // Only the collection link is shared — never the customer's photo.
    const url = `${window.location.origin}/collections/${session.product_id}`;
    const text = `I’m styling the SAVLINO ${session.product_name} — take a look.`;
    try {
      if (navigator.share) await navigator.share({ title: "SAVLINO", text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        flash("Link copied — your photos are never included.");
      }
    } catch {
      /* dismissed */
    }
  };

  const erase = async () => {
    setBusy(true);
    try {
      await call(api, "DELETE");
      router.replace("/virtual-try-on?deleted=1");
    } catch (e) {
      setBusy(false);
      setConfirmDelete(false);
      flash((e as Error).message);
    }
  };

  const retry = (key: "color" | "size", value: string) => {
    void log(key === "color" ? "try_other_color" : "try_other_size", { [key]: value });
    const p = new URLSearchParams({ product: session.product_id, color: session.selected_color ?? "", size: session.selected_size ?? "" });
    p.set(key, value);
    router.push(`/virtual-try-on?${p.toString()}`);
  };

  return (
    <div className="mx-auto grid max-w-[1320px] gap-10 px-5 pb-24 md:px-10 lg:grid-cols-[1.25fr_0.75fr]">
      {/* Gallery */}
      <section aria-label="Preview gallery">
        <div role="tablist" aria-label="View" className="mb-4 inline-flex border border-gold/20 p-1">
          {TRYON_VIEWS.map((v) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className="relative px-4 py-2 text-[0.6rem] uppercase tracking-[0.25em] sm:px-6">
              {view === v && <motion.span layoutId="tryon-view" className="absolute inset-0 bg-gold" transition={{ duration: 0.45, ease: EASE }} />}
              <span className={`relative ${view === v ? "text-noir" : "text-ivory/70"}`}>{VIEW_LABEL[v]}</span>
            </button>
          ))}
        </div>

        <div className="relative aspect-[4/5] overflow-hidden border border-gold/20 bg-noir-soft">
          <AnimatePresence mode="wait">
            <motion.div key={`${view}-${compare}`} initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.55, ease: EASE }} className="absolute inset-0">
              {output?.image_url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={output.image_url} alt={`${session.product_name} — ${VIEW_LABEL[view]} preview`} className="absolute inset-0 h-full w-full object-cover" />
                  {view === "front" && original && !compare && (
                    <figure className="absolute bottom-4 left-4 w-[30%] border border-gold/60 bg-noir shadow-2xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={original} alt="Your photo" className="aspect-[3/4] w-full object-cover" />
                      <figcaption className="px-2 py-1.5 text-[0.5rem] uppercase tracking-[0.22em] text-gold">You</figcaption>
                    </figure>
                  )}
                  {compare && original && (
                    <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={original} alt="Your original photo" className="h-full w-full object-cover" />
                      <span className="absolute left-3 top-14 bg-noir/80 px-2 py-1 text-[0.5rem] uppercase tracking-[0.22em] text-ivory">Original</span>
                    </div>
                  )}
                  {compare && original && <span aria-hidden className="absolute inset-y-0 w-px bg-gold" style={{ left: `${split}%` }} />}
                </>
              ) : (
                <p className="grid h-full place-items-center p-8 text-center text-sm text-ivory/60">This view isn’t available.</p>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="pointer-events-none absolute inset-x-3 top-3 flex flex-wrap gap-2">
            {isSample && <span className="bg-burgundy/90 px-2.5 py-1 text-[0.5rem] uppercase tracking-[0.2em] text-[#f8f5eb]">Sample preview — AI provider not connected</span>}
            {estimated && <span className="bg-noir/85 px-2.5 py-1 text-[0.5rem] uppercase tracking-[0.2em] text-gold">AI-estimated view</span>}
          </div>
        </div>

        {compare && original && (
          <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(Number(e.target.value))} aria-label="Compare with original" className="mt-3 w-full accent-[#d4af37]" />
        )}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={!original}
            onClick={() => {
              setCompare((c) => !c);
              if (!compare) void log("compare_original", { view });
            }}
            className="text-[0.6rem] uppercase tracking-[0.25em] text-gold disabled:text-ivory/30"
          >
            {compare ? "Hide comparison" : "Compare with original"}
          </button>
          {!original && view !== "front" && <span className="text-xs text-ivory/40">Add a {view} photo in Premium mode to compare this view.</span>}
        </div>

        <p className="mt-6 border-l-2 border-gold pl-4 text-sm leading-relaxed text-ivory/75">{TRYON_DISCLAIMER}</p>
      </section>

      {/* Details & actions */}
      <aside className="h-fit space-y-6">
        <div className="border border-gold/20 bg-noir-soft p-6">
          <p className="eyebrow">{session.mode === "premium" ? "Premium try-on" : "Quick try-on"}</p>
          <h1 className="mt-3 font-display text-4xl text-ivory">{session.product_name}</h1>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-[0.55rem] uppercase tracking-[0.22em] text-ivory/50">Colour</dt><dd className="text-ivory">{session.selected_color ?? "—"}</dd></div>
            <div><dt className="text-[0.55rem] uppercase tracking-[0.22em] text-ivory/50">Size</dt><dd className="text-ivory">{session.selected_size ?? "—"}</dd></div>
          </dl>
          <div className="mt-6 grid gap-3">
            <button onClick={addToBag} disabled={inBag} className="bg-gold py-3.5 text-[0.65rem] font-medium uppercase tracking-[0.3em] text-noir disabled:opacity-60">
              {inBag ? "Added to bag list ✓" : "Add to bag"}
            </button>
            <button onClick={save} disabled={saved} className="border border-gold/60 py-3.5 text-[0.65rem] uppercase tracking-[0.3em] text-gold disabled:opacity-60">
              {saved ? "Saved to account ✓" : signedIn ? "Save look" : "Sign in to save look"}
            </button>
            <p className="text-[0.7rem] text-ivory/45">Checkout opens soon — your bag list records interest only.</p>
          </div>
        </div>

        <div className="border border-gold/20 p-6">
          <p className="text-[0.6rem] uppercase tracking-[0.28em] text-ivory/60">Try another colour</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {colors.filter((c) => c !== session.selected_color).map((c) => (
              <button key={c} onClick={() => retry("color", c)} className="border border-ivory/15 px-3 py-1.5 text-xs text-ivory/75 hover:border-gold hover:text-gold">{c}</button>
            ))}
          </div>
          <p className="mt-5 text-[0.6rem] uppercase tracking-[0.28em] text-ivory/60">Try another size</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TRYON_SIZES.filter((s) => s !== session.selected_size).map((s) => (
              <button key={s} onClick={() => retry("size", s)} className="min-w-10 border border-ivory/15 px-2.5 py-1.5 text-xs text-ivory/75 hover:border-gold hover:text-gold">{s}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={download} className="border border-ivory/15 py-3 text-[0.6rem] uppercase tracking-[0.25em] text-ivory/80 hover:border-gold hover:text-gold">Download</button>
          <button onClick={share} className="border border-ivory/15 py-3 text-[0.6rem] uppercase tracking-[0.25em] text-ivory/80 hover:border-gold hover:text-gold">Share</button>
          <Link
            href={`/custom-stitching?from=try-on&product=${session.product_id}`}
            onClick={() => void log("custom_stitching_request")}
            className="col-span-2 border border-ivory/15 py-3 text-center text-[0.6rem] uppercase tracking-[0.25em] text-ivory/80 hover:border-gold hover:text-gold"
          >
            Request custom stitching
          </Link>
        </div>

        <div className="border-t border-gold/15 pt-5">
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="text-[0.6rem] uppercase tracking-[0.25em] text-ivory/50 hover:text-red-300">Delete my images</button>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-sm text-ivory/75">
              Permanently erase your photos and previews?
              <button onClick={erase} disabled={busy} className="bg-burgundy px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.22em] text-[#f8f5eb]">{busy ? "Erasing…" : "Yes, delete"}</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[0.6rem] uppercase tracking-[0.22em] text-ivory/60">Cancel</button>
            </div>
          )}
        </div>
      </aside>

      <AnimatePresence>
        {note && (
          <motion.p role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} style={{ x: "-50%" }} className="fixed bottom-6 left-1/2 z-50 border border-gold/40 bg-noir px-5 py-3 text-sm text-ivory shadow-2xl">
            {note}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
