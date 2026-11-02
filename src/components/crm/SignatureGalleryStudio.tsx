"use client";

import Image from "next/image";
import { useState } from "react";
import { uploadMedia } from "./data";
import { Panel, ICONS, toast } from "./ui";

const LABELS = ["Noir & Gold", "Tissue Gold", "Maharani Anarkali", "Zardozi Back", "Ivory Satin", "Bordeaux Lace"];

export function SignatureGalleryStudio({ images, onChange }: { images: string[]; onChange: (images: string[]) => void }) {
  const [uploading, setUploading] = useState<number | null>(null);
  const slots = Array.from({ length: 6 }, (_, i) => images[i] || "");

  async function upload(index: number, file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast("Upload a JPG, PNG or WebP photo", "error"); return; }
    if (file.size > 15 * 1024 * 1024) { toast("Maximum file size is 15 MB", "error"); return; }
    setUploading(index);
    try {
      const result = await uploadMedia("signature-gallery", file);
      const updated = [...slots];
      updated[index] = result.url;
      onChange(updated);
      toast("Image uploaded. Save & publish to update the website.");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Image upload failed", "error");
    } finally { setUploading(null); }
  }

  return <Panel title="Signature Gallery — Image Manager" icon={ICONS.image} subtitle="Change the six Signature Collection photo cards. Recommended portrait 3:4, at least 900 × 1200 px.">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {slots.map((url, i) => <div key={i} className="rounded-xl border border-gold/25 p-3">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-black/30">
          {url ? <Image src={url} alt={LABELS[i]} fill sizes="250px" unoptimized className="object-cover"/> :
            <div className="flex h-full items-center justify-center px-3 text-center text-xs opacity-60">Current website image remains until replaced</div>}
        </div>
        <div className="my-2 text-xs">{i + 1}. {LABELS[i]}</div>
        <label className="crm-chip inline-flex cursor-pointer">
          {uploading === i ? "Uploading..." : url ? "Replace" : "Upload Image"}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading !== null}
            onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void upload(i, file); }} />
        </label>
        {url && <button type="button" className="crm-chip ml-2" onClick={() => { const updated = [...slots]; updated[i] = ""; onChange(updated); }}>Reset</button>}
      </div>)}
    </div>
    <p className="mt-3 text-xs opacity-70">Save changes to publish. Reset restores the original image; collection links and labels are preserved.</p>
  </Panel>;
}
