"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { saveDpr } from "@/app/admin/(crm)/dpr/actions";
import { AssumptionsEditor, assumptionsFormId, restoreFigures } from "./AssumptionsEditor";
import { ReportExport } from "./ReportExport";
import { Financials } from "./Financials";
import { costLabels, type Assumptions } from "./defaults";
import { amortize, project, years } from "./model";
import { Card, Chart, lakh, number, Pairs, ratio, Table } from "./ui";
import "./dashboard.css";

const sections = [
  ["Executive Summary", "▤"], ["Business Profile", "⌂"], ["Project Cost", "▱"],
  ["Financial Projections", "▥"], ["Repayment Plan", "▦"], ["Risk & Sensitivity", "◇"], ["Annexures", "▧"],
];
const launchSteps = [
  ["Weeks 1–2", "Finalize premises, quotations and registrations"],
  ["Weeks 3–4", "Install machines and validate samples"],
  ["Weeks 5–6", "Build stock, test checkout and dispatch pilot orders"],
  ["Weeks 7–8", "Launch commercially and review orders, returns and collections"],
];
const stressLabels = ["Base case", "Sales −10%", "Sales −20%"];

export function Dashboard({ initial, revision: initialRevision }: { initial: Assumptions; revision?: number }) {
  const [input, setInput] = useState(initial);
  const [revision, setRevision] = useState(initialRevision);
  const [section, setSection] = useState(0);
  const [year, setYear] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const data = project(input);
  const first = data.forecast[0];
  const contribution = data.total ? data.equity / data.total * 100 : 0;
  const selectedYear = Math.min(year, data.loan.annual.length - 1);

  function preview(next: Assumptions) {
    setInput(next);
    setDirty(true);
    setEditing(false);
    setError("");
    setStatus("Recalculated. Save changes to keep this version.");
  }

  async function save(next: Assumptions) {
    if (revision === undefined || saving) return;
    setSaving(true);
    setError("");
    setStatus("");
    try {
      const result = await saveDpr(next, revision);
      if (result.revision === undefined) {
        setError(result.error ?? "The DPR could not be saved.");
      } else {
        setRevision(result.revision);
        setInput(next);
        setEditing(false);
        setDirty(false);
        setStatus("DPR changes saved.");
      }
    } catch {
      setError("The DPR could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const snapshot: [string, string][] = [
    ["Applicant", input.applicant ? `${input.applicant} · Proposed sole proprietor` : "Proposed sole proprietor"],
    ["Category", input.category], ["Business Stage", "New manufacturing unit"],
    ["Premises", "Rented unit, Bhopal · To be finalized"], ["Udyam", "Registration pending"],
  ];
  const costRows: [string, string][] = [
    ["Fixed assets and fit-out", number(data.assets)], ["Refundable premises deposit", number(data.deposit)],
    ["Opening fabric stock", number(data.fabric)], ["Trims and accessories", number(data.trims)],
    ["Opening operating cash", number(data.openingCash)], ["Total project cost", number(data.total)],
  ];
  const repaymentRows: [string, string][] = [
    ["Loan amount", lakh(input.loan)], ["Illustrative interest", `${input.rate}% p.a.`], ["Tenure", `${input.term} months`],
    ["Monthly EMI", `₹${number(data.loan.emi)}`], ["Total interest", lakh(data.loan.interest)],
    ["Total repayment", lakh(input.loan + data.loan.interest)],
  ];
  const funding = <Card title="Funding & Project Cost"><div className="body donutbox">
    <div className="donut" style={{ "--own": `${data.total ? contribution : 100}%` } as CSSProperties}>
      <div><b>₹{number(data.total)}</b>Lakh<br />Project cost</div>
    </div>
    <div className="legend">
      <p><i className="dot" />Bank loan · PMMY Tarun<br /><b>{lakh(input.loan)} ({number(data.total ? 100 - contribution : 0, 1)}%)</b></p>
      <p><i className="dot pink" />Own contribution<br /><b>{lakh(data.equity)} ({number(contribution, 1)}%)</b></p>
    </div>
  </div></Card>;
  const charts = <div className="grid three">
    <Chart title="5-Year Projected Net Sales" values={data.sales} labels={years}
      colors={["#c1a1ef", "#a477e2", "#8d57d4", "#a277d9", "#6338a8"]}
      note={`₹ lakh · Year 1–5 CAGR ${data.cagr === null ? "—" : `${number(data.cagr, 1)}%`}`} />
    <Chart title="5-Year EBITDA & Margin" values={data.forecast.map((y) => y.ebitda)} labels={years}
      margin={data.forecast.map((y) => y.margin)} note="Purple bars show EBITDA (₹ lakh). Pink line shows EBITDA margin." />
    <Chart title="Cash Available for Debt Service" values={data.forecast.map((y) => y.cfads)} labels={years}
      colors={["#2bb3a3"]} note="₹ lakh" />
  </div>;
  const stressChart = <Chart title="Cash Debt Coverage · Year 1" labels={stressLabels}
    values={data.scenarios.map((scenario) => scenario.cashCoverage)} colors={["#50b67b", "#e9a630", "#e74c85"]}
    unit="×" threshold={1} note="Dashed line marks 1.00× scheduled debt service." />;
  const timeline = <div className="timeline"><div><b>Project Timeline</b>Eight-week launch plan</div>
    {launchSteps.map(([heading, text]) => <div key={heading}><b>{heading}</b>{text}</div>)}
  </div>;
  const kpis = [
    ["↗", lakh(first.netSales), "Projected net sales"], ["▤", lakh(first.ebitda), "EBITDA"],
    ["▦", `₹${number(data.loan.emi, 0)}`, `Monthly EMI · ${input.rate}% p.a. · ${input.term} months`],
    ["◇", ratio(first.cashCoverage), "Cash debt coverage"],
  ];

  function amortization(index: number, interactive: boolean) {
    return <Card title={`Months ${index * 12 + 1}–${Math.min((index + 1) * 12, input.term)} · ₹`}>
      {interactive && <div className="body switch">{data.loan.annual.map((_, i) =>
        <button type="button" key={i} aria-pressed={index === i} onClick={() => setYear(i)}>Year {i + 1}</button>)}</div>}
      <Table headings={["Month", "Opening balance", "Installment", "Interest", "Principal", "Closing balance"]} rows={
        data.loan.months.slice(index * 12, (index + 1) * 12)
          .map((m) => [String(m.month), m.opening, m.payment, m.interest, m.principal, m.balance])
      } />
    </Card>;
  }

  function renderSection(index: number, exporting = false) {
    return <>
      {index === 0 && <>
        <div className="grid three">
          <Card title="Project Snapshot"><Pairs rows={snapshot} /></Card>{funding}
          <Card title="Key KPI Cards · Year 1 Base Case"><div className="body kpis">{kpis.map(([icon, value, label]) =>
            <div className="kpi" key={label}><span className="ico" aria-hidden="true">{icon}</span><div><b>{value}</b><small>{label}</small></div></div>)}
          </div></Card>
        </div>
        {charts}
        <div className="grid four">
          <Card title="Project Cost Break-up · ₹ lakh"><Pairs rows={costRows} money /></Card>
          <Card title="Loan Repayment Summary"><Pairs rows={repaymentRows} money /></Card>
          {stressChart}
          <Card title="Key Takeaways"><div className="body"><ul className="notes">
            <li>Year 1 indicative accounting DSCR {ratio(first.accountingDscr)}</li>
            <li>Annual operating break-even {data.breakEven === null ? "—" : lakh(data.breakEven)}</li>
            <li>Year 1 closing cash {lakh(first.cash)}</li>
            <li>Cash debt coverage at 10% lower sales {ratio(data.scenarios[1].cashCoverage)}</li>
          </ul></div></Card>
        </div>
        {timeline}
      </>}
      {index === 1 && <div className="detail">
        <div className="split"><Card title="Applicant and Enterprise"><Pairs rows={snapshot} /></Card>
          <Card title="Business and Premises"><Pairs rows={[
            ["Location", "Bhopal, Madhya Pradesh"], ["Workshop", "500–700 sq. ft. planned"],
            ["Year 1 rent", `₹${number(input.fixed[1][0] * 100_000 / 12, 0)} per month`],
            ["Refundable deposit", lakh(data.deposit)], ["Website", "Developed per applicant"],
            ["Year 1 channel mix", "60% website/digital · 40% local/custom"],
          ]} /></Card>
        </div>
        <Card title="Staffing and Production"><div className="body">
          <p>Start with two sewing operators. Add a third as orders justify it. The proprietor oversees sourcing, sampling, orders and accounts.</p>
          <p>Sample and measure → source and inspect fabric → cut and stitch → press and inspect → pack and dispatch → reconcile payments and returns.</p>
        </div></Card>{timeline}
      </div>}
      {index === 2 && <div className="detail">
        <div className="split">{funding}<Card title="Opening Uses of Funds · ₹ lakh"><Pairs rows={costRows} money /></Card></div>
        <Card title="Itemized Project Budget · ₹ lakh"><Table headings={["Use of funds", "Amount"]} rows={[
          ...costLabels.slice(0, 6).map((label, index) => [label, input.cost[index]]), ["Total depreciable fixed asset budget", data.assets],
          ...costLabels.slice(6).map((label, index) => [label, input.cost[index + 6]]), ["Total project cost", data.total],
        ]} /></Card>
        <Card title="Facility Structure"><div className="body">
          <p>Suggested structure for branch appraisal uses term finance up to the fixed asset budget and working capital for the balance. The repayment model amortizes the full {lakh(input.loan)} over {input.term} months.</p>
        </div></Card>
      </div>}
      {index === 3 && <div className="detail">{charts}<Financials input={input} data={data} /></div>}
      {index === 4 && <div className="detail">
        <div className="split"><Card title="Modeled Loan Terms"><Pairs rows={repaymentRows} money /></Card>
          <Chart title="Year-end Outstanding Loan" labels={data.loan.annual.map((_, index) => `Y${index + 1}`)}
            values={data.loan.annual.map((annual) => annual.closing)} />
        </div>
        <Card title="Annual Repayment Summary · ₹ lakh"><Table headings={["Year", "Opening loan", "Principal", "Interest", "Debt service", "Closing loan"]} rows={[
          ...data.loan.annual.map((a, index) => [String(index + 1), a.opening, a.principal, a.interest, a.payment, a.closing]),
          ["Total", "—", input.loan, data.loan.interest, input.loan + data.loan.interest, "—"],
        ]} /></Card>
        <Card title="Illustrative Rate Scenarios · ₹"><Table headings={["Rate", "Monthly installment", "Total interest"]} rows={
          [...new Set([Math.max(0, input.rate - 1), input.rate, Math.min(100, input.rate + 1), Math.min(100, input.rate + 2)])].map((rate) => {
            const scenario = amortize(input.loan, rate, input.term);
            return [`${number(rate, 2)}%`, scenario.emi, scenario.interest * 100_000];
          })
        } /></Card>
        {!exporting && amortization(selectedYear, true)}
      </div>}
      {index === 5 && <div className="detail">
        <div className="split">{stressChart}<Chart title="5-Year Cash Debt Coverage" values={data.forecast.map((y) => y.cashCoverage)}
          labels={years} unit="×" threshold={1} colors={["#2bb3a3"]} /></div>
        <Card title="Year 1 Downside Scenarios · ₹ lakh except coverage"><Table
          headings={["Scenario", "Net sales", "EBITDA", "Cash coverage", "Minimum month-end cash", "Year-end cash"]}
          rows={data.scenarios.map((s, index) => [stressLabels[index], s.netSales, s.ebitda, ratio(s.cashCoverage), s.minCash, s.closing])} /></Card>
        <Card title="Year 1 Monthly Cash Budget · ₹ lakh"><Table
          headings={["Month", "Sales", "EBITDA", "WC increase", "Tax", "EMI", "Drawings", "Capex", "Closing cash"]}
          rows={data.scenarios[0].budget.map((m, index) => [String(index + 1), m.monthSales, m.ebitda, m.wcChange, m.tax, m.payment, m.drawings, m.capex, m.closing])} /></Card>
      </div>}
      {index === 6 && <div className="detail">
        <Card title="Bank Submission Checklist"><Pairs rows={[
          ["Identity and category", "PAN, bank-accepted KYC, photos, category certificate if applicable and signed application"],
          ["Residence", "Bank-accepted current address proof and ownership or occupancy documents as applicable"],
          ["Workshop", "Landlord offer or lease, rent, deposit, tenure and consent"],
          ["Business", "Proprietorship declaration, Udyam, GST and local registrations as applicable"],
          ["Funding", `Bank statements and proof of ${lakh(data.equity)} own contribution`],
          ["Machinery and inventory", "Pro forma invoices, fabric and trims quotations"],
          ["Sales and website", "Website URL, catalogue, sample invoices, receipts and order records"],
        ]} /></Card>
        <Card title="Report Record"><div className="body"><p>Detailed Project Report · 25 November 2026 · For consideration by the Branch Manager, Indian Overseas Bank, Bhopal.</p>
          <p>Preparation attributed in the source DPR to an empanelled CA of Savrdh Financial Services Private Limited. CA credentials and signature pending confirmation.</p>
          <Link href="https://savrdhfinancialservices.com/">Savrdh Financial Services</Link>
        </div></Card>
      </div>}
    </>;
  }

  return <div className="sav-dpr"><div className="workspace">
    <aside>
      <div className="brand"><Image src="/dpr/hanger.webp" width={70} height={48} alt="" />SAVLINO</div>
      <nav aria-label="Report sections">{sections.map(([label, icon], index) =>
        <button key={label} type="button" aria-current={section === index ? "page" : undefined} onClick={() => setSection(index)}>
          <span className="ico" aria-hidden="true">{icon}</span>{label}
        </button>)}
      </nav>
      <Image className="fashion" src="/dpr/blouse.webp" width={170} height={243} alt="" />
    </aside>
    <div className="report">
      <header className="masthead">
        <div className="identity"><div><small>Credit Proposal · Detailed Project Report</small><h1>SAVLINO</h1></div>
          <div className="descriptor"><strong>Women’s blouse and apparel manufacturing</strong><br />Direct-to-consumer website and local orders</div>
        </div>
        <div className="bank"><Image src="/dpr/bank.webp" width={72} height={64} alt="" /><div>
          <strong>Indian Overseas Bank</strong>MUDRA Tarun Loan · {lakh(input.loan)}
        </div></div>
      </header>
      <div className="topline"><h2>{sections[section][0]}{section === 0 && " Dashboard"}</h2>
        <div className="meta"><span>Bhopal, Madhya Pradesh</span><span>25 November 2026</span><span>For the Branch Manager</span></div>
      </div>
      <div className="actions toolbar">
        <button className="print" type="button" aria-expanded={editing} disabled={saving} onClick={() => setEditing(!editing)}>
          {editing ? "Close assumptions" : "Edit figures"}
        </button>
        <button className="print" type={editing ? "submit" : "button"} form={editing ? assumptionsFormId : undefined}
          value="save" disabled={(!dirty && !editing) || saving || revision === undefined}
          onClick={editing ? undefined : () => void save(input)}>
          {saving ? "Saving…" : "Save changes"}
        </button>
        <ReportExport summary={renderSection(0, true)} reportSections={[
          { title: "Executive Summary Dashboard", content: renderSection(0, true) },
          ...sections.slice(1).map(([title], index) => ({ title, content: renderSection(index + 1, true) })),
          ...data.loan.annual.map((_, index) => ({
            title: `Amortization · Year ${index + 1}`, content: amortization(index, false),
          })),
        ]} applicant={input.applicant} loan={lakh(input.loan)} />
        {status && <span role="status">{status}</span>}
        {error && <span role="alert" className="error">{error}</span>}
        {revision === undefined && <span className="error">Shared storage unavailable. You can still preview figures.</span>}
      </div>
      {editing && <AssumptionsEditor key={editorKey} input={input} onPreview={preview} onSave={save}
        saving={saving} canSave={revision !== undefined}
        onRestore={() => { setEditorKey(editorKey + 1); preview(restoreFigures(input)); }} />}
      {renderSection(section)}
      <footer className="foot">Financial figures are DPR projections and illustrative financing assumptions. Final terms are subject to bank appraisal.</footer>
    </div>
  </div></div>;
}
