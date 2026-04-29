import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { STYLE_PRESETS } from "@/lib/visuals/style-presets";
import { VisualsAdminConsole } from "./VisualsAdminConsole";

export const metadata: Metadata = { title: "Admin — Visuals" };

export default async function AdminVisualsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("cel_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "author", "keith"].includes(profile.role)) {
    redirect("/profile");
  }

  const presets = Object.values(STYLE_PRESETS).map((p) => ({
    key: p.key,
    label: p.label,
    brief: p.brief,
  }));

  return (
    <div className="mx-auto max-w-content px-[var(--page-padding-x)] py-10 md:py-14">
      <Link
        href="/profile"
        className="type-ui mb-4 inline-block text-ink-ghost no-underline transition-colors hover:text-ocean"
      >
        &larr; Profile
      </Link>
      <h1 className="type-page-title mb-2">Visual Prompt Studio</h1>
      <p className="mb-8 max-w-prose font-[family-name:var(--font-lora)] text-sm text-ink-muted">
        Synthesize a structured visual prompt from the wiki corpus, then
        generate an image with Imagen 4. Same target × style × corpus version
        → same cached prompt; same prompt × provider × params → same cached
        image.
      </p>
      <VisualsAdminConsole presets={presets} />
    </div>
  );
}
