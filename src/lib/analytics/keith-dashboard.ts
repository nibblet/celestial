import { storiesData } from "@/lib/wiki/static-data";
import { createAdminClient } from "@/lib/supabase/admin";

type DashboardSummary = {
  totalStories: number;
  totalReads: number;
  readsLast30Days: number;
  mostRecentReadAt: string | null;
};

type TopStoryMetric = {
  storyId: string;
  title: string;
  reads: number;
};

type WeeklyReadMetric = {
  label: string;
  reads: number;
};

export type BeyondActivity = {
  draftsInProgress: number;
  draftsSubmittedForReview: number;
  publishedThisMonth: number;
  biosEdited: number;
  questionsAnsweredLast30Days: number;
  questionsPending: number;
};

export type KeithDashboardData = {
  summary: DashboardSummary;
  weeklyReads: WeeklyReadMetric[];
  topStories: TopStoryMetric[];
  trendingStories: TopStoryMetric[];
  beyondActivity: BeyondActivity;
};

const EMPTY_BEYOND_ACTIVITY: BeyondActivity = {
  draftsInProgress: 0,
  draftsSubmittedForReview: 0,
  publishedThisMonth: 0,
  biosEdited: 0,
  questionsAnsweredLast30Days: 0,
  questionsPending: 0,
};

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function startOfWeek(date: Date): Date {
  const next = startOfDay(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatWeekLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatIso(date: Date): string {
  return date.toISOString();
}

function buildStoryTitleMap(
  publishedStories: { story_id: string | null; title: string }[]
): Map<string, string> {
  const map = new Map<string, string>();

  for (const story of storiesData) {
    map.set(story.storyId, story.title);
  }

  for (const story of publishedStories) {
    if (story.story_id) {
      map.set(story.story_id, story.title);
    }
  }

  return map;
}

function rankStories(
  reads: { story_id: string }[],
  titleMap: Map<string, string>
): TopStoryMetric[] {
  const counts = new Map<string, number>();
  for (const read of reads) {
    counts.set(read.story_id, (counts.get(read.story_id) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([storyId, total]) => ({
      storyId,
      title: titleMap.get(storyId) ?? storyId,
      reads: total,
    }));
}

async function loadBeyondActivity(
  admin: ReturnType<typeof createAdminClient>
): Promise<BeyondActivity> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = addDays(startOfDay(now), -30);

  const [
    draftsInProgress,
    draftsSubmitted,
    publishedThisMonth,
    biosEdited,
    questionsAnswered,
    questionsPending,
  ] = await Promise.all([
    admin
      .from("sb_story_drafts")
      .select("id", { count: "exact", head: true })
      .eq("contribution_mode", "beyond")
      .eq("status", "draft"),
    admin
      .from("sb_story_drafts")
      .select("id", { count: "exact", head: true })
      .eq("contribution_mode", "beyond")
      .eq("status", "approved"),
    admin
      .from("sb_story_drafts")
      .select("id", { count: "exact", head: true })
      .eq("contribution_mode", "beyond")
      .eq("status", "published")
      .gte("updated_at", formatIso(startOfMonth)),
    admin
      .from("sb_people")
      .select("id", { count: "exact", head: true })
      .not("bio_md", "is", null),
    admin
      .from("sb_chapter_answers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", formatIso(thirtyDaysAgo)),
    admin
      .from("sb_chapter_questions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  return {
    draftsInProgress: draftsInProgress.count ?? 0,
    draftsSubmittedForReview: draftsSubmitted.count ?? 0,
    publishedThisMonth: publishedThisMonth.count ?? 0,
    biosEdited: biosEdited.count ?? 0,
    questionsAnsweredLast30Days: questionsAnswered.count ?? 0,
    questionsPending: questionsPending.count ?? 0,
  };
}

export async function getKeithDashboardData(): Promise<KeithDashboardData> {
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      summary: {
        totalStories: storiesData.length,
        totalReads: 0,
        readsLast30Days: 0,
        mostRecentReadAt: null,
      },
      weeklyReads: [],
      topStories: [],
      trendingStories: [],
      beyondActivity: EMPTY_BEYOND_ACTIVITY,
    };
  }

  // Fetch in parallel with the reads query below by resolving separately.
  const beyondActivityPromise = loadBeyondActivity(admin).catch((err) => {
    console.error("Failed to load Beyond activity:", err);
    return EMPTY_BEYOND_ACTIVITY;
  });

  const { data: publishedStories } = await admin
    .from("sb_story_drafts")
    .select("story_id, title")
    .eq("status", "published")
    .not("story_id", "is", null);

  const safePublishedStories = publishedStories || [];
  const titleMap = buildStoryTitleMap(safePublishedStories);

  const { data: allReads, error } = await admin
    .from("sb_story_reads")
    .select("story_id, read_at")
    .order("read_at", { ascending: false });

  if (error || !allReads) {
    return {
      summary: {
        totalStories: storiesData.length + safePublishedStories.length,
        totalReads: 0,
        readsLast30Days: 0,
        mostRecentReadAt: null,
      },
      weeklyReads: [],
      topStories: [],
      trendingStories: [],
      beyondActivity: await beyondActivityPromise,
    };
  }

  const now = new Date();
  const thirtyDaysAgo = addDays(startOfDay(now), -30);
  const currentWeekStart = startOfWeek(now);
  const weekStarts = Array.from({ length: 10 }, (_, index) =>
    addDays(currentWeekStart, -(9 - index) * 7)
  );
  const weeklyBuckets = new Map<string, number>(
    weekStarts.map((date) => [formatIso(date), 0])
  );

  const recentReads = allReads.filter(
    (read) => new Date(read.read_at) >= thirtyDaysAgo
  );

  for (const read of allReads) {
    const readAt = new Date(read.read_at);
    const bucket = startOfWeek(readAt);
    const key = formatIso(bucket);
    if (weeklyBuckets.has(key)) {
      weeklyBuckets.set(key, (weeklyBuckets.get(key) ?? 0) + 1);
    }
  }

  return {
    summary: {
      totalStories: storiesData.length + safePublishedStories.length,
      totalReads: allReads.length,
      readsLast30Days: recentReads.length,
      mostRecentReadAt: allReads[0]?.read_at ?? null,
    },
    weeklyReads: weekStarts.map((date) => ({
      label: formatWeekLabel(date),
      reads: weeklyBuckets.get(formatIso(date)) ?? 0,
    })),
    topStories: rankStories(allReads, titleMap),
    trendingStories: rankStories(recentReads, titleMap),
    beyondActivity: await beyondActivityPromise,
  };
}
