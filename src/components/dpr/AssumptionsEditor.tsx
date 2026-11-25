import { useState, type FormEvent } from "react";
import { costLabels, defaults, fixedLabels, type Assumptions } from "./defaults";
import { directLabels, validAssumptions, years } from "./model";
import { Card } from "./ui";

function Field({ name, label, value, text, integer }: {
  name: string; label: string; value: number | string; text?: boolean; integer?: boolean;
}) {
  return <label>{label}<input name={name} type={text ? "text" : "number"} defaultValue={value}
    maxLength={text ? 160 : undefined} min={text ? undefined : 0} step={integer ? "1" : "any"} required={!text} /></label>;
}

export function AssumptionsEditor({ input, onPreview, onRestore }: {
  input: Assumptions; onPreview: (next: Assumptions) => void; onRestore: () => void;
}) {
  const [error, setError] = useState("");
  function preview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const read = (name: string) => Number(data.get(name));
    const vector = (name: string, length: number) => Array.from({ length }, (_, index) => read(`${name}-${index}`));
    const updated: Assumptions = {
      applicant: String(data.get("applicant")).trim(),
      category: String(data.get("category")).trim(),
      loan: read("loan"), rate: read("rate"), term: read("term"), taxRate: read("taxRate"),
      cost: vector("cost", costLabels.length), directRates: vector("direct", directLabels.length),
      units: vector("units", years.length), price: vector("price", years.length),
      fixed: fixedLabels.map((_, index) => vector(`fixed-${index}`, years.length)),
      capitalExpenditure: vector("capex", years.length), drawings: vector("drawings", years.length),
    };
    if (!validAssumptions(updated)) {
      setError("Check the inputs. Tenure must be 1–120 months, percentages must be 0–100, total direct costs cannot exceed 100% and loan cannot exceed project cost.");
      return;
    }
    setError("");
    onPreview(updated);
  }
  return <form className="editor" onSubmit={preview}>
    <Card title="Applicant & Loan Terms"><div className="body inputGrid">
      <Field name="applicant" label="Applicant name" value={input.applicant} text />
      <Field name="category" label="Applicant category" value={input.category} text />
      <Field name="loan" label="Loan amount (₹ lakh)" value={input.loan} />
      <Field name="rate" label="Annual interest (%)" value={input.rate} />
      <Field name="term" label="Tenure (months)" value={input.term} integer />
      <Field name="taxRate" label="Tax reserve (%)" value={input.taxRate} />
    </div></Card>
    <Card title="Opening Project Budget · ₹ lakh"><div className="body inputGrid">
      {costLabels.map((label, index) => <Field key={label} name={`cost-${index}`} label={label} value={input.cost[index]} />)}
    </div></Card>
    <Card title="Direct Costs · % of net sales"><div className="body inputGrid">
      {directLabels.map((label, index) => <Field key={label} name={`direct-${index}`} label={label} value={input.directRates[index]} />)}
    </div></Card>
    {years.map((year, index) => <Card key={year} title={year}><div className="body inputGrid">
      <Field name={`units-${index}`} label="Net units sold" value={input.units[index]} integer />
      <Field name={`price-${index}`} label="Net price per unit (₹)" value={input.price[index]} />
      {fixedLabels.map((label, row) => <Field key={label} name={`fixed-${row}-${index}`} label={`${label} (₹ lakh)`} value={input.fixed[row][index]} />)}
      <Field name={`capex-${index}`} label="Replacement capex (₹ lakh)" value={input.capitalExpenditure[index]} />
      <Field name={`drawings-${index}`} label="Proprietor drawings (₹ lakh)" value={input.drawings[index]} />
    </div></Card>)}
    {error && <p role="alert" className="error">{error}</p>}
    <div className="actions">
      <button className="print" type="submit">Apply & recalculate</button>
      <button className="print" type="button" onClick={() => { setError(""); onRestore(); }}>
        Restore DPR figures
      </button>
    </div>
  </form>;
}

export function restoreFigures(input: Assumptions) {
  return { ...defaults, applicant: input.applicant, category: input.category };
}
