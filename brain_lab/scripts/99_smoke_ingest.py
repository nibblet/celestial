#!/usr/bin/env python3
"""Smoke test for source ingestion: hardcoded sample, assert no timestamps, quotes <=25 words, meta stub, index updated."""

import json
import re
import sys
import tempfile
from pathlib import Path

from rich import print

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.source_ingest import (
    clean_source_text,
    extract_quotes,
    build_meta_stub,
    detect_dates,
    extract_claims,
    derive_timeline_events,
)

# Sample with timestamps and quote-like content
SAMPLE = """
[00:12:34] HOST: Welcome. Today we talk about leadership.
KEITH: I learned that integrity is the foundation. (00:45) Never forget your values.
00:01:22 We moved to Fort Lauderdale in 1995. He became CEO of Alamo in June 1996.
From 1994 to 1996 we grew the team. Board of directors at Acme Corp.
"""


def test_no_timestamps_remain() -> None:
    cleaned = clean_source_text(SAMPLE)
    assert "[00:12:34]" not in cleaned, "Bracket timestamp should be removed"
    assert not re.search(r"\b\d{1,2}:\d{2}(?::\d{2})?\b", cleaned), "Plain timestamp should be removed"
    # No paren timestamps
    assert "(00:45)" not in cleaned, "Paren timestamp should be removed"


def test_all_quotes_under_25_words() -> None:
    cleaned = clean_source_text(SAMPLE)
    quotes = extract_quotes(cleaned)
    for q in quotes:
        text = q.get("quote", "")
        n = len(text.split())
        assert n <= 25, f"Quote has {n} words (max 25): {text[:60]}..."


def test_meta_stub_produced() -> None:
    stub = build_meta_stub(
        source_id="test_2024_01_15_smoke",
        source_type="video_transcript",
        title_guess="Smoke Test",
        url="https://example.com",
    )
    assert stub.get("source_id") == "test_2024_01_15_smoke"
    assert stub.get("type") == "video_transcript"
    assert stub.get("tier") == "B"
    assert "title" in stub and "url" in stub and "credibility" in stub


def test_dates_and_timeline() -> None:
    cleaned = clean_source_text(SAMPLE)
    dates = detect_dates(cleaned)
    assert any(d.get("year") == 1995 for d in dates)
    assert any(d.get("year") == 1996 for d in dates)
    claims = extract_claims(cleaned)
    timeline = derive_timeline_events(cleaned, dates, claims)
    assert len(timeline) >= 1


def test_cli_ingest_and_index_updated() -> None:
    """Run CLI once with temp file; assert cleaned, meta, extract, index exist and content valid."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
        f.write(SAMPLE)
        tmp = f.name
    try:
        import subprocess
        scripts = BASE / "scripts"
        r = subprocess.run(
            [
                sys.executable,
                str(scripts / "06_ingest_source.py"),
                "--input", tmp,
                "--type", "video_transcript",
                "--source-id", "smoke_test_ingest",
                "--title", "Smoke test",
                "--force",
            ],
            cwd=BASE,
            capture_output=True,
            text=True,
        )
        assert r.returncode == 0, f"CLI failed: {r.stderr or r.stdout}"
    finally:
        Path(tmp).unlink(missing_ok=True)

    sources = BASE / "sources"
    cleaned_path = sources / "cleaned" / "smoke_test_ingest.txt"
    meta_path = sources / "meta" / "smoke_test_ingest.json"
    extract_path = sources / "extract" / "smoke_test_ingest.json"
    index_json = BASE / "out" / "library" / "00_SOURCES_INDEX.json"

    assert cleaned_path.exists(), "cleaned file should exist"
    assert meta_path.exists(), "meta stub should exist"
    assert extract_path.exists(), "extract JSON should exist"
    assert index_json.exists(), "sources index JSON should exist"

    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    assert meta.get("source_id") == "smoke_test_ingest"

    extract_data = json.loads(extract_path.read_text(encoding="utf-8"))
    for q in extract_data.get("quotes", []):
        n = len(q.get("quote", "").split())
        assert n <= 25, f"Stored quote has {n} words"

    index_data = json.loads(index_json.read_text(encoding="utf-8"))
    entry = next((e for e in index_data if e.get("source_id") == "smoke_test_ingest"), None)
    assert entry is not None, "Index should contain smoke_test_ingest"
    assert entry.get("n_quotes", 0) >= 0


def main() -> int:
    print("[cyan]Smoke: no timestamps remain[/cyan]")
    test_no_timestamps_remain()
    print("[cyan]Smoke: all quotes <=25 words[/cyan]")
    test_all_quotes_under_25_words()
    print("[cyan]Smoke: meta stub produced[/cyan]")
    test_meta_stub_produced()
    print("[cyan]Smoke: dates and timeline[/cyan]")
    test_dates_and_timeline()
    print("[cyan]Smoke: CLI ingest and index updated[/cyan]")
    test_cli_ingest_and_index_updated()
    print("[green]All smoke checks passed.[/green]")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
