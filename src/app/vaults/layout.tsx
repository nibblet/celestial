import { ExploreHubTabs } from "@/components/layout/ExploreHubTabs";

export default function VaultsLayout({
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
