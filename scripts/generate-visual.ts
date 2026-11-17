/**
 * Run the Visuals pipeline from the command line: the same prompt synthesis
 * and generation the admin console uses (spec → visual director → OpenAI →
 * Supabase storage + cel_visual_assets), without typing the parameters in.
 *
 * Results appear in the console's Recent generations, unapproved, exactly
 * like a console render. Approve them there.
 *
 *   npm run visuals:generate -- --target elira-voss --preset intimate_crew \
 *     --aspect 4:5 --intent portrait --out /tmp/elira.png
 *   npm run visuals:generate -- --jobs path/to/jobs.json --out-dir /tmp/renders
 *
 * Flags (a jobs file is an array of objects with the same keys, camelCase):
 *   --target <slug>      entity slug (content/wiki/specs/<slug>)
 *   --kind <kind>        entity (default) | story | scene | freeform
 *   --preset <key>       style preset (default valkyrie_shipboard)
 *   --aspect <a>         16:9 (default) | 9:16 | 1:1 | 4:5 | 3:2 | 2:3
 *   --intent <i>         portrait | establishing_shot (default) | scene_moment
 *   --view / --state     spec view and state
 *   --focus <text>       what the shot should show
 *   --model <id>         OpenAI image model (default: provider default)
 *   --quality <q>        low | medium | high (default)
 *   --force              render again even if this prompt was already rendered
 *   --prompt-only        synthesize and print the prompt, generate nothing
 *   --out <file>         also save the image locally (single job)
 *   --out-dir <dir>      also save images locally as <target>-<assetId>.png
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 * and OPENAI_API_KEY (the npm script reads .env.local). Run from the repo root.
 */
import * as fs from "fs";
import * as path from "path";
import * as nodeModule from "node:module";
import { pathToFileURL } from "node:url";

type ResolveHook = (
  specifier: string,
  context: unknown,
  nextResolve: (specifier: string, context: unknown) => unknown,
) => unknown;
// registerHooks is in Node 22.15+, newer than this repo's @types/node.
const { registerHooks } = nodeModule as unknown as {
  registerHooks(hooks: { resolve: ResolveHook }): void;
};

// src/lib/visuals imports `server-only`, which only resolves inside Next.js.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return {
        url: pathToFileURL(path.join(__dirname, "lib/server-only-stub.cjs")).href,
        shortCircuit: true,
      };
    }
    return nextResolve(specifier, context);
  },
});

type Job = {
  target?: string;
  kind?: string;
  preset?: string;
  aspect?: string;
  intent?: string;
  view?: string;
  state?: string;
  focus?: string;
  model?: string;
  quality?: string;
  force?: boolean;
  promptOnly?: boolean;
  out?: string;
};

const BOOLEAN_FLAGS = new Set(["force", "prompt-only"]);

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) throw new Error(`Unexpected argument: ${arg}`);
    const key = arg.slice(2);
    if (BOOLEAN_FLAGS.has(key)) {
      out[key] = true;
    } else {
      const value = argv[++i];
      if (value === undefined) throw new Error(`--${key} needs a value`);
      out[key] = value;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = typeof args["out-dir"] === "string" ? args["out-dir"] : undefined;

  let jobs: Job[];
  if (typeof args.jobs === "string") {
    jobs = JSON.parse(fs.readFileSync(args.jobs, "utf-8")) as Job[];
    if (!Array.isArray(jobs)) throw new Error("--jobs file must hold a JSON array");
  } else {
    jobs = [
      {
        target: args.target as string | undefined,
        kind: args.kind as string | undefined,
        preset: args.preset as string | undefined,
        aspect: args.aspect as string | undefined,
        intent: args.intent as string | undefined,
        view: args.view as string | undefined,
        state: args.state as string | undefined,
        focus: args.focus as string | undefined,
        model: args.model as string | undefined,
        quality: args.quality as string | undefined,
        force: args.force === true,
        promptOnly: args["prompt-only"] === true,
        out: args.out as string | undefined,
      },
    ];
  }

  const { buildVisualCorpusContext } = await import("@/lib/visuals/corpus-context");
  const { synthesizeVisualPrompt } = await import("@/lib/visuals/synthesize-prompt");
  const { getOrGenerateAsset } = await import("@/lib/visuals/generate-asset");
  const { STYLE_PRESETS, DEFAULT_STYLE_PRESET } = await import("@/lib/visuals/style-presets");
  const { createAdminClient } = await import("@/lib/supabase/admin");

  // Attribute rows to whoever last used the Visuals console, so they show up
  // as that operator's work. VISUALS_USER_ID overrides.
  let userId: string | null = process.env.VISUALS_USER_ID?.trim() || null;
  if (!userId) {
    const { data } = await createAdminClient()
      .from("cel_visual_prompts")
      .select("created_by")
      .not("created_by", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    userId = (data?.created_by as string | undefined) ?? null;
  }

  let failed = 0;
  for (const job of jobs) {
    const label = job.target ?? job.focus?.slice(0, 40) ?? "freeform";
    try {
      const kind = (job.kind ?? "entity") as "entity" | "story" | "scene" | "freeform";
      if (kind !== "freeform" && !job.target) throw new Error("--target is required");
      const stylePreset = (job.preset ?? DEFAULT_STYLE_PRESET) as keyof typeof STYLE_PRESETS;
      if (!STYLE_PRESETS[stylePreset]) throw new Error(`Unknown preset: ${job.preset}`);

      const target = { kind, id: job.target ?? null, focus: job.focus };
      const context = await buildVisualCorpusContext(target);
      const synth = await synthesizeVisualPrompt({
        target,
        context,
        stylePreset,
        aspect: (job.aspect ?? "16:9") as never,
        intent: (job.intent ?? "establishing_shot") as never,
        view: job.view?.trim() || undefined,
        state: job.state?.trim() || undefined,
        userId,
      });
      console.log(`\n=== ${label}: prompt ${synth.promptId}${synth.cached ? " (cached)" : ""}`);
      console.log(synth.prompt.raw);
      console.log(
        `references: ${synth.referenceImages.map((r) => `[${r.role}] ${r.path}`).join(", ") || "none"}`,
      );
      if (job.promptOnly) continue;

      const params: Record<string, unknown> = { quality: job.quality ?? "high" };
      if (job.model) params.model = job.model;
      if (synth.referenceImages.length) {
        params.referenceImages = synth.referenceImages.map((r) => r.path);
      }
      const asset = await getOrGenerateAsset({
        promptId: synth.promptId,
        prompt: synth.prompt,
        provider: "openai",
        params,
        force: !!job.force,
        userId,
      });
      console.log(
        `asset ${asset.assetId}${asset.cached ? " (cached)" : ""} ${asset.width}x${asset.height}\n${asset.url}`,
      );

      const outPath =
        job.out ?? (outDir ? path.join(outDir, `${job.target ?? "freeform"}-${asset.assetId}.png`) : undefined);
      if (outPath) {
        // The render is already stored; don't let a stalled download hang the batch.
        const res = await fetch(asset.url, { signal: AbortSignal.timeout(60_000) });
        if (!res.ok) throw new Error(`Couldn't download the result (${res.status})`);
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
        console.log(`saved ${outPath}`);
      }
    } catch (err) {
      failed++;
      console.error(`\n=== ${label}: FAILED — ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (failed) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
