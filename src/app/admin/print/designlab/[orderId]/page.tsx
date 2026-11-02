import type { Metadata } from "next";
import { Fragment, type CSSProperties } from "react";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient, getSessionContext, isStaffRole } from "@/lib/supabase/server";
import { MEASURE_FIELDS } from "@/lib/designlab/fields";
import { PrintButton } from "../PrintButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tailor job card", robots: { index: false, follow: false } };

type M = Record<string, string>;
type Rev = { id: string; revision: number; size_label: string; unit: string; garment: M; body: M; ease: M; cutting: M; seam_allowance: number | null; cutting_notes: string; stitching_notes: string; status: string; sample_verified: boolean; sample_verified_by: string | null; designlab_patterns?: { pattern_code: string } | null };

const QC = [
  "Measurements match the approved pattern (bust, waist, shoulder, lengths)",
  "Neckline and armhole shape symmetrical, no puckering",
  "Seams straight, even seam allowance, no loose threads",
  "Lining sits flat; closure (hooks / zip / ties) works smoothly",
  "Embroidery / print / border aligned on both sides",
  "Pressing and finishing clean; no stains or marks",
  "Label and tag attached; packed",
];

export default async function JobCardPrint({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await getSessionContext();
  if (!session.configured) notFound();
  if (!session.user) redirect("/admin/login");
  if (!("role" in session) || !isStaffRole(session.role)) notFound();
  const sb = await createSupabaseServerClient();
  if (!sb) notFound();

  const { data: order } = await sb.from("designlab_tailor_orders").select("*, designlab_order_items(*)").eq("id", orderId).maybeSingle();
  if (!order) notFound();
  const { data: design } = await sb.from("designlab_designs").select("*, designlab_images(url, angle, position)").eq("id", order.design_id).maybeSingle();
  if (!design) notFound();
  const revIds = (order.designlab_order_items ?? []).map((i: { revision_id: string }) => i.revision_id);
  const { data: revRows } = revIds.length ? await sb.from("designlab_pattern_revisions").select("*, designlab_patterns(pattern_code)").in("id", revIds) : { data: [] };
  const revs = (revRows ?? []) as Rev[];
  const items = (order.designlab_order_items ?? []) as { id: string; revision_id: string; size_label: string; quantity: number }[];
  const images = [...(design.designlab_images ?? [])].sort((a: { position: number }, b: { position: number }) => a.position - b.position).slice(0, 4) as { url: string; angle: string }[];

  const problems: string[] = [];
  if (!["approved", "in_production", "completed"].includes(design.status)) problems.push("design is not approved");
  for (const r of revs) {
    if (r.status !== "approved") problems.push(`size ${r.size_label} pattern is ${r.status}`);
    if (!r.sample_verified) problems.push(`size ${r.size_label} not verified against the physical sample`);
  }
  if (order.status === "draft") problems.push("order is still a draft");
  if (order.status === "cancelled") problems.push("order is cancelled");
  const ready = problems.length === 0;
  const total = items.reduce((n, i) => n + i.quantity, 0);
  const unit = revs[0]?.unit ?? "in";
  const cell: CSSProperties = { border: "1px solid #999", padding: "4px 6px", fontSize: 12 };
  const th: CSSProperties = { ...cell, background: "#f0e8d8", textAlign: "left" };

  return (
    <div style={{ background: "#fff", color: "#111", minHeight: "100vh", padding: 24, fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <style>{`@page { size: A4; margin: 12mm } @media print { body { background: #fff !important } }`}</style>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div className="print:hidden" style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
          <a href={`/admin/designlab/tracker?order=${order.id}`} style={{ color: "#7a1f2b", fontSize: 14 }}>← Back to tracker</a>
          <PrintButton />
        </div>

        <header style={{ display: "flex", justifyContent: "space-between", borderBottom: "3px double #7a1f2b", paddingBottom: 8 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, letterSpacing: 3, color: "#7a1f2b" }}>SAVLINO</h1>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: 2 }}>TAILOR JOB CARD</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>{order.order_no}</p>
            <p style={{ margin: 0, fontSize: 12 }}>Status: {String(order.status).replace("_", " ")}</p>
          </div>
        </header>

        <div style={{ margin: "10px 0", padding: 8, border: `2px solid ${ready ? "#2e7d32" : "#b71c1c"}`, color: ready ? "#2e7d32" : "#b71c1c", fontWeight: 700, fontSize: 13 }}>
          {ready ? "APPROVED FOR PRODUCTION — pattern approved and verified against physical sample" : `NOT PRODUCTION-READY — ${problems.join("; ")}`}
        </div>

        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>{design.name}</h2>
            <table style={{ borderCollapse: "collapse", width: "100%" }}><tbody>
              {([["Design ID", design.design_code], ["Category", design.category], ["Colour", order.color || design.color], ["Fabric", order.fabric || design.fabric], ["Lining", order.lining || design.lining], ["Neckline", design.neckline], ["Sleeve", design.sleeve], ["Closure", design.closure]] as [string, string][]).map(([k, v]) => (
                <tr key={k}><th style={{ ...th, width: "32%" }}>{k}</th><td style={cell}>{v || "—"}</td></tr>
              ))}
            </tbody></table>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {images.map((im, i) => (
              <figure key={i} style={{ margin: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.url} alt={`${design.name} ${im.angle}`} style={{ width: "100%", aspectRatio: "4/5", objectFit: "cover", border: "1px solid #999" }} />
                <figcaption style={{ fontSize: 10, textAlign: "center" }}>{im.angle === "unlabeled" ? `Photo ${i + 1}` : im.angle}</figcaption>
              </figure>
            ))}
          </div>
        </section>

        <h3 style={{ fontSize: 14, margin: "14px 0 4px" }}>Quantity breakdown — {total} pieces</h3>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th style={th}>Size</th><th style={th}>Qty</th><th style={th}>Pattern</th><th style={th}>Revision</th><th style={th}>Pattern status</th></tr></thead>
          <tbody>{items.map((i) => { const r = revs.find((x) => x.id === i.revision_id); return (
            <tr key={i.id}><td style={cell}>{i.size_label}</td><td style={cell}>{i.quantity}</td><td style={cell}>{r?.designlab_patterns?.pattern_code ?? "—"}</td><td style={cell}>{r ? `rev ${r.revision}` : "—"}</td><td style={cell}>{r ? `${r.status}${r.sample_verified ? ` · sample verified by ${r.sample_verified_by}` : " · NOT verified"}` : "—"}</td></tr>
          ); })}</tbody>
        </table>

        <h3 style={{ fontSize: 14, margin: "14px 0 4px" }}>Measurements ({unit === "cm" ? "centimetres" : "inches"}) — finished garment / cutting</h3>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th style={th}>Point</th>{revs.map((r) => <th key={r.id} style={th} colSpan={2}>Size {r.size_label}</th>)}</tr>
            <tr><th style={th}></th>{revs.map((r) => <Fragment key={r.id}><th style={{ ...th, fontWeight: 400 }}>Finished</th><th style={{ ...th, fontWeight: 400 }}>Cutting</th></Fragment>)}</tr></thead>
          <tbody>
            {MEASURE_FIELDS.filter((m) => m.garment || m.cutting).map((m) => (
              <tr key={m.key}><td style={cell}>{m.label}</td>{revs.map((r) => <Fragment key={r.id}><td style={cell}>{r.garment?.[m.key] || ""}</td><td style={cell}>{r.cutting?.[m.key] || ""}</td></Fragment>)}</tr>
            ))}
            <tr><td style={cell}>Seam allowance</td>{revs.map((r) => <td key={r.id} style={cell} colSpan={2}>{r.seam_allowance ?? ""}</td>)}</tr>
          </tbody>
        </table>

        <h3 style={{ fontSize: 14, margin: "14px 0 4px" }}>Cutting &amp; stitching instructions</h3>
        <div style={{ ...cell, whiteSpace: "pre-wrap", minHeight: 50 }}>
          {design.stitching_notes && <p style={{ margin: "0 0 6px" }}><b>Design:</b> {design.stitching_notes}</p>}
          {revs.map((r) => (r.cutting_notes || r.stitching_notes) ? <p key={r.id} style={{ margin: "0 0 6px" }}><b>Size {r.size_label}:</b> {[r.cutting_notes, r.stitching_notes].filter(Boolean).join(" · ")}</p> : null)}
          {order.instructions && <p style={{ margin: 0 }}><b>Special:</b> {order.instructions}</p>}
        </div>

        <h3 style={{ fontSize: 14, margin: "14px 0 4px" }}>Material requirements</h3>
        <table style={{ borderCollapse: "collapse", width: "100%" }}><tbody>
          <tr><th style={{ ...th, width: "22%" }}>Fabric</th><td style={cell}>{order.fabric || design.fabric || "—"}</td><th style={{ ...th, width: "22%" }}>Metres issued</th><td style={{ ...cell, width: "18%" }}>&nbsp;</td></tr>
          <tr><th style={th}>Lining</th><td style={cell}>{order.lining || design.lining || "—"}</td><th style={th}>Metres issued</th><td style={cell}>&nbsp;</td></tr>
          <tr><th style={th}>Colour</th><td style={cell}>{order.color || design.color || "—"}</td><th style={th}>Trims / hooks</th><td style={cell}>&nbsp;</td></tr>
        </tbody></table>

        <h3 style={{ fontSize: 14, margin: "14px 0 4px" }}>Tailor</h3>
        <table style={{ borderCollapse: "collapse", width: "100%" }}><tbody>
          <tr><th style={{ ...th, width: "22%" }}>Name</th><td style={cell}>{order.tailor_name || "—"}</td><th style={{ ...th, width: "22%" }}>Phone</th><td style={cell}>{order.tailor_phone || "—"}</td></tr>
          <tr><th style={th}>Delivery date</th><td style={cell}>{order.delivery_date ?? "—"}</td><th style={th}>Issued on</th><td style={cell}>{new Date(order.created_at).toLocaleDateString("en-IN")}</td></tr>
        </tbody></table>

        <h3 style={{ fontSize: 14, margin: "14px 0 4px" }}>QC checklist</h3>
        <table style={{ borderCollapse: "collapse", width: "100%" }}><tbody>
          {QC.map((q) => <tr key={q}><td style={{ ...cell, width: 24 }}>☐</td><td style={cell}>{q}</td></tr>)}
        </tbody></table>
        <table style={{ borderCollapse: "collapse", width: "100%", marginTop: 8 }}><tbody>
          <tr><th style={{ ...th, width: "20%" }}>Produced</th><td style={cell}>&nbsp;</td><th style={{ ...th, width: "20%" }}>Accepted</th><td style={cell}>&nbsp;</td><th style={{ ...th, width: "20%" }}>Rejected / rework</th><td style={cell}>&nbsp;</td></tr>
          <tr><th style={th}>Tailor signature</th><td style={{ ...cell, height: 40 }} colSpan={2}>&nbsp;</td><th style={th}>QC signature</th><td style={cell} colSpan={2}>&nbsp;</td></tr>
        </tbody></table>
        <p style={{ fontSize: 10, color: "#555", marginTop: 8 }}>Measurements on this card are working values taken from the approved pattern revision above; the physical master pattern governs. Generated {new Date().toLocaleString("en-IN")}.</p>
      </div>
    </div>
  );
}
