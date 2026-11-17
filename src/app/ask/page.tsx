import { Suspense } from "react";
import { ArchiveConversation } from "@/components/archive/ArchiveConversation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * The same conversation as the home screen, without the opening prompt.
 * Deep links land here: a pinned thread (?c=), a chapter (?story=), a saved
 * passage (?highlight=) or a prepared question (?prompt=).
 */
export default async function AskPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return (
    <Suspense fallback={null}>
      <ArchiveConversation signedIn={Boolean(user)} opening={null} />
    </Suspense>
  );
}
