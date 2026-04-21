import { RuleIndexPage } from "@/components/entities/FictionEntityViews";
import { getAllRules } from "@/lib/wiki/parser";

export default function RulesPage() {
  return <RuleIndexPage rules={getAllRules()} />;
}
