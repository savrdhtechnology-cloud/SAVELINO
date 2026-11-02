"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader, Panel, Skeleton, Empty, Field, Drawer, ICONS, Icon, toast, fmtDate } from "@/components/crm/ui";
import { db, must, useLoad } from "@/components/crm/data";
import { coverOf, errMsg, fetchDesigns, sortImages, type DesignStatus, type DlDesign } from "./data";
import { DesignLabNav, DesignPill, ErrorBox, Lightbox, Photo, angleLabel, useDebounced } from "./shared";

const FILTERS: { value: "all" | DesignStatus; label: string }[] = [
  { value: "all", label: "All Designs" },
  { value: "new", label: "New" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "in_production", label: "In Production" },
  { value: "completed", label: "Completed" },
];

export function Library() {
  const { data, loading, error, reload, setData } = useLoad(fetchDesigns, []);
  const [filter, setFilter] = useState<"all" | DesignStatus>("all");
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [viewer, setViewer] = useState<{ d: DlDesign; i: number } | null>(null);
  const [edit, setEdit] = useState<DlDesign | null>(null);
  const query = useDebounced(q.trim().toLowerCase());

  const rows = useMemo(() => {
    const all = (data ?? []).filter((d) => d.archived === showArchived);
    return all.filter((d) => (filter === "all" || d.status === filter) && (!query || [d.design_code, d.name, d.category, d.color, d.source_sku ?? ""].some((s) => s.toLowerCase().includes(query))));
  }, [data, filter, query, showArchived]);

  const count = (s: "all" | DesignStatus) => (data ?? []).filter((d) => !d.archived && (s === "all" || d.status === s)).length;
  const patch = (id: string, p: Partial<DlDesign>) => setData((cur) => (cur ?? []).map((d) => (d.id === id ? { ...d, ...p } : d)));

  const archive = async (d: DlDesign, archived: boolean) => {
    if (archived && !window.confirm(`Archive ${d.design_code} · ${d.name}? It stays in the database and can be restored.`)) return;
    try {
      must(await db().from("designlab_designs").update({ archived }).eq("id", d.id));
      patch(d.id, { archived });
      toast(archived ? "Design archived" : "Design restored");
    } catch (e) {
      toast(errMsg(e), "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        section="DesignLab"
        subtitle="Design Library"
        actions={
          <Link href="/admin/designlab/import" className="crm-btn crm-btn-gold">
            <Icon d={ICONS.upload} /> Import ZIP
          </Link>
        }
      />
      <DesignLabNav />

      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                role="tab"
                aria-selected={filter === f.value}
                onClick={() => setFilter(f.value)}
                className="rounded-full border px-4 py-2 text-sm transition-colors"
                style={filter === f.value ? { background: "linear-gradient(180deg, var(--crm-accent-2), var(--crm-accent))", color: "var(--crm-accent-ink)", borderColor: "transparent" } : { borderColor: "var(--crm-border)", color: "var(--crm-muted)" }}
              >
                {f.label} <span className="ml-1 opacity-70">{count(f.value)}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Search" placeholder="ID, name, category, colour" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-72" />
            <label className="flex items-center gap-2 pb-3 text-sm crm-muted">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Archived
            </label>
          </div>
        </div>
      </Panel>

      {error && <ErrorBox message={error} retry={reload} />}
      {loading && !data && (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-96" />)}
        </div>
      )}
      {data && rows.length === 0 && (
        <Panel>
          <Empty icon={ICONS.layers} title={data.length === 0 ? "No designs yet" : "No designs match"}>
            {data.length === 0 ? <>Import a ZIP of blouse photos to create your first designs. <Link href="/admin/designlab/import" className="crm-accent underline">Open ZIP Import</Link></> : "Try another filter or search."}
          </Empty>
        </Panel>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((d) => {
          const imgs = sortImages(d.designlab_images);
          const angles = [...new Set(imgs.map((i) => i.angle).filter((a) => a !== "unlabeled"))];
          return (
            <article key={d.id} className="crm-panel group flex flex-col overflow-hidden">
              <button type="button" onClick={() => imgs.length && setViewer({ d, i: 0 })} aria-label={`View all images of ${d.name}`} className="relative block aspect-[4/5] overflow-hidden">
                <Photo src={coverOf(d)} alt={`${d.name} — main`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <span className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold tracking-wider" style={{ background: "rgba(20,6,10,.78)", color: "var(--crm-accent)", boxShadow: "inset 0 0 0 1px var(--crm-border)" }}>{d.design_code}</span>
                <span className="absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-xs" style={{ background: "rgba(20,6,10,.78)", color: "var(--crm-text)" }}>{imgs.length} {imgs.length === 1 ? "image" : "images"}</span>
              </button>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <h3 className="crm-serif text-xl leading-tight">{d.name}</h3>
                  <p className="mt-1 text-sm crm-muted">{[d.category, d.color].filter(Boolean).join(" · ") || "No category / colour yet"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <DesignPill status={d.status} />
                  {angles.length > 0 && <span className="text-xs crm-muted">{angles.map(angleLabel).join(", ")}</span>}
                </div>
                <p className="text-xs crm-muted">Created {fmtDate(d.created_at)}</p>
                <div className="mt-auto grid grid-cols-2 gap-2 pt-1">
                  <Link href={`/admin/designlab/designs/${d.design_code}`} className="crm-btn crm-btn-gold col-span-2 justify-center">Work on Design</Link>
                  <button className="crm-btn justify-center" onClick={() => imgs.length && setViewer({ d, i: 0 })}>View all images</button>
                  <button className="crm-btn justify-center" onClick={() => setEdit(d)}>Rename / edit</button>
                  <button className="crm-btn col-span-2 justify-center" onClick={() => archive(d, !d.archived)}>{d.archived ? "Restore" : "Archive"}</button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {viewer && (
        <Lightbox
          images={sortImages(viewer.d.designlab_images).map((i) => ({ url: i.url, label: `${viewer.d.design_code} · ${angleLabel(i.angle)}` }))}
          index={viewer.i}
          onIndex={(i) => setViewer({ ...viewer, i })}
          onClose={() => setViewer(null)}
        />
      )}
      <EditDrawer design={edit} onClose={() => setEdit(null)} onSaved={(id, p) => { patch(id, p); setEdit(null); }} />
    </div>
  );
}

function EditDrawer({ design, onClose, onSaved }: { design: DlDesign | null; onClose: () => void; onSaved: (id: string, p: Partial<DlDesign>) => void }) {
  const [f, setF] = useState({ name: "", category: "", color: "" });
  const [id, setId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (design && design.id !== id) {
    setId(design.id);
    setF({ name: design.name, category: design.category, color: design.color });
  }
  const save = async () => {
    if (!design) return;
    if (!f.name.trim()) return toast("Give the design a name", "error");
    setBusy(true);
    try {
      const p = { name: f.name.trim(), category: f.category.trim(), color: f.color.trim() };
      must(await db().from("designlab_designs").update(p).eq("id", design.id));
      toast("Design updated");
      onSaved(design.id, p);
    } catch (e) {
      toast(errMsg(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Drawer open={!!design} onClose={onClose} title={design ? `${design.design_code} · Rename / edit` : ""} footer={<button className="crm-btn crm-btn-gold" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button>}>
      <div className="space-y-4">
        <Field label="Design name" value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Field label="Category" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
        <Field label="Colour" value={f.color} onChange={(e) => setF({ ...f, color: e.target.value })} />
        <p className="text-xs crm-muted">The Design ID ({design?.design_code}) never changes. Images are edited in the Design Workspace.</p>
      </div>
    </Drawer>
  );
}
