import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { createSupabaseServerClient, getSessionContext } from "@/lib/supabase/server";
import { TRYON_DISCLAIMER } from "@/lib/tryon/config";

export const metadata: Metadata = { title: "My Try-On Previews" };
export const dynamic = "force-dynamic";

type SessionRow = {
  id: string;
  product_id: string;
  product_name: string | null;
  selected_size: string | null;
  selected_color: string | null;
  mode: string;
  status: string;
  created_at: string;
  virtual_try_on_outputs: { output_view: string; image_url: string | null }[];
};
type Loose = {
  from(t: string): {
    select(c: string): { order(c: string, o: { ascending: boolean }): { limit(n: number): PromiseLike<{ data: unknown; error: { message: string } | null }> } };
  };
};

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

function Card({ s, saved }: { s: SessionRow; saved: boolean }) {
  const front = s.virtual_try_on_outputs.find((o) => o.output_view === "front")?.image_url;
  return (
    <li>
      <Link href={`/virtual-try-on/${s.id}`} className="group block border border-gold/15 transition-colors hover:border-gold/50">
        <div className="relative aspect-[3/4] overflow-hidden bg-noir-soft">
          {front ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={front} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <span className="grid h-full place-items-center text-[0.6rem] uppercase tracking-[0.25em] text-ivory/40">{s.status}</span>
          )}
          {saved && <span className="absolute left-2 top-2 bg-gold px-2 py-1 text-[0.5rem] uppercase tracking-[0.2em] text-noir">Saved</span>}
        </div>
        <div className="p-3">
          <p className="font-serif text-lg text-ivory">{s.product_name}</p>
          <p className="mt-1 text-[0.62rem] uppercase tracking-[0.2em] text-ivory/50">
            {[s.selected_color, s.selected_size && `Size ${s.selected_size}`, s.mode].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-1 text-[0.62rem] text-ivory/40">{dateFmt.format(new Date(s.created_at))}</p>
        </div>
      </Link>
    </li>
  );
}

export default async function TryOnsPage() {
  const ctx = await getSessionContext();
  let rows: SessionRow[] = [];
  let savedIds = new Set<string>();
  if (ctx.configured && ctx.user) {
    const sb = (await createSupabaseServerClient()) as unknown as Loose | null;
    if (sb) {
      const [sess, saved] = await Promise.all([
        sb
          .from("virtual_try_on_sessions")
          .select("id,product_id,product_name,selected_size,selected_color,mode,status,created_at,virtual_try_on_outputs(output_view,image_url)")
          .order("created_at", { ascending: false })
          .limit(60),
        sb.from("virtual_try_on_saved_looks").select("session_id").order("saved_at", { ascending: false }).limit(60),
      ]);
      rows = ((sess.data as SessionRow[] | null) ?? []).filter((r) => r.status !== "deleted");
      savedIds = new Set(((saved.data as { session_id: string }[] | null) ?? []).map((r) => r.session_id));
    }
  }
  const savedRows = rows.filter((r) => savedIds.has(r.id));

  return (
    <div>
      <p className="eyebrow">Virtual Try-On</p>
      <h1 className="mt-3 font-display text-4xl text-ivory">My Try-On Previews</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ivory/60">
        Your previews are private to your account. Open one to compare, download or delete your images. {TRYON_DISCLAIMER}
      </p>

      <section className="mt-10">
        <h2 className="text-[0.62rem] uppercase tracking-[0.3em] text-gold">Saved looks</h2>
        {savedRows.length ? (
          <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{savedRows.map((s) => <Card key={s.id} s={s} saved />)}</ul>
        ) : (
          <p className="mt-4 text-sm text-ivory/50">Save a look from any preview to keep it here.</p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-[0.62rem] uppercase tracking-[0.3em] text-gold">Recent sessions</h2>
        {rows.length ? (
          <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{rows.map((s) => <Card key={s.id} s={s} saved={savedIds.has(s.id)} />)}</ul>
        ) : (
          <div className="mt-5 border border-gold/15 p-8 text-center">
            <p className="text-sm text-ivory/60">You haven’t tried anything on yet.</p>
            <div className="mt-6 flex justify-center">
              <Button href="/virtual-try-on">Open the Try-On Studio</Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
