import { NextResponse } from "next/server";
import { getStoryById } from "@/lib/wiki/parser";
import { getPublishedStoryById } from "@/lib/wiki/supabase-stories";

export async function GET(
  _request: Request,
  context: { params: Promise<{ storyId: string }> }
) {
  const { storyId } = await context.params;
  const story =
    getStoryById(storyId) || (await getPublishedStoryById(storyId));
  if (!story) {
    return NextResponse.json({ title: null }, { status: 404 });
  }
  return NextResponse.json({ title: story.title });
}
