import { createBrowserClient } from "@supabase/ssr";

// Not generic-typed against Database yet — src/lib/types/database.ts is
// hand-written and only covers what Phase 1 touches. Once the Supabase
// project exists, run `supabase gen types typescript` and re-add the
// generic here. Until then, cast query results explicitly at call sites.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
