#!/usr/bin/env python3
"""Clean OCR-like artifacts from extracted story text. Deterministic, no meaning change."""

import re
import unicodedata


# Literal sequences that appear in PDF extraction (e.g. "/u2014" instead of Unicode)
UNICODE_LITERAL_REPLACEMENTS = [
    (r"/u2014\.?d?", "\u2014"),   # em dash variants: /u2014.d, /u2014, etc.
    (r"\\u2014", "\u2014"),
    (r"/u2019", "\u2019"),        # right single quote
    (r"\\u2019", "\u2019"),
    (r"/u2018", "\u2018"),        # left single quote
    (r"\\u2018", "\u2018"),
    (r"/u201c", "\u201c"),        # left double quote
    (r"\\u201c", "\u201c"),
    (r"/u201d", "\u201d"),        # right double quote
    (r"\\u201d", "\u201d"),
]

# All known OCR splits: only these are joined (avoids joining article "a" with next word).
SPLIT_WHITELIST = [
    ("makeshi ft", "makeshift"),
    ("li ttle", "little"),
    ("o ffice", "office"),
    ("Pi ttsboro", "Pittsboro"),
    ("a ttended", "attended"),
    ("a ttorney", "attorney"),
    ("e very", "every"),
    ("a round", "around"),
    ("t oday", "today"),
    ("s ome", "some"),
    ("b efore", "before"),
    ("a fter", "after"),
]


def normalize_unicode(text: str) -> str:
    """Replace literal /uXXXX and \\uXXXX with proper characters; normalize quotes; strip control chars."""
    if not text:
        return ""
    s = text
    for pattern, replacement in UNICODE_LITERAL_REPLACEMENTS:
        s = re.sub(pattern, replacement, s, flags=re.IGNORECASE)
    # Normalize Unicode (NFC)
    s = unicodedata.normalize("NFC", s)
    # Strip control characters (except newline, tab)
    s = "".join(c for c in s if c in "\n\t\r" or unicodedata.category(c) != "Cc")
    return s


def fix_split_words(text: str) -> str:
    """Join known OCR splits from whitelist only (e.g. 'a ttended' -> 'attended', 'makeshi ft' -> 'makeshift').
    Conservative: no regex join to avoid merging article 'a' with following word."""
    if not text:
        return ""
    s = text
    for bad, good in SPLIT_WHITELIST:
        s = s.replace(bad, good)
    return s


def fix_hyphenated_linebreaks(text: str) -> str:
    """Convert 'fifty-\\nfive' -> 'fifty-five'; remove linebreaks mid-sentence when next line starts lowercase."""
    if not text:
        return ""
    # Hyphen at end of line followed by newline and lowercase word -> join (hyphenated word)
    s = re.sub(r"-\s*\n\s*([a-z])", r"-\1", text)
    # Mid-sentence: line ends with lowercase letter, next line starts with lowercase (no new paragraph)
    s = re.sub(r"([a-z])\s*\n\s*([a-z])", r"\1 \2", s)
    return s


def collapse_whitespace(text: str) -> str:
    """Normalize multiple spaces, normalize line endings, preserve paragraph breaks (double newline)."""
    if not text:
        return ""
    s = text.replace("\r\n", "\n").replace("\r", "\n")
    # Preserve paragraph breaks: collapse 3+ newlines to 2
    s = re.sub(r"\n{3,}", "\n\n", s)
    # Collapse horizontal whitespace to single space (but keep single newlines)
    lines = s.split("\n")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in lines]
    return "\n".join(lines).strip()


def clean_extracted_text(text: str) -> str:
    """Pipeline: unicode -> hyphenated linebreaks -> split words -> collapse whitespace."""
    if not text:
        return ""
    s = normalize_unicode(text)
    s = fix_hyphenated_linebreaks(s)
    s = fix_split_words(s)
    s = collapse_whitespace(s)
    return s
