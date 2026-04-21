#!/usr/bin/env python3
"""Deterministic text normalization and fingerprinting for dedup. No embeddings."""

import re
import unicodedata

# Light stopword list for fingerprinting (reduces noise; keep list small)
STOPWORDS = frozenset(
    "a an the and or but in on at to for of with by from as is was are were be been being have has had do does did will would could should may might must can and".split()
)


def normalize_text(s: str) -> str:
    """Lowercase, trim, collapse whitespace, strip trailing punctuation.
    Optionally replace fancy quotes with ASCII equivalents."""
    if not s:
        return ""
    s = (s or "").strip().lower()
    # Replace common fancy quotes with ASCII
    s = s.replace("\u2018", "'").replace("\u2019", "'")
    s = s.replace("\u201c", '"').replace("\u201d", '"')
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"^[^\w\s]+|[^\w\s]+$", "", s)  # strip leading/trailing punctuation
    return s.strip()


def fingerprint(s: str) -> str:
    """Stable fingerprint for dedup: normalized, drop stopwords, alphanumerics + spaces only."""
    n = normalize_text(s)
    if not n:
        return ""
    # Keep only alphanumerics and spaces
    n = re.sub(r"[^\w\s]", "", n)
    words = n.split()
    kept = [w for w in words if w not in STOPWORDS]
    return " ".join(kept).strip()
