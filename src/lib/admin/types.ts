export type Row = Record<string, unknown> & { id: string };

export type Format = "text" | "currency" | "date" | "status" | "bool" | "percent" | "number";

export type Column = {
  key: string;
  label: string;
  format?: Format;
  /** Derive the value from the row (e.g. a nested JSON field). */
  get?: (row: Row) => unknown;
  /** Hide on small screens. */
  wide?: boolean;
};

export type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "checkbox";
  options?: string[];
  required?: boolean;
  placeholder?: string;
};

export type Action = {
  label: string;
  patch: Record<string, unknown>;
  when?: (row: Row) => boolean;
  tone?: "gold" | "danger";
};

export type ModuleConfig = {
  slug: string;
  title: string;
  description: string;
  /** SVG path data (24×24, stroke) for the nav icon. */
  icon: string;
  /** Table or view read with the admin's session. */
  table: string;
  /** Table written to, if different from the one read. */
  writeTable?: string;
  select: string;
  orderBy?: string;
  columns: Column[];
  searchKeys: string[];
  statusKey?: string;
  statuses?: string[];
  form?: Field[];
  createLabel?: string;
  actions?: Action[];
  canDelete?: boolean;
  demo: () => Row[];
};
