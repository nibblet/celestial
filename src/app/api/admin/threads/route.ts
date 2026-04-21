import { createClient } from "@/lib/supabase/server";
import {
  createThread,
  listOpenThreads,
  markResolved,
  type OpenThreadKind,
} from "@/lib/threads/repo";

/**
 * Admin-only CRUD surface for `sb_open_threads`.
 *
 *   GET    /api/admin/threads?resolved=false&openedInChapterId=CH01&limit=100
 *   POST   /api/admin/threads
 *          body: { title, question, kind?, openedInChapterId,
 *                  openedInSceneSlug?, notes? }
 *   PATCH  /api/admin/threads?id=<uuid>
 *          body: { resolvedInChapterId, resolvedInSceneSlug?, notes? }
 *
 * Access: sb_profiles.role IN ('admin', 'keith'). Matches `/api/admin/
 * ai-activity` exactly so the role check is predictable and the RLS
 * policies on `cel_open_threads` are the ultimate safety net.
 */

const VALID_KINDS: readonly OpenThreadKind[] = [
  "mystery",
  "setup",
  "contradiction",
  "gap",
];

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" as const, status: 401 } as const;

  const { data: profile } = await supabase
    .from("sb_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "keith"].includes(profile.role)) {
    return { error: "Forbidden" as const, status: 403 } as const;
  }
  return { supabase } as const;
}

function parseBool(v: string | null): boolean | undefined {
  if (v == null) return undefined;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

// ── GET ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const parsedLimit = Number.parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(500, parsedLimit)
    : 200;

  const rows = await listOpenThreads(auth.supabase, {
    resolved: parseBool(url.searchParams.get("resolved")),
    openedInChapterId:
      url.searchParams.get("openedInChapterId") ?? undefined,
    limit,
  });
  return Response.json({ rows, limit });
}

// ── POST ────────────────────────────────────────────────────────────

type CreateBody = {
  title?: unknown;
  question?: unknown;
  kind?: unknown;
  openedInChapterId?: unknown;
  openedInSceneSlug?: unknown;
  notes?: unknown;
};

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  const openedInChapterId =
    typeof body.openedInChapterId === "string"
      ? body.openedInChapterId.trim()
      : "";

  if (!title || !question || !openedInChapterId) {
    return Response.json(
      {
        error:
          "title, question, and openedInChapterId are required non-empty strings",
      },
      { status: 400 },
    );
  }

  const kindRaw = typeof body.kind === "string" ? body.kind : "mystery";
  if (!VALID_KINDS.includes(kindRaw as OpenThreadKind)) {
    return Response.json(
      { error: `kind must be one of ${VALID_KINDS.join(", ")}` },
      { status: 400 },
    );
  }

  const created = await createThread(auth.supabase, {
    title,
    question,
    kind: kindRaw as OpenThreadKind,
    openedInChapterId,
    openedInSceneSlug:
      typeof body.openedInSceneSlug === "string"
        ? body.openedInSceneSlug
        : null,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  });

  if (!created) {
    return Response.json(
      { error: "Failed to create thread" },
      { status: 500 },
    );
  }
  return Response.json({ thread: created }, { status: 201 });
}

// ── PATCH (resolve) ─────────────────────────────────────────────────

type PatchBody = {
  resolvedInChapterId?: unknown;
  resolvedInSceneSlug?: unknown;
  notes?: unknown;
};

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "id query param is required" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const resolvedInChapterId =
    typeof body.resolvedInChapterId === "string"
      ? body.resolvedInChapterId.trim()
      : "";
  if (!resolvedInChapterId) {
    return Response.json(
      { error: "resolvedInChapterId is required to mark a thread resolved" },
      { status: 400 },
    );
  }

  const updated = await markResolved(auth.supabase, id, {
    resolvedInChapterId,
    resolvedInSceneSlug:
      typeof body.resolvedInSceneSlug === "string"
        ? body.resolvedInSceneSlug
        : null,
    notes: typeof body.notes === "string" ? body.notes : undefined,
  });

  if (!updated) {
    return Response.json(
      { error: "Failed to update thread (not found or RLS)" },
      { status: 404 },
    );
  }
  return Response.json({ thread: updated });
}
