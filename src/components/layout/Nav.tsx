"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAgeMode } from "@/hooks/useAgeMode";

const allNavItems = [
  { href: "/", label: "Home" },
  { href: "/stories", label: "Stories" },
  { href: "/journeys", label: "Journeys" },
  { href: "/themes", label: "Themes" },
  { href: "/timeline", label: "Timeline" },
  { href: "/ask", label: "Ask" },
  { href: "/profile", label: "Profile" },
] as const;

function navActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();
  const { ageMode } = useAgeMode();
  const navItems = useMemo(
    () =>
      ageMode === "young_reader"
        ? allNavItems.filter((i) => i.href !== "/themes")
        : [...allNavItems],
    [ageMode]
  );
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
    ? "border-[var(--color-border)] bg-[rgba(247,243,237,0.92)] backdrop-blur-md shadow-sm"
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
          Keith Cobb Storybook
        </Link>
        <div className="flex items-center gap-8">
          <ul className="flex list-none items-center gap-8">
            {navItems.slice(1).map((item) => {
              const active = navActive(pathname, item.href);
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
        </div>
      </nav>

      <nav
        aria-label="Main navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--color-border)] bg-warm-white/95 backdrop-blur-md"
      >
        <ul className="flex list-none justify-around py-2">
          {navItems.map((item) => {
            const active = navActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center px-2 py-1 text-[0.625rem] font-medium tracking-wide ${
                    active ? "text-burgundy" : "text-ink-muted"
                  }`}
                >
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
