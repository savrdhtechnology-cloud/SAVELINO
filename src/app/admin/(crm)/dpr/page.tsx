import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Dashboard } from "@/components/dpr/Dashboard";
import { defaults } from "@/components/dpr/defaults";
import { validAssumptions } from "@/components/dpr/model";
import { createSupabaseServerClient, getSessionContext } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "DPR Dashboard" };

export default async function DprPage() {
  const session = await getSessionContext();
  if (!("role" in session) || session.role !== "admin") notFound();

  const db = await createSupabaseServerClient();
  const result = await db?.from("dpr_assumptions").select("assumptions, revision").eq("id", true).single();
  const saved = { ...defaults, ...result?.data?.assumptions };
  const valid = validAssumptions(saved);
  const revision = valid ? result?.data?.revision : undefined;

  return <Dashboard initial={valid ? saved : defaults} revision={revision} />;
}
