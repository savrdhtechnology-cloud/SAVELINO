import type { Metadata } from "next";
import { Fragment, type CSSProperties } from "react";
import { notFound } from "next/navigation";
import { MEASURE_FIELDS } from "@/lib/designlab/fields";
import { cutPieces, fabricNeed, fmtNum, fromInches, layPlan, STD_SIZES, spools } from "@/lib/designlab/requirements";
import { pickSizes, staffClient, type RevisionRow, type TemplateRow } from "@/lib/designlab/server";
import { PrintButton } from "../../PrintButton";
import { Diagram, toDiagram } from "../../Diagram";
import { LayPlan } from "../../LayPlan";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cutting sheet", robots: { index: false, follow: false } };

const MAROON = "#7a1f2b", PINK = "#b0176b";
const cell: CSSProperties = { border: "1px solid #bbb", padding: "4px 8px", fontSize: 12 };
const head: CSSProperties = { ...cell, background: "#f7dce9", fontWeight: 700, textAlign: "left" };

export default async function CuttingSheet({ params, searchParams }: { params: Promise<{ designId: string }>; searchParams: Promise<{ w?: string }> }) {
  const { designId } = await params;
  const { w } = await searchParams;
  const sb = await staffClient();
  const col = /^[0-9a-f-]{36}$/i.test(designId) ? "id" : "design_code";
  const { data: design } = await sb.from("designlab_designs").select("*, designlab_images(url, angle, position)").eq(col, designId).maybeSingle();
  if (!design) notFound();
  const { data: tpl } = await sb.from("designlab_size_templates").select("*").order("sort_order");
  const { data: pat } = await sb.from("designlab_patterns").select("id, pattern_code").eq("design_id", design.id).maybeSingle();
  const { data: revs } = pat ? await sb.from("designlab_pattern_revisions").select("*").eq("pattern_id", pat.id) : { data: [] };
  const templates = (tpl ?? []) as TemplateRow[];
  const revisions = ((revs ?? []) as RevisionRow[]).map((r) => ({ ...r, pattern_code: pat?.pattern_code }));
  const extra = [...new Set(revisions.map((r) => r.size_label))].filter((s) => !(STD_SIZES as readonly string[]).includes(s));
  const sizes = pickSizes(templates, revisions, [...STD_SIZES, ...extra]).filter((s) => s.source !== "none");
  const widthIn = Number(w) > 20 ? Number(w) : 44;
  const images = [...(design.designlab_images ?? [])].sort((a: { position: number }, b: { position: number }) => a.position - b.position).slice(0, 4) as { url: string; angle: string }[];
  const allVerified = sizes.length > 0 && sizes.every((s) => s.verified);
  const rows = MEASURE_FIELDS.filter((m) => m.garment || m.body);
  const page: CSSProperties = { pageBreakAfter: "always", breakAfter: "page" };

  return (
    <div style={{ background: "#fff", color: "#111", minHeight: "100vh", padding: 24, fontFamily: "Arial, Helvetica, sans-serif" }}>
      <style>{`@page { size: A4; margin: 10mm } @media print { body { background: #fff !important } .no-print { display: none !important } }`}</style>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
          <a href={`/admin/designlab/designs/${design.design_code}`} style={{ color: MAROON, fontSize: 14 }}>← Back to design</a>
          <form style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
            Fabric width (in) <input name="w" defaultValue={widthIn} style={{ width: 56, padding: 4 }} /> <button style={{ padding: "4px 10px" }}>Update</button>
          </form>
          <PrintButton />
        </div>

        {/* ───── Page 1 — overview ───── */}
        <section style={page}>
          <header style={{ display: "flex", justifyContent: "space-between", borderBottom: `3px double ${MAROON}`, paddingBottom: 6 }}>
            <div><h1 style={{ margin: 0, fontSize: 24, letterSpacing: 3, color: MAROON, fontFamily: "Georgia, serif" }}>SAVLINO</h1><p style={{ margin: 0, fontSize: 11, letterSpacing: 2 }}>CUTTING SHEET</p></div>
            <div style={{ textAlign: "right" }}><p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{design.design_code}</p><p style={{ margin: 0, fontSize: 12 }}>{design.name}</p></div>
          </header>
          <div style={{ margin: "8px 0", padding: 6, fontSize: 12, fontWeight: 700, border: `2px solid ${allVerified ? "#2e7d32" : "#b71c1c"}`, color: allVerified ? "#2e7d32" : "#b71c1c" }}>
            {allVerified ? "ALL SIZES: pattern approved and verified against the physical sample" : "WORKING DRAFT — values are starter / unverified. Do not cut until the pattern is approved and verified against a physical sample."}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              {images.map((im, i) => (
                <figure key={i} style={{ margin: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.url} alt={`${design.name} ${im.angle}`} style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", borderRadius: 8, border: "1px solid #ccc" }} />
                  <figcaption style={{ fontSize: 10, textAlign: "center" }}>{im.angle === "unlabeled" ? `Photo ${i + 1}` : im.angle}</figcaption>
                </figure>
              ))}
            </div>
            <table style={{ borderCollapse: "collapse", width: "100%", alignSelf: "start" }}><tbody>
              {([["Category", design.category], ["Colour", design.color], ["Fabric", design.fabric], ["Lining", design.lining], ["Neckline", design.neckline], ["Sleeve", design.sleeve], ["Closure", design.closure], ["Seam allowance", sizes[0]?.spec.seam != null ? `${sizes[0].spec.seam} ${sizes[0].spec.unit}` : ""]] as [string, string][]).map(([k, v]) => (
                <tr key={k}><th style={{ ...head, width: "38%" }}>{k}</th><td style={cell}>{v || "—"}</td></tr>
              ))}
            </tbody></table>
          </div>

          <h3 style={{ fontSize: 14, margin: "12px 0 4px", color: PINK }}>MEASUREMENT CHART — all sizes ({sizes[0]?.spec.unit === "cm" ? "cm" : "inches"})</h3>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr><th style={head}>Point</th>{sizes.map((s) => <th key={s.size} style={{ ...head, textAlign: "center" }} colSpan={2}>{s.size}</th>)}</tr>
              <tr><th style={{ ...head, fontWeight: 400 }}></th>{sizes.map((s) => <Fragment key={s.size}><th style={{ ...head, fontWeight: 400 }}>Body</th><th style={{ ...head, fontWeight: 400 }}>Finished</th></Fragment>)}</tr></thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.key}><td style={cell}>{m.label}</td>{sizes.map((s) => <Fragment key={s.size}><td style={{ ...cell, textAlign: "center" }}>{s.spec.body[m.key] || "—"}</td><td style={{ ...cell, textAlign: "center" }}>{s.spec.garment[m.key] || "—"}</td></Fragment>)}</tr>
              ))}
              <tr><td style={cell}>Source</td>{sizes.map((s) => <td key={s.size} colSpan={2} style={{ ...cell, textAlign: "center", fontSize: 10, color: s.verified ? "#2e7d32" : "#b71c1c" }}>{s.source === "template" ? "template · unverified" : `${s.pattern ?? ""} rev ${s.revision} · ${s.source === "approved" && s.verified ? "approved" : "not approved"}`}</td>)}</tr>
            </tbody>
          </table>

          <h3 style={{ fontSize: 14, margin: "12px 0 4px", color: PINK }}>MATERIAL REQUIRED PER PIECE (fabric width {widthIn}”)</h3>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead><tr><th style={head}>Item</th>{sizes.map((s) => <th key={s.size} style={{ ...head, textAlign: "center" }}>{s.size}</th>)}</tr></thead>
            <tbody>
              {(() => {
                const needs = sizes.map((s) => fabricNeed(s.spec, { widthIn, lined: true }));
                return (<>
                  <tr><td style={cell}>Main fabric (m)</td>{needs.map((n, i) => <td key={i} style={{ ...cell, textAlign: "center" }}>{fmtNum(n.fabricM)}</td>)}</tr>
                  <tr><td style={cell}>Lining (m)</td>{needs.map((n, i) => <td key={i} style={{ ...cell, textAlign: "center" }}>{fmtNum(n.liningM)}</td>)}</tr>
                  <tr><td style={cell}>Fusing / interlining (m)</td>{needs.map((n, i) => <td key={i} style={{ ...cell, textAlign: "center" }}>{fmtNum(n.fusingM)}</td>)}</tr>
                  <tr><td style={cell}>Hook &amp; eye sets</td>{needs.map((n, i) => <td key={i} style={{ ...cell, textAlign: "center" }}>{n.hooks}</td>)}</tr>
                  <tr><td style={cell}>Thread (spools per 8 pcs)</td>{needs.map((_, i) => <td key={i} style={{ ...cell, textAlign: "center" }}>{spools(8)}</td>)}</tr>
                </>);
              })()}
            </tbody>
          </table>
          <p style={{ fontSize: 10, color: "#555" }}>Estimate: 4 body panels laid across {widthIn}” fabric + 10” facing, 5% wastage, rounded up to 5 cm; sleeves are added only if a sleeve length is entered. Confirm with a real lay plan before buying fabric.</p>
        </section>

        {/* ───── One page per size, in the reference-sheet layout ───── */}
        {sizes.map((s) => {
          const u = s.spec.unit;
          const body = s.spec.body, gar = s.spec.garment, cut = s.spec.cutting;
          const val = (k: string) => body[k] || gar[k] || "";
          const num = (v: string) => (Number(v) > 0 ? Number(v) : 0);
          const bust = num(val("bust")), waist = num(val("waist"));
          const half = (n: number) => (n ? fmtNum(n / 2, 1) : "—");
          const approx = s.source === "template" ? " (approx.)" : "";
          const pieces = cutPieces(s.spec, { lined: true });
          const lay = layPlan(pieces, widthIn);
          const need = fabricNeed(s.spec, { widthIn, lined: true });
          const d = (n: number) => fmtNum(fromInches(n, u), 1);
          return (
            <Fragment key={s.size}>
            <section style={{ ...page, paddingTop: 4 }}>
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <p style={{ margin: 0, fontSize: 12 }}><b style={{ color: MAROON }}>SAVLINO</b> · {design.design_code} · {design.name}</p>
                <p style={{ margin: 0, fontSize: 11, color: s.verified ? "#2e7d32" : "#b71c1c", fontWeight: 700 }}>{s.verified ? "APPROVED PATTERN" : "UNVERIFIED — NOT FOR CUTTING"}</p>
              </header>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.25fr", gap: 8, alignItems: "start" }}>
                {images.slice(0, 2).map((im, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={im.url} alt="" style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", borderRadius: 10 }} />
                ))}
                {images.length < 2 && <div />}
                <div>
                  <div style={{ border: `2px solid ${PINK}`, background: "#fde9f2", borderRadius: 10, padding: "8px 10px", textAlign: "center", fontWeight: 800, fontSize: 18, lineHeight: 1.25 }}>
                    SIZE {s.size}<br />CHEST – {bust ? fmtNum(bust, 1) : "—"} {u === "in" ? "INCH" : "CM"}<br />WAIST – {waist ? fmtNum(waist, 1) : "—"} {u === "in" ? "INCH" : "CM"}
                  </div>
                  <ul style={{ fontSize: 12, paddingLeft: 16, margin: "8px 0" }}>
                    <li>All measurements are in {u === "in" ? "inches" : "centimetres"}</li>
                    <li>Half measurements are shown for stitching</li>
                    <li>Add {s.spec.seam ?? "—"} {u} seam allowance on all sides</li>
                    <li>Measurements may vary as per body shape</li>
                  </ul>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
                <div><p style={{ margin: "0 0 2px", background: PINK, color: "#fff", textAlign: "center", borderRadius: 14, fontSize: 12, fontWeight: 700 }}>FRONT VIEW (HALF)</p><Diagram d={toDiagram("front", u, body, gar)} /></div>
                <div><p style={{ margin: "0 0 2px", background: PINK, color: "#fff", textAlign: "center", borderRadius: 14, fontSize: 12, fontWeight: 700 }}>BACK VIEW (HALF)</p><Diagram d={toDiagram("back", u, body, gar)} /></div>
              </div>
              <p style={{ fontSize: 9, color: "#777", margin: "0 0 6px", textAlign: "center" }}>Schematic — not to scale and not a cutting pattern.</p>

              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 10 }}>
                <div>
                  <p style={{ margin: "0 0 2px", background: PINK, color: "#fff", textAlign: "center", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>MEASUREMENT CHART (BODY)</p>
                  <table style={{ borderCollapse: "collapse", width: "100%" }}><thead><tr><th style={head}>Measurement</th><th style={{ ...head, textAlign: "center" }}>Size ({u})</th></tr></thead><tbody>
                    {([["Chest (Bust)", "bust", ""], ["Waist", "waist", ""], ["Shoulder", "shoulder", approx], ["Blouse length (front)", "front_length", approx], ["Blouse length (back)", "back_length", approx], ["Neck depth (front)", "front_neck_depth", approx], ["Neck depth (back)", "back_neck_depth", approx], ["Neck width", "neck_width", approx], ["Armhole depth", "armhole", approx]] as [string, string, string][]).map(([l, k, a]) => (
                      <tr key={k}><td style={cell}>{l}</td><td style={{ ...cell, textAlign: "center" }}>{val(k) ? `${val(k)}${a}` : "—"}</td></tr>
                    ))}
                  </tbody></table>
                </div>
                <div>
                  <p style={{ margin: "0 0 2px", background: PINK, color: "#fff", textAlign: "center", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>KEY POINTS</p>
                  <ul style={{ fontSize: 12, margin: "4px 0", paddingLeft: 16 }}>
                    <li>Chest (bust) – {bust ? fmtNum(bust, 1) : "—"}</li><li>Waist – {waist ? fmtNum(waist, 1) : "—"}</li>
                    <li>Chest (half) – {half(bust)}</li><li>Waist (half) – {half(waist)}</li>
                    <li>Finished bust – {gar.bust || "—"} (ease {s.spec.ease?.bust || "—"})</li>
                    <li>Cutting bust (with seams) – {cut.bust || "—"}</li>
                    <li>Cutting length (front / back) – {cut.front_length || "—"} / {cut.back_length || "—"}</li>
                    <li>Closure allowance – {cut.closure_allowance || "—"} · Hem – {cut.hem_allowance || "—"}</li>
                    <li>Seam allowance – {s.spec.seam ?? "—"} on all sides</li>
                  </ul>
                  {(() => { const n = fabricNeed(s.spec, { widthIn }); return <p style={{ fontSize: 12, margin: "4px 0", border: "1px solid #bbb", padding: 6 }}><b>Material per piece:</b> fabric {fmtNum(n.fabricM)} m · lining {fmtNum(n.liningM)} m · fusing {fmtNum(n.fusingM)} m · {n.hooks} hook sets</p>; })()}
                </div>
              </div>
              <p style={{ marginTop: 8, padding: 6, background: "#fde9f2", border: `1px solid ${PINK}`, borderRadius: 6, fontSize: 11 }}>
                <b>Note:</b> {s.source === "template" ? "These are STARTER values from the size template. Measure the physical sample, correct them in DesignLab, and get the pattern approved before cutting." : "Values come from this design's pattern revision."} Adjust as per body shape and fitting preference.
              </p>
            </section>

            <section style={{ ...page, paddingTop: 4 }}>
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, borderBottom: `2px solid ${MAROON}` }}>
                <p style={{ margin: 0, fontSize: 13 }}><b style={{ color: MAROON }}>SAVLINO</b> · {design.design_code} · {design.name} · <b>SIZE {s.size} — CUTTING GUIDE</b></p>
                <p style={{ margin: 0, fontSize: 11, color: s.verified ? "#2e7d32" : "#b71c1c", fontWeight: 700 }}>{s.verified ? "APPROVED PATTERN" : "UNVERIFIED — NOT FOR CUTTING"}</p>
              </header>
              <h3 style={{ fontSize: 13, margin: "6px 0 3px", color: PINK }}>1. FABRIC & MATERIAL NEEDED (1 piece, fabric width {widthIn}”)</h3>
              <table style={{ borderCollapse: "collapse", width: "100%" }}><tbody>
                <tr><th style={head}>Main fabric</th><td style={cell}>{fmtNum(need.fabricM)} m</td><th style={head}>Lining</th><td style={cell}>{fmtNum(need.liningM)} m</td><th style={head}>Fusing</th><td style={cell}>{fmtNum(need.fusingM)} m</td></tr>
                <tr><th style={head}>Hook &amp; eye sets</th><td style={cell}>{need.hooks}</td><th style={head}>Thread</th><td style={cell}>1 spool per 8 pcs</td><th style={head}>Seam allowance</th><td style={cell}>{s.spec.seam ?? "—"} {u}</td></tr>
              </tbody></table>

              <h3 style={{ fontSize: 13, margin: "10px 0 3px", color: PINK }}>2. PIECES TO CUT (sizes in {u === "in" ? "inches" : "cm"}, seam + hem allowance already added)</h3>
              <table style={{ borderCollapse: "collapse", width: "100%" }}>
                <thead><tr><th style={head}>Piece</th><th style={head}>Fabric</th><th style={{ ...head, textAlign: "center" }}>Qty</th><th style={{ ...head, textAlign: "center" }}>Width × Length</th><th style={head}>How</th></tr></thead>
                <tbody>{pieces.map((p, i) => (
                  <tr key={i}><td style={cell}>{p.name}</td><td style={cell}>{p.fabric}</td><td style={{ ...cell, textAlign: "center" }}>{p.qty}</td><td style={{ ...cell, textAlign: "center" }}>{d(p.w)} × {d(p.l)}</td><td style={{ ...cell, fontSize: 11 }}>{p.note}</td></tr>
                ))}</tbody>
              </table>
              <p style={{ fontSize: 10, color: "#555", margin: "3px 0" }}>Pieces are cut as rectangles first, then the neck, armhole and dart curves are marked from the pattern / sample and trimmed.{!need.usedSleeve ? " No sleeve length entered, so this is a sleeveless blouse." : ""}</p>

              <h3 style={{ fontSize: 13, margin: "10px 0 3px", color: PINK }}>3. LAY PLAN — main fabric (about {fmtNum(fromInches(lay.length, "in") * 0.0254, 2)} m used before wastage)</h3>
              <LayPlan placed={lay.placed} widthIn={widthIn} length={lay.length} />

              <h3 style={{ fontSize: 13, margin: "10px 0 3px", color: PINK }}>4. HOW TO CUT — step by step</h3>
              <ol style={{ fontSize: 12, margin: 0, paddingLeft: 18, lineHeight: 1.5 }}>
                <li>Press the fabric flat. Check for flaws and mark them so no piece falls on one. Pre-wash or steam if the fabric can shrink.</li>
                <li>Fold the fabric in half lengthways, <b>right sides together</b>, selvedges matching. The grain line of every piece runs parallel to the selvedge.</li>
                <li>Place the pieces as in the lay plan. For fabrics with a motif or one-way shine, keep all pieces facing the same direction.</li>
                <li>Mark each piece with tailor’s chalk: width × length from the table above, then the bust dart, neckline (front depth {val("front_neck_depth") || "—"}, back depth {val("back_neck_depth") || "—"}, width {val("neck_width") || "—"}) and armhole (depth {val("armhole") || "—"}) from the pattern or sample.</li>
                <li>Cut with sharp shears using long strokes. Cut the front and back panels twice so you get a left and a right. Cut notches (small snips) at the bust point, waist and shoulder.</li>
                <li>Cut the lining with the same shapes. Cut the bias strip at 45° to the grain.</li>
                <li>Iron fusing on the wrong side of the neck and closure edges before stitching.</li>
                <li>Bundle the pieces of one blouse together with a ticket: {design.design_code} · size {s.size} · {design.color || "colour"}. Check the piece count against the table before handing over to the tailor.</li>
              </ol>
              <p style={{ marginTop: 8, padding: 6, background: "#fde9f2", border: `1px solid ${PINK}`, borderRadius: 6, fontSize: 11 }}>
                <b>Note:</b> This guide is a starting estimate from standard size values. Make one sample piece first, check the fit, correct the pattern in DesignLab and get it approved before cutting a full batch.
              </p>
            </section>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
