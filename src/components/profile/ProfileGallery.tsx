import type { ProfileGalleryData } from "@/lib/analytics/profile-gallery-data";
import { StoriesReadProgress } from "@/components/profile/StoriesReadProgress";
import { FeaturedPassageTile } from "./tiles/FeaturedPassageTile";
import { WithKeithSinceTile } from "./tiles/WithKeithSinceTile";
import { PrinciplesTile } from "./tiles/PrinciplesTile";
import { DialogueTile } from "./tiles/DialogueTile";
import { ThemesTile } from "./tiles/ThemesTile";
import { KeepersTile } from "./tiles/KeepersTile";
import { KeithsPeopleTile } from "./tiles/KeithsPeopleTile";

type Props = { data: ProfileGalleryData; totalStories: number };

export function ProfileGallery({ data, totalStories }: Props) {
  return (
    <section className="relative border-t border-[rgba(240,232,213,0.12)] bg-[#241710] text-[#f0e8d5]">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,168,67,0.16),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]"
        aria-hidden
      />
      <div className="relative mx-auto max-w-wide px-[var(--page-padding-x)] py-12 md:py-16">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <StoriesReadProgress
            readCount={data.readStats.readCount}
            totalStories={totalStories}
          />
          <FeaturedPassageTile
            passage={data.featuredPassage}
            totalCount={data.savedPassageCount}
            className="lg:col-span-6"
          />
          <PrinciplesTile
            principles={data.topPrinciples}
            className="lg:col-span-3"
          />
          <ThemesTile themes={data.topThemes} className="lg:col-span-3" />
          <KeepersTile
            top={data.favorites.top}
            totalCount={data.favorites.totalCount}
            className="lg:col-span-2"
          />
          <DialogueTile
            recent={data.dialogue.recent}
            askedCount={data.dialogue.askedCount}
            answeredCount={data.dialogue.answeredCount}
            className="lg:col-span-2"
          />
          <WithKeithSinceTile
            firstReadAt={data.readStats.firstReadAt}
            readCount={data.readStats.readCount}
            mostRecentReadAt={data.readStats.mostRecentReadAt}
            className="lg:col-span-2"
          />
          <KeithsPeopleTile className="lg:col-span-6" />
        </div>
      </div>
    </section>
  );
}
