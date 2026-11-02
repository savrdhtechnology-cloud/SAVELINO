import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { fabricNeed, fmtNum, STD_SIZES, spools } from "@/lib/designlab/requirements";
import { pickSizes, staffClient, type RevisionRow, type TemplateRow } from "@/lib/designlab/server";
import { PrintButton } from "../PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Material requirement", robots: { index: false, follow: false } };

const MAROON = "#7a1f2b", PINK = "#b0176b";
const cell: CSSProperties = { border: "1px solid #bbb", padding: "4px 8px", fontSize: 12 };
const head: CSSProperties = { ...cell, background: "#f7dce9", fontWeight: 700, textAlign: "left" };
const c: CSSProperties = { ...cell, textAlign: "center" };

type Q = { category?: string; w?: string; lined?: string; s?: string; m?: string; l?: string; xl?: string };

export default async function Requirements({ searchParams }: { searchParams: Promise<Q> }) {
  const q = await searchParams;
  const sb = await staffClient();
  const { data: designsRaw } = await sb.from("designlab_designs").select("id, design_code, name, category, color, fabric, lining, status").eq("archived", false).order("design_code");
  const designs = (designsRaw ?? []) as { id: string; design_code: string; name: string; category: string; color: string; fabric: string; lining: string; status: string }[];
  const { data: tpl } = await sb.from("designlab_size_templates").select("*").order("sort_order");
  const { data: revs } = await sb.from("designlab_pattern_revisions").select("*, designlab_patterns(design_id)");
  const templates = (tpl ?? []) as TemplateRow[];
  const revByDesign = new Map<string, RevisionRow[]>();
  for (const r of (revs ?? []) as (RevisionRow & { designlab_patterns: { design_id: string } | null })[]) {
    const id = r.designlab_patterns?.design_id;
    if (id) revByDesign.set(id, [...(revByDesign.get(id) ?? []), r]);
  }

  const categories = [...new Set(designs.map((d) => d.category || "Uncategorised"))].sort();
  const chosen = q.category && categories.includes(q.category) ? [q.category] : categories;
  const widthIn = Number(q.w) > 20 ? Number(q.w) : 44;
  const lined = q.lined !== "0";
  const qty: Record<string, number> = { S: Math.max(0, Math.floor(Number(q.s ?? 1)) || 0), M: Math.max(0, Math.floor(Number(q.m ?? 1)) || 0), L: Math.max(0, Math.floor(Number(q.l ?? 1)) || 0), XL: Math.max(0, Math.floor(Number(q.xl ?? 1)) || 0) };
  const perDesign = Object.values(qty).reduce((a, b) => a + b, 0);
  const inp: CSSProperties = { width: 52, padding: 4 };

  return (
    <div style={{ background: "#fff", color: "#111", minHeight: "100vh", padding: 24, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <style>{`@page { size: A4 landscape; margin: 10mm } @media print { body { background: #fff !important } .no-print { display: none !important } }`}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <form className="no-print" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "end", marginBottom: 14, fontSize: 13 }}>
          <label>Category<br /><select name="category" defaultValue={q.category ?? ""} style={{ padding: 5 }}><option value="">All categories</option>{categories.map((x) => <option key={x}>{x}</option>)}</select></label>
          {(["S", "M", "L", "XL"] as const).map((s) => <label key={s}>Qty {s}<br /><input name={s.toLowerCase()} type="number" min={0} defaultValue={qty[s]} style={inp} /></label>)}
          <label>Fabric width (in)<br /><input name="w" type="number" defaultValue={widthIn} style={inp} /></label>
          <label>Lining<br /><select name="lined" defaultValue={lined ? "1" : "0"} style={{ padding: 5 }}><option value="1">Lined</option><option value="0">Unlined</option></select></label>
          <button style={{ padding: "6px 14px" }}>Update</button>
          <span style={{ flex: 1 }} />
          <a href="/admin/designlab/library" style={{ color: MAROON }}>← Library</a>
          <PrintButton />
        </form>

        {chosen.map((cat) => {
          const list = designs.filter((d) => (d.category || "Uncategorised") === cat);
          const calc = list.map((d) => ({ d, sizes: pickSizes(templates, revByDesign.get(d.id) ?? [], [...STD_SIZES]).map((s) => ({ s, need: fabricNeed(s.spec, { widthIn, lined }) })) }));
          const tot = STD_SIZES.map((sz, i) => {
            const pieces = qty[sz] * calc.length;
            const sum = (f: (n: ReturnType<typeof fabricNeed>) => number) => calc.reduce((a, x) => a + f(x.sizes[i].need) * qty[sz], 0);
            return { sz, pieces, fabric: sum((n) => n.fabricM), lining: sum((n) => n.liningM), fusing: sum((n) => n.fusingM), hooks: sum((n) => n.hooks) };
          });
          const T = (f: (t: (typeof tot)[number]) => number) => tot.reduce((a, t) => a + f(t), 0);
          return (
            <section key={cat} style={{ pageBreakAfter: "always", breakAfter: "page", marginBottom: 24 }}>
              <header style={{ display: "flex", justifyContent: "space-between", borderBottom: `3px double ${MAROON}`, paddingBottom: 6 }}>
                <div><h1 style={{ margin: 0, fontSize: 22, letterSpacing: 3, color: MAROON, fontFamily: "Georgia, serif" }}>SAVLINO</h1><p style={{ margin: 0, fontSize: 11, letterSpacing: 2 }}>MATERIAL REQUIREMENT</p></div>
                <div style={{ textAlign: "right" }}><p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{cat}</p><p style={{ margin: 0, fontSize: 12 }}>{list.length} design(s) · fabric width {widthIn}” · {lined ? "lined" : "unlined"} · {new Date().toLocaleDateString("en-IN")}</p></div>
              </header>

              <h3 style={{ fontSize: 14, margin: "10px 0 4px", color: PINK }}>1. Fabric per piece (metres), by design and size</h3>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead><tr><th style={head}>Design</th><th style={head}>Colour</th><th style={head}>Fabric</th>{STD_SIZES.map((s) => <th key={s} style={{ ...head, textAlign: "center" }}>{s}</th>)}<th style={head}>Pattern source</th></tr></thead>
                <tbody>
                  {calc.map(({ d, sizes }) => (
                    <tr key={d.id}>
                      <td style={cell}><b>{d.design_code}</b> {d.name}</td><td style={cell}>{d.color || "—"}</td><td style={cell}>{d.fabric || "—"}</td>
                      {sizes.map(({ need }, i) => <td key={i} style={c}>{fmtNum(need.fabricM)}</td>)}
                      <td style={{ ...cell, fontSize: 10, color: sizes.every((x) => x.s.verified) ? "#2e7d32" : "#b71c1c" }}>{sizes.every((x) => x.s.verified) ? "approved patterns" : sizes.some((x) => x.s.source === "template") ? "size template (unverified)" : "design revisions (not all approved)"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 style={{ fontSize: 14, margin: "14px 0 4px", color: PINK }}>2. Total requirement — {perDesign} piece(s) of each design ({STD_SIZES.map((s) => `${s}×${qty[s]}`).join(", ")}) × {calc.length} design(s) = {perDesign * calc.length} pieces</h3>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead><tr><th style={head}>Material</th>{STD_SIZES.map((s) => <th key={s} style={{ ...head, textAlign: "center" }}>{s}</th>)}<th style={{ ...head, textAlign: "center" }}>TOTAL</th></tr></thead>
                <tbody>
                  <tr><td style={cell}>Pieces</td>{tot.map((t) => <td key={t.sz} style={c}>{t.pieces}</td>)}<td style={{ ...c, fontWeight: 700 }}>{T((t) => t.pieces)}</td></tr>
                  <tr><td style={cell}>Main fabric (m)</td>{tot.map((t) => <td key={t.sz} style={c}>{fmtNum(t.fabric)}</td>)}<td style={{ ...c, fontWeight: 700 }}>{fmtNum(T((t) => t.fabric))}</td></tr>
                  <tr><td style={cell}>Lining (m)</td>{tot.map((t) => <td key={t.sz} style={c}>{fmtNum(t.lining)}</td>)}<td style={{ ...c, fontWeight: 700 }}>{fmtNum(T((t) => t.lining))}</td></tr>
                  <tr><td style={cell}>Fusing / interlining (m)</td>{tot.map((t) => <td key={t.sz} style={c}>{fmtNum(t.fusing)}</td>)}<td style={{ ...c, fontWeight: 700 }}>{fmtNum(T((t) => t.fusing))}</td></tr>
                  <tr><td style={cell}>Hook &amp; eye sets</td>{tot.map((t) => <td key={t.sz} style={c}>{t.hooks * 1}</td>)}<td style={{ ...c, fontWeight: 700 }}>{T((t) => t.hooks)}</td></tr>
                  <tr><td style={cell}>Thread (spools)</td>{tot.map((t) => <td key={t.sz} style={c}>{spools(t.pieces)}</td>)}<td style={{ ...c, fontWeight: 700 }}>{spools(T((t) => t.pieces))}</td></tr>
                </tbody>
              </table>
              <p style={{ fontSize: 10, color: "#555", marginTop: 6 }}>Estimate from finished measurements: 4 body panels across the fabric width + facing, 5% wastage, rounded up to 5 cm. Sleeves are included only where a sleeve length is entered. Buy a little extra for pattern matching / borders and confirm with a lay plan.</p>
            </section>
          );
        })}
        {chosen.length === 0 && <p>No designs yet.</p>}
      </div>
    </div>
  );
}
