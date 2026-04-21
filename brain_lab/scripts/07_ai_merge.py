#!/usr/bin/env python3
"""AI merge: group principles/heuristics by same idea via API; write ai_merged_*.json.
Run before make cluster so 03/03b use merged lists and frequency = stories supporting each idea.
Uses OPENAI_API_KEY from .env.local."""

import json
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from rich import print

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.cluster_common import fingerprint_dedup, load_extracted_items

ENV_LOCAL = BASE / ".env.local"
PROMPT_PATH = BASE / "prompts" / "ai_merge_prompt.md"
IN_DIR = BASE / "out" / "extracted"
OUT_CLUSTERS = BASE / "out" / "clusters"
OUT_PRINCIPLES = OUT_CLUSTERS / "ai_merged_principles.json"
OUT_HEURISTICS = OUT_CLUSTERS / "ai_merged_heuristics.json"
BATCH_SIZE = 25


def get_client():
    load_dotenv(ENV_LOCAL)
    try:
        from openai import OpenAI
    except ImportError:
        return None
    key = __import__("os").environ.get("OPENAI_API_KEY")
    if not key:
        return None
    return OpenAI(api_key=key)


def call_merge_api(client, statements: list[str], item_type: str) -> list[list[int]]:
    """Send batch to API; return list of groups (each group = list of indices)."""
    prompt_template = PROMPT_PATH.read_text(encoding="utf-8")
    numbered = "\n".join(f"{i}. {s}" for i, s in enumerate(statements))
    user_content = prompt_template.strip() + "\n\n" + numbered
    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You return only valid JSON. No markdown code fences, no explanation. Keys: groups (array of arrays of indices)."},
                    {"role": "user", "content": user_content},
                ],
            )
            raw = resp.choices[0].message.content.strip()
            if raw.startswith("```"):
                raw = re.sub(r"^```(?:json)?\s*", "", raw)
                raw = re.sub(r"\s*```$", "", raw)
            data = json.loads(raw)
            groups = data.get("groups", [])
            if not isinstance(groups, list):
                return [[i] for i in range(len(statements))]
            return groups
        except Exception as e:
            if attempt < 2 and ("500" in str(e) or "rate" in str(e).lower()):
                time.sleep(2 * (attempt + 1))
                continue
            print(f"[yellow]API error: {e}[/yellow]")
            return [[i] for i in range(len(statements))]
    return [[i] for i in range(len(statements))]


def merge_canonical_from_groups(canonical_list: list[dict], groups: list[list[int]], text_key: str = "display_text") -> list[dict]:
    """Convert API groups (indices) into merged canonical items: union story_ids, shortest display_text."""
    merged = []
    for group in groups:
        if not group:
            continue
        indices = [i for i in group if 0 <= i < len(canonical_list)]
        if not indices:
            continue
        group_items = [canonical_list[i] for i in indices]
        all_story_ids = sorted({sid for c in group_items for sid in c.get("story_ids", [])})
        all_variants = []
        for c in group_items:
            all_variants.extend(c.get("variants", []))
        best = min(group_items, key=lambda c: len(c.get(text_key) or "") or 9999)
        display = (best.get(text_key) or "").strip()
        if not display and all_variants:
            display = (all_variants[0].get("text") or "").strip()[:200]
        merged.append({
            "display_text": display or "(no text)",
            "fingerprint": best.get("fingerprint", ""),
            "frequency": len(all_story_ids),
            "story_ids": all_story_ids,
            "total_mentions": sum(c.get("total_mentions", 0) for c in group_items),
            "evidence": best.get("evidence", ""),
            "variants": all_variants,
        })
    return merged


def run_merge(client, item_type: str, text_key: str) -> list[dict]:
    raw = load_extracted_items(IN_DIR, item_type, text_key)
    if not raw:
        return []
    canonical = fingerprint_dedup(raw, text_key)
    if not canonical:
        return []
    statements = [c.get("display_text", "") for c in canonical]
    n = len(statements)
    all_merged: list[dict] = []
    for start in range(0, n, BATCH_SIZE):
        end = min(start + BATCH_SIZE, n)
        batch_statements = statements[start:end]
        batch_canonical = canonical[start:end]
        groups = call_merge_api(client, batch_statements, item_type)
        # Keep indices batch-relative (0..len(batch_canonical)-1) for merge_canonical_from_groups
        remapped = [[i for i in g if 0 <= i < len(batch_canonical)] for g in groups]
        batch_merged = merge_canonical_from_groups(batch_canonical, remapped, text_key)
        all_merged.extend(batch_merged)
        print(f"[dim]{item_type} batch {start}-{end}: {len(batch_canonical)} -> {len(batch_merged)}[/dim]")
    return all_merged


def main():
    if not IN_DIR.exists():
        print("[yellow]No out/extracted. Run extraction first.[/yellow]")
        return
    if not PROMPT_PATH.exists():
        print(f"[red]Missing {PROMPT_PATH}[/red]")
        sys.exit(1)
    client = get_client()
    if not client:
        print("[red]OPENAI_API_KEY not set in .env.local[/red]")
        sys.exit(1)

    OUT_CLUSTERS.mkdir(parents=True, exist_ok=True)

    principles = run_merge(client, "principle", "principle")
    if principles:
        OUT_PRINCIPLES.write_text(json.dumps(principles, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"[green]Wrote {OUT_PRINCIPLES} ({len(principles)} merged principles)[/green]")

    heuristics = run_merge(client, "heuristic", "heuristic")
    if heuristics:
        OUT_HEURISTICS.write_text(json.dumps(heuristics, indent=2, ensure_ascii=False), encoding="utf-8")
        print(f"[green]Wrote {OUT_HEURISTICS} ({len(heuristics)} merged heuristics)[/green]")

    print("[bold green]Done. Run make cluster to use merged lists.[/bold green]")


if __name__ == "__main__":
    main()
