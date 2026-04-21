import { StoriesHubTabs } from "@/components/layout/StoriesHubTabs";

export default function MissionLogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StoriesHubTabs />
      {children}
    </>
  );
}
