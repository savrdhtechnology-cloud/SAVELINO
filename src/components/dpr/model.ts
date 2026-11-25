import { capacity, defaults, monthlySales, type Assumptions } from "./defaults";

export const years = capacity.map((_, index) => `Year ${index + 1}`);
export const directLabels = ["Fabric consumed", "Trims and accessories", "Piece-rate labour", "Packaging and fulfilment"];
const LAKH = 100_000;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

export function validAssumptions(value: unknown): value is Assumptions {
  if (!value || typeof value !== "object") return false;
  const input = value as Assumptions;
  function validShape(candidate: unknown, sample: unknown): boolean {
    if (typeof sample === "string") return typeof candidate === "string" && candidate.length <= 160;
    if (Array.isArray(sample)) {
      return Array.isArray(candidate) && candidate.length === sample.length &&
        sample.every((row, index) => validShape(candidate[index], row));
    }
    return typeof candidate === "number" && Number.isFinite(candidate) && candidate >= 0 && candidate <= 1_000_000;
  }
  return Object.keys(input).length === Object.keys(defaults).length &&
    (Object.keys(defaults) as (keyof Assumptions)[]).every((key) => validShape(input[key], defaults[key])) &&
    input.loan <= sum(input.cost) + 1e-9 &&
    input.term >= 1 && input.term <= 120 && Number.isInteger(input.term) &&
    input.units.every(Number.isInteger) &&
    input.rate <= 100 && input.taxRate <= 100 && sum(input.directRates) <= 100;
}

export function amortize(loan: number, rate: number, term: number) {
  const original = loan * LAKH;
  const monthlyRate = rate / 1200;
  const emi = monthlyRate ? original * monthlyRate / -Math.expm1(-term * Math.log1p(monthlyRate)) : original / term;
  let balance = original;
  const months = Array.from({ length: term }, (_, index) => {
    const opening = balance;
    const interest = opening * monthlyRate;
    const principal = index === term - 1 ? opening : emi - interest;
    balance -= principal;
    return { month: index + 1, opening, payment: principal + interest, interest, principal, balance };
  });
  const annual = Array.from({ length: Math.ceil(term / 12) }, (_, year) => {
    const group = months.slice(year * 12, year * 12 + 12);
    return {
      opening: group[0].opening / LAKH,
      principal: sum(group.map((month) => month.principal)) / LAKH,
      interest: sum(group.map((month) => month.interest)) / LAKH,
      payment: sum(group.map((month) => month.payment)) / LAKH,
      closing: group[group.length - 1].balance / LAKH,
    };
  });
  return { emi, months, annual, interest: sum(months.map((month) => month.interest)) / LAKH };
}

export function project(input: Assumptions) {
  const assets = sum(input.cost.slice(0, 6));
  const [deposit, fabric, trims, openingCash] = input.cost.slice(6);
  const openingInventory = fabric + trims;
  const total = assets + deposit + openingInventory + openingCash;
  const equity = total - input.loan;
  const loan = amortize(input.loan, input.rate, input.term);
  const sales = input.units.map((units, index) => units * input.price[index] / LAKH);
  const fixed = years.map((_, index) => sum(input.fixed.map((row) => row[index])));
  const variableRate = sum(input.directRates) / 100;
  const contributionRate = 1 - variableRate;

  function operating(netSales: number, index: number, previousWc: number) {
    const debt = loan.annual[index];
    const interest = debt?.interest ?? 0;
    const principal = debt?.principal ?? 0;
    const payment = debt?.payment ?? 0;
    const direct = input.directRates.map((rate) => netSales * rate / 100);
    const contribution = netSales * contributionRate;
    const ebitda = contribution - fixed[index];
    const depreciation = (assets + sum(input.capitalExpenditure.slice(0, index + 1))) * .1;
    const ebit = ebitda - depreciation;
    const pretax = ebit - interest;
    const tax = Math.max(0, pretax) * input.taxRate / 100;
    const pat = pretax - tax;
    const materials = direct[0] + direct[1];
    const inventory = Math.max(openingInventory, materials * 75 / 365);
    const receivables = netSales * 7 / 365;
    const payables = materials * 15 / 365;
    const workingCapital = inventory + receivables - payables;
    const wcChange = workingCapital - previousWc;
    const operatingCash = ebitda - tax - wcChange;
    const cfads = operatingCash - input.capitalExpenditure[index];
    return {
      netSales, direct, contribution, ebitda, depreciation, ebit, interest, principal, pretax, tax, pat,
      inventory, receivables, payables, workingCapital, wcChange, operatingCash, cfads,
      cashCoverage: payment ? cfads / payment : null,
      accountingDscr: payment ? (pat + depreciation + interest) / payment : null,
      margin: netSales ? ebitda / netSales * 100 : null,
      netCash: cfads - payment - input.drawings[index],
    };
  }

  let cash = openingCash;
  let workingCapital = openingInventory;
  let fixedAssets = assets;
  let proprietorCapital = equity;
  const forecast = sales.map((netSales, index) => {
    const year = operating(netSales, index, workingCapital);
    const startCash = cash;
    cash += year.netCash;
    workingCapital = year.workingCapital;
    fixedAssets += input.capitalExpenditure[index] - year.depreciation;
    proprietorCapital += year.pat - input.drawings[index];
    const currentLoan = loan.annual[index + 1]?.principal ?? 0;
    const longLoan = Math.max(0, (loan.annual[index]?.closing ?? 0) - currentLoan);
    return { ...year, startCash, cash, fixedAssets, proprietorCapital, currentLoan, longLoan };
  });

  const scenarios = [1, .9, .8].map((factor) => {
    const year = operating(sales[0] * factor, 0, openingInventory);
    let closing = openingCash;
    const budget = monthlySales.map((weight, index) => {
      const share = weight / sum(monthlySales);
      const monthSales = year.netSales * share;
      const ebitda = monthSales * contributionRate - fixed[0] / 12;
      const wcChange = year.wcChange * share;
      const tax = year.tax / 12;
      const payment = (loan.months[index]?.payment ?? 0) / LAKH;
      const drawings = input.drawings[0] / 12;
      const capex = input.capitalExpenditure[0] / 12;
      closing += ebitda - wcChange - tax - payment - drawings - capex;
      return { monthSales, ebitda, wcChange, tax, payment, drawings, capex, closing };
    });
    return { ...year, budget, minCash: Math.min(...budget.map((month) => month.closing)), closing };
  });

  return {
    assets, deposit, fabric, trims, openingCash, openingInventory, total, equity, loan, sales, fixed, forecast, scenarios,
    cagr: sales[0] ? (Math.pow(sales[4] / sales[0], .25) - 1) * 100 : null,
    breakEven: contributionRate > 0 ? fixed[0] / contributionRate : null,
  };
}
