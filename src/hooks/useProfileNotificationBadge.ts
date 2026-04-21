"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NotificationState = {
  unreadAnswers: number;
  pendingQuestions: number;
  isAuthor: boolean;
};

export type ProfileNavBadge =
  | { kind: "dot" }
  | { kind: "number"; value: number };

export function useProfileNotificationBadge(): ProfileNavBadge | null {
  const pathname = usePathname();
  const [notifications, setNotifications] = useState<NotificationState>({
    unreadAnswers: 0,
    pendingQuestions: 0,
    isAuthor: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      try {
        const res = await fetch("/api/notifications/count");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as NotificationState;
        if (!cancelled) setNotifications(data);
      } catch {
        // Keep the zero state if the endpoint fails.
      }
    }
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (
    notifications.isAuthor &&
    notifications.pendingQuestions > 0
  ) {
    return {
      kind: "number",
      value: notifications.pendingQuestions,
    };
  }
  if (
    !notifications.isAuthor &&
    notifications.unreadAnswers > 0
  ) {
    return { kind: "dot" };
  }
  return null;
}
