"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Effects, type EffectsConfig } from "./Effects";

export const EFFECTS_PREVIEW_EVENT = "savlino:effects-preview";

/** Website background motion + mouse effects. The CRM draws its own (see AdminShell). */
export function SiteEffects(props: EffectsConfig) {
  const pathname = usePathname();
  const [preview, setPreview] = useState<EffectsConfig | null>(null);

  // CRM → Studio sends unsaved choices to its preview frame through StudioBridge.
  useEffect(() => {
    const on = (e: Event) => setPreview((e as CustomEvent<EffectsConfig>).detail);
    window.addEventListener(EFFECTS_PREVIEW_EVENT, on);
    return () => window.removeEventListener(EFFECTS_PREVIEW_EVENT, on);
  }, []);

  if (pathname.startsWith("/admin") || pathname.startsWith("/worker") || pathname.startsWith("/studio")) return null;
  const cfg = preview ?? props;
  return <Effects key={`${cfg.background}-${cfg.cursor}`} {...cfg} />;
}
