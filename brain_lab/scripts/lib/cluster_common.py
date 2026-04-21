#!/usr/bin/env python3
"""Shared clustering: fingerprint dedup, near-duplicate merge, labeling, frequency. Used by 03 and 03b."""

import json
import re
from pathlib import Path
from typing import Any

# Near-duplicate merge: cosine similarity >= this → same canonical idea; frequency = union of story_ids
NEAR_DUP_SIMILARITY_THRESHOLD = 0.82

# Light generic terms to drop from cluster labels
LABEL_STOPWORDS = frozenset("use make work learn get take give know think see need want way thing things".split())


def normalize_for_fingerprint(s: str) -> str:
    from lib.normalize import fingerprint
    return fingerprint(s)


def fingerprint_dedup(
    items: list[dict],
    text_key: str,
) -> list[dict]:
    """Group by fingerprint; pick canonical display_text (shortest); keep backrefs."""
    from lib.normalize import fingerprint

    by_fp: dict[str, list[dict]] = {}
    for it in items:
        text = (it.get(text_key) or "").strip()
        if not text:
            continue
        fp = fingerprint(text)
        if not fp:
            fp = text[:80]  # fallback if fingerprint empty
        it_copy = {**it, "text": text}
        if fp not in by_fp:
            by_fp[fp] = []
        by_fp[fp].append(it_copy)

    canonical_list: list[dict] = []
    for fp, group in by_fp.items():
        # Shortest version as display_text
        group_sorted = sorted(group, key=lambda x: len(x["text"]))
        display_text = group_sorted[0]["text"]
        story_ids = list({v.get("story_id") or v.get("story", "") for v in group})
        variants = [{"text": v["text"], "story_id": v.get("story_id", ""), "file": v.get("file", "")} for v in group]
        evidence = (group_sorted[0].get("evidence") or "").strip() if group_sorted else ""
        canonical_list.append({
            "display_text": display_text,
            "fingerprint": fp,
            "frequency": len(story_ids),
            "story_ids": sorted(story_ids),
            "total_mentions": len(group),
            "evidence": evidence,
            "variants": variants,
        })
    return canonical_list


def near_duplicate_merge(
    canonical_list: list[dict],
    text_key: str = "display_text",
    similarity_threshold: float = NEAR_DUP_SIMILARITY_THRESHOLD,
    normalize_fn=None,
) -> list[dict]:
    """Merge near-duplicates by TF-IDF cosine similarity. Union story_ids; frequency = len(unique story_ids).
    Picks shortest display_text per merged group. Deterministic."""
    if not canonical_list or len(canonical_list) == 1:
        return canonical_list
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    if normalize_fn is None:
        from lib.normalize import normalize_text as _norm
        normalize_fn = _norm

    texts = [c.get(text_key) or "" for c in canonical_list]
    normed = [normalize_fn(t) for t in texts]
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=1)
    X = vectorizer.fit_transform(normed)
    sim = cosine_similarity(X)
    n = len(canonical_list)
    # Union-find: merge indices where sim[i,j] >= threshold
    parent = list(range(n))

    def find(i: int) -> int:
        if parent[i] != i:
            parent[i] = find(parent[i])
        return parent[i]

    def union(i: int, j: int) -> None:
        pi, pj = find(i), find(j)
        if pi != pj:
            parent[pi] = pj

    for i in range(n):
        for j in range(i + 1, n):
            if sim[i, j] >= similarity_threshold:
                union(i, j)

    # One representative per group (root)
    groups: dict[int, list[int]] = {}
    for i in range(n):
        root = find(i)
        if root not in groups:
            groups[root] = []
        groups[root].append(i)

    merged: list[dict] = []
    for root, indices in groups.items():
        group_items = [canonical_list[i] for i in indices]
        all_story_ids = sorted({sid for c in group_items for sid in c.get("story_ids", [])})
        all_variants = []
        for c in group_items:
            all_variants.extend(c.get("variants", []))
        # Shortest display_text as canonical
        best = min(group_items, key=lambda c: len(c.get(text_key) or ""))
        merged.append({
            "display_text": best.get(text_key) or "",
            "fingerprint": best.get("fingerprint", ""),
            "frequency": len(all_story_ids),
            "story_ids": all_story_ids,
            "total_mentions": sum(c.get("total_mentions", 0) for c in group_items),
            "evidence": best.get("evidence", ""),
            "variants": all_variants,
        })
    return merged


def suggest_label(top_terms: list[str], max_words: int = 5) -> str:
    """Human-friendly label: title case, drop generic terms, 2-5 words max, no duplicate words."""
    seen: set[str] = set()
    words: list[str] = []
    for t in top_terms:
        for part in t.replace("_", " ").split():
            w = part.strip().lower()
            if not w or w in LABEL_STOPWORDS or w in seen:
                continue
            seen.add(w)
            words.append(w.title())
            if len(words) >= max_words:
                break
        if len(words) >= max_words:
            break
    if not words:
        for t in top_terms[:max_words]:
            w = t.replace("_", " ").strip().lower()
            if w and w not in seen:
                words.append(w.title())
                if len(words) >= max_words:
                    break
    return " ".join(words[:max_words]) or "Unnamed cluster"


def load_extracted_items(
    extracted_dir: Path,
    item_type: str,
    text_key: str,
) -> list[dict]:
    """Load principles or heuristics from out/extracted/*.json."""
    items: list[dict] = []
    for fp in sorted(extracted_dir.glob("*.json")):
        if not fp.suffix == ".json":
            continue
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        story_id = data.get("story_id") or fp.stem
        title = data.get("story_title", story_id)
        key = "principles" if item_type == "principle" else "decision_heuristics"
        for el in data.get(key, []):
            text = (el.get(text_key) or "").strip()
            if not text:
                continue
            items.append({
                "text": text,
                text_key: text,
                "evidence": (el.get("evidence") or "").strip(),
                "story_id": story_id,
                "story": title,
                "file": fp.name,
            })
    return items


LABELS_EDITABLE_FILENAME = "labels_editable.json"


def merge_labels_editable(
    clusters_dir: Path,
    prefix: str,
    cluster_summaries: list[dict],
) -> None:
    """Write or merge labels_editable.json (single file with principles + heuristics sections)."""
    labels_path = clusters_dir / LABELS_EDITABLE_FILENAME
    existing: dict[str, dict] = {}
    if labels_path.exists():
        try:
            raw = json.loads(labels_path.read_text(encoding="utf-8"))
            if isinstance(raw, dict) and prefix in raw:
                existing = {str(k): v for k, v in raw[prefix].items()}
        except Exception:
            pass
    out = {}
    for c in cluster_summaries:
        cid = str(c.get("cluster_id", c.get("cluster", "")))
        out[cid] = {
            "cluster_id": cid,
            "auto_label": c.get("suggested_label", c.get("label", "")),
            "human_label": existing.get(cid, {}).get("human_label", ""),
            "ai_suggested_label": existing.get(cid, {}).get("ai_suggested_label", ""),
        }
    # Read full file, update section, write back
    full: dict[str, Any] = {}
    if labels_path.exists():
        try:
            full = json.loads(labels_path.read_text(encoding="utf-8"))
        except Exception:
            pass
    if not isinstance(full, dict):
        full = {}
    full[prefix] = out
    labels_path.write_text(json.dumps(full, indent=2), encoding="utf-8")
