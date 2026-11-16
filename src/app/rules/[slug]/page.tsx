import { notFound } from "next/navigation";
import { RuleDetailPage } from "@/components/entities/FictionEntityViews";
import { getRuleBySlug } from "@/lib/wiki/parser";
import { CodexLocked, getCodexLock } from "@/components/entities/CodexGate";

export default async function RuleDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rule = getRuleBySlug(slug);
  if (!rule) notFound();
  const lock = await getCodexLock("rules", slug);
  if (lock) return <CodexLocked progress={lock} />;
  return <RuleDetailPage rule={rule} />;
}
