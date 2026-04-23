"use client";

import { book } from "@/config/book";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AgeModeSwitcher } from "@/components/layout/AgeModeSwitcher";
import { ProfileNavLink } from "@/components/layout/ProfileNavLink";
import { useProfileNotificationBadge } from "@/hooks/useProfileNotificationBadge";

const primaryNavItems = [
  { href: "/stories", label: "Chapters" },
  { href: "/arcs", label: "Explore" },
  { href: "/ask", label: "Ask" },
] as const;

function isNavActive(pathname: string, href: string): boolean {
  if (href === "/stories") return pathname.startsWith("/stories");
  if (href === "/arcs") {
    return (
      pathname.startsWith("/journeys") ||
      pathname.startsWith("/arcs") ||
      pathname.startsWith("/themes") ||
      pathname.startsWith("/principles") ||
      pathname.startsWith("/people") ||
      pathname.startsWith("/characters") ||
      pathname.startsWith("/artifacts") ||
      pathname.startsWith("/vaults") ||
      pathname.startsWith("/locations") ||
      pathname.startsWith("/factions") ||
      pathname.startsWith("/rules") ||
      pathname.startsWith("/mission-logs")
    );
  }
  if (href === "/ask") return pathname === "/ask" || pathname.startsWith("/ask/");
  return false;
}

function MobileNavIcon({
  name,
  active,
}: {
  name: (typeof primaryNavItems)[number]["href"];
  active: boolean;
}) {
  const c = active ? "text-burgundy" : "text-ink-muted";
  switch (name) {
    case "/stories":
      return (
        <svg
          className={`h-5 w-5 ${c}`}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M8 7h8M8 11h6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "/arcs":
      return (
        <svg
          className={`h-5 w-5 ${c}`}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="m16.2 7.8-4.4 14.2M9.5 9.5 16 8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "/ask":
      return (
        <svg
          className={`h-5 w-5 ${c}`}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <path
            d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function Nav() {
  const pathname = usePathname();
  const profileBadge = useProfileNotificationBadge();
  const isHome = pathname === "/";
  const [navSolid, setNavSolid] = useState(!isHome);

  useEffect(() => {
    if (!isHome) {
      queueMicrotask(() => setNavSolid(true));
      return;
    }
    const onScroll = () => setNavSolid(window.scrollY >= 60);
    queueMicrotask(() => onScroll());
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  if (pathname === "/login" || pathname === "/signup") return null;

  const desktopNavSurface = navSolid
    ? "border-[var(--color-border)] bg-[rgba(13,20,28,0.88)] backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.22)]"
    : "border-transparent bg-transparent backdrop-blur-sm";

  return (
    <>
      <nav
        aria-label="Main navigation"
        className={`hidden md:flex sticky top-0 z-[90] h-[60px] shrink-0 items-center justify-between border-b px-[var(--page-padding-x)] transition-[background-color,box-shadow,border-color] duration-[var(--duration-normal)] ${desktopNavSurface}`}
      >
        <Link
          href="/"
          className="font-[family-name:var(--font-playfair)] text-base font-semibold tracking-tight text-burgundy"
        >
          {book.title}
        </Link>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-4 pl-6">
          <ul className="flex list-none items-center gap-6 lg:gap-8">
            {primaryNavItems.map((item) => {
              const active = isNavActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`type-ui relative inline-block text-[0.875rem] no-underline transition-colors duration-[var(--duration-fast)] ${
                      active
                        ? "text-burgundy after:absolute after:left-0 after:right-0 after:top-full after:mt-0.5 after:h-0.5 after:rounded-sm after:bg-burgundy"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex shrink-0 items-center gap-2 border-l border-[var(--color-border)] pl-4">
            <AgeModeSwitcher variant="compact" />
            <ProfileNavLink badge={profileBadge} />
          </div>
        </div>
      </nav>

      <nav
        aria-label="Main navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-[rgba(13,20,28,0.94)] backdrop-blur-md"
      >
        <ul className="flex list-none justify-around py-2">
          {primaryNavItems.map((item) => {
            const active = isNavActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 px-1 py-1 text-[0.6875rem] font-medium tracking-wide ${
                    active ? "text-burgundy" : "text-ink-muted"
                  }`}
                >
                  <MobileNavIcon name={item.href} active={active} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
