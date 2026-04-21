import { createBrowserClient } from "@supabase/ssr";
import { withCelTablePrefix } from "@/lib/supabase/table-prefix";

export function createClient() {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return withCelTablePrefix(client);
}
