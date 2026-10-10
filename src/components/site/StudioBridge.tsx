"use client";

import { useEffect } from "react";

type Msg =
  | { type: "savlino:studio:vars"; vars: Record<string, string> }
  | { type: "savlino:studio:text"; key: string; value: string }
  | { type: "savlino:studio:mode"; mode: "dark" | "light" };

/**
 * Lets CRM → Studio preview unsaved theme and copy changes inside its iframe.
 * Only active when the page is framed by the same origin.
 */
export function StudioBridge() {
  useEffect(() => {
    if (window.parent === window) return;
    const onMessage = (e: MessageEvent<Msg>) => {
      if (e.origin !== window.location.origin || !e.data || typeof e.data !== "object") return;
      if (e.data.type === "savlino:studio:vars") {
        for (const [k, v] of Object.entries(e.data.vars)) {
          if (/^--(color|font)-[a-z-]+$/.test(k)) document.documentElement.style.setProperty(k, v);
        }
      } else if (e.data.type === "savlino:studio:mode") {
        if (e.data.mode === "dark" || e.data.mode === "light") document.documentElement.setAttribute("data-theme", e.data.mode);
      } else if (e.data.type === "savlino:studio:text") {
        const { key, value } = e.data;
        document.querySelectorAll<HTMLElement>(`[data-studio="${CSS.escape(key)}"]`).forEach((el) => {
          el.textContent = value;
        });
      }
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "savlino:studio:ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  return null;
}
