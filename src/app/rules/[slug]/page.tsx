import { notFound } from "next/navigation";
import { RuleDetailPage } from "@/components/entities/FictionEntityViews";
import { getRuleBySlug } from "@/lib/wiki/parser";

export default async function RuleDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const rule = getRuleBySlug(slug);
  if (!rule) notFound();
  return <RuleDetailPage rule={rule} />;
}
