import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Singleton so onAuthStateChange listeners fire regardless of which
// module calls signOut() or any other auth method.
let instance: SupabaseClient | null = null;

export function createClient() {
  if (!instance) {
    instance = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return instance;
}
