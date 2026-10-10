import { WorkerPortal } from "@/components/atelier/WorkerPortal";
import { getSessionContext } from "@/lib/supabase/server";

export default async function WorkerPage() {
  const session = await getSessionContext();
  const live = session.configured;
  const role = session.configured && "role" in session ? session.role : "worker";
  const email = session.configured && session.user ? session.user.email : null;
  return <WorkerPortal live={live} adminPreview={role === "admin"} email={email} />;
}
