#!/usr/bin/env python3
"""AI label clusters: for each cluster with empty human_label, call API for 2–5 word title; write ai_suggested_label to labels_editable.json.
Run after make cluster. Uses OPENAI_API_KEY from .env.local."""

import json
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from rich import print

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

ENV_LOCAL = BASE / ".env.local"
PROMPT_PATH = BASE / "prompts" / "ai_label_cluster_prompt.md"
OUT_CLUSTERS = BASE / "out" / "clusters"
LABELS_PATH = OUT_CLUSTERS / "labels_editable.json"
PRINCIPLES_CLUSTERS = OUT_CLUSTERS / "principles_clusters.json"
HEURISTICS_CLUSTERS = OUT_CLUSTERS / "heuristics_clusters.json"


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


def get_label(client, top_terms: list[str], examples: list[str], prompt_template: str) -> str:
    """One API call: return 2–5 word title, stripped."""
    top_terms_str = ", ".join(top_terms[:10])
    examples_str = "\n".join(f"- {e}" for e in examples[:3])
    body = prompt_template.replace("{top_terms}", top_terms_str).replace("{examples}", examples_str)
    for attempt in range(3):
        try:
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You return only the title, no quotes, no explanation."},
                    {"role": "user", "content": body},
                ],
            )
            raw = (resp.choices[0].message.content or "").strip()
            raw = re.sub(r"^[\"']|[\"']$", "", raw)
            return raw[:80] or "Unnamed"
        except Exception as e:
            if attempt < 2 and ("500" in str(e) or "rate" in str(e).lower()):
                time.sleep(2 * (attempt + 1))
                continue
            print(f"[yellow]API error: {e}[/yellow]")
            return "Unnamed"
    return "Unnamed"


def run_section(
    client,
    summaries: list[dict],
    labels_editable: dict,
    prefix: str,
    prompt_template: str,
) -> int:
    updated = 0
    for s in summaries:
        cid = str(s.get("cluster_id", ""))
        if cid not in labels_editable:
            labels_editable[cid] = {"cluster_id": cid, "auto_label": s.get("suggested_label", ""), "human_label": "", "ai_suggested_label": ""}
        entry = labels_editable[cid]
        if entry.get("human_label"):
            continue
        top_terms = s.get("top_terms", [])
        items = s.get("canonical_items", [])
        examples = [it.get("display_text", "")[:120] for it in items if it.get("display_text")]
        label = get_label(client, top_terms, examples, prompt_template)
        entry["ai_suggested_label"] = label
        if not entry.get("auto_label"):
            entry["auto_label"] = s.get("suggested_label", "")
        updated += 1
        print(f"[dim]{prefix} cluster {cid}: {label}[/dim]")
    return updated


def main():
    if not PROMPT_PATH.exists():
        print(f"[red]Missing {PROMPT_PATH}[/red]")
        sys.exit(1)
    if not LABELS_PATH.exists():
        print("[yellow]Run make cluster first to create labels_editable.json[/yellow]")
        sys.exit(1)
    client = get_client()
    if not client:
        print("[red]OPENAI_API_KEY not set in .env.local[/red]")
        sys.exit(1)

    prompt_template = PROMPT_PATH.read_text(encoding="utf-8")
    full = json.loads(LABELS_PATH.read_text(encoding="utf-8"))
    if not isinstance(full, dict):
        full = {}

    total = 0
    if PRINCIPLES_CLUSTERS.exists():
        summaries = json.loads(PRINCIPLES_CLUSTERS.read_text(encoding="utf-8"))
        principles_labels = full.setdefault("principles", {})
        n = run_section(client, summaries, principles_labels, "principles", prompt_template)
        total += n
    if HEURISTICS_CLUSTERS.exists():
        summaries = json.loads(HEURISTICS_CLUSTERS.read_text(encoding="utf-8"))
        heuristics_labels = full.setdefault("heuristics", {})
        n = run_section(client, summaries, heuristics_labels, "heuristics", prompt_template)
        total += n

    LABELS_PATH.write_text(json.dumps(full, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[bold green]Done. Updated {total} ai_suggested_label(s) in {LABELS_PATH}[/bold green]")


if __name__ == "__main__":
    main()
