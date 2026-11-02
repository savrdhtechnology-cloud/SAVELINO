"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { CINEMA_STYLES, CINEMA_STYLE_LABELS, DEFAULT_CINEMA_SLIDES, MAX_CINEMA_SLIDES, type CinemaSlide, type CinemaStyle } from "@/lib/settings";
import { removeMedia, uploadMedia } from "./data";
import { Field, ICONS, Icon, Panel, Select, toast } from "./ui";

/** Supabase public URL -> storage path inside the "media" bucket (so a replaced photo can be deleted). */
const storagePath = (url: string) => url.split("/storage/v1/object/public/media/")[1] ?? "";

/** Hero Studio: edit the Royal Cinema hero slides — photo, colour mood, text and buttons for each. */
export function CinemaSlides({ slides, onChange }: { slides: CinemaSlide[]; onChange: (next: CinemaSlide[]) => void }) {
  const [busy, setBusy] = useState<number | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const target = useRef(0);

  const set = (i: number, p: Partial<CinemaSlide>) => onChange(slides.map((s, j) => (j === i ? { ...s, ...p } : s)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  async function upload(file: File) {
    const i = target.current;
    setBusy(i);
    try {
      const up = await uploadMedia("hero", file);
      const old = storagePath(slides[i]?.image ?? "");
      set(i, { image: up.url });
      if (old) void removeMedia([old]).catch(() => {});
      toast("Photo added — Publish to put it live");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not upload this photo", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel
      title="Royal Cinema hero slides"
      icon={ICONS.image}
      subtitle="Shown when the Royal Cinema website theme is live. Upload a wide (16:9) photo with the model on the right — the headline is written on top by the website, so keep the photo free of text."
    >
      <input
        ref={picker}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void upload(f);
        }}
      />
      <ul className="space-y-4">
        {slides.map((sl, i) => (
          <li key={i} className="crm-panel-soft rounded-xl p-3">
            <div className="flex items-start gap-3">
              <span className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-lg" style={{ background: "var(--crm-wash)" }}>
                {sl.image ? (
                  <Image src={sl.image} alt="" fill sizes="144px" className="object-cover" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center px-2 text-center text-[0.65rem] crm-muted">Placeholder photo</span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium">Slide {i + 1}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => {
                      target.current = i;
                      picker.current?.click();
                    }}
                    className="crm-chip"
                  >
                    <Icon d={ICONS.upload} className="h-3 w-3" /> {busy === i ? "Uploading…" : sl.image ? "Change photo" : "Upload photo"}
                  </button>
                  {sl.image && (
                    <button type="button" className="crm-chip" onClick={() => set(i, { image: "" })}>
                      Use placeholder
                    </button>
                  )}
                  <button type="button" className="crm-chip" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move slide earlier">
                    ↑
                  </button>
                  <button type="button" className="crm-chip" disabled={i === slides.length - 1} onClick={() => move(i, 1)} aria-label="Move slide later">
                    ↓
                  </button>
                  {slides.length > 1 && (
                    <button type="button" className="crm-chip" onClick={() => onChange(slides.filter((_, j) => j !== i))} aria-label="Remove slide">
                      <Icon d={ICONS.trash} className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Select label="Style" value={sl.style} onChange={(e) => set(i, { style: e.target.value as CinemaStyle })} className="sm:col-span-2">
                {CINEMA_STYLES.map((st) => (
                  <option key={st} value={st}>
                    {CINEMA_STYLE_LABELS[st]}
                  </option>
                ))}
              </Select>
              <Field label="Small line" value={sl.eyebrow} onChange={(e) => set(i, { eyebrow: e.target.value })} />
              <Field label="Heading" value={sl.title} onChange={(e) => set(i, { title: e.target.value })} hint="The last word is shown in gold italics" />
              <Field label="Subtitle" value={sl.subtitle} onChange={(e) => set(i, { subtitle: e.target.value })} className="sm:col-span-2" />
              <Field label="Main button" value={sl.primaryLabel} onChange={(e) => set(i, { primaryLabel: e.target.value })} />
              <Field label="Links to" value={sl.primaryHref} onChange={(e) => set(i, { primaryHref: e.target.value })} placeholder="/shop" />
              <Field label="Second button" value={sl.secondaryLabel} onChange={(e) => set(i, { secondaryLabel: e.target.value })} />
              <Field label="Links to" value={sl.secondaryHref} onChange={(e) => set(i, { secondaryHref: e.target.value })} placeholder="/custom-stitching" />
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        {slides.length < MAX_CINEMA_SLIDES && (
          <button type="button" className="crm-chip" onClick={() => onChange([...slides, { ...DEFAULT_CINEMA_SLIDES[slides.length % DEFAULT_CINEMA_SLIDES.length], image: "" }])}>
            <Icon d={ICONS.plus} className="h-3 w-3" /> Add a slide
          </button>
        )}
        <button type="button" className="crm-chip" onClick={() => onChange(DEFAULT_CINEMA_SLIDES.map((d) => ({ ...d })))}>
          Reset all four
        </button>
      </div>
    </Panel>
  );
}
