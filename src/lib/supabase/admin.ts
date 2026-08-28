import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS entirely. NEVER import this into
// client components, and never expose SUPABASE_SERVICE_ROLE_KEY to the
// browser. Use only inside Server Actions / Route Handlers for privileged
// operations the anon-key client cannot do under RLS, e.g.:
//   - provisioning a teacher/parent/admin auth.users account
//   - publishing a terminal report (writing the frozen snapshot)
//   - approving a parent_change_requests row
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
