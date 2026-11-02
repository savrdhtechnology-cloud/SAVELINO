"use client";

import { useEffect, useMemo, useState } from "react";
import { Panel, Field, Area, Select, Empty, Skeleton, ICONS, toast, fmtDateTime } from "@/components/crm/ui";
import { db, must, useLoad } from "@/components/crm/data";
import { MEASURE_FIELDS, errMsg, fetchRevisions, fetchSizes, num, rpc, useRole, type DlDesign, type Measures, type Revision, type RevisionStatus } from "./data";
import { ErrorBox, Pill } from "./shared";

const REV_COLOR: Record<RevisionStatus, string> = { draft: "#e0a83a", submitted: "#5aa0e8", approved: "#58c48a", rejected: "#ef6b6b", superseded: "#8a8a8a" };
const REQUIRED_G = MEASURE_FIELDS.filter((m) => m.required).map((m) => m.key);
const REQUIRED_C = ["bust", "front_length", "back_length", "shoulder"];

type Draft = Pick<Revision, "unit" | "body" | "garment" | "ease" | "cutting" | "cutting_notes" | "stitching_notes"> & { seam: string };
const toDraft = (r: Revision): Draft => ({ unit: r.unit, body: r.body ?? {}, garment: r.garment ?? {}, ease: r.ease ?? {}, cutting: r.cutting ?? {}, cutting_notes: r.cutting_notes, stitching_notes: r.stitching_notes, seam: r.seam_allowance == null ? "" : String(r.seam_allowance) });

export function missingFor(d: Pick<Draft, "garment" | "cutting" | "seam">): string[] {
  const out: string[] = [];
  for (const k of REQUIRED_G) if (!d.garment[k]?.trim()) out.push(`finished ${k.replace(/_/g, " ")}`);
  for (const k of REQUIRED_C) if (!d.cutting[k]?.trim()) out.push(`cutting ${k.replace(/_/g, " ")}`);
  if (d.seam.trim() === "") out.push("seam allowance");
  return out;
}

export function PatternTab({ design, part }: { design: DlDesign; part: "measurements" | "pattern" }) {
  const revs = useLoad(() => fetchRevisions(design.id), [design.id]);
  const sizes = useLoad(fetchSizes, []);
  const role = useRole();
  const [selId, setSelId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [newSize, setNewSize] = useState("38");
  const [custom, setCustom] = useState("");
  const [copyFrom, setCopyFrom] = useState("");
  const [by, setBy] = useState("");
  const [note, setNote] = useState("");

  const list = revs.data ?? [];
  const sel = list.find((r) => r.id === selId) ?? list[0] ?? null;
  useEffect(() => { if (sel) setDraft(toDraft(sel)); else setDraft(null); }, [sel?.id, sel?.status, sel?.sample_verified, revs.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const editable = !!sel && (sel.status === "draft" || sel.status === "rejected");
  const missing = useMemo(() => (draft ? missingFor(draft) : []), [draft]);
  const dirty = !!sel && !!draft && JSON.stringify(draft) !== JSON.stringify(toDraft(sel));

  const act = async (job: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await job(); toast(ok); await revs.reload(); } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); }
  };

  const create = () => act(async () => {
    const size = (newSize === "__custom" ? custom : newSize).trim();
    const tpl = (sizes.data ?? []).find((s) => s.size_label === size);
    const id = await rpc<string>("designlab_create_revision", { p_design: design.id, p_size: size, p_template: copyFrom ? null : tpl?.id ?? null, p_copy_from: copyFrom || null });
    setSelId(id);
  }, "Revision created");

  const addStandard = () => act(async () => {
    const have = new Set(list.map((r) => r.size_label));
    let made = 0;
    for (const label of ["S", "M", "L", "XL"]) {
      if (have.has(label)) continue;
      const tpl = (sizes.data ?? []).find((s) => s.size_label === label);
      if (!tpl) continue;
      await rpc("designlab_create_revision", { p_design: design.id, p_size: label, p_template: tpl.id, p_copy_from: null });
      made++;
    }
    if (made === 0) throw new Error("S, M, L and XL already exist for this design (or their templates are missing — run migration 005).");
  }, "S / M / L / XL revisions added from the size templates");

  const save = () => act(async () => {
    if (!sel || !draft) return;
    const seam = num(draft.seam);
    if (draft.seam.trim() !== "" && (seam == null || seam < 0)) throw new Error("Seam allowance must be a number ≥ 0");
    must(await db().from("designlab_pattern_revisions").update({ unit: draft.unit, body: draft.body, garment: draft.garment, ease: draft.ease, cutting: draft.cutting, cutting_notes: draft.cutting_notes, stitching_notes: draft.stitching_notes, seam_allowance: seam }).eq("id", sel.id));
  }, "Saved");

  const setM = (group: "body" | "garment" | "ease" | "cutting", key: string, v: string) => setDraft((d) => (d ? { ...d, [group]: { ...(d[group] as Measures), [key]: v } } : d));

  if (revs.loading && !revs.data) return <Skeleton className="h-80" />;
  if (revs.error) return <ErrorBox message={revs.error} retry={revs.reload} />;

  const sizeOptions = [...new Set([...(sizes.data ?? []).map((s) => s.size_label)])];
  const isAdmin = role === "admin";

  return (
    <div className="space-y-5">
      <div role="note" className="crm-panel p-4 text-sm" style={{ borderColor: "#e0a83a88" }}>
        <b style={{ color: "#e0a83a" }}>Working values, not certified standards.</b> Exact cutting patterns cannot be derived from photographs. A tailor / pattern master must measure a physical sample of <b>{design.design_code}</b>, then the pattern is approved here before any cutting job is released.
      </div>

      <Panel title="Pattern revisions" icon={ICONS.layers} subtitle={`Pattern ${list.length ? "PT-" + design.design_code : "not started"}`}>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <Select label="Size" value={newSize} onChange={(e) => setNewSize(e.target.value)}>
            {sizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            <option value="__custom">Custom size…</option>
          </Select>
          {newSize === "__custom" ? <Field label="Custom size name" value={custom} maxLength={20} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. 46 or XL-Petite" /> : <div className="hidden sm:block" />}
          <Select label="Start from" value={copyFrom} onChange={(e) => setCopyFrom(e.target.value)}>
            <option value="">Size template (Size & Pattern Master)</option>
            {list.map((r) => <option key={r.id} value={r.id}>Copy of size {r.size_label} rev {r.revision}</option>)}
          </Select>
          <button className="crm-btn crm-btn-gold" disabled={busy || (newSize === "__custom" && !custom.trim())} onClick={create}>New revision</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="crm-btn" disabled={busy} onClick={addStandard}>Add S · M · L · XL from templates</button>
          <a className="crm-btn" href={`/admin/print/designlab/sheet/${design.design_code}`} target="_blank" rel="noreferrer">Cutting sheet (PDF)</a>
        </div>
        {list.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {list.map((r) => (
              <button key={r.id} onClick={() => setSelId(r.id)} className="rounded-full border px-3 py-1.5 text-sm" style={sel?.id === r.id ? { borderColor: "var(--crm-accent)", color: "var(--crm-accent)" } : { borderColor: "var(--crm-border-soft)", color: "var(--crm-muted)" }}>
                {r.size_label} · rev {r.revision} <span className="ml-1 inline-block h-2 w-2 rounded-full" style={{ background: REV_COLOR[r.status] }} />
              </button>
            ))}
          </div>
        )}
      </Panel>

      {!sel || !draft ? (
        <Panel><Empty icon={ICONS.edit} title="No pattern revision yet">Create a revision for a size to start entering measurements.</Empty></Panel>
      ) : (
        <>
          <Panel
            title={`Size ${sel.size_label} · revision ${sel.revision}`}
            action={<div className="flex items-center gap-2"><Pill color={REV_COLOR[sel.status]}>{sel.status}</Pill>{sel.sample_verified ? <Pill color="#58c48a">Sample verified</Pill> : <Pill color="#e0a83a">Sample not verified</Pill>}</div>}
          >
            {!editable && <p className="mb-3 text-sm crm-muted">This revision is {sel.status} and locked. To change anything, make a new revision (copy).</p>}
            <div className="mb-4 max-w-xs">
              <Select label="Unit" value={draft.unit} disabled={!editable} onChange={(e) => setDraft({ ...draft, unit: e.target.value as "in" | "cm" })}>
                <option value="in">Inches (in)</option>
                <option value="cm">Centimetres (cm)</option>
              </Select>
            </div>

            {part === "measurements" ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead><tr className="text-left text-xs uppercase tracking-wider crm-muted"><th className="py-2 pr-3">Point</th><th className="px-2">Body ({draft.unit})</th><th className="px-2">Finished garment ({draft.unit})</th><th className="px-2">Ease ({draft.unit})</th></tr></thead>
                  <tbody>
                    {MEASURE_FIELDS.filter((m) => m.body || m.garment).map((m) => (
                      <tr key={m.key} className="border-t" style={{ borderColor: "var(--crm-border-soft)" }}>
                        <td className="py-1.5 pr-3">{m.label}{m.required && <span className="crm-accent"> *</span>}</td>
                        {(["body", "garment", "ease"] as const).map((g) => (
                          <td key={g} className="px-2 py-1">
                            {(g === "body" ? m.body : g === "garment" ? m.garment : m.garment && m.body) ? (
                              <input inputMode="decimal" className="crm-input !py-1.5" aria-label={`${m.label} ${g}`} disabled={!editable} value={draft[g][m.key] ?? ""} onChange={(e) => setM(g, m.key, e.target.value)} />
                            ) : <span className="crm-muted">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs crm-muted">* needed before the pattern can be submitted. Ease = how much roomier the finished garment is than the body.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {MEASURE_FIELDS.filter((m) => m.cutting).map((m) => (
                    <Field key={m.key} label={`${m.label} — cutting (${draft.unit})${REQUIRED_C.includes(m.key) ? " *" : ""}`} inputMode="decimal" disabled={!editable} value={draft.cutting[m.key] ?? ""} onChange={(e) => setM("cutting", m.key, e.target.value)} />
                  ))}
                  <Field label={`Seam allowance (${draft.unit}) *`} inputMode="decimal" disabled={!editable} value={draft.seam} onChange={(e) => setDraft({ ...draft, seam: e.target.value })} />
                </div>
                <Area label="Cutting notes (grain, fabric direction, fusing, pieces)" disabled={!editable} value={draft.cutting_notes} rows={4} onChange={(e) => setDraft({ ...draft, cutting_notes: e.target.value })} />
                <Area label="Stitching notes for this size" disabled={!editable} value={draft.stitching_notes} rows={4} onChange={(e) => setDraft({ ...draft, stitching_notes: e.target.value })} />
              </div>
            )}
            {editable && <div className="mt-4 flex justify-end"><button className="crm-btn crm-btn-gold" disabled={busy || !dirty} onClick={save}>{busy ? "Saving…" : dirty ? "Save changes" : "Saved"}</button></div>}
          </Panel>

          <Panel title="Verification & approval" icon={ICONS.shield}>
            <div className="space-y-4 text-sm">
              {sel.review_note && <p className="rounded-xl border p-3" style={{ borderColor: sel.status === "rejected" ? "#ef6b6b88" : "var(--crm-border)" }}>Reviewer note: {sel.review_note}</p>}
              {editable && missing.length > 0 && <p className="crm-muted">Still empty: {missing.join(", ")}.</p>}
              <div className="flex flex-wrap items-end gap-3">
                {editable && <button className="crm-btn" disabled={busy || dirty || missing.length > 0} onClick={() => act(() => rpc("designlab_submit_revision", { p_rev: sel.id }), "Submitted for approval")}>Submit for approval</button>}
                {dirty && editable && <span className="text-xs crm-muted">Save first.</span>}
              </div>

              {!sel.sample_verified && ["draft", "submitted", "rejected"].includes(sel.status) && (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <Field label="Verified against the physical sample by" placeholder="Tailor / pattern master name" value={by} onChange={(e) => setBy(e.target.value)} />
                  <button className="crm-btn" disabled={busy || !by.trim() || dirty} onClick={() => act(() => rpc("designlab_verify_sample", { p_rev: sel.id, p_by: by }), "Sample verification recorded")}>Record verification</button>
                </div>
              )}
              {sel.sample_verified && <p>Sample verified by <b>{sel.sample_verified_by}</b> · {sel.sample_verified_at ? fmtDateTime(sel.sample_verified_at) : ""}. Editing the measurements again clears this.</p>}

              {sel.status === "submitted" && (
                isAdmin ? (
                  <div className="space-y-3">
                    <Area label="Note (required to reject)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                    <div className="flex gap-2">
                      <button className="crm-btn crm-btn-gold" disabled={busy || !sel.sample_verified} onClick={() => act(() => rpc("designlab_review_revision", { p_rev: sel.id, p_decision: "approve", p_note: note }), "Pattern approved")}>Approve pattern</button>
                      <button className="crm-btn" disabled={busy || !note.trim()} onClick={() => act(() => rpc("designlab_review_revision", { p_rev: sel.id, p_decision: "reject", p_note: note }), "Pattern rejected")}>Reject</button>
                    </div>
                    {!sel.sample_verified && <p className="text-xs crm-muted">Approval needs the sample verification above.</p>}
                  </div>
                ) : <p className="crm-muted">Waiting for an admin to approve this pattern.</p>
              )}
              {sel.status === "approved" && <p style={{ color: "#58c48a" }}>Approved{sel.approved_at ? ` · ${fmtDateTime(sel.approved_at)}` : ""}. This revision can be released to the tailor.</p>}
              {sel.status === "superseded" && <p className="crm-muted">Replaced by a newer approved revision of this size.</p>}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}
