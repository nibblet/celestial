#!/usr/bin/env python3
"""CLI: Ingest a source file into sources/ and update out/library/00_SOURCES_INDEX.
Idempotent: skip if source_id exists unless --force. With --force, overwrite derived files; raw preserved unless --overwrite-raw."""

import argparse
import json
import shutil
import sys
from pathlib import Path

from rich import print

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.source_ingest import (
    SUPPORTED_TYPES,
    build_meta_stub,
    clean_source_text,
    derive_source_id,
    detect_dates,
    derive_timeline_events,
    extract_claims,
    extract_quotes,
    load_text,
)

BASE = Path(__file__).resolve().parent.parent
SOURCES = BASE / "sources"
RAW_DIR = SOURCES / "raw"
CLEANED_DIR = SOURCES / "cleaned"
META_DIR = SOURCES / "meta"
EXTRACT_DIR = SOURCES / "extract"
LIBRARY_DIR = BASE / "out" / "library"
SOURCES_INDEX_MD = LIBRARY_DIR / "00_SOURCES_INDEX.md"
SOURCES_INDEX_JSON = LIBRARY_DIR / "00_SOURCES_INDEX.json"


def ensure_dirs() -> None:
    for d in (RAW_DIR, CLEANED_DIR, META_DIR, EXTRACT_DIR, LIBRARY_DIR):
        d.mkdir(parents=True, exist_ok=True)


def load_sources_index_json() -> list[dict]:
    if not SOURCES_INDEX_JSON.exists():
        return []
    try:
        data = json.loads(SOURCES_INDEX_JSON.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def type_heading(stype: str) -> str:
    return "## " + stype.replace("_", " ").title()


def render_sources_index_md(entries: list[dict]) -> str:
    """Render full 00_SOURCES_INDEX.md from entries, grouped by type."""
    lines = ["# Sources Index", "", "Ingested sources (video transcripts, articles, board bios, SEC filings, etc.).", ""]
    by_type: dict[str, list[dict]] = {}
    for e in entries:
        t = e.get("type", "other")
        by_type.setdefault(t, []).append(e)
    for stype in sorted(by_type.keys()):
        lines.append(type_heading(stype))
        lines.append("")
        for entry in by_type[stype]:
            source_id = entry.get("source_id", "")
            title = entry.get("title", "") or source_id
            tier = entry.get("tier", "D")
            date = entry.get("date_published", "") or entry.get("date_event", "")
            url = entry.get("url", "")
            n_quotes = entry.get("n_quotes", 0)
            n_claims = entry.get("n_claims", 0)
            n_timeline = entry.get("n_timeline", 0)
            lines.append(f"- **{source_id}** — {title}")
            lines.append(f"  - Type: {stype}, Tier: {tier}")
            if date:
                lines.append(f"  - Date: {date}")
            if url:
                lines.append(f"  - Link: {url}")
            lines.append(f"  - Contains: {n_quotes} quotes, {n_claims} claims, {n_timeline} timeline candidates")
            lines.append("")
        lines.append("")
    return "\n".join(lines).strip() + "\n"


def update_sources_index_json(entries: list[dict], new_entry: dict) -> list[dict]:
    """Append or update one entry in the JSON list."""
    sid = new_entry.get("source_id", "")
    out = [e for e in entries if e.get("source_id") != sid]
    out.append(new_entry)
    return sorted(out, key=lambda e: (e.get("type", ""), e.get("source_id", "")))


def main() -> int:
    parser = argparse.ArgumentParser(description="Ingest a source file into the archive.")
    parser.add_argument("--input", "-i", required=True, help="Path to input .txt or .md file")
    parser.add_argument("--type", "-t", required=True, choices=list(SUPPORTED_TYPES), help="Source type")
    parser.add_argument("--source-id", help="Stable source ID (default: derived from filename and type)")
    parser.add_argument("--title", help="Title (optional)")
    parser.add_argument("--url", help="URL (optional)")
    parser.add_argument("--force", action="store_true", help="Overwrite derived files if source_id exists")
    parser.add_argument("--overwrite-raw", action="store_true", help="With --force, also overwrite raw copy")
    args = parser.parse_args()

    ensure_dirs()

    input_path = Path(args.input)
    if not input_path.is_absolute():
        input_path = (BASE / input_path).resolve()
    if not input_path.exists():
        print(f"[red]Input file not found: {input_path}[/red]")
        return 1

    try:
        raw_text = load_text(input_path)
    except SystemExit as e:
        print(f"[red]{e}[/red]")
        return 1
    except FileNotFoundError as e:
        print(f"[red]{e}[/red]")
        return 1

    cleaned = clean_source_text(raw_text)

    source_id = args.source_id
    if not source_id:
        source_id = derive_source_id(input_path.name, args.type)

    # Idempotent: skip if already present (unless --force)
    meta_path = META_DIR / f"{source_id}.json"
    if meta_path.exists() and not args.force:
        print(f"[yellow]Source already exists: {source_id}. Use --force to overwrite.[/yellow]")
        return 0

    # Write raw copy (only if new or --overwrite-raw)
    raw_dest = RAW_DIR / f"{source_id}{input_path.suffix}"
    if not raw_dest.exists() or args.overwrite_raw:
        shutil.copy2(input_path, raw_dest)

    # Write cleaned
    cleaned_path = CLEANED_DIR / f"{source_id}.txt"
    cleaned_path.write_text(cleaned, encoding="utf-8")

    # Extract
    date_candidates = detect_dates(cleaned)
    quotes = extract_quotes(cleaned)
    claims = extract_claims(cleaned)
    timeline_candidates = derive_timeline_events(cleaned, date_candidates, claims)

    extract_payload = {
        "source_id": source_id,
        "quotes": quotes,
        "claims": claims,
        "timeline_candidates": timeline_candidates,
        "date_candidates": date_candidates,
    }
    extract_path = EXTRACT_DIR / f"{source_id}.json"
    EXTRACT_DIR.mkdir(parents=True, exist_ok=True)
    extract_path.write_text(json.dumps(extract_payload, indent=2, ensure_ascii=False), encoding="utf-8")

    # Meta stub (date_guess from first date candidate if any)
    date_guess = ""
    if date_candidates:
        d = date_candidates[0]
        if d.get("year"):
            date_guess = d.get("date_text", str(d["year"]))
    meta = build_meta_stub(
        source_id=source_id,
        source_type=args.type,
        title_guess=args.title or "",
        domain_guess="",
        date_guess=date_guess,
        url=args.url or "",
    )
    meta_path.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")

    # Index entry for MD/JSON
    index_entry = {
        "source_id": source_id,
        "title": meta.get("title", ""),
        "type": args.type,
        "tier": meta.get("tier", "D"),
        "date_published": meta.get("date_published", ""),
        "date_event": meta.get("date_event", ""),
        "url": meta.get("url", ""),
        "n_quotes": len(quotes),
        "n_claims": len(claims),
        "n_timeline": len(timeline_candidates),
    }

    entries = load_sources_index_json()
    entries = update_sources_index_json(entries, index_entry)
    SOURCES_INDEX_JSON.write_text(json.dumps(entries, indent=2, ensure_ascii=False), encoding="utf-8")

    md_content = render_sources_index_md(entries)
    SOURCES_INDEX_MD.write_text(md_content, encoding="utf-8")

    print(f"[green]Ingested: {source_id}[/green]")
    print(f"  cleaned: {cleaned_path.relative_to(BASE)}")
    print(f"  meta: {meta_path.relative_to(BASE)}")
    print(f"  extract: {extract_path.relative_to(BASE)}")
    print(f"  quotes: {len(quotes)}, claims: {len(claims)}, timeline: {len(timeline_candidates)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
