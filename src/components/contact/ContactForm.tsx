"use client";

import { useState, type FormEvent } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const field =
  "mt-2 w-full border border-gold/25 bg-transparent px-4 py-3.5 text-ivory placeholder:text-ivory/30 outline-none transition-colors focus:border-gold";
const labelCls = "text-[0.62rem] uppercase tracking-[0.28em] text-ivory/60";

const topics = ["Custom stitching", "Ready-made sizing", "Partner program", "Order help", "Something else"];

export function ContactForm({ configured }: { configured: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "offline">("idle");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const supabase = createSupabaseBrowserClient();
    if (!configured || !supabase) {
      setState("offline");
      return;
    }
    const form = e.currentTarget;
    const data = new FormData(form);
    setState("sending");
    const inbox = supabase.from("contact_messages") as unknown as {
      insert(row: Record<string, unknown>): PromiseLike<{ error: unknown }>;
    };
    const { error } = await inbox.insert({
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim() || null,
      topic: String(data.get("topic") ?? ""),
      message: String(data.get("message") ?? "").trim(),
    });
    if (error) {
      setState("error");
      return;
    }
    form.reset();
    setState("sent");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Name</span>
          <input name="name" required autoComplete="name" className={field} />
        </label>
        <label className="block">
          <span className={labelCls}>Email</span>
          <input name="email" type="email" required autoComplete="email" className={field} />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={labelCls}>Mobile (optional)</span>
          <input name="phone" type="tel" autoComplete="tel" inputMode="tel" className={field} />
        </label>
        <label className="block">
          <span className={labelCls}>Topic</span>
          <select name="topic" className={`${field} bg-noir`} defaultValue={topics[0]}>
            {topics.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className={labelCls}>Message</span>
        <textarea name="message" required rows={6} minLength={10} className={field} />
      </label>
      <button
        type="submit"
        disabled={state === "sending"}
        className="w-full bg-gold py-4 text-[0.7rem] font-medium uppercase tracking-[0.32em] text-noir transition-colors hover:bg-gold-light disabled:opacity-60"
      >
        {state === "sending" ? "Sending…" : "Send message"}
      </button>
      <p role="status" className="min-h-6 text-sm text-gold-light">
        {state === "sent" && "Thank you — your message has reached the SAVLINO team."}
        {state === "error" && "Your message could not be sent. Please try again."}
        {state === "offline" && "Messaging opens soon. Your message has not been sent or stored."}
      </p>
    </form>
  );
}
