import type { ProfileGalleryData } from "@/lib/analytics/profile-gallery-data";
import { StoriesReadProgress } from "@/components/profile/StoriesReadProgress";
import { FeaturedPassageTile } from "./tiles/FeaturedPassageTile";
import { ReaderSinceTile } from "./tiles/ReaderSinceTile";
import { PrinciplesTile } from "./tiles/PrinciplesTile";
import { DialogueTile } from "./tiles/DialogueTile";
import { ThemesTile } from "./tiles/ThemesTile";
import { KeepersTile } from "./tiles/KeepersTile";
import { LorePeopleTile } from "./tiles/LorePeopleTile";

type Props = { data: ProfileGalleryData; totalStories: number };

export function ProfileGallery({ data, totalStories }: Props) {
  return (
    <section className="relative border-t border-[rgba(242,238,228,0.12)] bg-[#0d141c] text-[#f2eee4]">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(127,231,225,0.14),transparent_30%),radial-gradient(ellipse_at_bottom,rgba(182,90,54,0.16),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent)]"
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
          <ReaderSinceTile
            firstReadAt={data.readStats.firstReadAt}
            readCount={data.readStats.readCount}
            mostRecentReadAt={data.readStats.mostRecentReadAt}
            className="lg:col-span-2"
          />
          <LorePeopleTile className="lg:col-span-6" />
        </div>
      </div>
    </section>
  );
}
