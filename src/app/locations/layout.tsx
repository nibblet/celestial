import { ExploreHubTabs } from "@/components/layout/ExploreHubTabs";

export default function LocationsLayout({
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
