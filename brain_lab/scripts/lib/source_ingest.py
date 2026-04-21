#!/usr/bin/env python3
"""Source ingestion: load, clean, extract quotes/claims/dates/timeline, build meta stub.
Deterministic, no external API calls. Uses regex + heuristics only."""

import re
from pathlib import Path
from typing import Optional, Union

# Import after path setup in caller, or use local import
try:
    from lib.text_clean import clean_extracted_text
except ImportError:
    from .text_clean import clean_extracted_text


SUPPORTED_TYPES = frozenset({
    "video_transcript", "article", "board_bio", "sec_filing", "speech", "letter", "other"
})

# Timestamp patterns common in transcripts
TS_BRACKET = re.compile(r"\[\s*\d{1,2}:\d{2}(?::\d{2})?\s*\]")
TS_PLAIN = re.compile(r"(?<!\d)\b\d{1,2}:\d{2}(?::\d{2})?\b(?!\d)")
TS_PAREN = re.compile(r"\(\s*\d{1,2}:\d{2}(?::\d{2})?\s*\)")

# Speaker label: optional leading spaces, ALL CAPS or Name followed by colon
SPEAKER_LINE = re.compile(r"^(\s*)([A-Z][A-Za-z0-9_\s]*)\s*:\s*(.*)$")

# Date patterns
YEAR_ONLY = re.compile(r"\b(19|20)\d{2}\b")
MONTH_YYYY = re.compile(
    r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b",
    re.IGNORECASE
)
MONTH_DD_YYYY = re.compile(
    r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b",
    re.IGNORECASE
)
RANGE_FROM_TO = re.compile(r"(?:from|between)\s+(\d{4})\s+(?:to|and|-)\s+(\d{4})\b", re.IGNORECASE)
RANGE_HYPHEN = re.compile(r"\b(19|20)\d{2}\s*[-–—]\s*(19|20)\d{2}\b")

MONTH_NAMES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
]


def load_text(path: Union[str, Path]) -> str:
    """Load text from .txt or .md. For .pdf, print error and tell user to pre-extract."""
    p = Path(path)
    suf = (p.suffix or "").lower()
    if suf == ".pdf":
        raise SystemExit(
            "PDF is not supported. Pre-extract text to .txt or .md and pass that file."
        )
    if suf not in (".txt", ".md"):
        # Allow no extension or .text etc.; treat as text
        pass
    if not p.exists():
        raise FileNotFoundError(f"File not found: {p}")
    return p.read_text(encoding="utf-8", errors="replace")


def clean_source_text(text: str) -> str:
    """Reuse existing text cleaning pipeline; remove transcript timestamps; normalize speaker labels; collapse blanks."""
    if not text:
        return ""
    # 1) Existing pipeline
    s = clean_extracted_text(text)
    # 2) Remove timestamp patterns
    s = TS_BRACKET.sub("", s)
    s = TS_PLAIN.sub("", s)
    s = TS_PAREN.sub("", s)
    # 3) Normalize speaker labels: "HOST: " -> "HOST: " (single space after colon), trim
    lines = s.split("\n")
    out = []
    for line in lines:
        m = SPEAKER_LINE.match(line)
        if m:
            prefix, speaker, rest = m.groups()
            speaker_clean = " ".join(speaker.split())
            rest_clean = rest.strip()
            out.append(f"{speaker_clean}: {rest_clean}".strip())
        else:
            out.append(line.strip())
    s = "\n".join(out)
    # 4) Collapse excessive blank lines (already partly done by clean_extracted_text; ensure 3+ -> 2)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def detect_dates(text: str) -> list[dict]:
    """Return date candidates: { date_text, year, month, day, context_excerpt, confidence }."""
    results: list[dict] = []
    seen: set[tuple[Optional[int], Optional[int], Optional[int], str]] = set()

    def excerpt_around(match: re.Match, radius: int = 25) -> str:
        start = max(0, match.start() - radius)
        end = min(len(text), match.end() + radius)
        snippet = text[start:end].replace("\n", " ")
        return " ".join(snippet.split())[:80]

    # Year only
    for m in YEAR_ONLY.finditer(text):
        year = int(m.group(0))
        key = (year, None, None, "year")
        if key in seen:
            continue
        seen.add(key)
        results.append({
            "date_text": str(year),
            "year": year,
            "month": None,
            "day": None,
            "context_excerpt": excerpt_around(m),
            "confidence": "medium",
        })

    # Month YYYY
    for m in MONTH_YYYY.finditer(text):
        month_name, year_str = m.group(1), m.group(2)
        month = next((i for i, name in enumerate(MONTH_NAMES, 1) if name == month_name.lower()), None)
        year = int(year_str)
        key = (year, month, None, "month_yyyy")
        if key in seen:
            continue
        seen.add(key)
        results.append({
            "date_text": f"{month_name} {year}",
            "year": year,
            "month": month,
            "day": None,
            "context_excerpt": excerpt_around(m),
            "confidence": "high",
        })

    # Month DD, YYYY
    for m in MONTH_DD_YYYY.finditer(text):
        month_name, day_str, year_str = m.group(1), m.group(2), m.group(3)
        month = next((i for i, name in enumerate(MONTH_NAMES, 1) if name == month_name.lower()), None)
        day = int(day_str)
        year = int(year_str)
        key = (year, month, day, "month_dd_yyyy")
        if key in seen:
            continue
        seen.add(key)
        results.append({
            "date_text": f"{month_name} {day_str}, {year}",
            "year": year,
            "month": month,
            "day": day,
            "context_excerpt": excerpt_around(m),
            "confidence": "high",
        })

    # From YYYY to YYYY
    for m in RANGE_FROM_TO.finditer(text):
        y1, y2 = int(m.group(1)), int(m.group(2))
        key = (y1, y2, None, "range")
        if key in seen:
            continue
        seen.add(key)
        results.append({
            "date_text": f"{y1}-{y2}",
            "year": y1,
            "month": None,
            "day": None,
            "context_excerpt": excerpt_around(m),
            "confidence": "medium",
        })

    # YYYY-YYYY
    for m in RANGE_HYPHEN.finditer(text):
        full = m.group(0)
        parts = re.split(r"[-–—]", full)
        if len(parts) == 2:
            y1, y2 = int(parts[0].strip()), int(parts[1].strip())
            key = (y1, y2, None, "range_hyphen")
            if key in seen:
                continue
            seen.add(key)
            results.append({
                "date_text": f"{y1}-{y2}",
                "year": y1,
                "month": None,
                "day": None,
                "context_excerpt": excerpt_around(m),
                "confidence": "medium",
            })

    return results


def _normalize_quote_fingerprint(s: str) -> str:
    """Lowercase, collapse spaces, strip punctuation for dedup."""
    s = s.lower().strip()
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"[^\w\s]", "", s)
    return s


def _word_count(s: str) -> int:
    return len(s.split())


def extract_quotes(text: str) -> list[dict]:
    """Extract quote-like sentences: first-person/aphorism + quoted strings. Max 120, each <=25 words, dedupe."""
    MAX_QUOTES = 120
    MAX_WORDS = 25

    candidates: list[dict] = []
    seen_fp: set[str] = set()

    # 1) Quoted strings (double or curly quotes)
    quoted = re.findall(r'["\u201c\u201d]([^"\u201c\u201d]{10,}?)["\u201c\u201d]', text)
    for q in quoted:
        q = " ".join(q.split()).strip()
        if _word_count(q) > MAX_WORDS:
            continue
        fp = _normalize_quote_fingerprint(q)
        if fp in seen_fp:
            continue
        seen_fp.add(fp)
        candidates.append({
            "quote": q,
            "themes": [],
            "context": "quoted",
            "type": "reflection",
            "excerpt": q[:120],
        })

    # 2) Sentence-level: first-person / aphorism-like (I learned, I think, we always, never forget)
    sentence_end = re.compile(r"[.!?]\s+")
    first_person = re.compile(
        r"\b(I\s+(?:learned|think|believe|knew|realized|felt|saw|think we|would|will)|"
        r"We\s+(?:always|never|had to|must)|"
        r"Never\s+forget|Always\s+remember|"
        r"It\s+(?:was|is)\s+(?:clear|important|critical))[^.!?]*[.!?]",
        re.IGNORECASE
    )
    for m in first_person.finditer(text):
        sent = " ".join(m.group(0).split()).strip()
        if _word_count(sent) > MAX_WORDS:
            continue
        fp = _normalize_quote_fingerprint(sent)
        if fp in seen_fp:
            continue
        seen_fp.add(fp)
        candidates.append({
            "quote": sent,
            "themes": [],
            "context": "first_person",
            "type": "reflection",
            "excerpt": sent[:120],
        })

    # 3) Short declarative sentences that look like principles (optional)
    for sent in sentence_end.split(text):
        sent = " ".join(sent.split()).strip()
        if not sent or _word_count(sent) > MAX_WORDS or _word_count(sent) < 5:
            continue
        if sent in {c["quote"] for c in candidates}:
            continue
        fp = _normalize_quote_fingerprint(sent)
        if fp in seen_fp:
            continue
        # Simple heuristic: contains value words
        if re.search(r"\b(integrity|honesty|trust|respect|family|principle|value)\b", sent, re.IGNORECASE):
            seen_fp.add(fp)
            candidates.append({
                "quote": sent,
                "themes": [],
                "context": "principle",
                "type": "principle",
                "excerpt": sent[:120],
            })

    # Cap and trim words
    out: list[dict] = []
    for c in candidates:
        if len(out) >= MAX_QUOTES:
            break
        words = c["quote"].split()
        if len(words) > MAX_WORDS:
            c = {**c, "quote": " ".join(words[:MAX_WORDS]), "excerpt": " ".join(words[:MAX_WORDS])[:120]}
        out.append(c)
    return out[:MAX_QUOTES]


def extract_claims(text: str) -> list[dict]:
    """Extract factual claims: role/title/org, location moves, awards/milestones. Paraphrase + verbatim excerpt."""
    claims: list[dict] = []

    # Role/title/org
    role_patterns = [
        (r"(?:CEO|CFO|COO|President|Chairman|Partner|Director|VP|Vice President)\s+of\s+([^,.\n]{2,40})", 0.85),
        (r"(?:joined|became|served as|was appointed)\s+([^,.\n]{5,50})", 0.75),
        (r"board\s+(?:of\s+)?(?:directors?\s+)?(?:of|at)\s+([^,.\n]{2,40})", 0.8),
        (r"(?:at|with)\s+([A-Z][^,.\n]{3,35})\s+(?:from|in|since)\s+(\d{4})", 0.8),
    ]
    for pattern, conf in role_patterns:
        for m in re.finditer(pattern, text, re.IGNORECASE):
            excerpt = m.group(0).strip()
            excerpt = " ".join(excerpt.split())[:80]
            claim = excerpt[:60] + ("..." if len(excerpt) > 60 else "")
            supporting = " ".join(excerpt.split())[:25] if _word_count(excerpt) > 25 else excerpt
            words = supporting.split()[:25]
            supporting = " ".join(words)
            claims.append({
                "claim": claim,
                "supporting_excerpt": supporting,
                "confidence": min(conf + 0.05, 1.0),
                "tags": ["career", "leadership"],
            })

    # Location moves
    for m in re.finditer(r"(?:moved to|relocated to|based in)\s+([^,.\n]{3,40})", text, re.IGNORECASE):
        excerpt = m.group(0).strip()
        excerpt = " ".join(excerpt.split())[:80]
        supporting = " ".join(excerpt.split())[:25]
        claims.append({
            "claim": f"Location: {excerpt}",
            "supporting_excerpt": supporting,
            "confidence": 0.6,
            "tags": ["location"],
        })

    # Milestones
    for m in re.finditer(r"(?:appointed|promoted|joined|retired|founded|started)\s+[^,.\n]{5,50}", text, re.IGNORECASE):
        excerpt = m.group(0).strip()
        excerpt = " ".join(excerpt.split())[:80]
        supporting = " ".join(excerpt.split())[:25]
        claims.append({
            "claim": excerpt,
            "supporting_excerpt": supporting,
            "confidence": 0.7,
            "tags": ["career", "milestone"],
        })

    # Dedupe by supporting_excerpt
    seen_excerpt: set[str] = set()
    out: list[dict] = []
    for c in claims:
        key = _normalize_quote_fingerprint(c["supporting_excerpt"])
        if key in seen_excerpt:
            continue
        seen_excerpt.add(key)
        out.append(c)
    return out


def derive_timeline_events(
    text: str,
    dates: list[dict],
    claims: list[dict],
) -> list[dict]:
    """Pair detected dates with nearby claims to form timeline events."""
    events: list[dict] = []
    # Build simple timeline from dates with context
    for d in dates:
        year = d.get("year")
        if year is None:
            continue
        excerpt = (d.get("context_excerpt") or "")[:80]
        # Try to find role/org in same excerpt or nearby
        role = ""
        organization = ""
        location = ""
        event = d.get("date_text", str(year))
        for c in claims:
            ex = c.get("supporting_excerpt", "")
            if str(year) in ex or (d.get("date_text") and d["date_text"] in ex):
                claim = c.get("claim", "")
                if not event or event == str(year):
                    event = claim[:60]
                if "CEO" in claim or "President" in claim:
                    role = "CEO" if "CEO" in claim else "President"
                if re.search(r"of\s+([A-Za-z0-9&\s]+)", claim):
                    org_m = re.search(r"of\s+([A-Za-z0-9&\s]{2,30})", claim)
                    if org_m:
                        organization = org_m.group(1).strip()
                break
        events.append({
            "year": year,
            "year_range": None,
            "event": event or str(year),
            "role": role,
            "organization": organization,
            "location": location,
            "source_excerpt": excerpt[:80],
            "confidence": "high" if (role or organization) else "medium",
        })
    return events


def build_meta_stub(
    source_id: str,
    source_type: str,
    title_guess: str = "",
    domain_guess: str = "",
    date_guess: str = "",
    url: str = "",
) -> dict:
    """Build metadata stub. Tier: letter/speech -> A, video_transcript -> B, sec_filing/board_bio/article -> C, other -> D."""
    tier = "D"
    if source_type in ("letter", "speech"):
        tier = "A"
    elif source_type == "video_transcript":
        tier = "B"
    elif source_type in ("sec_filing", "board_bio", "article"):
        tier = "C"
    return {
        "source_id": source_id,
        "type": source_type,
        "title": title_guess or "",
        "publisher": "",
        "domain": domain_guess or "",
        "date_published": date_guess or "",
        "date_event": "",
        "url": url or "",
        "rights": "permission_unknown",
        "tier": tier,
        "credibility": 3,
        "notes": "",
    }


def derive_source_id(
    filename: str,
    source_type: str,
    date_yyyy: Optional[int] = None,
    date_mm: Optional[int] = None,
    date_dd: Optional[int] = None,
) -> str:
    """Default: TYPE_YYYY_MM_DD_slug or TYPE_slug if no date. Slug from filename stem, sanitized."""
    stem = Path(filename).stem
    slug = re.sub(r"[^\w\-]", "_", stem).strip("_")
    slug = re.sub(r"_+", "_", slug)[:60]
    if date_yyyy is not None:
        mm = f"{date_mm:02d}" if date_mm is not None else "01"
        dd = f"{date_dd:02d}" if date_dd is not None else "01"
        return f"{source_type}_{date_yyyy}_{mm}_{dd}_{slug}"
    return f"{source_type}_{slug}"
