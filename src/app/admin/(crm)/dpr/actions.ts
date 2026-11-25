"use server";

import { validAssumptions } from "@/components/dpr/model";
import { createSupabaseServerClient, getSessionContext } from "@/lib/supabase/server";

export async function saveDpr(assumptions: unknown, revision: number) {
  const session = await getSessionContext();
  if (!("role" in session) || session.role !== "admin") return { error: "Admin access is required." };
  if (!validAssumptions(assumptions) || !Number.isInteger(revision) || revision < 0) {
    return { error: "Check the figures and ensure the loan does not exceed the project cost." };
  }

  const db = await createSupabaseServerClient();
  const result = await db?.from("dpr_assumptions")
    .update({ assumptions, revision: revision + 1 })
    .eq("id", true).eq("revision", revision).select("revision").maybeSingle();

  if (!result || result.error) return { error: "The DPR could not be saved. Try again." };
  if (!result.data) return { error: "Another admin saved a newer version. Reload before saving." };
  return { revision: result.data.revision as number };
}
