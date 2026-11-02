"use client";

import Image from "next/image";
import { useState } from "react";
import { uploadMedia } from "./data";
import { Panel, ICONS, toast } from "./ui";

export function ShowcaseImageStudio({ images, onChange }: { images: string[]; onChange: (urls: string[]) => void }) {
  const [uploading, setUploading] = useState<number | null>(null);
  const slots = Array.from({ length: 6 }, (_, i) => images[i] ?? "");

  async function upload(index: number, file: File) {
    if (!file.type.startsWith("image/")) { toast("Choose an image file", "error"); return; }
    if (file.size > 15 * 1024 * 1024) { toast("Maximum original image size is 15 MB", "error"); return; }
    setUploading(index);
    try {
      const result = await uploadMedia("showcase", file);
      const next = [...slots];
      next[index] = result.url;
      onChange(next);
      toast("Photo uploaded. Click Publish to update the website.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Upload failed", "error");
    } finally { setUploading(null); }
  }

  return (
    <Panel title="3D Collection Showcase — Image Studio" icon={ICONS.image}
      subtitle="Upload up to six portrait photos for 'Every piece, in the round'. Your original images remain unchanged until you publish. Recommended 3:4 portrait, at least 900 × 1200 pixels.">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {slots.map((url, i) => (
          <div key={i} className="rounded-xl border border-gold/25 p-2">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-black/30">
              {url ? <Image src={url} alt={`Showcase slot ${i + 1}`} fill sizes="220px" className="object-cover" unoptimized /> :
                <div className="flex h-full items-center justify-center text-center text-xs opacity-60">Default collection photo</div>}
            </div>
            <p className="my-2 text-xs">Photo {i + 1}</p>
            <label className="crm-chip inline-flex cursor-pointer">
              {uploading === i ? "Uploading…" : url ? "Replace photo" : "Upload photo"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading !== null}
                onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(i, file); }} />
            </label>
            {url && <button className="crm-chip ml-1" type="button" onClick={() => { const next = [...slots]; next[i] = ""; onChange(next); }}>Reset</button>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs opacity-70">Photos are assigned to the visible collection order. Changes appear after Publish. A reset restores the bundled image.</p>
    </Panel>
  );
}
