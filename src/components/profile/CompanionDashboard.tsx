import type { CompanionDashboardData } from "@/lib/analytics/companion-dashboard";

function formatRelativeDate(value: string | null): string {
  if (!value) return "No reads yet";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRecentWindowLabel(count: number): string {
  return count === 1 ? "1 family read in 30 days" : `${count} family reads in 30 days`;
}

export function CompanionDashboard({
  summary,
  weeklyReads,
  topStories,
  trendingStories,
  beyondActivity,
}: CompanionDashboardData) {
  const maxWeeklyReads = Math.max(...weeklyReads.map((week) => week.reads), 1);
  const maxTopReads = Math.max(...topStories.map((story) => story.reads), 1);
  const maxTrendingReads = Math.max(
    ...trendingStories.map((story) => story.reads),
    1
  );

  return (
    <section className="relative border-t border-[rgba(247,243,237,0.08)] bg-[#160f0b] text-[#f7f3ed]">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(74,127,160,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-wide px-[var(--page-padding-x)] py-14 md:py-18">
        <div className="mb-8 max-w-3xl">
          <p className="type-era-label mb-3 text-[rgba(247,243,237,0.58)]">
            Family Reading Pulse
          </p>
          <h2 className="font-[family-name:var(--font-playfair)] text-[clamp(1.8rem,3vw,2.6rem)] font-semibold text-[#f7f3ed]">
            A quiet look at how the archive is being used.
          </h2>
          <p className="mt-3 font-[family-name:var(--font-lora)] text-base leading-relaxed text-[rgba(247,243,237,0.74)]">
            These aggregate signals celebrate family engagement without showing
            individual reading histories.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-[24px] border border-[rgba(247,243,237,0.1)] bg-[rgba(247,243,237,0.04)] p-5">
            <p className="type-era-label text-[rgba(247,243,237,0.5)]">
              Stories in library
            </p>
            <p className="mt-3 font-[family-name:var(--font-playfair)] text-4xl font-semibold text-[#f7f3ed]">
              {summary.totalStories}
            </p>
          </div>
          <div className="rounded-[24px] border border-[rgba(247,243,237,0.1)] bg-[rgba(247,243,237,0.04)] p-5">
            <p className="type-era-label text-[rgba(247,243,237,0.5)]">
              Total family reads
            </p>
            <p className="mt-3 font-[family-name:var(--font-playfair)] text-4xl font-semibold text-[#f7f3ed]">
              {summary.totalReads}
            </p>
          </div>
          <div className="rounded-[24px] border border-[rgba(247,243,237,0.1)] bg-[rgba(247,243,237,0.04)] p-5">
            <p className="type-era-label text-[rgba(247,243,237,0.5)]">
              Last 30 days
            </p>
            <p className="mt-3 font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[#f7f3ed]">
              {summary.readsLast30Days}
            </p>
            <p className="mt-2 font-[family-name:var(--font-inter)] text-sm text-[rgba(247,243,237,0.62)]">
              {formatRecentWindowLabel(summary.readsLast30Days)}
            </p>
          </div>
          <div className="rounded-[24px] border border-[rgba(247,243,237,0.1)] bg-[rgba(247,243,237,0.04)] p-5">
            <p className="type-era-label text-[rgba(247,243,237,0.5)]">
              Most recent read
            </p>
            <p className="mt-3 font-[family-name:var(--font-playfair)] text-2xl font-semibold text-[#f7f3ed]">
              {formatRelativeDate(summary.mostRecentReadAt)}
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_0.75fr_0.75fr]">
          <div className="rounded-[28px] border border-[rgba(247,243,237,0.12)] bg-[rgba(247,243,237,0.04)] p-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="type-era-label text-[rgba(247,243,237,0.5)]">
                  Weekly reading trend
                </p>
                <h3 className="mt-2 font-[family-name:var(--font-playfair)] text-2xl text-[#f7f3ed]">
                  Last 10 weeks
                </h3>
              </div>
              <p className="font-[family-name:var(--font-inter)] text-xs text-[rgba(247,243,237,0.55)]">
                Aggregate family reads
              </p>
            </div>

            {weeklyReads.length === 0 ? (
              <p className="mt-6 font-[family-name:var(--font-inter)] text-sm text-[rgba(247,243,237,0.58)]">
                Reading activity will appear here once stories begin getting
                opened.
              </p>
            ) : (
              <div className="mt-8 grid h-[220px] grid-cols-10 items-end gap-2">
                {weeklyReads.map((week) => {
                  const height = `${Math.max(
                    12,
                    (week.reads / maxWeeklyReads) * 100
                  )}%`;
                  return (
                    <div
                      key={week.label}
                      className="flex h-full flex-col justify-end gap-2"
                    >
                      <div className="flex h-full items-end">
                        <div
                          className="w-full rounded-t-[14px] bg-[linear-gradient(180deg,#d4a843_0%,#b5451b_100%)] opacity-90"
                          style={{ height }}
                          aria-label={`${week.label}: ${week.reads} reads`}
                          title={`${week.label}: ${week.reads} reads`}
                        />
                      </div>
                      <div className="text-center">
                        <p className="font-[family-name:var(--font-inter)] text-[10px] text-[rgba(247,243,237,0.45)]">
                          {week.label}
                        </p>
                        <p className="font-[family-name:var(--font-inter)] text-[11px] font-semibold text-[rgba(247,243,237,0.82)]">
                          {week.reads}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-[rgba(247,243,237,0.12)] bg-[rgba(247,243,237,0.04)] p-6">
            <p className="type-era-label text-[rgba(247,243,237,0.5)]">
              Most read
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-playfair)] text-2xl text-[#f7f3ed]">
              Library leaders
            </h3>

            {topStories.length === 0 ? (
              <p className="mt-6 font-[family-name:var(--font-inter)] text-sm text-[rgba(247,243,237,0.58)]">
                Popular stories will appear after the first reads are tracked.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {topStories.map((story, index) => (
                  <div key={story.storyId}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <p className="font-[family-name:var(--font-lora)] text-sm leading-snug text-[#f7f3ed]">
                        {index + 1}. {story.title}
                      </p>
                      <span className="font-[family-name:var(--font-inter)] text-xs font-semibold text-[rgba(247,243,237,0.62)]">
                        {story.reads}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[rgba(247,243,237,0.1)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#7ab3c9_0%,#4a7fa0_100%)]"
                        style={{
                          width: `${(story.reads / maxTopReads) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-[rgba(247,243,237,0.12)] bg-[rgba(247,243,237,0.04)] p-6">
            <p className="type-era-label text-[rgba(247,243,237,0.5)]">
              Trending this month
            </p>
            <h3 className="mt-2 font-[family-name:var(--font-playfair)] text-2xl text-[#f7f3ed]">
              Fresh momentum
            </h3>

            {trendingStories.length === 0 ? (
              <p className="mt-6 font-[family-name:var(--font-inter)] text-sm text-[rgba(247,243,237,0.58)]">
                Once there are 30-day reads, this list will show which stories
                are drawing recent attention.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {trendingStories.map((story) => (
                  <div key={story.storyId}>
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <p className="font-[family-name:var(--font-lora)] text-sm leading-snug text-[#f7f3ed]">
                        {story.title}
                      </p>
                      <span className="font-[family-name:var(--font-inter)] text-xs font-semibold text-[rgba(247,243,237,0.62)]">
                        {story.reads}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-[rgba(247,243,237,0.1)]">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#6ba35a_0%,#3d6b35_100%)]"
                        style={{
                          width: `${(story.reads / maxTrendingReads) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Beyond activity ── */}
        <div className="mt-10">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <p className="type-era-label text-[rgba(247,243,237,0.58)]">
                Beyond activity
              </p>
              <h3 className="mt-2 font-[family-name:var(--font-playfair)] text-2xl text-[#f7f3ed]">
                What&apos;s moving in your private workshop
              </h3>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <BeyondStat
              label="Drafts in progress"
              value={beyondActivity.draftsInProgress}
            />
            <BeyondStat
              label="Submitted for review"
              value={beyondActivity.draftsSubmittedForReview}
              accent="clay"
            />
            <BeyondStat
              label="Published this month"
              value={beyondActivity.publishedThisMonth}
              accent="gold"
            />
            <BeyondStat
              label="Biographies with your voice"
              value={beyondActivity.biosEdited}
            />
            <BeyondStat
              label="Questions answered (30 d)"
              value={beyondActivity.questionsAnsweredLast30Days}
            />
            <BeyondStat
              label="Questions awaiting you"
              value={beyondActivity.questionsPending}
              accent={beyondActivity.questionsPending > 0 ? "clay" : undefined}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function BeyondStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: "clay" | "gold";
}) {
  const borderClass =
    accent === "clay"
      ? "border-[rgba(184,67,54,0.45)]"
      : accent === "gold"
        ? "border-[rgba(212,168,67,0.45)]"
        : "border-[rgba(247,243,237,0.1)]";
  const valueClass =
    accent === "clay"
      ? "text-[#e8b4a8]"
      : accent === "gold"
        ? "text-[#d4a843]"
        : "text-[#f7f3ed]";
  return (
    <div
      className={`rounded-[20px] border ${borderClass} bg-[rgba(247,243,237,0.04)] p-4`}
    >
      <p className="type-era-label text-[rgba(247,243,237,0.5)]">{label}</p>
      <p
        className={`mt-2 font-[family-name:var(--font-playfair)] text-3xl font-semibold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}
