#!/usr/bin/env python3
"""Read manifest and write out/library/00_LIBRARY_INDEX.md and 00_LIBRARY_INDEX.json.
Parts → list of stories (ID, title, link to stories_md). When cluster outputs exist, enriches
each story with principle/heuristic cluster labels (human_label → ai_suggested_label → auto_label). Cwd-independent."""

import csv
import json
from pathlib import Path

from rich import print

BASE = Path(__file__).resolve().parent.parent
OUT_DIR = BASE / "out"
CLUSTERS_DIR = OUT_DIR / "clusters"
LIBRARY_DIR = OUT_DIR / "library"
INDEX_MD = LIBRARY_DIR / "00_LIBRARY_INDEX.md"
INDEX_JSON = LIBRARY_DIR / "00_LIBRARY_INDEX.json"
PART_LABELS = {"P1": "Part One", "P2": "Part Two", "P3": "Part Three"}


def cluster_label(editable: dict, cid: str, auto_label: str) -> str:
    """human_label → ai_suggested_label → auto_label."""
    entry = editable.get(str(cid), {}) if editable else {}
    if entry.get("human_label"):
        return entry["human_label"]
    if entry.get("ai_suggested_label"):
        return entry["ai_suggested_label"]
    return entry.get("auto_label", auto_label)


def build_story_clusters() -> dict[str, dict]:
    """story_id -> { principle_clusters: [{cluster_id, label}], heuristic_clusters: [...] }."""
    out: dict[str, dict] = {}
    labels_path = CLUSTERS_DIR / "labels_editable.json"
    labels_raw: dict = {}
    if labels_path.exists():
        try:
            labels_raw = json.loads(labels_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    principles_labels = (labels_raw.get("principles") or {}) if isinstance(labels_raw, dict) else {}
    heuristics_labels = (labels_raw.get("heuristics") or {}) if isinstance(labels_raw, dict) else {}

    for name, prefix in [("principles_clusters.json", "principle"), ("heuristics_clusters.json", "heuristic")]:
        path = CLUSTERS_DIR / name
        if not path.exists():
            continue
        try:
            summaries = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        editable = principles_labels if prefix == "principle" else heuristics_labels
        key = "principle_clusters" if prefix == "principle" else "heuristic_clusters"
        for s in summaries:
            cid = s.get("cluster_id", "")
            auto = s.get("suggested_label", "")
            label = cluster_label(editable, str(cid), auto)
            story_ids = set()
            for it in s.get("canonical_items", []):
                story_ids.update(it.get("story_ids", []))
            for sid in story_ids:
                if sid not in out:
                    out[sid] = {"principle_clusters": [], "heuristic_clusters": []}
                out[sid][key].append({"cluster_id": cid, "label": label})

    for sid in out:
        for key in ("principle_clusters", "heuristic_clusters"):
            seen = set()
            unique = []
            for c in out[sid][key]:
                if c["cluster_id"] not in seen:
                    seen.add(c["cluster_id"])
                    unique.append(c)
            out[sid][key] = sorted(unique, key=lambda x: x["cluster_id"])
    return out


def load_manifest() -> list[dict]:
    manifest_csv = OUT_DIR / "manifest.csv"
    manifest_jsonl = OUT_DIR / "manifest.jsonl"
    if manifest_csv.exists():
        rows = []
        with manifest_csv.open("r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                rows.append(row)
        return rows
    if manifest_jsonl.exists():
        rows = []
        with manifest_jsonl.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    rows.append(json.loads(line))
        return rows
    return []


def main() -> None:
    manifest = load_manifest()
    if not manifest:
        print("[yellow]No manifest found. Run 01_split_by_toc.py first.[/yellow]")
        raise SystemExit(1)

    story_clusters = build_story_clusters() if CLUSTERS_DIR.exists() else {}

    by_part: dict[str, list[dict]] = {}
    for r in manifest:
        part = r.get("part", "P1")
        if part not in by_part:
            by_part[part] = []
        by_part[part].append(r)

    index_entries: list[dict] = []
    intro = "Navigation spine for “Explore stories”."
    if story_clusters:
        intro += " Themes from principle/heuristic clusters (run `make cluster` to refresh)."
    lines = ["# Library Index", "", intro, ""]
    for part in sorted(by_part.keys()):
        label = PART_LABELS.get(part, part)
        lines.append(f"## {label}")
        lines.append("")
        for r in by_part[part]:
            sid = r.get("story_id", "")
            title = r.get("title", "")
            md_path_rel = r.get("md_path", "")
            txt_path_rel = r.get("txt_path", "")
            if md_path_rel:
                md_name = Path(md_path_rel).name
                md_full = BASE / md_path_rel
            else:
                md_name = f"{sid}.md"
                md_full = OUT_DIR / "stories_md" / md_name
            link = md_name if md_full.exists() else (Path(txt_path_rel).name if txt_path_rel else "")

            lines.append(f"- **{sid}** — {title}")
            if link:
                lines.append(f"  - `{link}`")
            clusters = story_clusters.get(sid, {})
            principle_labels = [c["label"] for c in clusters.get("principle_clusters", [])]
            heuristic_labels = [c["label"] for c in clusters.get("heuristic_clusters", [])]
            if principle_labels or heuristic_labels:
                theme_parts = []
                if principle_labels:
                    theme_parts.append("Principles: " + ", ".join(principle_labels))
                if heuristic_labels:
                    theme_parts.append("Heuristics: " + ", ".join(heuristic_labels))
                lines.append(f"  - {theme_parts[0]}")
                if len(theme_parts) > 1:
                    lines.append(f"  - {theme_parts[1]}")
            lines.append("")

            entry: dict = {
                "story_id": sid,
                "title": title,
                "part": part,
                "paths": {
                    "txt": txt_path_rel or "",
                    "md": md_path_rel or f"stories_md/{md_name}",
                    "pdf": r.get("pdf_path", ""),
                },
            }
            if sid in story_clusters:
                entry["principle_clusters"] = story_clusters[sid].get("principle_clusters", [])
                entry["heuristic_clusters"] = story_clusters[sid].get("heuristic_clusters", [])
            index_entries.append(entry)
        lines.append("")

    LIBRARY_DIR.mkdir(parents=True, exist_ok=True)
    INDEX_MD.write_text("\n".join(lines), encoding="utf-8")
    INDEX_JSON.write_text(json.dumps(index_entries, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[bold green]Wrote {INDEX_MD}, {INDEX_JSON}[/bold green]")


if __name__ == "__main__":
    main()
