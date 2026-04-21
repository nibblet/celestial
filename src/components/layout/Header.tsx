"use client";

import { book } from "@/config/book";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AgeModeSwitcher } from "./AgeModeSwitcher";
import { ProfileNavLink } from "./ProfileNavLink";
import { useProfileNotificationBadge } from "@/hooks/useProfileNotificationBadge";

export function Header() {
  const pathname = usePathname();
  const profileBadge = useProfileNotificationBadge();

  if (pathname === "/signup" || pathname === "/login") return null;

  return (
    <header className="md:hidden flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-warm-white px-4 py-3">
      <Link
        href="/"
        className="min-w-0 shrink font-[family-name:var(--font-playfair)] text-lg font-semibold text-burgundy"
        aria-label="Home"
      >
        {book.title}
      </Link>
      <div className="flex min-w-0 shrink-0 items-center gap-1.5">
        <AgeModeSwitcher variant="compact" />
        <ProfileNavLink badge={profileBadge} />
      </div>
    </header>
  );
}
