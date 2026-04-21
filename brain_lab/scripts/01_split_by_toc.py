#!/usr/bin/env python3
"""Split book.pdf by TOC into per-story PDFs + TXT + MD; write out/manifest.csv and manifest.jsonl.
Stable IDs: P1_S01 (part + story). Paths are cwd-independent (BASE = script dir parent)."""

import csv
import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Optional

from pypdf import PdfReader, PdfWriter
from rich import print

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.text_clean import clean_extracted_text

BASE = Path(__file__).resolve().parent.parent
PDF_PATH = BASE / "book.pdf"
OUT_DIR = BASE / "out"
OUT_PDF = OUT_DIR / "pdf"
OUT_TXT = OUT_DIR / "txt"
OUT_STORIES_MD = OUT_DIR / "stories_md"
MANIFEST_JSONL = OUT_DIR / "manifest.jsonl"
MANIFEST_CSV = OUT_DIR / "manifest.csv"
TOC_REPORT_PATH = OUT_DIR / "toc_report.txt"

PART_LABELS = {"P1": "One", "P2": "Two", "P3": "Three"}

# Scan these 0-indexed PDF pages for TOC (expand if Contents is later)
TOC_PAGES = list(range(10))  # 0..9 to pick up Contents on 3, 6, etc.
TOC_LINE_RE = re.compile(r"^(?P<title>.+?)\s+\.{3,}\s*(?P<page>\d+)\s*$")
TOC_LINE_FALLBACK = re.compile(r"^(?P<title>.+?)\s{2,}(?P<page>\d+)\s*$")
TOC_LINE_LOOSE = re.compile(r"^(?P<title>.+?)\s+(?P<page>\d+)\s*$")
SKIP_TITLES = {
    "CONTENTS",
    "INTRODUCTION",
    "PART ONE",
    "PART TWO",
    "PART THREE",
    "CONCLUSION",
}
# If set, only include TOC entries from this title onward (e.g. "PART ONE" → skip Introduction)
START_SPLITTING_AT: Optional[str] = "PART ONE"
# Limit to first N stories for testing (None = all)
MAX_STORIES: Optional[int] = None
# Skip this many PDF pages when finding anchor (avoids matching TOC; story starts after front matter)
ANCHOR_SEARCH_START_PAGE = 10
# Strip these from extracted text so narrative flows (headers/footers on each PDF page)
STRIP_BOOK_TITLE = "out of the red clay hills"
STRIP_AUTHOR = "keith cobb"


def strip_headers_footers(text: str) -> str:
    """Remove recurring header/footer lines (book title, author, page numbers) for readable narrative."""
    lines = text.splitlines()
    kept = []
    for line in lines:
        s = line.strip()
        if not s:
            kept.append("")
            continue
        lower = s.lower()
        if lower == STRIP_BOOK_TITLE or lower == STRIP_AUTHOR:
            continue
        if re.match(r"^\d{1,4}$", s):
            continue
        kept.append(line)
    # Collapse multiple blank lines to a single paragraph break
    return re.sub(r"\n{3,}", "\n\n", "\n".join(kept)).strip()


def clean_filename(s: str) -> str:
    s = s.strip()
    s = re.sub(r"[^\w\s\-—'']", "", s)
    s = re.sub(r"\s+", "_", s)
    return (s[:120] or "untitled")


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip().lower()


def main() -> None:
    if not PDF_PATH.exists():
        print(f"[red]Not found: {PDF_PATH}[/red]")
        raise SystemExit(1)

    OUT_PDF.mkdir(parents=True, exist_ok=True)
    OUT_TXT.mkdir(parents=True, exist_ok=True)
    OUT_STORIES_MD.mkdir(parents=True, exist_ok=True)

    reader = PdfReader(str(PDF_PATH))
    n_pages = len(reader.pages)

    # 1) Extract TOC text; prefer pages that contain "Contents"
    contents_pages = [i for i in range(min(20, n_pages)) if "contents" in (reader.pages[i].extract_text() or "").lower()]
    scan_pages = list(range(contents_pages[0], min(contents_pages[0] + 8, n_pages))) if contents_pages else TOC_PAGES
    toc_text = ""
    for p in scan_pages:
        if p < n_pages:
            toc_text += (reader.pages[p].extract_text() or "") + "\n"

    # 2) Parse entries (dotted leaders or space/tab before page number)
    # Reject implausible page numbers (e.g. zip 01002) so they don't become anchor
    MAX_REASONABLE_PAGE = 600
    raw_entries: list[tuple[str, int]] = []
    for line in toc_text.splitlines():
        line = line.strip()
        m = TOC_LINE_RE.match(line) or TOC_LINE_FALLBACK.match(line) or TOC_LINE_LOOSE.match(line)
        if not m:
            continue
        title = m.group("title").strip()
        page_num = int(m.group("page"))
        if page_num < 1 or page_num > MAX_REASONABLE_PAGE:
            continue
        raw_entries.append((title, page_num))

    # 3) Filter: skip headers; assign part (P1|P2|P3) from "Part One/Two/Three" lines
    skipped: list[str] = []
    entries: list[tuple[str, int, str]] = []  # (title, printed_start, part)
    seen_start = START_SPLITTING_AT is None
    current_part = "P1"
    for title, p in raw_entries:
        tn = norm(title).upper()
        if tn in SKIP_TITLES:
            skipped.append(title)
            continue
        if norm(title).startswith("part "):
            if "one" in tn:   current_part = "P1"
            elif "two" in tn: current_part = "P2"
            elif "three" in tn: current_part = "P3"
            skipped.append(title)
            continue
        if START_SPLITTING_AT and not seen_start:
            if tn == norm(START_SPLITTING_AT).upper():
                seen_start = True
            else:
                skipped.append(title)
                continue
        entries.append((title, p, current_part))

    # If START_SPLITTING_AT was set but no "Part One" line found, accept all story-like entries
    if not entries and START_SPLITTING_AT and raw_entries:
        current_part = "P1"
        for title, p in raw_entries:
            tn = norm(title).upper()
            if tn in SKIP_TITLES:
                continue
            if norm(title).startswith("part "):
                if "one" in tn:   current_part = "P1"
                elif "two" in tn: current_part = "P2"
                elif "three" in tn: current_part = "P3"
                continue
            entries.append((title, p, current_part))

    if not entries:
        raise SystemExit("No TOC entries parsed. Expand TOC_PAGES or tweak TOC_LINE_RE / START_SPLITTING_AT.")

    if MAX_STORIES is not None:
        entries = entries[:MAX_STORIES]
        print(f"[yellow]Limiting to first {MAX_STORIES} stories (set MAX_STORIES = None in script to run all).[/yellow]")

    # 4) TOC report: duplicates, non-monotonic
    printed_pages = [p for _, p, _ in entries]
    duplicates = [p for i, p in enumerate(printed_pages) if p in printed_pages[:i]]
    non_monotonic = []
    for i in range(1, len(printed_pages)):
        if printed_pages[i] < printed_pages[i - 1]:
            non_monotonic.append((entries[i - 1][0], entries[i][0], printed_pages[i - 1], printed_pages[i]))

    report_lines = [
        "TOC parsing report",
        f"Entries parsed (after filters): {len(entries)}",
        f"Skipped: {len(skipped)}",
        f"Skipped titles: {skipped[:20]}{'...' if len(skipped) > 20 else ''}",
        f"Duplicate printed page numbers: {duplicates or 'none'}",
        f"Non-monotonic page starts: {non_monotonic or 'none'}",
    ]
    TOC_REPORT_PATH.write_text("\n".join(report_lines), encoding="utf-8")
    print(f"[dim]TOC report written to {TOC_REPORT_PATH}[/dim]")
    for line in report_lines[1:]:
        print(f"  [dim]{line}[/dim]")

    # 5) Anchor: first entry's printed page → PDF index (skip front matter so we don't match TOC)
    anchor_title, anchor_printed, _ = entries[0]
    anchor_norm = norm(anchor_title)
    found_pdf_index = None
    start_i = min(ANCHOR_SEARCH_START_PAGE, n_pages - 1)
    for i in range(start_i, n_pages):
        text = norm(reader.pages[i].extract_text() or "")
        if anchor_norm in text:
            found_pdf_index = i
            break
    if found_pdf_index is None:
        raise SystemExit(f"Could not locate anchor title in PDF text: {anchor_title}")

    offset = found_pdf_index - (anchor_printed - 1)

    def printed_to_pdf_index(printed_page: int) -> int:
        return (printed_page - 1) + offset

    print(f"[cyan]Parsed {len(entries)} TOC entries[/cyan]")
    print(f"[green]Anchor:[/green] '{anchor_title}' printed p.{anchor_printed} -> pdf index {found_pdf_index}")
    print(f"[yellow]Offset:[/yellow] {offset}")

    # 6) Per-part story counter for stable IDs P1_S01, P2_S01, ...
    part_counter: dict[str, int] = {}
    manifest_rows: list[dict] = []

    for idx, (title, start_printed, part) in enumerate(entries):
        part_counter[part] = part_counter.get(part, 0) + 1
        story_id = f"{part}_S{part_counter[part]:02d}"

        start_pdf = printed_to_pdf_index(start_printed)
        if idx < len(entries) - 1:
            next_printed = entries[idx + 1][1]
            end_pdf_exclusive = printed_to_pdf_index(next_printed)
        else:
            end_pdf_exclusive = n_pages

        start_pdf = max(0, min(start_pdf, n_pages))
        end_pdf_exclusive = max(start_pdf, min(end_pdf_exclusive, n_pages))
        printed_page_end = (end_pdf_exclusive - 1) - offset + 1
        pdf_page_end = end_pdf_exclusive - 1

        writer = PdfWriter()
        text_parts: list[str] = []
        for p in range(start_pdf, end_pdf_exclusive):
            writer.add_page(reader.pages[p])
            text_parts.append(reader.pages[p].extract_text() or "")

        raw_text = strip_headers_footers("\n".join(text_parts))
        full_text = clean_extracted_text(raw_text)
        word_count = len(full_text.split())
        char_count = len(full_text)
        content_hash = hashlib.sha256(full_text.encode("utf-8")).hexdigest()[:16]

        slug = clean_filename(title)
        fname_base = f"{story_id}_{slug}"
        pdf_path = OUT_PDF / f"{fname_base}.pdf"
        txt_path = OUT_TXT / f"{fname_base}.txt"
        md_path = OUT_STORIES_MD / f"{fname_base}.md"

        with pdf_path.open("wb") as f:
            writer.write(f)
        txt_path.write_text(full_text, encoding="utf-8")

        part_label = PART_LABELS.get(part, part)
        md_content = f"""# {title}
**Story ID:** {story_id}
**Part:** {part_label}
**Tags:**

## Summary

## Full Text

{full_text}
"""
        md_path.write_text(md_content, encoding="utf-8")

        txt_path_rel = str(txt_path.relative_to(BASE))
        pdf_path_rel = str(pdf_path.relative_to(BASE))
        md_path_rel = str(md_path.relative_to(BASE))
        record = {
            "story_id": story_id,
            "part": part,
            "title": title,
            "slug": slug,
            "printed_start": start_printed,
            "printed_end": printed_page_end,
            "pdf_start": start_pdf,
            "pdf_end": pdf_page_end,
            "txt_path": txt_path_rel,
            "md_path": md_path_rel,
            "pdf_path": pdf_path_rel,
            "word_count": word_count,
            "char_count": char_count,
            "hash": content_hash,
        }
        manifest_rows.append(record)

    # Write manifest.jsonl and manifest.csv
    with MANIFEST_JSONL.open("w", encoding="utf-8") as f:
        for r in manifest_rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    csv_columns = ["story_id", "part", "title", "slug", "printed_start", "printed_end", "pdf_start", "pdf_end", "txt_path", "md_path", "pdf_path", "word_count", "char_count"]
    with MANIFEST_CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=csv_columns, extrasaction="ignore")
        w.writeheader()
        w.writerows(manifest_rows)

    print(f"[bold green]Done.[/bold green] PDFs -> {OUT_PDF} | TXTs -> {OUT_TXT} | MD -> {OUT_STORIES_MD} | Manifest -> {MANIFEST_CSV}, {MANIFEST_JSONL}")


if __name__ == "__main__":
    main()
