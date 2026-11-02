"use client";

import { useState } from "react";
import { brandProducts } from "./brand";
import { toast } from "./ui";

/** One click: put the SAVLINO frame (logo, icons, title band) on every listed product that does not have it yet. */
export function BrandButton() {
  const [busy, setBusy] = useState("");
  const run = async () => {
    if (!window.confirm("Apply the SAVLINO frame to every live and upcoming product that does not have it yet? This can take a minute and runs in this browser tab — keep it open.")) return;
    setBusy("Starting…");
    try {
      const r = await brandProducts((done, total, name) => setBusy(name ? `Framing ${done + 1}/${total}: ${name}` : "Finishing…"));
      if (r.failed.length) toast(`${r.branded} framed, ${r.failed.length} failed — ${r.failed[0]}`, "error");
      else toast(r.branded ? `SAVLINO frame applied to ${r.branded} product(s)` : "Every listed product already has the frame");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not apply the frame", "error");
    } finally {
      setBusy("");
    }
  };
  return (
    <button type="button" className="crm-btn" disabled={!!busy} onClick={run}>
      {busy || "Apply SAVLINO frame to all products"}
    </button>
  );
}
