#!/usr/bin/env python3
"""Build out/library/00_STORY_INDEX.md from stories_md, extracted JSON, and library index.
Provides a navigation index so the GPT can quickly find stories by theme and question type."""

import json
import re
from pathlib import Path

from rich import print

BASE = Path(__file__).resolve().parent.parent
OUT_DIR = BASE / "out"
EXTRACTED_DIR = OUT_DIR / "extracted"
STORIES_MD = OUT_DIR / "stories_md"
LIBRARY_INDEX_JSON = OUT_DIR / "library" / "00_LIBRARY_INDEX.json"
STORY_INDEX_MD = OUT_DIR / "library" / "00_STORY_INDEX.md"

# Life stage by story_id (childhood, education, early career, leadership, retirement, reflection)
LIFE_STAGE_MAP = {
    "P1_S01": "childhood",
    "P1_S02": "education",
    "P1_S03": "education",
    "P1_S04": "childhood",
    "P1_S05": "childhood",
    "P1_S06": "childhood",
    "P1_S07": "childhood",
    "P1_S08": "childhood",
    "P1_S09": "childhood",
    "P1_S10": "education",
    "P1_S11": "education",
    "P1_S12": "education",
    "P1_S13": "education",
    "P1_S14": "education",
    "P1_S15": "education",
    "P1_S16": "early career",
    "P1_S17": "reflection",
    "P1_S18": "early career",
    "P1_S19": "early career",
    "P1_S20": "early career",
    "P1_S21": "early career",
    "P1_S22": "leadership",
    "P1_S23": "leadership",
    "P1_S24": "leadership",
    "P1_S25": "leadership",
    "P1_S26": "leadership",
    "P1_S27": "leadership",
    "P1_S28": "reflection",
    "P1_S29": "reflection",
    "P1_S30": "reflection",
    "P1_S31": "reflection",
    "P1_S32": "reflection",
    "P1_S33": "reflection",
    "P1_S34": "reflection",
    "P1_S35": "reflection",
    "P1_S36": "reflection",
    "P1_S37": "reflection",
    "P1_S38": "reflection",
    "P1_S39": "reflection",
}

# Map cluster labels / keywords to theme directory categories
THEME_KEYWORDS = {
    "Work Ethic": ["work ethic", "diligent", "responsible", "conscientious", "Leadership Through Modeling", "Career Foundations"],
    "Mentorship": ["mentor", "tutelage", "sponsor", "teacher", "legacy", "Exemplar", "Remarkable Teacher", "Mentorship"],
    "Leadership": ["leadership", "managing", "turnaround", "partner", "Leadership Through Adversity", "Making Tough Decisions", "Leadership Through Modeling"],
    "Integrity": ["integrity", "honest", "ethics", "trustworthy", "Confidentiality", "Ownership and Accountability", "Business Ethics"],
    "Community": ["community", "service", "giving", "pay it forward", "Commitment and Community", "Identity and Creation", "Shared Values"],
    "Financial Responsibility": ["financial", "debt", "saving", "money", "Financial Responsibility", "Debt Management", "Investing in Credibility"],
    "Family": ["family", "father", "mother", "parent", "children", "Shared Values", "Child Protection"],
    "Career Choices": ["career", "fork", "opportunity", "launching", "Career Foundations", "Long Term Focus", "Early Momentum"],
    "Adversity": ["adversity", "setback", "failure", "resilience", "Leadership Through Adversity", "Investing in Credibility"],
    "Gratitude": ["gratitude", "grateful", "thank", "acknowledgment", "Gratitude and Acknowledgment", "Career Foundations"],
    "Identity": ["identity", "origins", "roots", "Identity and Creation", "Career Foundations"],
    "Curiosity": ["curiosity", "learning", "engagement", "Curiosity and Engagement", "Learning Through Responsibility"],
}


def load_library_index():
    if not LIBRARY_INDEX_JSON.exists():
        return []
    return json.loads(LIBRARY_INDEX_JSON.read_text(encoding="utf-8"))


def load_extracted(story_id: str) -> dict:
    path = EXTRACTED_DIR / f"{story_id}.json"
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def get_summary(ext: dict) -> str:
    s = (ext.get("story_summary") or "").strip()
    if s:
        return s
    return ""


def get_principles(ext: dict) -> list[str]:
    out = []
    for p in ext.get("principles", []):
        text = (p.get("principle") if isinstance(p, dict) else str(p)).strip()
        if text:
            out.append(text)
    return out[:8]  # cap for readability


def get_heuristics(ext: dict) -> list[str]:
    out = []
    for h in ext.get("decision_heuristics", []):
        text = (h.get("heuristic") if isinstance(h, dict) else str(h)).strip()
        if text:
            out.append(text)
    return out[:8]


def get_cluster_labels(entry: dict) -> tuple[list[str], list[str]]:
    principles = [c.get("label", "") for c in entry.get("principle_clusters", []) if c.get("label")]
    heuristics = [c.get("label", "") for c in entry.get("heuristic_clusters", []) if c.get("label")]
    return principles, heuristics


def build_best_used_when(entry: dict, ext: dict) -> list[str]:
    """Derive 'Best Used When User Asks About' from cluster labels and extracted content."""
    seen = set()
    out = []
    p_labels, h_labels = get_cluster_labels(entry)
    summary = (ext.get("story_summary") or "").lower()
    title = (entry.get("title") or "").lower()

    # Map cluster labels to question topics
    label_to_topic = {
        "Career Foundations and Growth": "career and growth",
        "Identity and Creation": "identity and origins",
        "Curiosity and Engagement": "curiosity and learning",
        "Leadership Through Adversity": "adversity and leadership",
        "Making Tough Decisions": "tough decisions",
        "Shared Values and Bonds": "values and relationships",
        "Investing in Credibility": "credibility and trust",
        "Financial Responsibility First": "financial responsibility",
        "Seeking Trusted Counsel": "mentors and advice",
        "Client Engagement Strategies": "client relationships",
        "Ownership and Accountability": "accountability",
        "Confidentiality and Vigilance": "integrity and ethics",
        "Leadership Through Modeling": "leadership by example",
        "Learning from Financial Mistakes": "learning from mistakes",
        "Gratitude and Acknowledgment": "gratitude",
        "Resource Management Strategies": "resourcefulness",
        "Resourceful Progress Management": "making progress with limited resources",
        "Long Term Focus": "long-term thinking",
        "Commitment and Community": "commitment and community",
        "Learning Through Responsibility": "learning through responsibility",
    }
    for label in p_labels + h_labels:
        topic = label_to_topic.get(label) or label.replace(" ", " ").lower()
        if topic and topic not in seen:
            seen.add(topic)
            out.append(topic)
    # Add from title/summary keywords
    for theme, keywords in THEME_KEYWORDS.items():
        if theme.lower() in seen or any(k in summary or k in title for k in keywords):
            if theme.lower() not in seen:
                t = theme.lower().replace(" ", " and ")
                if t not in seen:
                    seen.add(t)
                    out.append(theme.lower())
    return out[:12]


def build_theme_directory(entries: list[dict]) -> str:
    """Build THEME DIRECTORY: theme -> list of story_ids."""
    theme_to_ids: dict[str, set[str]] = {}
    for entry in entries:
        sid = entry.get("story_id", "")
        title = (entry.get("title") or "").lower()
        p_labels, h_labels = get_cluster_labels(entry)
        all_text = " ".join(p_labels + h_labels).lower() + " " + title
        for theme, keywords in THEME_KEYWORDS.items():
            if theme.lower() in all_text or any(kw.lower() in all_text for kw in keywords):
                theme_to_ids.setdefault(theme, set()).add(sid)
    lines = ["# THEME DIRECTORY", "", "Use this to find stories by topic.", ""]
    for theme in sorted(theme_to_ids.keys()):
        ids = sorted(theme_to_ids[theme])
        lines.append(f"**{theme}**")
        lines.append(" ".join(ids))
        lines.append("")
    return "\n".join(lines)


def main():
    index_entries = load_library_index()
    if not index_entries:
        print("[yellow]No library index. Run make index first.[/yellow]")
        return

    theme_dir = build_theme_directory(index_entries)
    story_sections = []

    for entry in index_entries:
        story_id = entry.get("story_id", "")
        title = entry.get("title", story_id)
        ext = load_extracted(story_id)
        summary = get_summary(ext)
        principles = get_principles(ext)
        heuristics = get_heuristics(ext)
        life_stage = LIFE_STAGE_MAP.get(story_id, "reflection")
        p_labels, h_labels = get_cluster_labels(entry)

        # Core themes: from cluster labels (short form)
        core_themes = []
        for lb in p_labels + h_labels:
            # shorten e.g. "Career Foundations and Growth" -> "career foundations"
            short = lb.split(" and ")[0].strip() if " and " in lb else lb
            short = short.lower().replace(" ", " ").strip()
            if short and short not in core_themes:
                core_themes.append(short)
        if not core_themes:
            core_themes = ["memoir reflection"]

        best_used = build_best_used_when(entry, ext)
        if not best_used:
            best_used = core_themes[:6]

        # Keep summary to 2-4 sentences
        sentences = [s.strip() for s in re.split(r"[.!?]+", summary) if s.strip()]
        summary_short = ". ".join(sentences[:4]) + ("." if sentences else "")

        block = f"""
---
Story ID: {story_id}
Title: {title}

Life Stage: {life_stage.title()}

Core Themes:
""" + "\n".join(f"- {t}" for t in core_themes[:10]) + """

Key Principles:
""" + "\n".join(f"- {p}" for p in principles) + """

Decision Heuristics:
""" + "\n".join(f"- {h}" for h in heuristics) + """

Summary:
""" + (summary_short or "(No summary in extracted data.)") + """

Best Used When User Asks About:
""" + "\n".join(f"- {b}" for b in best_used)
        story_sections.append(block.strip())

    out = "# Story Navigation Index\n\n"
    out += "Structured index for GPT: find which story is relevant to a user question.\n\n"
    out += "---\n\n"
    out += theme_dir
    out += "\n\n---\n\n# STORIES\n\n"
    out += "\n\n".join(story_sections)
    out += "\n"

    STORY_INDEX_MD.parent.mkdir(parents=True, exist_ok=True)
    STORY_INDEX_MD.write_text(out, encoding="utf-8")
    print(f"[bold green]Wrote {STORY_INDEX_MD} ({len(index_entries)} stories)[/bold green]")


if __name__ == "__main__":
    main()
