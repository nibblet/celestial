"use client";

import { usePathname } from "next/navigation";
import { AgeModeSwitcher } from "./AgeModeSwitcher";

export function Header() {
  const pathname = usePathname();

  if (pathname === "/signup" || pathname === "/login") return null;

  return (
    <header className="md:hidden flex items-center justify-between border-b border-[var(--color-border)] bg-warm-white px-4 py-3">
      <h1 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-burgundy">
        Keith Cobb
      </h1>
      <AgeModeSwitcher />
    </header>
  );
}
