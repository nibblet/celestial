#!/usr/bin/env python3
"""Build out/library/quotes.json (structured quote bank) and quotes_index.md from memoir corpus.
Uses out/quotes/quotes.json and out/extracted/*.json. Focus on principles, values, decisions, gratitude, leadership."""

import json
import re
from pathlib import Path

from rich import print

BASE = Path(__file__).resolve().parent.parent
EXTRACTED_DIR = BASE / "out" / "extracted"
QUOTES_SOURCE = BASE / "out" / "quotes" / "quotes.json"
LIBRARY_DIR = BASE / "out" / "library"
QUOTES_JSON = LIBRARY_DIR / "quotes.json"
QUOTES_INDEX_MD = LIBRARY_DIR / "quotes_index.md"
MAX_WORDS = 25

# Keywords to classify quote type (first match wins)
TYPE_KEYWORDS = {
    "gratitude": ["grateful", "gratitude", "thank", "treasured", "forever grateful", "appreciate", "grateful", "indebted"],
    "principle": ["value", "values", "believe", "lesson", "principle", "learned", "teach", "work ethic", "honest", "integrity", "trust", "responsibility", "character"],
    "leadership": ["lead", "partner", "ownership", "responsibility", "managing", "decision", "decisive", "firm", "accountability"],
    "decision": ["decision", "choose", "fork", "opportunity", "option", "when x", "if you", "before"],
    "reflection": ["reflect", "remember", "realize", "looking back", "over the years", "learned from", "observation"],
}

# Map type + quote text to themes (2-4 tags)
THEME_KEYWORDS = {
    "Integrity": ["honest", "integrity", "trust", "trustworthy", "ethics", "right and wrong", "confidential"],
    "Work Ethic": ["work ethic", "diligent", "hard work", "responsible", "discipline", "prepared"],
    "Mentorship": ["mentor", "teacher", "learned from", "father", "mother", "sponsor", "tutelage", "example"],
    "Leadership": ["lead", "partner", "ownership", "managing", "responsibility", "accountability", "decisive"],
    "Gratitude": ["grateful", "gratitude", "thank", "treasured", "appreciate", "help along the way"],
    "Decision Making": ["decision", "choose", "fork", "opportunity", "option", "when x do y"],
    "Character": ["character", "values", "virtues", "principle", "moral"],
    "Community": ["community", "church", "school", "home", "service", "give"],
    "Career": ["career", "professional", "firm", "client", "business"],
}


def trim_to_words(text: str, max_w: int = MAX_WORDS) -> str:
    if not text:
        return ""
    text = text.strip()
    words = text.split()
    if len(words) <= max_w:
        return text
    return " ".join(words[:max_w]).rstrip(".,;:")


def classify_type(quote: str) -> str:
    q = quote.lower()
    for t, keywords in TYPE_KEYWORDS.items():
        if any(k in q for k in keywords):
            return t
    return "reflection"


def assign_themes(quote: str, quote_type: str) -> list[str]:
    q = quote.lower()
    themes = []
    for theme, keywords in THEME_KEYWORDS.items():
        if any(k in q for k in keywords):
            themes.append(theme)
    if not themes:
        themes = ["Reflection"]
    return themes[:4]


def normalize_for_dedup(s: str) -> str:
    return re.sub(r"\s+", " ", s.strip().lower())[:120]


def main():
    seen = set()
    entries: list[dict] = []

    # 1. From extracted: verbatim evidence only (principle/heuristic summaries are not verbatim story text)
    for fp in sorted(EXTRACTED_DIR.glob("*.json")):
        story_id = fp.stem
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        for p in data.get("principles", []):
            text = (p.get("evidence") or "").strip()
            if not text:
                continue
            text = trim_to_words(text)
            if len(text.split()) > MAX_WORDS:
                continue
            norm = normalize_for_dedup(text)
            if norm in seen:
                continue
            seen.add(norm)
            entries.append({
                "quote": text,
                "story_id": story_id,
                "themes": assign_themes(text, "principle"),
                "context": "principle evidence in story",
                "type": "principle",
            })
        for h in data.get("decision_heuristics", []):
            text = (h.get("evidence") or "").strip()
            if not text:
                continue
            text = trim_to_words(text)
            if len(text.split()) > MAX_WORDS:
                continue
            norm = normalize_for_dedup(text)
            if norm in seen:
                continue
            seen.add(norm)
            entries.append({
                "quote": text,
                "story_id": story_id,
                "themes": assign_themes(text, "decision"),
                "context": "decision heuristic evidence",
                "type": "decision",
            })

    # 2. From out/quotes/quotes.json: add meaningful quotes not already covered
    if QUOTES_SOURCE.exists():
        try:
            raw_quotes = json.loads(QUOTES_SOURCE.read_text(encoding="utf-8"))
        except Exception:
            raw_quotes = []
        for q in raw_quotes:
            quote = (q.get("quote") or "").strip()
            if not quote:
                continue
            quote = trim_to_words(quote)
            if len(quote.split()) > MAX_WORDS:
                continue
            norm = normalize_for_dedup(quote)
            if norm in seen:
                continue
            story_id = q.get("story_id", "")
            if not story_id:
                continue
            # Prefer quotes that sound like principles/values/gratitude/reflection (skip pure narrative)
            qtype = classify_type(quote)
            # Skip very short or purely narrative (e.g. "It was just my destiny!" is reflection; "I was quite a busy guy" is skip)
            skip_phrases = ["i was ", "we were ", "he was ", "she was ", "they were ", "it was ", "there was ", "that was "]
            if qtype == "reflection" and any(quote.lower().startswith(p) for p in skip_phrases) and len(quote.split()) < 6:
                continue
            seen.add(norm)
            entries.append({
                "quote": quote,
                "story_id": story_id,
                "themes": assign_themes(quote, qtype),
                "context": "memoir narrative",
                "type": qtype,
            })

    # Cap at 150, keep variety by type
    by_type: dict[str, list] = {}
    for e in entries:
        by_type.setdefault(e["type"], []).append(e)
    result = []
    for t in ["principle", "decision", "gratitude", "leadership", "reflection"]:
        result.extend(by_type.get(t, [])[:40])
    result = result[:150]
    # Stable order
    result = sorted(result, key=lambda x: (x["story_id"], x["quote"]))[:150]

    LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
    QUOTES_JSON.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    # quotes_index.md by theme
    theme_to_quotes: dict[str, list[dict]] = {}
    for e in result:
        for t in e["themes"]:
            theme_to_quotes.setdefault(t if t in THEME_KEYWORDS else t.title(), []).append(e)
    md_lines = ["# Quote Bank Index", "", "Quotes by theme. Source: out/library/quotes.json", ""]
    for theme in ["Integrity", "Work Ethic", "Mentorship", "Leadership", "Gratitude", "Decision Making", "Character", "Community", "Career", "Reflection"]:
        quotes = theme_to_quotes.get(theme, [])
        if not quotes:
            continue
        md_lines.append(f"## {theme}")
        md_lines.append("")
        for e in quotes[:25]:  # cap per theme for readability
            md_lines.append(f"- **{e['story_id']}** ({e['type']}): \"{e['quote']}\"")
        md_lines.append("")
    QUOTES_INDEX_MD.write_text("\n".join(md_lines), encoding="utf-8")

    print(f"[bold green]Wrote {QUOTES_JSON} ({len(result)} quotes), {QUOTES_INDEX_MD}[/bold green]")


if __name__ == "__main__":
    main()
