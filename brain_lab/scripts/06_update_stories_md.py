#!/usr/bin/env python3
"""Update out/stories_md/*.md from manifest + out/extracted/*.json + out/txt/*.txt.
Fills title, tags (from principles/context), summary, and full text. Run after extraction."""

import csv
import json
from pathlib import Path

from rich import print

BASE = Path(__file__).resolve().parent.parent
OUT_DIR = BASE / "out"
MANIFEST_CSV = OUT_DIR / "manifest.csv"
MANIFEST_JSONL = OUT_DIR / "manifest.jsonl"
EXTRACTED_DIR = OUT_DIR / "extracted"
STORIES_MD_DIR = OUT_DIR / "stories_md"

PART_LABELS = {"P1": "One", "P2": "Two", "P3": "Three"}


def load_manifest(limit=None):
    rows = []
    if MANIFEST_CSV.exists():
        with MANIFEST_CSV.open("r", encoding="utf-8") as f:
            for i, row in enumerate(csv.DictReader(f)):
                if limit is not None and i >= limit:
                    break
                rows.append(row)
        return rows
    if MANIFEST_JSONL.exists():
        with MANIFEST_JSONL.open("r", encoding="utf-8") as f:
            for i, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                if limit is not None and i >= limit:
                    break
                rows.append(json.loads(line))
        return rows
    return rows


def tags_from_extraction(data):
    """Build a comma-separated tag list from extraction JSON."""
    tags = []
    ctx = data.get("context") or {}
    if ctx.get("time_period"):
        tags.append(ctx["time_period"].strip())
    if ctx.get("industry"):
        tags.append(ctx["industry"].strip())
    if data.get("core_conflict"):
        tags.append(data["core_conflict"].strip())
    for p in (data.get("principles") or [])[:5]:
        phr = (p.get("principle") or "").strip()
        if phr:
            short = phr[:50].rsplit(",", 1)[0].rsplit(".", 1)[0].strip()
            if short and short not in tags:
                tags.append(short)
    return ", ".join(t for t in tags if t)


def build_md(story_id: str, part: str, title_from_manifest: str, data: dict, full_text: str) -> str:
    title = (data.get("story_title") or title_from_manifest or story_id).strip()
    part_label = PART_LABELS.get(part, part)
    tags = tags_from_extraction(data)
    summary = (data.get("story_summary") or "").strip()

    sections = [
        f"# {title}",
        f"**Story ID:** {story_id}",
        f"**Part:** {part_label}",
        f"**Tags:** {tags}",
        "",
        "## Summary",
        "",
        summary if summary else "",
        "",
        "## Full Text",
        "",
        full_text.strip(),
    ]

    principles = data.get("principles") or []
    if principles:
        sections.extend(["", "## Principles", ""])
        for p in principles:
            phr = (p.get("principle") or "").strip()
            if phr:
                sections.append(f"- {phr}")

    heuristics = data.get("decision_heuristics") or []
    if heuristics:
        sections.extend(["", "## Decision heuristics", ""])
        for h in heuristics:
            phr = (h.get("heuristic") or "").strip()
            if phr:
                sections.append(f"- {phr}")

    return "\n".join(sections)


def main(limit=None):
    STORIES_MD_DIR.mkdir(parents=True, exist_ok=True)
    manifest = load_manifest(limit=limit)
    if not manifest:
        print("[yellow]No manifest. Run 01_split_by_toc.py first.[/yellow]")
        return

    updated = 0
    skipped_no_json = 0
    skipped_no_txt = 0

    for row in manifest:
        story_id = row["story_id"]
        part = row.get("part", "")
        title = row.get("title", "")
        txt_path = BASE / row.get("txt_path", "")
        json_path = EXTRACTED_DIR / f"{story_id}.json"
        md_path_rel = row.get("md_path")
        if md_path_rel:
            md_path = BASE / md_path_rel
        else:
            md_path = STORIES_MD_DIR / f"{story_id}.md"

        if not json_path.exists():
            skipped_no_json += 1
            continue
        if not txt_path or not txt_path.exists():
            skipped_no_txt += 1
            continue

        data = json.loads(json_path.read_text(encoding="utf-8"))
        full_text = txt_path.read_text(encoding="utf-8")
        md_content = build_md(story_id, part, title, data, full_text)
        md_path.parent.mkdir(parents=True, exist_ok=True)
        md_path.write_text(md_content, encoding="utf-8")
        updated += 1
        print(f"[green]Updated {md_path.name}[/green]")

    print(f"[bold green]Done.[/bold green] Updated {updated} story .md files.")
    if skipped_no_json:
        print(f"[dim]Skipped {skipped_no_json} (no extracted JSON).[/dim]")
    if skipped_no_txt:
        print(f"[dim]Skipped {skipped_no_txt} (missing TXT).[/dim]")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Update story .md from extracted JSON and TXT")
    parser.add_argument("--limit", type=int, default=None, help="Max number of stories to process")
    args = parser.parse_args()
    main(limit=args.limit)
