import { ExploreHubTabs } from "@/components/layout/ExploreHubTabs";

export default function ArcsLayout({
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
