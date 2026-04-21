#!/usr/bin/env python3
"""Validate out/extracted/*.json against Pydantic schema and report manifest coverage.
Exit non-zero if validation fails or coverage is incomplete. Cwd-independent."""

import json
import sys
from pathlib import Path

from pydantic import BaseModel, Field, field_validator
from rich import print

BASE = Path(__file__).resolve().parent.parent
EXTRACTED_DIR = BASE / "out" / "extracted"
COVERAGE_REPORT_PATH = EXTRACTED_DIR / "coverage_report.md"

# Set True to require non-empty evidence for principles/heuristics
REQUIRE_EVIDENCE = False


class QuoteItem(BaseModel):
    quote: str = ""
    max_25_words: bool = True

    @field_validator("quote")
    @classmethod
    def quote_max_25_words(cls, v: str) -> str:
        words = v.split()
        if len(words) > 25:
            raise ValueError(f"Quote has {len(words)} words (max 25)")
        return v


class DecisionMoment(BaseModel):
    trigger: str = ""
    constraints: list[str] = Field(default_factory=list)
    options: list[str] = Field(default_factory=list)
    choice: str = ""
    reasoning: str = ""
    risk_accepted: str = ""
    outcome: str = ""


class PrincipleItem(BaseModel):
    principle: str = ""
    evidence: str = ""

    @field_validator("evidence")
    @classmethod
    def evidence_non_empty_if_required(cls, v: str) -> str:
        if REQUIRE_EVIDENCE and (v or "").strip() == "":
            raise ValueError("Evidence required for principle")
        return v or ""


class HeuristicItem(BaseModel):
    heuristic: str = ""
    evidence: str = ""

    @field_validator("evidence")
    @classmethod
    def evidence_non_empty_if_required(cls, v: str) -> str:
        if REQUIRE_EVIDENCE and (v or "").strip() == "":
            raise ValueError("Evidence required for heuristic")
        return v or ""


class Context(BaseModel):
    role: str = ""
    industry: str = ""
    time_period: str = ""
    stakes: str = ""


class LeadershipPatterns(BaseModel):
    risk_tolerance: str = ""
    communication_style: str = ""
    accountability_posture: str = ""
    ethical_framing: str = ""


class ExtractedStory(BaseModel):
    story_id: str = ""
    story_title: str = ""
    story_summary: str = ""
    context: Context = Field(default_factory=Context)
    core_conflict: str = ""
    decision_moments: list[DecisionMoment] = Field(default_factory=list)
    principles: list[PrincipleItem] = Field(default_factory=list)
    decision_heuristics: list[HeuristicItem] = Field(default_factory=list)
    leadership_patterns: LeadershipPatterns = Field(default_factory=LeadershipPatterns)
    quotes: list[QuoteItem] = Field(default_factory=list)

    @field_validator("quotes")
    @classmethod
    def quotes_max_5(cls, v: list[QuoteItem]) -> list[QuoteItem]:
        if len(v) > 5:
            raise ValueError(f"At most 5 quotes allowed, got {len(v)}")
        return v


def load_manifest() -> list[dict]:
    import csv as _csv
    manifest_csv = BASE / "out" / "manifest.csv"
    manifest_jsonl = BASE / "out" / "manifest.jsonl"
    if manifest_csv.exists():
        records = []
        with manifest_csv.open("r", encoding="utf-8") as f:
            for row in _csv.DictReader(f):
                records.append(row)
        return records
    if manifest_jsonl.exists():
        records = []
        with manifest_jsonl.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                records.append(json.loads(line))
        return records
    return []


def main() -> int:
    EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)

    manifest = load_manifest()
    story_ids = {r["story_id"] for r in manifest}

    extracted_files = list(EXTRACTED_DIR.glob("*.json"))
    extracted_ids = {fp.stem for fp in extracted_files}

    missing = sorted(story_ids - extracted_ids)
    orphans = []
    for fp in extracted_files:
        stem = fp.stem
        if stem not in story_ids:
            orphans.append(fp.name)

    total = len(story_ids)
    have = len(story_ids - set(missing))
    coverage_pct = (100.0 * have / total) if total else 100.0

    report_lines = [
        "# Extraction coverage report",
        "",
        f"- **Stories in manifest:** {total}",
        f"- **With extraction JSON:** {have}",
        f"- **Percent complete:** {coverage_pct:.0f}%",
        "",
        "## Missing extraction JSON (story_id)",
        "",
    ]
    if missing:
        for sid in missing:
            report_lines.append(f"- {sid}")
        report_lines.append("")
    else:
        report_lines.append("(none)")
        report_lines.append("")

    report_lines.append("## Orphan JSON files (not in manifest)")
    report_lines.append("")
    if orphans:
        for name in orphans:
            report_lines.append(f"- {name}")
        report_lines.append("")
    else:
        report_lines.append("(none)")
        report_lines.append("")

    EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)
    COVERAGE_REPORT_PATH.write_text("\n".join(report_lines), encoding="utf-8")

    print("[bold]Coverage report[/bold]")
    print(f"  Stories in manifest: {total}")
    print(f"  With extraction JSON: {have}")
    print(f"  Percent complete: {coverage_pct:.0f}%")
    print(f"  Report: {COVERAGE_REPORT_PATH}")
    if missing:
        print(f"[yellow]Stories missing extraction JSON:[/yellow] {missing}")
    if orphans:
        print(f"[yellow]Extra JSON files with no matching story_id:[/yellow] {orphans}")

    # Validate each extracted JSON
    errors: list[tuple[str, str]] = []
    for fp in sorted(extracted_files):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
            ExtractedStory.model_validate(data)
        except json.JSONDecodeError as e:
            errors.append((fp.name, f"Invalid JSON: {e}"))
        except Exception as e:
            errors.append((fp.name, str(e)))

    if errors:
        print("[red]Validation errors:[/red]")
        for name, msg in errors:
            print(f"  {name}: {msg}")
        return 1

    if total and have == 0:
        print("[red]No extracted JSON for any manifest story.[/red]")
        return 1

    print("[bold green]Validation passed.[/bold green]")
    return 0


if __name__ == "__main__":
    sys.exit(main())
