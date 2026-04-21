#!/usr/bin/env python3
"""Build upload_to_gpt/ for GPT Knowledge: STORIES_ALL.md, 00_LIBRARY_INDEX.md, doctrine files.
Run after cluster/index so the bundle is up to date. Cwd-independent."""

import json
import shutil
from pathlib import Path

from rich import print

BASE = Path(__file__).resolve().parent.parent
OUT_DIR = BASE / "out"
UPLOAD_DIR = BASE / "upload_to_gpt"
STORIES_MD = OUT_DIR / "stories_md"
LIBRARY_INDEX_JSON = OUT_DIR / "library" / "00_LIBRARY_INDEX.json"
LIBRARY_INDEX_MD = OUT_DIR / "library" / "00_LIBRARY_INDEX.md"
DOCTRINE_DIR = OUT_DIR / "doctrine"


def main() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # 1. STORIES_ALL.md — one compiled file, order from library index
    if not LIBRARY_INDEX_JSON.exists():
        print("[yellow]No library index. Run make index first.[/yellow]")
    else:
        index_entries = json.loads(LIBRARY_INDEX_JSON.read_text(encoding="utf-8"))
        parts: list[str] = []
        for entry in index_entries:
            sid = entry.get("story_id", "")
            title = entry.get("title", "")
            md_rel = entry.get("paths", {}).get("md", "")
            if md_rel:
                md_path = BASE / md_rel
            else:
                md_path = STORIES_MD / f"{sid}.md"
            if not md_path.exists():
                print(f"[dim]Skip {sid}: no story file[/dim]")
                continue
            content = md_path.read_text(encoding="utf-8").strip()
            parts.append(f"# {sid} – {title}\n\n{content}")
        STORIES_ALL = "\n\n---\n\n".join(parts)
        (UPLOAD_DIR / "STORIES_ALL.md").write_text(STORIES_ALL, encoding="utf-8")
        print(f"[green]Wrote {UPLOAD_DIR / 'STORIES_ALL.md'} ({len(parts)} stories)[/green]")

    # 2. Library index (required)
    if LIBRARY_INDEX_MD.exists():
        shutil.copy2(LIBRARY_INDEX_MD, UPLOAD_DIR / "00_LIBRARY_INDEX.md")
        print(f"[green]Wrote {UPLOAD_DIR / '00_LIBRARY_INDEX.md'}[/green]")
    else:
        print("[yellow]No 00_LIBRARY_INDEX.md. Run make index.[/yellow]")

    # 3–5. Doctrine files (optional)
    for name in ["draft_principles_doctrine.md", "draft_heuristics_doctrine.md", "core_principles.md"]:
        src = DOCTRINE_DIR / name
        if src.exists():
            shutil.copy2(src, UPLOAD_DIR / name)
            print(f"[green]Wrote {UPLOAD_DIR / name}[/green]")
        else:
            print(f"[dim]Skip {name} (not found)[/dim]")

    print(f"[bold green]Done. Upload {UPLOAD_DIR}/ to GPT (Knowledge).[/bold green]")


if __name__ == "__main__":
    main()
