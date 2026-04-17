export interface StoryTOCSection {
  id: string;
  label: string;
}

interface StoryTOCProps {
  sections: StoryTOCSection[];
}

export function StoryTOC({ sections }: StoryTOCProps) {
  if (sections.length < 2) return null;

  return (
    <aside
      aria-label="On this page"
      className="hidden lg:block"
    >
      <nav className="sticky top-20">
        <p className="type-meta mb-2 text-ink-ghost">On this page</p>
        <ul className="space-y-1.5 border-l border-[var(--color-divider)] pl-3">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="type-ui block text-ink-ghost no-underline transition-colors hover:text-ocean"
              >
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
