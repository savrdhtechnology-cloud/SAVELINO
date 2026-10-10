import { Dashboard } from "@/components/admin/Dashboard";
import { isBackendConfigured } from "@/lib/supabase/env";

export default function AdminDashboardPage() {
  return <Dashboard live={isBackendConfigured()} />;
}
