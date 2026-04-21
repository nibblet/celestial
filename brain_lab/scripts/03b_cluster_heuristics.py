#!/usr/bin/env python3
"""Cluster HEURISTICS only from out/extracted/*.json. Fingerprint dedup, frequency, human labels.
Outputs: out/clusters/heuristics_*.json|.md, out/doctrine/draft_heuristics_doctrine.md."""

import json
import sys
from pathlib import Path

from rich import print
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import silhouette_score

BASE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib.normalize import normalize_text
from lib.cluster_common import (
    fingerprint_dedup,
    near_duplicate_merge,
    suggest_label,
    load_extracted_items,
    merge_labels_editable,
)

IN_DIR = BASE / "out" / "extracted"
OUT_CLUSTERS = BASE / "out" / "clusters"
OUT_DOCTRINE = BASE / "out" / "doctrine"
N_REP = 5
TOP_N_CLUSTERS_REQUIRE_LABEL = 15
# Heuristics are more varied: use higher K for more, smaller clusters (less "grab bag")
K_MIN, K_MAX = 15, 45


def main() -> None:
    IN_DIR.mkdir(parents=True, exist_ok=True)
    OUT_CLUSTERS.mkdir(parents=True, exist_ok=True)
    OUT_DOCTRINE.mkdir(parents=True, exist_ok=True)

    raw_items: list[dict] = []
    ai_merged_path = OUT_CLUSTERS / "ai_merged_heuristics.json"
    if ai_merged_path.exists():
        try:
            canonical = json.loads(ai_merged_path.read_text(encoding="utf-8"))
            if not canonical:
                canonical = []
            print("[dim]Using ai_merged_heuristics.json (skipping fingerprint_dedup + near_duplicate_merge)[/dim]")
        except Exception as e:
            print(f"[yellow]Failed to load {ai_merged_path}: {e}; falling back to extracted[/yellow]")
            canonical = None
    else:
        canonical = None
    if canonical is None:
        raw_items = load_extracted_items(IN_DIR, "heuristic", "heuristic")
        if not raw_items:
            print("[yellow]No heuristics found in out/extracted/*.json[/yellow]")
            return
        canonical = fingerprint_dedup(raw_items, "heuristic")
        if not canonical:
            print("[yellow]No canonical heuristics after dedup.[/yellow]")
            return
        canonical = near_duplicate_merge(canonical, text_key="display_text", normalize_fn=normalize_text)

    texts = [c["display_text"] for c in canonical]
    normed = [normalize_text(t) for t in texts]
    vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), min_df=1)
    X = vectorizer.fit_transform(normed)
    terms = vectorizer.get_feature_names_out()
    n = len(canonical)
    k_range = range(max(2, K_MIN), min(K_MAX + 1, n + 1))
    best_k = max(2, min(25, n // 4))
    best_sil = -1.0
    for k in k_range:
        if k >= n:
            break
        km = KMeans(n_clusters=k, random_state=42, n_init="auto")
        labels = km.fit_predict(X)
        sil = silhouette_score(X, labels)
        if sil > best_sil:
            best_sil = sil
            best_k = k
    k = best_k
    km = KMeans(n_clusters=k, random_state=42, n_init="auto")
    labels = km.fit_predict(X)
    order_centroids = km.cluster_centers_.argsort()[:, ::-1]
    from sklearn.metrics.pairwise import euclidean_distances
    cluster_reps = []
    for c in range(k):
        mask = labels == c
        idx = [i for i in range(len(canonical)) if mask[i]]
        if not idx:
            cluster_reps.append([])
            continue
        sub = X[idx]
        centroid = km.cluster_centers_[c].reshape(1, -1)
        dists = euclidean_distances(centroid, sub)[0]
        order = dists.argsort()
        cluster_reps.append([idx[order[i]] for i in range(min(N_REP, len(order)))])

    summaries = []
    for c in range(k):
        top_terms = [terms[i] for i in order_centroids[c, :8]]
        suggested_label = suggest_label(top_terms)
        mask = labels == c
        cluster_items = [canonical[i] for i in range(len(canonical)) if mask[i]]
        summaries.append({
            "cluster_id": c,
            "top_terms": top_terms,
            "suggested_label": suggested_label,
            "count": len(cluster_items),
            "canonical_items": [
                {
                    "display_text": it["display_text"],
                    "frequency": it["frequency"],
                    "story_ids": it["story_ids"],
                    "total_mentions": it.get("total_mentions", 0),
                    "evidence": it.get("evidence", ""),
                    "variants": it.get("variants", []),
                }
                for it in cluster_items
            ],
            "all_story_ids": sorted({sid for it in cluster_items for sid in it["story_ids"]}),
        })

    merge_labels_editable(OUT_CLUSTERS, "heuristics", summaries)
    labels_editable_path = OUT_CLUSTERS / "labels_editable.json"
    labels_editable = {}
    if labels_editable_path.exists():
        try:
            raw = json.loads(labels_editable_path.read_text(encoding="utf-8"))
            labels_editable = raw.get("heuristics", {}) or {}
        except Exception:
            pass

    def cluster_label(cluster_id: int, mark_needs_rename: bool = True) -> str:
        cid = str(cluster_id)
        if cid in labels_editable and labels_editable[cid].get("human_label"):
            return labels_editable[cid]["human_label"]
        if cid in labels_editable and labels_editable[cid].get("ai_suggested_label"):
            return labels_editable[cid]["ai_suggested_label"]
        auto = next((s["suggested_label"] for s in summaries if s["cluster_id"] == cluster_id), f"Cluster {cluster_id}")
        return f"{auto} (needs rename)" if mark_needs_rename else auto

    top_summaries = sorted(summaries, key=lambda x: -x["count"])[:TOP_N_CLUSTERS_REQUIRE_LABEL]
    missing_labels = [s["cluster_id"] for s in top_summaries if not labels_editable.get(str(s["cluster_id"]), {}).get("human_label")]
    doctrine_note = ""
    if missing_labels:
        doctrine_note = "\n**Review required:** Set `human_label` in `out/clusters/labels_editable.json` for cluster IDs: " + ", ".join(str(x) for x in missing_labels[:10]) + (" ..." if len(missing_labels) > 10 else "") + "\n\n"

    (OUT_CLUSTERS / "heuristics_clusters.json").write_text(
        json.dumps(summaries, indent=2), encoding="utf-8"
    )
    lines = ["# Heuristic Clusters\n"]
    for s in sorted(summaries, key=lambda x: -x["count"]):
        label = cluster_label(s["cluster_id"])
        lines.append(f"## {label}")
        lines.append(f"Cluster ID: {s['cluster_id']} | Top terms: {', '.join(s['top_terms'][:5])}")
        lines.append("")
        for it in s["canonical_items"]:
            lines.append(f"- {it['display_text']}  _(frequency: {it['frequency']}, stories: {', '.join(it['story_ids'])})_")
        lines.append("")
    (OUT_CLUSTERS / "heuristics_cluster_summary.md").write_text("\n".join(lines), encoding="utf-8")

    draft_lines = ["# Draft Heuristics Doctrine\n", doctrine_note, "When X, do Y style. Sorted by frequency; grouped by cluster. Headers marked (needs rename) until human_label is set.\n"]
    for s in sorted(summaries, key=lambda x: -x["count"]):
        label = cluster_label(s["cluster_id"])
        draft_lines.append(f"## {label}\n")
        items_sorted = sorted(
            s["canonical_items"],
            key=lambda x: (-x["frequency"], -x.get("total_mentions", 0)),
        )
        for it in items_sorted:
            draft_lines.append(f"- **{it['display_text']}**")
            draft_lines.append(f"  - Frequency: {it['frequency']} stories | {', '.join(it['story_ids'])}")
            if it.get("evidence"):
                draft_lines.append(f"  - Evidence: _{it['evidence'][:120]}{'...' if len(it.get('evidence', '')) > 120 else ''}_")
            draft_lines.append("")
        draft_lines.append("")
    (OUT_DOCTRINE / "draft_heuristics_doctrine.md").write_text("\n".join(draft_lines), encoding="utf-8")

    raw_count = len(raw_items) if raw_items else len(canonical)
    print(f"[bold green]Heuristics: {raw_count} raw -> {len(canonical)} canonical -> {k} clusters.[/bold green]")
    print(f"  Outputs: {OUT_CLUSTERS}/heuristics_clusters.json, heuristics_cluster_summary.md")
    print(f"  Doctrine: {OUT_DOCTRINE}/draft_heuristics_doctrine.md")


if __name__ == "__main__":
    main()
