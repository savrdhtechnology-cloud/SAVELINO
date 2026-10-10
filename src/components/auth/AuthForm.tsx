"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "register";
  audience: "customer" | "partner";
  /** Whether the Supabase backend is provisioned (decided on the server). */
  configured: boolean;
};

const field =
  "mt-2 w-full border border-gold/25 bg-transparent px-4 py-3.5 text-ivory placeholder:text-ivory/30 outline-none transition-colors focus:border-gold";
const labelCls = "text-[0.62rem] uppercase tracking-[0.28em] text-ivory/60";

function safeNext(value: string | null, fallback: string) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export function AuthForm({ mode, audience, configured }: AuthFormProps) {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "info">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const home = audience === "partner" ? "/partner/dashboard" : "/account";
  const altHref =
    audience === "partner"
      ? mode === "login"
        ? "/partner/register"
        : "/partner/login"
      : mode === "login"
        ? "/register"
        : "/login";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = createSupabaseBrowserClient();
    if (!configured || !supabase) {
      setStatus("info");
      setMessage("Online accounts open soon. Your details have not been sent anywhere.");
      return;
    }

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    setStatus("loading");
    setMessage(null);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      router.replace(safeNext(params.get("next"), home));
      router.refresh();
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(home)}`,
        data: {
          full_name: String(form.get("name") ?? "").trim(),
          phone: String(form.get("phone") ?? "").trim(),
          business_name: String(form.get("business") ?? "").trim() || null,
          // Only expresses intent; roles are assigned server-side after review.
          signup_intent: audience,
        },
      },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("info");
    setMessage("Please check your email to confirm your account.");
  }

  const disabled = status === "loading";

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate={false}>
      {!configured && (
        <p className="border border-gold/25 bg-gold/5 px-4 py-3 text-xs leading-relaxed text-gold-light">
          {audience === "partner" ? "Partner" : "Customer"} accounts are being connected to our secure backend and open
          soon. Nothing you enter here is stored or sent.
        </p>
      )}

      {mode === "register" && (
        <>
          <label className="block">
            <span className={labelCls}>Full name</span>
            <input name="name" required autoComplete="name" className={field} />
          </label>
          <label className="block">
            <span className={labelCls}>Mobile number</span>
            <input name="phone" type="tel" required autoComplete="tel" inputMode="tel" className={field} />
          </label>
          {audience === "partner" && (
            <label className="block">
              <span className={labelCls}>Business / boutique name (optional)</span>
              <input name="business" autoComplete="organization" className={field} />
            </label>
          )}
        </>
      )}

      <label className="block">
        <span className={labelCls}>Email</span>
        <input name="email" type="email" required autoComplete="email" className={field} />
      </label>
      <label className="block">
        <span className={labelCls}>Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className={field}
        />
      </label>

      <button
        type="submit"
        disabled={disabled}
        className="w-full bg-gold py-4 text-[0.7rem] font-medium uppercase tracking-[0.32em] text-noir transition-colors hover:bg-gold-light disabled:opacity-60"
      >
        {disabled ? "Please wait…" : mode === "login" ? "Sign in" : audience === "partner" ? "Apply as partner" : "Create account"}
      </button>

      {message && (
        <p
          role={status === "error" ? "alert" : "status"}
          className={`text-sm ${status === "error" ? "text-red-300" : "text-gold-light"}`}
        >
          {message}
        </p>
      )}

      <p className="pt-2 text-center text-sm text-ivory/60">
        {mode === "login" ? "New to SAVLINO? " : "Already have an account? "}
        <Link href={altHref} className="text-gold underline-offset-4 hover:underline">
          {mode === "login" ? (audience === "partner" ? "Apply to partner" : "Create an account") : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
