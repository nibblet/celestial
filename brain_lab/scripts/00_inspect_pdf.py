#!/usr/bin/env python3
"""Inspect book.pdf: total pages, first 5 pages preview, 'Contents' pages, anchor title page.
Run from any cwd. Use to diagnose TOC/splitting before running 01_split_by_toc.py."""

import re
from pathlib import Path

from pypdf import PdfReader
from rich import print

BASE = Path(__file__).resolve().parent.parent
PDF_PATH = BASE / "book.pdf"

# Match 01_split_by_toc.py so anchor = first story-like TOC entry
# Default: scan first 10 pages; script can use Contents pages (see below)
TOC_PAGES = list(range(10))  # 0..9 so we hit Contents (often 3–7)
# Dotted leaders: "Title ......... 42" or space/tab: "Title    42"
TOC_LINE_RE = re.compile(r"^(?P<title>.+?)\s+\.{3,}\s*(?P<page>\d+)\s*$")
TOC_LINE_FALLBACK = re.compile(r"^(?P<title>.+?)\s{2,}(?P<page>\d+)\s*$")
SKIP_TITLES = {
    "CONTENTS",
    "INTRODUCTION",
    "PART ONE",
    "PART TWO",
    "PART THREE",
    "CONCLUSION",
}


def norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip().lower()


def main() -> None:
    if not PDF_PATH.exists():
        print(f"[red]Not found: {PDF_PATH}[/red]")
        raise SystemExit(1)

    reader = PdfReader(str(PDF_PATH))
    n = len(reader.pages)
    print(f"[bold]Total pages:[/bold] {n}")

    # First 5 pages: first 3 lines each
    print("\n[bold]First 5 pages (first 3 lines each):[/bold]")
    for i in range(min(5, n)):
        text = reader.pages[i].extract_text() or ""
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()][:3]
        preview = " | ".join(lines) or "(empty)"
        print(f"  Page {i}: {preview[:120]}{'...' if len(preview) > 120 else ''}")

    # Which pages contain "Contents"
    contents_pages = []
    for i in range(n):
        text = (reader.pages[i].extract_text() or "").lower()
        if "contents" in text:
            contents_pages.append(i)
    print(f"\n[bold]Pages containing 'Contents':[/bold] {contents_pages or 'none'}")

    # Anchor title = first TOC entry that isn't skipped
    # Prefer scanning pages that contain "Contents" if we found any
    scan_pages = TOC_PAGES
    if contents_pages:
        first_contents = contents_pages[0]
        scan_pages = list(range(first_contents, min(first_contents + 8, n)))
    toc_text = ""
    for p in scan_pages:
        if p < n:
            toc_text += (reader.pages[p].extract_text() or "") + "\n"
    anchor_title = None
    for line in toc_text.splitlines():
        line = line.strip()
        m = TOC_LINE_RE.match(line) or TOC_LINE_FALLBACK.match(line)
        if not m:
            continue
        title = m.group("title").strip()
        if norm(title).upper() in SKIP_TITLES or norm(title).startswith("part "):
            continue
        anchor_title = title
        break

    if not anchor_title:
        print("\n[yellow]No anchor title found (no TOC entry after skips).[/yellow]")
        return

    print(f"\n[bold]Anchor title (first story-like TOC entry):[/bold] \"{anchor_title}\"")
    anchor_norm = norm(anchor_title)
    for i in range(n):
        text = norm(reader.pages[i].extract_text() or "")
        if anchor_norm in text:
            print(f"[bold]Page containing anchor title:[/bold] {i}")
            break
    else:
        print("[yellow]Anchor title not found in any page text.[/yellow]")


if __name__ == "__main__":
    main()
