import { Suspense } from "react";
import { ArchiveConversation } from "@/components/archive/ArchiveConversation";
import { loadArchivePrompts, pickOpeningPrompt } from "@/lib/archive/prompts";
import { getReaderProgress } from "@/lib/progress/reader-progress";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** The app opens on a conversation with the archive. */
export default async function HomePage() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    progress,
  ] = await Promise.all([supabase.auth.getUser(), getReaderProgress()]);

  const prompt = pickOpeningPrompt(loadArchivePrompts(), progress);
  const opening = prompt
    ? {
        label: prompt.label,
        quote: prompt.quote,
        question: prompt.question,
        file: prompt.file,
        followUp: prompt.followUp,
      }
    : null;

  return (
    <Suspense fallback={null}>
      <ArchiveConversation signedIn={Boolean(user)} opening={opening} />
    </Suspense>
  );
}
