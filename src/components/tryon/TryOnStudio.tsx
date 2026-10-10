"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { PHOTO_GUIDANCE, TRYON_CONSENT_POINTS, TRYON_DISCLAIMER, TRYON_SIZES } from "@/lib/tryon/config";
import { CameraCapture } from "./CameraCapture";
import { PhotoError, preparePhotoFile, type PreparedPhoto } from "./image-tools";
import { ProcessingScreen } from "./ProcessingScreen";

export type TryOnProduct = { slug: string; title: string; kicker: string; image: string; colors: string[] };

type Mode = "quick" | "premium";
type Slot = "front" | "left" | "right" | "back";

const SLOT_LABEL: Record<Slot, string> = { front: "Front", left: "Left side", right: "Right side", back: "Back" };
const EASE = [0.22, 1, 0.36, 1] as const;
const STEPS = ["Piece", "Style", "Consent", "Photos"];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(typeof json.error === "string" ? json.error : "Something went wrong. Please try again.");
  return json;
}

export function TryOnStudio({ products, initial }: { products: TryOnProduct[]; initial?: { product?: string; color?: string; size?: string } }) {
  const router = useRouter();
  const start = products.find((p) => p.slug === initial?.product);
  const [step, setStep] = useState(start ? 1 : 0);
  const [product, setProduct] = useState<TryOnProduct | undefined>(start);
  const [size, setSize] = useState(initial?.size && (TRYON_SIZES as readonly string[]).includes(initial.size) ? initial.size : "36");
  const [color, setColor] = useState(initial?.color && start?.colors.includes(initial.color) ? initial.color : start?.colors[0] ?? "");
  const [mode, setMode] = useState<Mode>("quick");
  const [consent, setConsent] = useState(false);
  const [photos, setPhotos] = useState<Partial<Record<Slot, PreparedPhoto>>>({});
  const [camera, setCamera] = useState<Slot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(-1);
  const fileRefs = useRef<Partial<Record<Slot, HTMLInputElement | null>>>({});

  const slots: Slot[] = mode === "premium" ? ["front", "left", "right", "back"] : ["front"];

  const choose = (p: TryOnProduct) => {
    setProduct(p);
    setColor(p.colors[0]);
    setStep(1);
  };

  const onFile = async (slot: Slot, file?: File) => {
    if (!file) return;
    setError(null);
    try {
      const prepared = await preparePhotoFile(file);
      setPhotos((p) => ({ ...p, [slot]: prepared }));
    } catch (e) {
      setError(e instanceof PhotoError ? e.message : "We couldn’t read that photo. Please try another one.");
    }
  };

  const onCapture = useCallback(
    (p: PreparedPhoto) => {
      if (camera) setPhotos((prev) => ({ ...prev, [camera]: p }));
      setCamera(null);
    },
    [camera],
  );

  const generate = async () => {
    if (!product || !photos.front || !consent) return;
    setBusy(true);
    setError(null);
    setStage(0);
    try {
      const { sessionId } = (await post("/api/virtual-try-on/session", { productId: product.slug, size, color, mode, consent })) as { sessionId: string };
      for (const slot of slots) {
        const ph = photos[slot];
        if (ph) await post("/api/virtual-try-on/upload", { sessionId, type: slot, data: ph.dataUrl, width: ph.width, height: ph.height });
      }
      setStage(1);
      const gen = post("/api/virtual-try-on/generate", { sessionId });
      await wait(900);
      setStage(2);
      await wait(900);
      setStage(3);
      await gen;
      setStage(4);
      await wait(700);
      router.push(`/virtual-try-on/${sessionId}`);
    } catch (e) {
      setStage(-1);
      setBusy(false);
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
  };

  if (stage >= 0 && product) return <ProcessingScreen stage={stage} productTitle={product.title} photo={photos.front?.dataUrl} />;

  const canNext = [!!product, !!product && !!size && !!color, consent, !!photos.front][step];

  return (
    <div className="mx-auto max-w-[1200px] px-5 pb-24 md:px-10">
      {/* Stepper */}
      <ol className="mx-auto mb-12 flex max-w-xl items-center justify-between" aria-label="Try-on steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center last:flex-none">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i >= step}
              aria-current={i === step ? "step" : undefined}
              className="flex flex-col items-center gap-2"
            >
              <span className={`grid h-8 w-8 place-items-center rounded-full border text-[0.65rem] transition-colors duration-500 ${i < step ? "border-gold bg-gold text-noir" : i === step ? "border-gold text-gold" : "border-ivory/20 text-ivory/40"}`}>
                {i < step ? "✓" : i + 1}
              </span>
              <span className={`text-[0.55rem] uppercase tracking-[0.25em] ${i <= step ? "text-ivory/80" : "text-ivory/35"}`}>{s}</span>
            </button>
            {i < STEPS.length - 1 && (
              <span className="relative mx-2 mb-6 h-px flex-1 bg-ivory/15">
                <motion.span className="absolute inset-y-0 left-0 bg-gold" initial={false} animate={{ width: i < step ? "100%" : "0%" }} transition={{ duration: 0.6, ease: EASE }} />
              </span>
            )}
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.45, ease: EASE }}>
          {step === 0 && (
            <section aria-labelledby="pick">
              <h2 id="pick" className="text-center font-display text-3xl text-ivory md:text-4xl">Choose a piece to try</h2>
              <p className="mx-auto mt-3 max-w-lg text-center text-sm text-ivory/60">Virtual Try-On is available for blouses, salwar suits, sarees and loungewear.</p>
              <ul className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
                {products.map((p) => (
                  <li key={p.slug}>
                    <button type="button" onClick={() => choose(p)} className={`group block w-full border text-left transition-colors ${product?.slug === p.slug ? "border-gold" : "border-gold/15 hover:border-gold/50"}`}>
                      <span className="block aspect-[3/4] overflow-hidden bg-noir-soft">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                      </span>
                      <span className="block p-3">
                        <span className="block text-[0.55rem] uppercase tracking-[0.22em] text-gold">{p.kicker}</span>
                        <span className="mt-1 block font-serif text-lg text-ivory">{p.title}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {step === 1 && product && (
            <section aria-labelledby="style" className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="relative mx-auto aspect-[3/4] w-full max-w-sm overflow-hidden border border-gold/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
                <button type="button" onClick={() => setStep(0)} className="absolute bottom-3 left-3 bg-noir/80 px-3 py-2 text-[0.55rem] uppercase tracking-[0.25em] text-ivory backdrop-blur">
                  Change piece
                </button>
              </div>
              <div>
                <p className="eyebrow">{product.kicker}</p>
                <h2 id="style" className="mt-3 font-display text-4xl text-ivory">{product.title}</h2>

                <fieldset className="mt-8">
                  <legend className="text-[0.6rem] uppercase tracking-[0.28em] text-ivory/60">Colour</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {product.colors.map((c) => (
                      <button key={c} type="button" aria-pressed={color === c} onClick={() => setColor(c)} className={`relative border px-4 py-2 text-xs ${color === c ? "border-gold text-ivory" : "border-ivory/15 text-ivory/65 hover:border-gold/40"}`}>
                        {color === c && <motion.span layoutId="tryon-color" className="absolute inset-0 bg-gold/10" />}
                        <span className="relative">{c}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="mt-6">
                  <legend className="text-[0.6rem] uppercase tracking-[0.28em] text-ivory/60">Size</legend>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {TRYON_SIZES.map((s) => (
                      <button key={s} type="button" aria-pressed={size === s} onClick={() => setSize(s)} className={`relative min-w-12 border px-3 py-2 text-xs ${size === s ? "border-gold text-ivory" : "border-ivory/15 text-ivory/65 hover:border-gold/40"}`}>
                        {size === s && <motion.span layoutId="tryon-size" className="absolute inset-0 bg-gold/10" />}
                        <span className="relative">{s}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="mt-8">
                  <legend className="text-[0.6rem] uppercase tracking-[0.28em] text-ivory/60">Try-on mode</legend>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {([
                      ["quick", "Quick Try-On", "One front photo. A fast styling preview in moments."],
                      ["premium", "Premium Try-On", "Front, left, right and back photos for a fuller 360° preview."],
                    ] as const).map(([m, title, body]) => (
                      <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} className={`relative border p-5 text-left transition-colors ${mode === m ? "border-gold" : "border-ivory/15 hover:border-gold/40"}`}>
                        {mode === m && <motion.span layoutId="tryon-mode" className="absolute inset-0 bg-gold/[0.07]" />}
                        <span className="relative block font-serif text-xl text-ivory">{title}</span>
                        <span className="relative mt-2 block text-xs leading-relaxed text-ivory/60">{body}</span>
                        {m === "premium" && <span className="relative mt-3 inline-block border border-gold/40 px-2 py-1 text-[0.5rem] uppercase tracking-[0.22em] text-gold">Recommended</span>}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </div>
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="consent" className="mx-auto max-w-2xl border border-gold/20 bg-noir-soft p-6 md:p-10">
              <p className="eyebrow">Your privacy</p>
              <h2 id="consent" className="mt-3 font-display text-3xl text-ivory">Before we begin</h2>
              <ul className="mt-6 space-y-3">
                {TRYON_CONSENT_POINTS.map((p) => (
                  <li key={p} className="flex gap-3 text-sm leading-relaxed text-ivory/75">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-gold" />
                    {p}
                  </li>
                ))}
              </ul>
              <label className="mt-8 flex cursor-pointer items-start gap-3 border border-gold/25 p-4">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-4 w-4 accent-[#d4af37]" />
                <span className="text-sm leading-relaxed text-ivory/85">
                  I agree to the{" "}
                  <Link href="/try-on-terms" className="text-gold underline underline-offset-4" target="_blank">Virtual Try-On terms</Link> and{" "}
                  <Link href="/image-consent" className="text-gold underline underline-offset-4" target="_blank">image consent policy</Link>, and confirm the photos are of me.
                </span>
              </label>
              <p className="mt-4 text-xs text-ivory/50">
                Read more in our <Link href="/privacy" className="underline underline-offset-4 hover:text-gold">privacy policy</Link>.
              </p>
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="photos" className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
              <div>
                <h2 id="photos" className="font-display text-3xl text-ivory">{mode === "premium" ? "Add your four photos" : "Add your front photo"}</h2>
                <p className="mt-2 text-sm text-ivory/60">JPG, PNG or WEBP · up to 12 MB · at least 400px. Photos are resized privately in your browser before upload.</p>
                <div className={`mt-6 grid gap-4 ${mode === "premium" ? "grid-cols-2" : "max-w-sm"}`}>
                  {slots.map((slot) => {
                    const ph = photos[slot];
                    return (
                      <div key={slot} className="border border-gold/20 bg-noir-soft">
                        <div className="relative aspect-[3/4] overflow-hidden">
                          {ph ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={ph.dataUrl} alt={`Your ${SLOT_LABEL[slot]} photo`} className="h-full w-full object-cover" />
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileRefs.current[slot]?.click()}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                void onFile(slot, e.dataTransfer.files[0]);
                              }}
                              className="flex h-full w-full flex-col items-center justify-center gap-3 border border-dashed border-gold/30 text-ivory/60 transition-colors hover:border-gold hover:text-gold"
                            >
                              <svg aria-hidden viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.2"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
                              <span className="text-[0.6rem] uppercase tracking-[0.25em]">Upload {SLOT_LABEL[slot]}</span>
                              {slot === "front" && <span className="text-[0.55rem] text-ivory/40">Required</span>}
                            </button>
                          )}
                          <span className="absolute left-2 top-2 bg-noir/80 px-2 py-1 text-[0.5rem] uppercase tracking-[0.22em] text-gold">{SLOT_LABEL[slot]}</span>
                        </div>
                        <div className="flex divide-x divide-gold/15 border-t border-gold/15 text-[0.55rem] uppercase tracking-[0.2em]">
                          <button type="button" onClick={() => fileRefs.current[slot]?.click()} className="flex-1 py-2.5 text-ivory/70 hover:text-gold">{ph ? "Replace" : "Upload"}</button>
                          <button type="button" onClick={() => setCamera(slot)} className="flex-1 py-2.5 text-ivory/70 hover:text-gold">Camera</button>
                          {ph && <button type="button" onClick={() => setPhotos((p) => ({ ...p, [slot]: undefined }))} className="flex-1 py-2.5 text-ivory/70 hover:text-gold">Remove</button>}
                        </div>
                        <input
                          ref={(el) => { fileRefs.current[slot] = el; }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          aria-label={`Upload ${SLOT_LABEL[slot]} photo`}
                          onChange={(e) => {
                            void onFile(slot, e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
              <aside className="h-fit border border-gold/20 bg-noir-soft p-6">
                <p className="eyebrow">Photo guidance</p>
                <ul className="mt-5 space-y-4">
                  {PHOTO_GUIDANCE.map((g, i) => (
                    <motion.li key={g.title} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i, ease: EASE }} className="flex gap-3">
                      <span className="mt-0.5 text-[0.6rem] text-gold">0{i + 1}</span>
                      <span>
                        <span className="block text-sm text-ivory">{g.title}</span>
                        <span className="block text-xs text-ivory/55">{g.body}</span>
                      </span>
                    </motion.li>
                  ))}
                </ul>
                <p className="mt-6 border-t border-gold/15 pt-4 text-[0.7rem] leading-relaxed text-ivory/50">{TRYON_DISCLAIMER}</p>
              </aside>
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p role="alert" className="mx-auto mt-8 max-w-xl border border-burgundy/60 bg-burgundy/20 px-4 py-3 text-center text-sm text-ivory">
          {error}
        </p>
      )}

      {step > 0 && (
        <div className="mx-auto mt-12 flex max-w-xl items-center justify-between gap-4">
          <button type="button" onClick={() => setStep((s) => s - 1)} className="text-[0.62rem] uppercase tracking-[0.3em] text-ivory/60 hover:text-gold">
            ← Back
          </button>
          {step < 3 ? (
            <button type="button" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className="bg-gold px-8 py-3.5 text-[0.68rem] font-medium uppercase tracking-[0.3em] text-noir transition-opacity disabled:opacity-40">
              Continue
            </button>
          ) : (
            <button type="button" disabled={!canNext || busy || !consent} onClick={generate} className="bg-gold px-8 py-3.5 text-[0.68rem] font-medium uppercase tracking-[0.3em] text-noir transition-opacity disabled:opacity-40">
              Generate preview
            </button>
          )}
        </div>
      )}

      <AnimatePresence>{camera && <CameraCapture label={SLOT_LABEL[camera]} onCapture={onCapture} onClose={() => setCamera(null)} />}</AnimatePresence>
    </div>
  );
}
