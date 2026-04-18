import { ExploreHubTabs } from "@/components/layout/ExploreHubTabs";

export default function PrinciplesLayout({
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
