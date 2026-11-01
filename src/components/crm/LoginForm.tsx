"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SiteSettings } from "@/lib/settings";
import { crmStyle } from "./theme";
import { EASE, ICONS, Icon, RevealText } from "./ui";

export function LoginForm({ crm }: { crm: SiteSettings["crm"] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const client = createSupabaseBrowserClient();
    if (!client) return setError("The database is not connected yet.");
    setBusy(true);
    setError("");
    const { error: err } = await client.auth.signInWithPassword({ email: String(f.get("email") ?? "").trim(), password: String(f.get("password") ?? "") });
    setBusy(false);
    if (err) return setError(err.message === "Invalid login credentials" ? "Wrong email or password" : err.message);
    const next = params.get("next");
    router.replace(next && next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  }

  return (
    <div className="crm flex items-center justify-center px-5 py-16" style={crmStyle(crm)}>
      <div aria-hidden className="crm-silk" />
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: EASE }}
        className="crm-panel relative w-full max-w-md p-8 md:p-10"
      >
        <div className="flex flex-col items-center text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full" style={{ boxShadow: "inset 0 0 0 1.5px var(--crm-accent), 0 0 40px -8px var(--crm-accent)", background: "var(--crm-wash)" }}>
            <Image src="/branding/savlino-monogram-alpha.png" alt="" width={60} height={60} className="h-14 w-14 object-contain" priority />
          </span>
          <h1 className="mt-5 text-3xl">
            <RevealText text="SAVLINO" className="crm-heading crm-gold-text tracking-[0.1em]" />
          </h1>
          <p className="crm-serif mt-1 text-lg italic crm-muted">Commerce CRM</p>
        </div>
        <div className="mt-8 space-y-4">
          <label className="block">
            <span className="crm-label">Email</span>
            <input name="email" type="email" required autoComplete="email" className="crm-input" />
          </label>
          <label className="block">
            <span className="crm-label">Password</span>
            <span className="relative block">
              <input name="password" type={show ? "text" : "password"} required autoComplete="current-password" className="crm-input pr-16" />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 mt-[3px] -translate-y-1/2 px-2 text-xs font-semibold crm-accent">
                {show ? "Hide" : "Show"}
              </button>
            </span>
          </label>
          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="flex items-center gap-2 text-sm" style={{ color: "var(--crm-danger)" }}>
              <Icon d={ICONS.warn} /> {error}
            </motion.p>
          )}
          <button type="submit" disabled={busy} className="crm-btn crm-btn-gold w-full py-3 text-sm">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
        <p className="crm-serif mt-8 text-center text-sm italic crm-accent">A Legacy of Elegance</p>
      </motion.form>
    </div>
  );
}
