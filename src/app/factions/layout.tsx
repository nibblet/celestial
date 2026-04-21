import { ExploreHubTabs } from "@/components/layout/ExploreHubTabs";

export default function FactionsLayout({
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
