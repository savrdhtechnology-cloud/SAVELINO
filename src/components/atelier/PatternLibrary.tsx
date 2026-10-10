"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/admin/ui";
import { toast } from "@/lib/admin/store";
import type { Row } from "@/lib/admin/types";
import { DEFAULT_SPEC, PIECE_TYPES, STANDARD_SIZES, type DesignSpec, type Measurements } from "@/lib/atelier/constants";
import { draftPieces, pieceSvg, type PieceGeometry } from "@/lib/atelier/drafting";
import { rpc, useRows, write } from "@/lib/atelier/store";
import { ALL_LAYERS, PatternPiece, type Layers } from "./PatternView";
import { AppHeader, Empty, Notice, Section, Select, btnDanger, btnGhost, btnGold, btnLine, fmtDateTime } from "./ui";
import { Viewport } from "./Viewport";

type Piece = Row & { design_id: string; design_version: number; size_chart_id: string; size: string; piece_type: string; version: number; status: string; geometry: PieceGeometry; approved_at?: string; created_at?: string };
type Design = Row & { name: string; code: string; status: string; category: string; spec: Partial<DesignSpec>; current_version: number };

const STATUS_DOT: Record<string, string> = { approved: "bg-emerald-300", in_review: "bg-gold", draft: "bg-ivory/40", rejected: "bg-red-300", superseded: "bg-ivory/15" };

/** Latest version of each piece type for a design + size. */
export function latestPieces(rows: Piece[]) {
  const best = new Map<string, Piece>();
  for (const p of rows) {
    const cur = best.get(p.piece_type);
    const rank = (x: Piece) => (x.status === "approved" ? 1e6 : 0) + x.version;
    if (!cur || rank(p) > rank(cur)) best.set(p.piece_type, p);
  }
  return PIECE_TYPES.map((t) => best.get(t.value)).filter((p): p is Piece => !!p);
}

export function printPieces(pieces: { g: PieceGeometry; meta: { design: string; size: string; status: string; version: number } }[]) {
  const w = window.open("", "_blank");
  if (!w) return toast("Allow pop-ups to print patterns", "danger");
  const body = pieces.map((p, i) => `<section>${pieceSvg(p.g, p.meta, { calibration: i === 0 })}</section>`).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>SAVLINO patterns</title><style>
  @page { margin: 8mm; }
  html,body { margin:0; background:#fff; color:#000; font-family: Helvetica, Arial, sans-serif; }
  .note { font-size: 11px; padding: 8px 0; }
  section { page-break-after: always; break-after: page; }
  svg { display:block; }
  @media screen { body { padding: 16px; } }
</style></head><body><p class="note">Print at <b>100% / Actual size</b> (turn off “Fit to page”). Check the 10 cm calibration square with a ruler before cutting. Large pieces print across several pages — tile and tape at the edges.</p>${body}<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
  w.document.close();
}

function download(name: string, svg: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function PatternLibrary({ live }: { live: boolean }) {
  const designs = useRows<Design>("garment_designs", "id,code,name,status,category,spec,current_version", live, { order: "updated_at" });
  const charts = useRows("size_charts", "id,category,status,version", live, { order: "version" });
  const [designId, setDesignId] = useState("");
  const design = designs.rows.find((d) => d.id === designId) ?? designs.rows.find((d) => d.status === "approved") ?? designs.rows[0];
  const pieces = useRows<Piece>("pattern_pieces", "id,design_id,design_version,size_chart_id,size,piece_type,version,status,geometry,approved_at,created_at", live, { filter: { column: "design_id", value: design?.id ?? "-" }, order: "created_at" });
  const [size, setSize] = useState("36");
  const [pieceType, setPieceType] = useState("front");
  const [layers, setLayers] = useState<Layers>(ALL_LAYERS);
  const [nest, setNest] = useState(false);
  const [busy, setBusy] = useState(false);

  const chart = charts.rows.find((c) => c.category === design?.category && c.status === "approved") ?? charts.rows.find((c) => c.category === design?.category && c.status === "draft");
  const ms = useRows<Row & Measurements & { size: string }>("size_measurements", "*", live, { filter: { column: "size_chart_id", value: chart?.id ?? "-" } });

  const forSize = useMemo(() => latestPieces(pieces.rows.filter((p) => p.size === size)), [pieces.rows, size]);
  const current = forSize.find((p) => p.piece_type === pieceType) ?? forSize[0];
  useEffect(() => {
    if (current && current.piece_type !== pieceType) setPieceType(current.piece_type);
  }, [current, pieceType]);

  const spec: DesignSpec = { ...DEFAULT_SPEC, ...(design?.spec ?? {}) };
  const measure = ms.rows.find((m) => m.size === size);

  const draft = async () => {
    if (!design || !chart || !measure) return;
    setBusy(true);
    const generated = draftPieces(measure, spec);
    const rows = generated.map((g) => {
      const prev = pieces.rows.filter((p) => p.size === size && p.piece_type === g.piece);
      return {
        design_id: design.id,
        design_version: design.current_version,
        size_chart_id: chart.id,
        size,
        piece_type: g.piece,
        version: Math.max(0, ...prev.map((p) => p.version)) + 1,
        geometry: g,
        seam_allowance: g.seamAllowance,
      };
    });
    const { error } = await write(live, "pattern_pieces", "insert", rows);
    setBusy(false);
    if (error) toast(error, "danger");
    else toast(`${rows.length} draft pieces created for size ${size} — submit for Pattern Master review`);
  };

  const act = async (fn: string, args: Record<string, unknown>, msg: string) => {
    const { error } = await rpc(live, fn, args, ["pattern_pieces"]);
    if (error) toast(error, "danger");
    else toast(msg);
  };

  const submitAll = async () => {
    for (const p of forSize.filter((x) => x.status === "draft" || x.status === "rejected")) {
      const { error } = await rpc(live, "atelier_submit_pattern", { p_piece: p.id }, ["pattern_pieces"]);
      if (error) return toast(error, "danger");
    }
    toast("Sent for Pattern Master review");
  };

  const meta = (p: Piece) => ({ design: design?.name ?? "", size: p.size, status: p.status, version: p.version });
  const nestPieces = nest && current ? STANDARD_SIZES.map((s) => latestPieces(pieces.rows.filter((p) => p.size === s)).find((p) => p.piece_type === current.piece_type)).filter((p): p is Piece => !!p) : [];
  const box = (() => {
    const list = nestPieces.length ? nestPieces : current ? [current] : [];
    if (!list.length) return { x: 0, y: 0, w: 40, h: 50 };
    const b = list.map((p) => p.geometry.bounds);
    const minX = Math.min(...b.map((x) => x.minX)), minY = Math.min(...b.map((x) => x.minY)) - 2;
    return { x: minX - 2, y: minY, w: Math.max(...b.map((x) => x.maxX)) - minX + 6, h: Math.max(...b.map((x) => x.maxY)) - minY + 3 };
  })();

  return (
    <div className="space-y-6">
      <AppHeader
        live={live}
        eyebrow="Atelier · Pattern Library"
        title="Pattern Library"
        description="Size-wise 2D pattern sets drafted from the approved size chart. Drafts must be reviewed and approved by the Pattern Master before production can use them."
        actions={
          <div className="flex flex-wrap gap-2">
            <Select ariaLabel="Design" value={design?.id ?? ""} onChange={setDesignId} options={designs.rows.map((d) => ({ value: d.id, label: `${d.name} (${d.status})` }))} />
          </div>
        }
      />

      {!design ? (
        <Empty title="No designs yet" body="Create a design in the Design Studio first." />
      ) : (
        <>
          <Section title="Size-wise library">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-[0.55rem] uppercase tracking-[0.2em] text-ivory/50">
                    <th className="px-2 py-2 text-left font-normal">Piece</th>
                    {STANDARD_SIZES.map((s) => (
                      <th key={s} className="px-2 py-2 text-center font-normal">
                        <button onClick={() => setSize(s)} className={`px-2 py-1 ${size === s ? "bg-gold text-noir" : "hover:text-gold"}`}>Size {s}</button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PIECE_TYPES.filter((t) => (spec.sleeve !== "sleeveless" || !t.value.includes("sleeve")) && (spec.lining !== "none" || !t.value.startsWith("lining"))).map((t) => (
                    <tr key={t.value} className="border-t border-gold/[0.07]">
                      <td className="px-2 py-2 text-ivory/80">{t.label}</td>
                      {STANDARD_SIZES.map((s) => {
                        const p = latestPieces(pieces.rows.filter((x) => x.size === s)).find((x) => x.piece_type === t.value);
                        return (
                          <td key={s} className="px-2 py-2 text-center">
                            {p ? (
                              <button onClick={() => { setSize(s); setPieceType(t.value); }} className="inline-flex items-center gap-1.5 text-[0.65rem] text-ivory/70 hover:text-gold" title={`${p.status} · v${p.version}`}>
                                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[p.status] ?? "bg-ivory/30"}`} /> v{p.version}
                              </button>
                            ) : (
                              <span className="text-ivory/20">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 flex flex-wrap gap-4 text-[0.6rem] uppercase tracking-[0.18em] text-ivory/45">
              {Object.entries(STATUS_DOT).map(([k, c]) => <span key={k} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${c}`} />{k.replace("_", " ")}</span>)}
            </p>
          </Section>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {forSize.map((p) => (
                  <button key={p.id} onClick={() => setPieceType(p.piece_type)} className={`relative px-3 py-1.5 text-[0.6rem] uppercase tracking-[0.2em] ${current?.id === p.id ? "text-noir" : "text-ivory/70 hover:text-gold"}`}>
                    {current?.id === p.id && <motion.span layoutId="piece-tab" className="absolute inset-0 bg-gold" />}
                    <span className="relative">{p.geometry.label}</span>
                  </button>
                ))}
              </div>
              {current ? (
                <Viewport key={`${current.id}-${nest}`} content={box} grid={1} className="h-[560px]" label={`${current.geometry.label} pattern, size ${size}`}>
                  <AnimatePresence>
                    {nestPieces.filter((p) => p.id !== current.id).map((p) => <PatternPiece key={p.id} g={p.geometry} layers={{ ...layers, labels: false, measurements: false }} tone="muted" ghost />)}
                  </AnimatePresence>
                  <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                    <PatternPiece g={current.geometry} layers={layers} />
                  </motion.g>
                </Viewport>
              ) : (
                <Empty
                  title={`No pattern for size ${size} yet`}
                  body={measure ? "Draft the full pattern set from this size’s chart measurements. Drafts are blocks for the Pattern Master to check against a fit sample." : "Add and approve measurements for this size in Size Charts first."}
                  action={measure ? <button onClick={draft} disabled={busy} className={btnGold}>Draft pattern set · size {size}</button> : undefined}
                />
              )}
              <div className="flex flex-wrap gap-3 text-[0.6rem] uppercase tracking-[0.2em] text-ivory/60">
                {(Object.keys(ALL_LAYERS) as (keyof Layers)[]).map((k) => (
                  <label key={k} className="flex items-center gap-1.5">
                    <input type="checkbox" checked={layers[k]} onChange={(e) => setLayers((l) => ({ ...l, [k]: e.target.checked }))} className="accent-[#d4af37]" />
                    {k === "seam" ? "Seam allowance" : k === "grain" ? "Grainline" : k}
                  </label>
                ))}
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={nest} onChange={(e) => setNest(e.target.checked)} className="accent-[#d4af37]" /> Grade nest (all sizes)
                </label>
              </div>
            </div>

            <aside className="space-y-4">
              {!chart && <Notice tone="danger">No size chart for this category. Create and approve one in Size Charts.</Notice>}
              {chart && chart.status !== "approved" && <Notice>Drafting from a draft chart. Patterns cannot be approved until the chart is approved.</Notice>}
              {design.status !== "approved" && <Notice tone="info">Design is “{design.status}”. Patterns can be prepared now; production needs the design approved too.</Notice>}
              {current && (
                <Section title="Piece" aside={<StatusBadge value={current.status} />}>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-[0.55rem] uppercase tracking-[0.2em] text-ivory/45">Piece</dt><dd className="text-ivory">{current.geometry.label}</dd></div>
                    <div><dt className="text-[0.55rem] uppercase tracking-[0.2em] text-ivory/45">Pattern version</dt><dd className="text-ivory">v{current.version}</dd></div>
                    <div><dt className="text-[0.55rem] uppercase tracking-[0.2em] text-ivory/45">Size</dt><dd className="text-ivory">{current.size}</dd></div>
                    <div><dt className="text-[0.55rem] uppercase tracking-[0.2em] text-ivory/45">Design version</dt><dd className="text-ivory">v{current.design_version}</dd></div>
                    <div><dt className="text-[0.55rem] uppercase tracking-[0.2em] text-ivory/45">Cut</dt><dd className="text-ivory">{current.geometry.cutCount}</dd></div>
                    <div><dt className="text-[0.55rem] uppercase tracking-[0.2em] text-ivory/45">Seam allowance</dt><dd className="text-ivory">{current.geometry.seamAllowance} cm</dd></div>
                    <div className="col-span-2"><dt className="text-[0.55rem] uppercase tracking-[0.2em] text-ivory/45">{current.status === "approved" ? "Approved" : "Drafted"}</dt><dd className="text-ivory">{fmtDateTime(current.approved_at ?? current.created_at)}</dd></div>
                  </dl>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {(current.status === "draft" || current.status === "rejected") && <button onClick={() => act("atelier_submit_pattern", { p_piece: current.id }, "Sent for review")} className={btnLine}>Submit for review</button>}
                    {current.status === "in_review" && (
                      <>
                        <button onClick={() => act("atelier_review_pattern", { p_piece: current.id, p_decision: "approved", p_comment: null }, "Pattern approved for production")} className={btnGold}>Approve</button>
                        <button onClick={() => act("atelier_review_pattern", { p_piece: current.id, p_decision: "changes_requested", p_comment: null }, "Sent back to draft")} className={btnLine}>Request changes</button>
                        <button onClick={() => act("atelier_review_pattern", { p_piece: current.id, p_decision: "rejected", p_comment: null }, "Pattern rejected")} className={btnDanger}>Reject</button>
                      </>
                    )}
                  </div>
                </Section>
              )}
              <Section title={`Pattern set · size ${size}`}>
                <div className="grid gap-2">
                  {measure && <button onClick={draft} disabled={busy} className={btnLine}>{forSize.length ? "Redraft as new version" : "Draft pattern set"}</button>}
                  {forSize.some((p) => p.status === "draft" || p.status === "rejected") && <button onClick={submitAll} className={btnLine}>Submit all drafts for review</button>}
                  {current && <button onClick={() => download(`savlino-${design.code}-${size}-${current.piece_type}-v${current.version}.svg`, pieceSvg(current.geometry, meta(current), { calibration: true }))} className={btnGhost}>Export SVG (true scale)</button>}
                  {forSize.length > 0 && <button onClick={() => printPieces(forSize.map((p) => ({ g: p.geometry, meta: meta(p) })))} className={btnGhost}>Print / save PDF (true scale)</button>}
                </div>
                <p className="mt-3 text-[0.65rem] leading-relaxed text-ivory/45">Exports are drawn at 1:1 in centimetres with a 10 cm calibration square. Unapproved pieces are watermarked “not approved for production”.</p>
              </Section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
