import { ExploreHubTabs } from "@/components/layout/ExploreHubTabs";

export default function RulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ExploreHubTabs />
      {children}
    </>
  );
}
