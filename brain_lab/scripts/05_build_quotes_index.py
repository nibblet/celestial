#!/usr/bin/env python3
"""Aggregate quotes from out/extracted/*.json into out/quotes/quotes.json and quotes.md.
No API calls. topic_tags left empty unless present in JSON."""

import csv
import json
from pathlib import Path

from rich import print

BASE = Path(__file__).resolve().parent.parent
EXTRACTED_DIR = BASE / "out" / "extracted"
QUOTES_DIR = BASE / "out" / "quotes"
QUOTES_JSON = QUOTES_DIR / "quotes.json"
QUOTES_JSONL = QUOTES_DIR / "quotes.jsonl"
QUOTES_MD = QUOTES_DIR / "quotes.md"
MANIFEST_CSV = BASE / "out" / "manifest.csv"
MANIFEST_JSONL = BASE / "out" / "manifest.jsonl"
PART_LABELS = {"P1": "Part One", "P2": "Part Two", "P3": "Part Three"}


def load_manifest() -> list[dict]:
    if MANIFEST_CSV.exists():
        rows = []
        with MANIFEST_CSV.open("r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                rows.append(row)
        return rows
    if MANIFEST_JSONL.exists():
        rows = []
        with MANIFEST_JSONL.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
        return rows
    return []


def main() -> None:
    manifest_by_id = {r["story_id"]: r for r in load_manifest()}

    entries: list[dict] = []
    for fp in sorted(EXTRACTED_DIR.glob("*.json")):
        story_id = fp.stem
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        story_title = data.get("story_title") or story_id
        part = manifest_by_id.get(story_id, {}).get("part", "")
        part_label = PART_LABELS.get(part, part)
        for q in data.get("quotes", []):
            quote = (q.get("quote") or "").strip()
            if not quote:
                continue
            entries.append({
                "quote": quote,
                "story_id": story_id,
                "story_title": story_title,
                "part": part_label,
                "topic_tags": q.get("topic_tags", []),
            })

    QUOTES_DIR.mkdir(parents=True, exist_ok=True)
    QUOTES_JSON.write_text(json.dumps(entries, indent=2, ensure_ascii=False), encoding="utf-8")
    with QUOTES_JSONL.open("w", encoding="utf-8") as f:
        for e in entries:
            f.write(json.dumps(e, ensure_ascii=False) + "\n")

    # quotes.md: grouped by part
    by_part: dict[str, list[dict]] = {}
    for e in entries:
        p = e.get("part", "Other")
        if p not in by_part:
            by_part[p] = []
        by_part[p].append(e)

    lines = ["# Quote library", "", "Grouped by part.", ""]
    for part in sorted(by_part.keys()):
        lines.append(f"## {part}")
        lines.append("")
        for e in by_part[part]:
            lines.append(f"- **{e['story_id']}** — {e['story_title']}")
            lines.append(f"  > {e['quote']}")
            lines.append("")
        lines.append("")

    QUOTES_MD.write_text("\n".join(lines), encoding="utf-8")
    print(f"[bold green]Wrote {QUOTES_JSON}, {QUOTES_JSONL}, {QUOTES_MD}[/bold green]")
    print(f"  Total quotes: {len(entries)}")


if __name__ == "__main__":
    main()
