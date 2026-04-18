import Link from "next/link";

/** Theme chip style — matches story page theme pills in `StoryDetailsDisclosure`. */
export function ThemePillLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  const isLeadership = children.toLowerCase().includes("leadership");
  return (
    <Link
      href={href}
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
        isLeadership
          ? "border-ocean/35 text-ocean hover:border-ocean hover:bg-ocean-pale/50"
          : "border-green/35 text-green hover:border-green hover:bg-green-pale/50"
      }`}
    >
      {children}
    </Link>
  );
}
