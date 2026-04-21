#!/usr/bin/env python3
"""Extract fiction entities from CH## story markdown with conservative character rules.

Writes:
- brain_lab/out/entities/entities.json
- brain_lab/out/entities/by_chapter.json
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
ROOT = BASE.parent
STORIES_DIR = ROOT / "content" / "wiki" / "stories"
OUT_DIR = BASE / "out" / "entities"
ENTITY_JSON = OUT_DIR / "entities.json"
CHAPTER_JSON = OUT_DIR / "by_chapter.json"

MULTIWORD_NAME_RE = re.compile(r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b")
SINGLE_NAME_DIALOG_RE = re.compile(
    r"(?:^|\W)([A-Z][a-z]{2,})\s+(?:said|asked|replied|muttered|whispered|called|added|nodded|sighed|glanced)\b"
)
CH_RE = re.compile(r"\bCH\d{2,4}\b")

ARTIFACT_HINTS = {"Valkyrie-1", "Echo Core", "Harmonic Key"}
LOCATION_HINTS = {"South Trench", "Orbital Habitat IX", "Subsurface Vault", "Mars"}
FACTION_HINTS = {"Expedition Command", "Council of Orbits", "Shadow Salvage Ring"}
COMMON_CAPITALIZED_STOPWORDS = {
    "Chapter",
    "Scene",
    "Mission",
    "Log",
    "Story",
    "Full",
    "Text",
    "Themes",
    "Main",
    "Narrative",
    "Word",
    "Count",
    "Summary",
    "Location",
    "Privacy",
    "Level",
    "Date",
    "Author",
    "Attachments",
    "Source",
    "Sources",
    "Zone",
    "Vault",
    "Activation",
    "Across",
    "Above",
    "Below",
    "About",
    "According",
    "She",
    "He",
    "They",
    "We",
    "I",
}
CONNECTOR_WORDS = {
    "And",
    "But",
    "If",
    "From",
    "Once",
    "Outside",
    "Just",
    "Even",
    "Then",
    "Not",
    "The",
    "As",
    "Like",
    "Of",
    "In",
    "On",
    "At",
    "To",
    "For",
    "With",
    "By",
}


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def first_sentence(text: str) -> str:
    part = re.split(r"(?<=[.!?])\s+", text.strip(), maxsplit=1)[0]
    return part[:220]


def detect_type(name: str) -> str:
    if name in ARTIFACT_HINTS:
        return "artifact"
    if name in LOCATION_HINTS:
        return "location"
    if name in FACTION_HINTS:
        return "faction"
    return "character"


def clean_markdown_for_entity_scan(text: str) -> str:
    lines = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.startswith("#"):
            continue
        if line.startswith("**"):
            continue
        if line.startswith("##"):
            continue
        if line.startswith("- **"):
            continue
        if line.startswith("Attachments:"):
            continue
        lines.append(line)
    return "\n".join(lines)


def normalize_person_name(raw: str) -> str:
    name = raw.strip()
    name = re.sub(
        r"^(Commander|Captain|Dr|Professor|Major|Colonel|Lt|Lieutenant)\s+",
        "",
        name,
    )
    name = re.sub(r"\s+", " ", name).strip()
    return name


def looks_like_person_name(name: str) -> bool:
    if not name:
        return False
    if any(ch in name for ch in ("\n", "\r", "\t")):
        return False
    parts = name.split()
    if len(parts) == 0 or len(parts) > 3:
        return False
    if any(part in COMMON_CAPITALIZED_STOPWORDS for part in parts):
        return False
    if len(parts) == 1 and parts[0] in COMMON_CAPITALIZED_STOPWORDS:
        return False
    if not all(re.match(r"^[A-Z][a-z]+$", part) for part in parts):
        return False
    return True


def build_character_alias_map(name_counts: dict[str, int]) -> dict[str, str]:
    """Map short/ranked variants to a canonical full name when likely identical."""
    full_by_first: dict[str, list[str]] = defaultdict(list)
    for name in name_counts:
        parts = name.split()
        if len(parts) >= 2 and looks_like_person_name(name):
            full_by_first[parts[0]].append(name)

    canonical_by_first: dict[str, str] = {}
    for first, candidates in full_by_first.items():
        # Prefer most frequently observed full name; break ties by longest then alpha.
        canonical = sorted(
            candidates,
            key=lambda n: (-name_counts.get(n, 0), -len(n.split()), n),
        )[0]
        canonical_by_first[first] = canonical

    alias_map: dict[str, str] = {}
    for name in name_counts:
        parts = name.split()
        if len(parts) == 1 and parts[0] in canonical_by_first:
            alias_map[name] = canonical_by_first[parts[0]]
            continue
        if len(parts) >= 2:
            first = parts[0]
            canonical = canonical_by_first.get(first)
            if canonical and name != canonical:
                # Merge partial name variants that share the same first token.
                alias_map[name] = canonical
    return alias_map


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    entities: dict[str, dict] = {}
    name_counts: dict[str, int] = defaultdict(int)
    name_story_ids: dict[str, set[str]] = defaultdict(set)
    chapter_snippets: dict[str, str] = {}
    author_seed_names: set[str] = set()
    person_tokens: set[str] = set()
    by_chapter: dict[str, dict[str, list[str]]] = defaultdict(
        lambda: defaultdict(list)
    )

    for story_path in sorted(STORIES_DIR.glob("CH*.md")):
        text = story_path.read_text(encoding="utf-8")
        chapter_match = CH_RE.search(text)
        if not chapter_match:
            continue
        chapter_id = chapter_match.group(0)
        cleaned = clean_markdown_for_entity_scan(text)
        chapter_snippets[chapter_id] = first_sentence(cleaned[:260]) if cleaned else f"Auto-detected entity in {chapter_id}."

        # Strong seed: mission log authors.
        for author_match in re.finditer(r"- \*\*Author:\*\*\s*(.+)$", text, flags=re.MULTILINE):
            author_raw = author_match.group(1).strip()
            author = normalize_person_name(author_raw)
            if looks_like_person_name(author):
                author_seed_names.add(author)
                name_counts[author] += 3
                name_story_ids[author].add(chapter_id)
                for tok in author.split():
                    person_tokens.add(tok)

        for match in MULTIWORD_NAME_RE.finditer(cleaned):
            name = normalize_person_name(match.group(1))
            if looks_like_person_name(name):
                name_counts[name] += 1
                name_story_ids[name].add(chapter_id)

        for match in SINGLE_NAME_DIALOG_RE.finditer(cleaned):
            name = normalize_person_name(match.group(1))
            if looks_like_person_name(name):
                name_counts[name] += 1
                name_story_ids[name].add(chapter_id)
                for tok in name.split():
                    person_tokens.add(tok)

    alias_map = build_character_alias_map(name_counts)
    canonical_counts: dict[str, int] = defaultdict(int)
    canonical_story_ids: dict[str, set[str]] = defaultdict(set)
    canonical_author_seed: set[str] = set()

    for name, count in name_counts.items():
        canonical = alias_map.get(name, name)
        canonical_counts[canonical] += count
        canonical_story_ids[canonical].update(name_story_ids.get(name, set()))
        if name in author_seed_names:
            canonical_author_seed.add(canonical)

    for name, count in sorted(canonical_counts.items()):
        if not looks_like_person_name(name):
            continue
        entity_type = detect_type(name)
        story_ids = sorted(canonical_story_ids.get(name, set()))
        if len(story_ids) == 0:
            continue
        # Gate characters aggressively: author-seeded or repeated by mention count or chapter spread.
        if entity_type == "character":
            parts = name.split()
            if parts[0] in CONNECTOR_WORDS:
                continue
            if len(parts) >= 2 and not any(tok in person_tokens for tok in parts):
                continue
            if name not in canonical_author_seed and count < 3 and len(story_ids) < 2:
                continue

        slug = slugify(name)
        key = f"{entity_type}:{slug}"
        first_story = story_ids[0]
        entities[key] = {
            "type": entity_type,
            "slug": slug,
            "name": name,
            "first_chapter_id": first_story,
            "summary": chapter_snippets.get(first_story, f"Auto-detected entity in {first_story}."),
            "story_ids": story_ids,
        }
        for chapter_id in story_ids:
            by_chapter[chapter_id][entity_type].append(slug)

    dedup_chapter = {
        chapter: {k: sorted(set(v)) for k, v in buckets.items()}
        for chapter, buckets in by_chapter.items()
    }

    entity_rows = sorted(entities.values(), key=lambda r: (r["type"], r["name"]))
    ENTITY_JSON.write_text(
        json.dumps(
            {
                "generatedAt": datetime.now(UTC).isoformat(),
                "source": "content/wiki/stories/CH*.md",
                "entities": entity_rows,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    CHAPTER_JSON.write_text(json.dumps(dedup_chapter, indent=2), encoding="utf-8")
    print(f"Wrote {len(entity_rows)} entities -> {ENTITY_JSON}")
    print(f"Wrote per-chapter map -> {CHAPTER_JSON}")


if __name__ == "__main__":
    main()
