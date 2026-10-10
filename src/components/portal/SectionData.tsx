import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Column, PortalSection } from "@/lib/portals";
import { table } from "@/lib/supabase/loose";

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" });

function formatCell(value: unknown, column: Column) {
  if (value === null || value === undefined || value === "") return <span className="text-ivory/30">—</span>;
  switch (column.format) {
    case "currency":
      return inr.format(Number(value));
    case "date": {
      const d = new Date(String(value));
      return Number.isNaN(d.getTime()) ? String(value) : dateFmt.format(d);
    }
    case "status":
      return (
        <span className="inline-block border border-gold/40 px-2.5 py-1 text-[0.6rem] uppercase tracking-[0.2em] text-gold">
          {String(value).replace(/_/g, " ")}
        </span>
      );
    default:
      return typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  }
}

/** Reads the section's rows with the viewer's session. RLS on every table scopes access. */
export async function SectionData({ section, userId }: { section: PortalSection; userId: string }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  let ownerValue: string | null = null;
  if (section.owner) {
    ownerValue = userId;
    if (section.owner.by === "partner") {
      const { data } = await table(supabase, "partners")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      const partner = data as unknown as { id: string } | null;
      if (!partner) return <Empty text="Your partner application has not been approved yet." />;
      ownerValue = partner.id;
    }
  }

  let query = table(supabase, section.table).select(section.columns.map((c) => c.key).join(","));
  if (section.owner && ownerValue) query = query.eq(section.owner.column, ownerValue);
  if (section.orderBy) query = query.order(section.orderBy, { ascending: false });
  const { data, error } = await query.limit(100);

  if (error) {
    return <Empty text="This section could not be loaded. If the database schema is not yet applied, run the Supabase migrations." />;
  }

  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  if (rows.length === 0) return <Empty text={section.empty} />;

  return (
    <div className="overflow-x-auto border border-gold/15">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-gold/20 bg-noir-soft">
            {section.columns.map((c) => (
              <th key={c.key} scope="col" className="px-5 py-4 text-[0.62rem] font-medium uppercase tracking-[0.25em] text-gold">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={String(row.id ?? i)} className="border-b border-gold/10 last:border-0">
              {section.columns.map((c) => (
                <td key={c.key} className="px-5 py-4 text-ivory/80">
                  {formatCell(row[c.key], c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-gold/25 px-6 py-16 text-center">
      <p className="font-serif text-xl text-ivory/60">{text}</p>
    </div>
  );
}
