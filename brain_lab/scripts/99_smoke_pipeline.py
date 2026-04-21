#!/usr/bin/env python3
"""Smoke test: run principles + heuristics clustering and doctrine generation; print counts.
Exit non-zero if required outputs are missing or no extracted JSON found."""

import json
import subprocess
import sys
from pathlib import Path

from rich import print

BASE = Path(__file__).resolve().parent.parent
EXTRACTED_DIR = BASE / "out" / "extracted"
CLUSTERS_DIR = BASE / "out" / "clusters"
DOCTRINE_DIR = BASE / "out" / "doctrine"


def main() -> int:
    jsons = list(EXTRACTED_DIR.glob("*.json"))
    if not EXTRACTED_DIR.exists() or not jsons:
        print("[red]No out/extracted/*.json found. Run extraction first.[/red]")
        return 1

    story_ids = set()
    raw_principles = 0
    raw_heuristics = 0
    for fp in jsons:
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
            story_ids.add(data.get("story_id") or fp.stem)
            raw_principles += len(data.get("principles") or [])
            raw_heuristics += len(data.get("decision_heuristics") or [])
        except Exception:
            continue

    print(f"[cyan]Stories with extraction: {len(story_ids)}[/cyan]")
    print(f"[cyan]Raw principles: {raw_principles} | Raw heuristics: {raw_heuristics}[/cyan]")

    scripts_dir = BASE / "scripts"
    r1 = subprocess.run(
        [sys.executable, str(scripts_dir / "03_cluster_principles.py")],
        cwd=BASE,
        capture_output=True,
        text=True,
    )
    if r1.returncode != 0:
        print(f"[red]03_cluster_principles.py failed: {r1.stderr or r1.stdout}[/red]")
        return 1

    r2 = subprocess.run(
        [sys.executable, str(scripts_dir / "03b_cluster_heuristics.py")],
        cwd=BASE,
        capture_output=True,
        text=True,
    )
    if r2.returncode != 0:
        print(f"[red]03b_cluster_heuristics.py failed: {r2.stderr or r2.stdout}[/red]")
        return 1

    # Count canonical and clusters from outputs
    principles_json = CLUSTERS_DIR / "principles_clusters.json"
    heuristics_json = CLUSTERS_DIR / "heuristics_clusters.json"
    if not principles_json.exists():
        print("[red]Missing out/clusters/principles_clusters.json[/red]")
        return 1
    if not heuristics_json.exists():
        print("[red]Missing out/clusters/heuristics_clusters.json[/red]")
        return 1

    p_data = json.loads(principles_json.read_text(encoding="utf-8"))
    h_data = json.loads(heuristics_json.read_text(encoding="utf-8"))
    canonical_principles = sum(len(c.get("canonical_items", [])) for c in p_data)
    canonical_heuristics = sum(len(c.get("canonical_items", [])) for c in h_data)

    print("[bold]Principles:[/bold]")
    print(f"  Raw: {raw_principles} -> Canonical: {canonical_principles} -> Clusters: {len(p_data)}")
    print("[bold]Heuristics:[/bold]")
    print(f"  Raw: {raw_heuristics} -> Canonical: {canonical_heuristics} -> Clusters: {len(h_data)}")

    required = [
        CLUSTERS_DIR / "principles_cluster_summary.md",
        CLUSTERS_DIR / "heuristics_cluster_summary.md",
        CLUSTERS_DIR / "labels_editable.json",
        DOCTRINE_DIR / "draft_principles_doctrine.md",
        DOCTRINE_DIR / "draft_heuristics_doctrine.md",
        DOCTRINE_DIR / "core_principles.md",
    ]
    missing = [f for f in required if not f.exists()]
    if missing:
        print("[red]Missing outputs:[/red]")
        for f in missing:
            print(f"  {f}")
        return 1

    print("[bold green]Smoke passed. All outputs present.[/bold green]")
    return 0


if __name__ == "__main__":
    sys.exit(main())
