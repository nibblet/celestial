"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { StoryContributionWorkspace } from "@/components/tell/StoryContributionWorkspace";
import { BeyondDraftEditor } from "./BeyondDraftEditor";
import { BeyondEditMode } from "./BeyondEditMode";
import { BeyondQAMode } from "./BeyondQAMode";
import { BeyondModeTabs, type BeyondMode } from "./BeyondModeTabs";

function resolveMode(param: string | null): BeyondMode {
  if (param === "write" || param === "edit" || param === "qa") return param;
  return "chat";
}

function BeyondShellInner() {
  const params = useSearchParams();
  const mode = resolveMode(params.get("mode"));

  return (
    <div className="beyond-theme relative flex h-full flex-col">
      <BeyondModeTabs active={mode} />
      <div className="flex-1 overflow-y-auto">
        {mode === "qa" && <BeyondQAMode />}
        {mode === "chat" && (
          <StoryContributionWorkspace contributionMode="beyond" />
        )}
        {mode === "write" && (
          <BeyondDraftEditor origin="write" />
        )}
        {mode === "edit" && <BeyondEditMode />}
      </div>
    </div>
  );
}

export function BeyondShell() {
  return (
    <Suspense fallback={null}>
      <BeyondShellInner />
    </Suspense>
  );
}
