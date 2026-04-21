import { ExploreHubTabs } from "@/components/layout/ExploreHubTabs";

export default function CharactersLayout({
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
