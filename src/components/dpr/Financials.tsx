import { capacity, fixedLabels, type Assumptions } from "./defaults";
import { directLabels, project, years } from "./model";
import { Card, Table, number, ratio } from "./ui";

type Projection = ReturnType<typeof project>;
type Year = Projection["forecast"][number];

export function Financials({ input, data }: { input: Assumptions; data: Projection }) {
  const row = (label: string, value: (year: Year, index: number) => number | null) => [label, ...data.forecast.map(value)];
  const annual = ["Particulars", ...years];
  const balance = (label: string, start: number, value: (year: Year) => number) => [label, start, ...data.forecast.map(value)];
  return <>
    <Card title="Sales and Production"><Table headings={annual} rows={[
      ["Practical capacity (units)", ...capacity], ["Net units sold", ...input.units],
      ["Utilization (%)", ...input.units.map((units, index) => units / capacity[index] * 100)],
      ["Net sales value per unit (₹)", ...input.price], ["Net sales (₹ lakh)", ...data.sales],
    ]} /></Card>
    <Card title="Profit & Loss · ₹ lakh unless stated"><Table headings={annual} rows={[
      ["Net sales", ...data.sales], ...directLabels.map((label, index) => row(label, (year) => year.direct[index])),
      row("Total direct costs", (year) => year.netSales - year.contribution), row("Contribution", (year) => year.contribution),
      ["Fixed operating expenses", ...data.fixed], row("EBITDA", (year) => year.ebitda),
      row("Depreciation", (year) => year.depreciation), row("Operating profit (EBIT)", (year) => year.ebit),
      row("Interest on modeled facility", (year) => year.interest), row("Profit before tax", (year) => year.pretax),
      row("Indicative income tax reserve", (year) => year.tax), row("Profit after tax reserve", (year) => year.pat),
      row("EBITDA margin (%)", (year) => year.margin),
    ]} /></Card>
    <Card title="Balance Sheet · ₹ lakh"><Table headings={["Particulars", "At setup", ...years]} rows={[
      balance("Net fixed assets", data.assets, (year) => year.fixedAssets),
      balance("Refundable rent deposit", data.deposit, () => data.deposit),
      balance("Inventory", data.openingInventory, (year) => year.inventory),
      balance("Trade receivables", 0, (year) => year.receivables),
      balance("Cash and bank", data.openingCash, (year) => year.cash),
      balance("Total assets", data.total, (year) => year.fixedAssets + data.deposit + year.inventory + year.receivables + year.cash),
      balance("Proprietor capital and reserves", data.equity, (year) => year.proprietorCapital),
      balance("Loan due within 12 months", data.loan.annual[0].principal, (year) => year.currentLoan),
      balance("Loan due after 12 months", input.loan - data.loan.annual[0].principal, (year) => year.longLoan),
      balance("Trade payables", 0, (year) => year.payables),
      balance("Total equity and liabilities", data.total, (year) => year.proprietorCapital + year.currentLoan + year.longLoan + year.payables),
    ]} /></Card>
    <Card title="Cash Flow · ₹ lakh"><Table headings={annual} rows={[
      row("Opening cash and bank", (year) => year.startCash), row("EBITDA", (year) => year.ebitda),
      row("Less income tax reserve", (year) => year.tax), row("Less increase in net operating WC", (year) => year.wcChange),
      row("Operating cash before interest", (year) => year.operatingCash),
      ["Less replacement capex", ...input.capitalExpenditure], row("Cash available for debt service", (year) => year.cfads),
      row("Less interest payments", (year) => year.interest), row("Less principal payments", (year) => year.principal),
      ["Less proprietor drawings", ...input.drawings], row("Net change in cash", (year) => year.netCash),
      row("Closing cash and bank", (year) => year.cash),
    ]} /></Card>
    <Card title="Debt Coverage"><Table headings={annual} rows={[
      ["Indicative accounting DSCR", ...data.forecast.map((year) => ratio(year.accountingDscr))],
      ["Cash debt coverage", ...data.forecast.map((year) => ratio(year.cashCoverage))],
    ]} /></Card>
    <Card title="Fixed Cash Operating Costs · ₹ lakh"><Table headings={annual} rows={[
      ...fixedLabels.map((label, index) => [label, ...input.fixed[index].map((value) => number(value))]),
      ["Total fixed cash cost", ...data.fixed],
    ]} /></Card>
  </>;
}
