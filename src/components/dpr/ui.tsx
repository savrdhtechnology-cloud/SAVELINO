import type { ReactNode } from "react";

export const number = (value: number | null, digits = 2) => value === null ? "—" : value.toLocaleString("en-IN", {
  minimumFractionDigits: digits, maximumFractionDigits: digits,
});
export const lakh = (value: number) => `₹${number(value)} lakh`;
export const ratio = (value: number | null) => value === null ? "—" : `${number(value)}×`;

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="card"><h3>{title}</h3>{children}</section>;
}

export function Pairs({ rows, money = false }: { rows: [string, ReactNode][]; money?: boolean }) {
  return <div className="body"><dl className={money ? "pairs moneylist" : "pairs"}>
    {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
  </dl></div>;
}

export function Table({ headings, rows }: { headings: string[]; rows: (string | number | null)[][] }) {
  return <div className="tablewrap" tabIndex={0} role="region" aria-label="Financial table">
    <table><thead><tr>{headings.map((heading) => <th scope="col" key={heading}>{heading}</th>)}</tr></thead>
      <tbody>{rows.map(([label, ...values]) => <tr key={label}>
        <th scope="row">{label}</th>{values.map((value, index) => <td key={index}>
          {typeof value === "string" ? value : number(value)}
        </td>)}
      </tr>)}</tbody>
    </table>
  </div>;
}

export function Chart({ title, labels, values, colors = ["#8955c7"], note, margin, threshold, unit = "₹ lakh" }: {
  title: string; labels: string[]; values: (number | null)[]; colors?: string[];
  note?: string; margin?: (number | null)[]; threshold?: number; unit?: string;
}) {
  const high = Math.max(0, ...values.map((value) => value ?? 0), threshold ?? 0);
  const low = Math.min(0, ...values.map((value) => value ?? 0));
  const max = high * 1.17 || 1;
  const min = low * 1.17;
  const left = 43;
  const right = margin ? 350 : 379;
  const top = 15;
  const base = 135;
  const width = (right - left) / values.length;
  const x = (index: number) => left + width * (index + .5);
  const y = (value: number) => base - (value - min) / (max - min) * (base - top);
  const percentages = Math.max(30, ...((margin ?? []).map((value) => Math.abs(value ?? 0))));
  const marginY = (value: number) => 75 - value / percentages * 55;

  return <Card title={title}>
    <svg className="chart" viewBox="0 0 390 160" role="img"
      aria-label={`${title}. ${values.map((value, index) => `${labels[index]}: ${number(value)} ${unit}`).join(", ")}`}>
      {Array.from({ length: 5 }, (_, index) => {
        const value = min + (max - min) * index / 4;
        return <g key={index}><path d={`M${left} ${y(value)}H${right}`} stroke="#eee3f2" />
          <text className="axis" x={left - 5} y={y(value) + 3} textAnchor="end">{number(value, max < 5 ? 2 : 0)}</text></g>;
      })}
      <path d={`M${left} ${y(0)}H${right}`} stroke="#bca8cf" />
      {threshold !== undefined && <path d={`M${left} ${y(threshold)}H${right}`} stroke="#825a9c" strokeDasharray="4 4" />}
      {values.map((value, index) => <g key={labels[index]} tabIndex={0}>
        <title>{labels[index]} · {number(value)} {unit}</title>
        {value !== null && <rect className="bar" x={x(index) - width * .33} y={Math.min(y(value), y(0))}
          width={width * .66} height={Math.abs(y(value) - y(0))} rx="4" fill={colors[index % colors.length]} />}
        <text className="value" x={x(index)} y={value === null ? y(0) - 5 : y(value) + (value < 0 ? 11 : -5)}
          textAnchor="middle">{number(value)}</text>
        <text className="axis" x={x(index)} y="151" textAnchor="middle">{labels[index]}</text>
      </g>)}
      {margin?.map((value, index) => {
        if (value === null) return null;
        const previous = margin[index - 1];
        return <g key={labels[index]}>
          {previous != null && <line x1={x(index - 1)} y1={marginY(previous)} x2={x(index)} y2={marginY(value)} stroke="#e23988" strokeWidth="2" />}
          <circle cx={x(index)} cy={marginY(value)} r="3" fill="#e23988" />
          <text className="value" x={x(index)} y={marginY(value) - 7} textAnchor="middle">{number(value, 1)}%</text>
        </g>;
      })}
    </svg>
    {note && <p className="subnote">{note}</p>}
  </Card>;
}
