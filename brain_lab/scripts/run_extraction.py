#!/usr/bin/env python3
"""Run extraction for stories via OpenAI API. Loads OPENAI_API_KEY from .env.local.
Usage: python scripts/run_extraction.py [--limit N]   (default: first 3 stories)"""

import argparse
import csv
import json
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from rich import print

BASE = Path(__file__).resolve().parent.parent
ENV_LOCAL = BASE / ".env.local"
PROMPT_PATH = BASE / "prompts" / "extraction_prompt.md"
MANIFEST_CSV = BASE / "out" / "manifest.csv"
EXTRACTED_DIR = BASE / "out" / "extracted"


def load_manifest(limit=None):
    rows = []
    with MANIFEST_CSV.open("r", encoding="utf-8") as f:
        for i, row in enumerate(csv.DictReader(f)):
            if limit is not None and i >= limit:
                break
            rows.append(row)
    return rows


def main():
    parser = argparse.ArgumentParser(description="Extract story JSON via OpenAI")
    parser.add_argument("--limit", type=int, default=3, help="Max number of stories (default: 3)")
    args = parser.parse_args()

    load_dotenv(ENV_LOCAL)
    api_key = __import__("os").environ.get("OPENAI_API_KEY")
    if not api_key:
        print("[red]OPENAI_API_KEY not set. Add it to .env.local[/red]")
        sys.exit(1)

    if not PROMPT_PATH.exists():
        print(f"[red]Missing {PROMPT_PATH}[/red]")
        sys.exit(1)
    prompt_template = PROMPT_PATH.read_text(encoding="utf-8")

    manifest = load_manifest(limit=args.limit)
    if not manifest:
        print("[red]No manifest rows. Run make split first.[/red]")
        sys.exit(1)

    EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)

    try:
        from openai import OpenAI
    except ImportError:
        print("[red]Install openai: pip install openai[/red]")
        sys.exit(1)

    client = OpenAI(api_key=api_key)

    for row in manifest:
        story_id = row.get("story_id")
        txt_path_rel = row.get("txt_path")
        if not story_id or not txt_path_rel:
            continue
        txt_path = BASE / txt_path_rel
        out_path = EXTRACTED_DIR / f"{story_id}.json"
        if not txt_path.exists():
            print(f"[yellow]Skip {story_id}: missing {txt_path}[/yellow]")
            continue
        if out_path.exists():
            print(f"[dim]Skip {story_id}: already exists[/dim]")
            continue

        story_text = txt_path.read_text(encoding="utf-8")
        user_content = f"{prompt_template}\n\n---\n\n**Story ID:** {story_id}\n\n**Story text to analyze:**\n\n{story_text}"

        print(f"[cyan]Extracting {story_id}...[/cyan]")
        try:
            for attempt in range(3):
                try:
                    resp = client.chat.completions.create(
                        model="gpt-5-mini",
                        messages=[
                            {"role": "system", "content": "You return only valid JSON. No markdown code fences, no explanation."},
                            {"role": "user", "content": user_content},
                        ],
                    )
                    break
                except Exception as api_err:
                    if attempt < 2 and "500" in str(api_err):
                        import time
                        time.sleep(2 * (attempt + 1))
                        continue
                    raise
            raw = resp.choices[0].message.content.strip()
            # Strip markdown code block if present
            if raw.startswith("```"):
                raw = re.sub(r"^```(?:json)?\s*", "", raw)
                raw = re.sub(r"\s*```$", "", raw)
            data = json.loads(raw)
            data["story_id"] = data.get("story_id") or story_id
            data.setdefault("story_summary", "")
            out_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
            print(f"[green]Wrote {out_path}[/green]")
        except Exception as e:
            print(f"[red]{story_id}: {e}[/red]")
            raise

    # Update story .md files from extracted JSON + TXT
    try:
        import subprocess
        cmd = [sys.executable, str(BASE / "scripts" / "06_update_stories_md.py")]
        if args.limit is not None:
            cmd.extend(["--limit", str(args.limit)])
        subprocess.run(cmd, cwd=BASE, check=False)
    except Exception as e:
        print(f"[yellow]Could not update story .md files: {e}[/yellow]")

    print("[bold green]Done.[/bold green]")


if __name__ == "__main__":
    main()
