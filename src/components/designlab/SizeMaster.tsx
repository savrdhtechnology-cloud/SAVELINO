"use client";

import { useEffect, useState } from "react";
import { PageHeader, Panel, Field, Area, Select, Empty, Skeleton, ICONS, toast, fmtDate } from "@/components/crm/ui";
import { db, must, useLoad } from "@/components/crm/data";
import { MEASURE_FIELDS, errMsg, fetchSizes, num, useRole, type Measures, type SizeTemplate } from "./data";
import { DesignLabNav, ErrorBox, Pill } from "./shared";

type Draft = { unit: "in" | "cm"; body: Measures; garment: Measures; ease: Measures; cutting: Measures; seam: string; notes: string };
const toDraft = (t: SizeTemplate): Draft => ({ unit: t.unit, body: t.body ?? {}, garment: t.garment ?? {}, ease: t.ease ?? {}, cutting: t.cutting ?? {}, seam: t.seam_allowance == null ? "" : String(t.seam_allowance), notes: t.notes });
const filled = (t: SizeTemplate) => Object.values({ ...t.body, ...t.garment, ...t.cutting }).filter((v) => String(v).trim()).length;

export function SizeMaster() {
  const sizes = useLoad(fetchSizes, []);
  const role = useRole();
  const [selId, setSelId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState("");

  const list = sizes.data ?? [];
  const sel = list.find((s) => s.id === selId) ?? list[0] ?? null;
  useEffect(() => setDraft(sel ? toDraft(sel) : null), [sel?.id, sizes.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = !!sel && !!draft && JSON.stringify(draft) !== JSON.stringify(toDraft(sel));
  const set = (g: "body" | "garment" | "ease" | "cutting", k: string, v: string) => setDraft((d) => (d ? { ...d, [g]: { ...d[g], [k]: v } } : d));

  const run = async (job: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await job(); toast(ok); await sizes.reload(); } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  };
  const save = () => run(async () => {
    if (!sel || !draft) return;
    const seam = num(draft.seam);
    if (draft.seam.trim() !== "" && (seam == null || seam < 0)) throw new Error("Seam allowance must be a number ≥ 0");
    must(await db().from("designlab_size_templates").update({ unit: draft.unit, body: draft.body, garment: draft.garment, ease: draft.ease, cutting: draft.cutting, seam_allowance: seam, notes: draft.notes }).eq("id", sel.id));
  }, "Size template saved");
  const add = () => run(async () => {
    const label = custom.trim();
    if (!label) throw new Error("Enter a size name");
    const order = Math.max(0, ...list.map((s) => s.sort_order)) + 1;
    const row = must(await db().from("designlab_size_templates").insert({ size_label: label, sort_order: Number(label) || order }).select("id").single()) as { id: string };
    setSelId(row.id); setCustom("");
  }, "Size added");
  const verify = (on: boolean) => run(async () => {
    if (!sel) return;
    must(await db().from("designlab_size_templates").update(on ? { verified: true, verified_by_name: "Admin", verified_at: new Date().toISOString() } : { verified: false, verified_by_name: null, verified_at: null }).eq("id", sel.id));
  }, on ? "Marked as verified" : "Verification removed");
  const del = () => {
    if (!sel || !window.confirm(`Delete the size template “${sel.size_label}”? Pattern revisions already made from it keep their own numbers.`)) return;
    void run(async () => { must(await db().from("designlab_size_templates").delete().eq("id", sel.id)); setSelId(null); }, "Size deleted");
  };

  return (
    <div className="space-y-6">
      <PageHeader section="DesignLab" subtitle="Size & Pattern Master" />
      <DesignLabNav />
      <div role="note" className="crm-panel p-4 text-sm" style={{ borderColor: "#e0a83a88" }}>
        <b style={{ color: "#e0a83a" }}>These are blank, editable templates — not certified standards.</b> Fill them from your own measured master patterns and physical samples. A design&apos;s pattern still has to be verified against its sample and approved before cutting.
      </div>
      {sizes.error && <ErrorBox message={sizes.error} retry={sizes.reload} />}
      {sizes.loading && !sizes.data ? <Skeleton className="h-96" /> : (
        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <Panel title="Sizes">
            <ul className="space-y-1.5">
              {list.map((s) => (
                <li key={s.id}>
                  <button onClick={() => setSelId(s.id)} className="flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm" style={sel?.id === s.id ? { borderColor: "var(--crm-accent)" } : { borderColor: "var(--crm-border-soft)" }}>
                    <span className="crm-serif text-lg">{s.size_label}</span>
                    <span className="flex items-center gap-2 text-xs crm-muted">{filled(s)} values {s.verified && <span style={{ color: "#58c48a" }}>✓</span>}</span>
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-end gap-2">
              <Field label="Custom size" placeholder="e.g. 46" value={custom} maxLength={20} onChange={(e) => setCustom(e.target.value)} className="flex-1" />
              <button className="crm-btn" disabled={busy || !custom.trim()} onClick={add}>Add</button>
            </div>
          </Panel>

          {!sel || !draft ? <Panel><Empty icon={ICONS.edit} title="Choose a size" /></Panel> : (
            <Panel title={`Size ${sel.size_label} template`} action={sel.verified ? <Pill color="#58c48a">Verified {sel.verified_at ? fmtDate(sel.verified_at) : ""}</Pill> : <Pill color="#e0a83a">Not verified</Pill>}>
              <div className="mb-4 grid gap-4 sm:grid-cols-3">
                <Select label="Unit" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value as "in" | "cm" })}>
                  <option value="in">Inches (in)</option>
                  <option value="cm">Centimetres (cm)</option>
                </Select>
                <Field label={`Seam allowance (${draft.unit})`} inputMode="decimal" value={draft.seam} onChange={(e) => setDraft({ ...draft, seam: e.target.value })} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[40rem] text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wider crm-muted"><th className="py-2 pr-3">Point</th><th className="px-2">Body</th><th className="px-2">Finished</th><th className="px-2">Ease</th><th className="px-2">Cutting</th></tr></thead>
                  <tbody>
                    {MEASURE_FIELDS.map((m) => (
                      <tr key={m.key} className="border-t" style={{ borderColor: "var(--crm-border-soft)" }}>
                        <td className="py-1.5 pr-3">{m.label}</td>
                        {(["body", "garment", "ease", "cutting"] as const).map((g) => {
                          const on = g === "body" ? m.body : g === "garment" ? m.garment : g === "ease" ? m.garment && m.body : m.cutting;
                          return <td key={g} className="px-2 py-1">{on ? <input inputMode="decimal" className="crm-input !py-1.5" aria-label={`${m.label} ${g}`} value={draft[g][m.key] ?? ""} onChange={(e) => set(g, m.key, e.target.value)} /> : <span className="crm-muted">—</span>}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Area label="Notes (source of these numbers, grading rules)" rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="mt-4" />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  {role === "admin" && (sel.verified
                    ? <button className="crm-btn" disabled={busy || dirty} onClick={() => verify(false)}>Remove verified mark</button>
                    : <button className="crm-btn" disabled={busy || dirty} onClick={() => verify(true)}>Mark verified (admin)</button>)}
                  <button className="crm-btn" disabled={busy} onClick={del}>Delete</button>
                </div>
                <button className="crm-btn crm-btn-gold" disabled={busy || !dirty} onClick={save}>{busy ? "Saving…" : "Save template"}</button>
              </div>
              <p className="mt-2 text-xs crm-muted">Changing numbers removes an earlier verified mark. A template is only a starting point for a design&apos;s own pattern revision.</p>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
