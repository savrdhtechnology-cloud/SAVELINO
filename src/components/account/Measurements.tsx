"use client";

import { useState, type FormEvent } from "react";
import type { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Measurement } from "@/lib/account";

type Client = NonNullable<ReturnType<typeof createSupabaseBrowserClient>>;

const input = "mt-1.5 w-full rounded-xl border border-gold/25 bg-noir-soft px-4 py-3 text-[0.95rem] text-ivory outline-none transition-colors placeholder:text-ivory/35 focus:border-gold";
const label = "text-[0.74rem] uppercase tracking-[0.22em] text-ivory/72";
const btn = "rounded-full bg-gold px-6 py-3 text-[0.72rem] font-medium uppercase tracking-[0.26em] text-noir transition-opacity hover:opacity-90 disabled:opacity-60";
const ghost = "rounded-full border border-gold/50 px-5 py-2.5 text-[0.7rem] uppercase tracking-[0.24em] text-gold transition-colors hover:bg-gold/10";

const FIELDS: [keyof Measurement, string][] = [
  ["bust", "Bust"],
  ["waist", "Waist"],
  ["hip", "Hip"],
  ["shoulder", "Shoulder"],
  ["blouse_length", "Blouse length"],
  ["sleeve_length", "Sleeve length"],
];

export function Measurements({ db, userId, rows, reload }: { db: Client; userId: string; rows: Measurement[]; reload: () => Promise<void> }) {
  const [editing, setEditing] = useState<Measurement | "new" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const cur = editing && editing !== "new" ? editing : null;

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const get = (k: string) => String(f.get(k) ?? "").trim();
    const row = {
      label: get("label") || "My measurements",
      bust: get("bust"),
      waist: get("waist"),
      hip: get("hip"),
      shoulder: get("shoulder"),
      blouse_length: get("blouse_length"),
      sleeve_length: get("sleeve_length"),
      notes: get("notes"),
      updated_at: new Date().toISOString(),
    };
    setBusy(true);
    setError("");
    const res = cur ? await db.from("customer_measurements").update(row).eq("id", cur.id) : await db.from("customer_measurements").insert({ ...row, user_id: userId });
    setBusy(false);
    if (res.error) return setError(res.error.message);
    setEditing(null);
    await reload();
  }

  async function remove(m: Measurement) {
    if (!window.confirm(`Remove "${m.label}"?`)) return;
    await db.from("customer_measurements").delete().eq("id", m.id);
    await reload();
  }

  return (
    <div>
      <p className="mb-5 text-sm text-ivory/70">Save your measurements once — share them straight from your account for any custom stitching request.</p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {rows.map((m) => (
          <li key={m.id} className="rounded-2xl border border-gold/25 bg-noir-soft p-5">
            <p className="font-display text-lg text-ivory">{m.label}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[0.85rem] text-ivory/80">
              {FIELDS.map(([k, t]) => m[k] && (
                <div key={k}>
                  <dt className="inline text-ivory/55">{t}: </dt>
                  <dd className="inline">{m[k]}</dd>
                </div>
              ))}
            </dl>
            {m.notes && <p className="mt-2 text-[0.82rem] text-ivory/65">{m.notes}</p>}
            <div className="mt-4 flex gap-3 text-[0.78rem] uppercase tracking-[0.16em]">
              <button type="button" onClick={() => setEditing(m)} className="text-ivory/75 hover:text-gold">Edit</button>
              <button type="button" onClick={() => remove(m)} className="text-ivory/55 hover:text-ivory">Remove</button>
            </div>
          </li>
        ))}
        {rows.length === 0 && !editing && <li className="text-ivory/65 sm:col-span-2">No saved measurements yet.</li>}
      </ul>
      {!editing && <button type="button" onClick={() => { setEditing("new"); setError(""); }} className={`${btn} mt-6`}>Add measurements</button>}
      {editing && (
        <form key={cur?.id ?? "new"} onSubmit={save} className="mt-6 grid gap-4 rounded-2xl border border-gold/25 bg-noir-soft p-6 sm:grid-cols-2">
          <label className="block sm:col-span-2"><span className={label}>Label</span><input name="label" defaultValue={cur?.label ?? "My measurements"} className={input} /></label>
          {FIELDS.map(([k, t]) => (
            <label key={k} className="block"><span className={label}>{t}</span><input name={k} placeholder="in inches" defaultValue={cur?.[k] ?? ""} className={input} /></label>
          ))}
          <label className="block sm:col-span-2"><span className={label}>Notes (optional)</span><textarea name="notes" rows={2} defaultValue={cur?.notes ?? ""} className={input} /></label>
          {error && <p role="alert" className="rounded-lg border border-burgundy bg-burgundy/30 px-4 py-3 text-sm text-ivory sm:col-span-2">{error}</p>}
          <div className="flex gap-3 sm:col-span-2">
            <button type="submit" disabled={busy} className={btn}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" onClick={() => setEditing(null)} className={ghost}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
