import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Anthropic from "@anthropic-ai/sdk";
import { BeyondShell } from "@/components/beyond/BeyondShell";
import { SessionWrapCard } from "@/components/beyond/SessionWrapCard";
import { getAuthenticatedProfileContext } from "@/lib/auth/profile-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrGenerateBeyondReflection } from "@/lib/ai/reflections";
import {
  computeSessionWrapSignature,
  gatherSessionWrapInputs,
  generateSessionWrap,
  SESSION_WRAP_MODEL,
} from "@/lib/beyond/session-wrap";

export const metadata: Metadata = {
  title: "Beyond",
  description:
    "Keith's dedicated space for shaping untold stories into new stories for the collection.",
};

type SessionWrap = { text: string; generated: boolean } | null;

/**
 * Build the cached "here's where you left off" summary. Cached by the
 * helper against a signature derived from Keith's most recent session,
 * open-draft count, and latest message timestamp — so rerenders within
 * the same activity window hit the cache (no Anthropic call, no new
 * ledger row). Any failure fails-open to null so /beyond still renders.
 */
async function buildSessionWrap(userId: string): Promise<SessionWrap> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const supabase = createAdminClient();
    const inputs = await gatherSessionWrapInputs(supabase, userId);

    // No activity yet — skip generation entirely. The card only adds
    // signal when there's something to welcome Keith back to.
    if (!inputs.lastSessionId && inputs.draftCount === 0) return null;

    const signature = computeSessionWrapSignature({
      lastSessionId: inputs.lastSessionId,
      draftCount: inputs.draftCount,
      latestMessageTimestamp: inputs.latestMessageTimestamp,
    });

    const anthropic = new Anthropic({ apiKey });
    const result = await getOrGenerateBeyondReflection({
      supabase,
      userId,
      kind: "session_wrap",
      targetId: null,
      inputSignature: signature,
      model: SESSION_WRAP_MODEL,
      contextType: "beyond",
      contextId: userId,
      generate: () => generateSessionWrap({ inputs, anthropic }),
    });
    return { text: result.text, generated: result.generated };
  } catch (err) {
    console.error("[beyond/page] session wrap failed:", err);
    return null;
  }
}

export default async function BeyondPage() {
  const { user, isAuthorSpecialAccess } = await getAuthenticatedProfileContext();

  if (!user) redirect("/login");
  if (!isAuthorSpecialAccess) redirect("/tell");

  const wrap = await buildSessionWrap(user.id);

  return (
    <>
      {wrap ? <SessionWrapCard text={wrap.text} generated={wrap.generated} /> : null}
      <BeyondShell />
    </>
  );
}
