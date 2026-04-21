# Brain Lab — run from project root (or any cwd; scripts resolve BASE)
PY = python3
SCRIPTS = scripts

.PHONY: inspect split validate index quotes cluster doctrine update-stories-md ai-merge ai-labels upload-to-gpt story-index career-timeline smoke smoke-ingest entities compile-wiki ingest-celestial

inspect:
	$(PY) $(SCRIPTS)/00_inspect_pdf.py

split:
	$(PY) $(SCRIPTS)/01_split_by_toc.py

validate:
	$(PY) $(SCRIPTS)/02_extract_units.py

index:
	$(PY) $(SCRIPTS)/04_build_library_index.py

story-index:
	$(PY) $(SCRIPTS)/build_story_index.py

career-timeline:
	$(PY) $(SCRIPTS)/build_career_timeline.py

quotes:
	$(PY) $(SCRIPTS)/05_build_quotes_index.py

cluster:
	$(PY) $(SCRIPTS)/03_cluster_principles.py
	$(PY) $(SCRIPTS)/03b_cluster_heuristics.py

# Optional AI stages: set OPENAI_API_KEY in .env.local. Order: ai-merge → cluster → ai-labels
ai-merge:
	$(PY) $(SCRIPTS)/07_ai_merge.py

ai-labels:
	$(PY) $(SCRIPTS)/08_ai_label_clusters.py

doctrine: cluster

smoke:
	$(PY) $(SCRIPTS)/99_smoke_pipeline.py

smoke-ingest:
	$(PY) $(SCRIPTS)/99_smoke_ingest.py

entities:
	$(PY) $(SCRIPTS)/04_extract_entities.py

compile-wiki:
	$(PY) $(SCRIPTS)/05_compile_wiki.py

ingest-celestial: entities compile-wiki

update-stories-md:
	$(PY) $(SCRIPTS)/06_update_stories_md.py

# GPT Knowledge bundle: STORIES_ALL.md + 00_LIBRARY_INDEX.md + doctrine (run after index/cluster)
upload-to-gpt:
	$(PY) $(SCRIPTS)/build_upload_to_gpt.py
