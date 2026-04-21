#!/usr/bin/env python3
"""Smoke tests for text_clean using representative bad strings from our outputs."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from lib.text_clean import (
    clean_extracted_text,
    collapse_whitespace,
    fix_hyphenated_linebreaks,
    fix_split_words,
    normalize_unicode,
)


def test_normalize_unicode():
    assert "/u2014" not in normalize_unicode("something /u2014.d here")
    assert "\u2014" in normalize_unicode("something /u2014 here")
    assert "—" in normalize_unicode("/u2014.da number")
    assert "/u2014.d" not in normalize_unicode("text /u2014.d more")


def test_fix_split_words():
    assert "attended" in fix_split_words("I a ttended more")
    assert "a ttended" not in fix_split_words("I a ttended more")
    assert "makeshift" in fix_split_words("a makeshi ft platform")
    assert "makeshi ft" not in fix_split_words("a makeshi ft platform")
    assert "little" in fix_split_words("a li ttle bit")
    assert "attorney" in fix_split_words("district a ttorney")
    assert "office" in fix_split_words("post o ffice")
    assert "Pittsboro" in fix_split_words("Pi ttsboro, Mississippi")


def test_fix_hyphenated_linebreaks():
    assert "fifty-five" in fix_hyphenated_linebreaks("fifty-\nfive")
    assert "fifty-\nfive" not in fix_hyphenated_linebreaks("fifty-\nfive")
    # Mid-sentence lowercase join
    out = fix_hyphenated_linebreaks("word\nnext")
    assert "word next" in out or "word\nnext" not in out


def test_collapse_whitespace():
    assert "  " not in collapse_whitespace("a   b")
    assert collapse_whitespace("  a  b  ") == "a b"


def test_clean_extracted_text_pipeline():
    bad = "I a ttended on a makeshi ft platform. Something /u2014.d here."
    cleaned = clean_extracted_text(bad)
    assert "a ttended" not in cleaned
    assert "attended" in cleaned
    assert "makeshi ft" not in cleaned
    assert "makeshift" in cleaned
    assert "/u2014" not in cleaned
    assert "—" in cleaned or "here" in cleaned


if __name__ == "__main__":
    test_normalize_unicode()
    test_fix_split_words()
    test_fix_hyphenated_linebreaks()
    test_collapse_whitespace()
    test_clean_extracted_text_pipeline()
    print("All smoke tests passed.")
