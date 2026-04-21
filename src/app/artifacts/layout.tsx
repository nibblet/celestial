import { ExploreHubTabs } from "@/components/layout/ExploreHubTabs";

export default function ArtifactsLayout({
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
