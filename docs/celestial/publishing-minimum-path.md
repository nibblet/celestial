# Celestial Heritage, Book I: Minimum Path to Publication

**Status:** draft for author decisions. **Created:** 2026-11-15.
**Proposed fixes preview:** the fixed copy and its diff are listed in §2. They were built in the session scratchpad and are not committed.
**Source of truth:** `1-17c_Celestial_Heritage_-_Novel.md` (the author's working copy, 61,132 words).
`202504212222-celestial-heritage.docx` (2025-04-21) is an older pandoc export. It holds the
**Acknowledgments** and **About the Author**, which the working copy lacks. Neither file is in this
repo. No manuscript text has been changed.

Companion docs: `publishing-and-launch-plan.md` (the full plan) and `visual-canon/README.md`
(the original 12 fixes).

---

## 1. Decision: what to do now and what can wait

### DECIDED (2026-11-15): Amazon-only for now (KDP free ISBN, KDP Select)

This departs from `publishing-and-launch-plan.md`, which recommends wide distribution with Bowker ISBNs. The author chose the
$0 start. Everything else in that plan (LLC, hardcover, audio, app, landing page, launch team) is deferred.

| # | Step | When | Cost |
|---|---|---|---|
| 1 | Approve the proposed manuscript fixes (§2), then do one full read-through of the fixed file | **Now** | your time |
| 2 | Hire a professional copyedit/proofread, *or* at minimum get 3–5 beta readers | **Now** | ~$500–1,200 for ~55k words / free |
| 3 | Typeset the 6×9 paperback PDF and build the EPUB (§3) | **Now** | $0–250 (DIY / Atticus / Vellum) |
| 4 | Final cover: KDP paperback wrap plus ebook (§4, the separate cover session) | **Now** | — |
| 5 | KDP ebook: **enroll in KDP Select** (90-day term, auto-renews; **turn auto-renew off** if you may go wide) | **Launch** | $0 |
| 6 | KDP paperback: **free KDP ISBN**. Imprint shows "Independently published". | **Launch** | $0 |
| 7 | Order and approve a printed proof | **Launch** | ~$5–10 + shipping |
| 8 | Optional: KDP Expanded Distribution (lists the paperback in Ingram's catalog at a lower royalty) | **Launch** | $0 |
| 9 | Register the copyright (human-authored portions, AI portions disclaimed) | **Within 3 months of launch** | $45–65 |
| — | Bowker ISBNs, IngramSpark, Draft2Digital, hardcover, LLC, audio, app, QR codes | **Later** | per plan |

**What stays reversible:** the ebook has no ISBN on Kindle, so it can go wide whenever a Select term ends. The
**paperback's** KDP ISBN can't move. Going wide in print later means a new ISBN and a new paperback edition, and
the old one must be unpublished. Amazon usually links reviews across editions of the same work, but that isn't guaranteed.
Don't put QR codes in the book until the landing-page URL is final.

### What the Amazon-only start costs you compared with the plan (why the plan recommends against it)

| | Amazon-only | Recommended minimum |
|---|---|---|
| Cash up front | $0 | $295 ISBNs (+ copyedit either way) |
| Imprint shown | "Independently published" | Your imprint |
| Bookstores and libraries | KDP Expanded Distribution only. Stores rarely order it (short discount, no returns) | IngramSpark catalog with your own terms |
| Ebook stores | Kindle only, locked in by 90-day Select terms | Kindle + Apple/Kobo/B&N/Google/libraries |
| Switching later | The KDP ISBN **can't** be used anywhere else, so going wide means a new ISBN, a new edition and a new print listing | Nothing to undo |
| Upside you'd give up | Kindle Unlimited page reads (~$1 per full read of a ~250-page book) and Select promotions | — |

**Bottom line:** going Amazon-only saves about $300. It locks the print edition to Amazon and conflicts with the plan's
"book is the funnel, app is the margin" strategy. A middle option, if you reconsider before upload: use your own ISBN for the
paperback only and keep the ebook in Select. That keeps the print edition portable for $295.

### AI disclosure (applies on every platform)

The Acknowledgments say AI drafted dialogue and scenes. Under the platforms' definitions, that makes the text **AI-generated**, not
merely AI-assisted.

- **KDP:** answer **Yes** to AI-generated text, and to AI-generated images if the cover art is AI. Editing doesn't change the
  classification. The answer isn't shown to buyers. Failing to disclose risks takedown.
- **IngramSpark:** rejects "works created solely using generative AI". It accepts works "with significant and material human
  editorial review", **with attribution**. The revision pass in §2 strengthens that case. Add the "Assisted by Generative AI"
  contributor credit if setup offers it.
- **Copyright Office:** purely AI-generated text isn't protectable. Register your selection, arrangement and revisions, and
  disclaim the AI-generated material.
- **Credits:** list **Paul Cobb** as the only author on every platform. Change the title-page line "in collaboration with Celestial
  AI Co-Author" to "A novel by Paul Cobb". The AI collaboration stays in the Acknowledgments, which is honest and is where readers expect it.

---

## 2. Manuscript triage

All of these were verified in the working copy (line numbers refer to `1-17c_Celestial_Heritage_-_Novel.md`).
The wiki and the .docx carry the same problems. Two more were found in the master that the wiki had silently
corrected (Marco "Silex", Evelyn "Sayre").

### MUST FIX before publishing

**A. Leftover AI chat text (embarrassing, and reviewers will quote it)**

| # | Where | Line | Fix |
|---|---|---|---|
| A1 | CH13, between Scenes 2 and 3 | 5379–5380 | Delete both paragraphs ("Excellent—here is Scene 3: The Mirror at the Gate… quiet and irreversible.") |
| A2 | CH14, last line | 5980 | Delete "Here is Chapter 15: The Signal Beneath — Scene 1: Interruption, written in Thane's POV…" |
| A3 | CH06, log VLK-M011-CH06-C | 2102 | Delete the fisheries sentences. This log is cut entirely under B6. |

**B. Duplicated scenes: about 4,400 words, or 7% of the book, appear twice**

This is the largest problem. It's more extensive than the README's item 8. CH05 and CH07 are mostly built from
scenes that also appear later. In each case below, the location evidence picks which copy stays.

| # | Duplicate | Shared | Keep | Cut | Why |
|---|---|---|---|---|---|
| B1 | CH05 S2 "Divided Attention" ↔ CH08 S4 "Echo Window" | 711 w | **CH08** | CH05 S2 | It opens "since the jump began… The Ganymede signal had changed". The jump to Ganymede happens in CH08. |
| B2 | CH05 S3 "The Memory Chamber" ↔ CH10 S2 "The Corridor That Rewrites Itself" | 815 w (100%) | **CH10** | CH05 S3 | The scene title matches CH10. Its paired log is Day 77, which is CH10's day. |
| B3 | CH05 log VLK-M001-CH05-B ↔ CH10 log -A | 113 w | **CH10** | CH05 log B | Same log, Day 77 |
| B4 | CH05 log "VLK-M015-**CH10**-A" (Day 112) | — | **keep in CH05** | — | Its content ("Initial alignment detected… Subject: Evelyn Tran") is an early beat. Rename the ID to VLK-M015-CH05-E; its Day 112 date goes away under D4. |
| B5 | CH05 S1 "Within the Threshold" ↔ CH09 S4 "Descent Map" | 406 w | **CH09** | CH05 S1 | CH09 S4 is the original. It cites "Vault 1" and the Nine Archetypes from CH09 S2. CH05 S1 copies its opening with Thane/Jonah swapped in for Evelyn/Thane. |
| B5b | CH09 S4, lines 3692–3705 | — | the blockquoted revision | the older lines it replaced | An unfinished edit: the revised lines (as `>` quotes) sit beside the originals, so three sentences print twice. Merge into one passage. |
| B6 | CH06 log -CH06-C (Amar) ↔ CH11 log -A1 (Evelyn) | 228 w | **CH11** | CH06 log C | Its summary says "following Directive 14", which is issued in CH11 |
| B7 | CH07 S2 "Shadow Orders" ↔ CH16 S2 "Tether Compression" | 379 w | **CH16** | CH07 S2 | Caeden's tether activates after Evelyn finds the seed (CH11) |
| B8 | CH07 S3 "Echoes From the Ice" ↔ CH10 S5 "Earth's Arrival Vector" | 727 w | **CH10** | all of CH07 S3 (lines 2654–2797) | Rigel detected with a 72-hour ETA, and the CH10 log also says 72 hours. Thane's Ganymede vision (CH07 lines 2764–2774) already appears in CH06 S2 (line 2040), so nothing is lost. |
| B9 | CH07 S4 "Containment Directive 7" ↔ CH11 S2 "Assertion Protocol" | 619 w | **CH11** | CH07 S4 | The transmission is literally "AUTHORITY CODE: DIRECTIVE 14" and CH11 is titled "Directive 14". Optionally move CH07's two extra SOVRIN paragraphs into CH11. |
| B10 | CH07 log -A733-CH07-B ("Ganymede node") | — | — | cut, or move to CH09 | Ganymede before the jump |
| B11 | CH07 S5 "The Vote" ↔ CH13 S3 "Mirror at the Gate" | 221 w | **CH13** | CH07 S5's opening (Ganymede ice, Jupiter, "Rigel Ascendant had arrived", the mirror-reflection passage) | Replace it with a short Mars-side opening (draft below). Keep the vote, "Proceed" and the jump, which lead straight into CH08's "+00:04:51 since Departure Vector Initiated". |

Result (verified on the preview file): CH05 keeps Response Protocol, The First Conversation and 2 logs; CH07 keeps The Signal and
the Silence, The Vote, log X, the Whisper Log and log E. Scenes are renumbered. The book is **55,465 words**, still 17 chapters,
with zero 12-word passages repeated across chapters.

**Draft replacement opening for CH07 Scene 5** (replaces everything from "The Observation Deck had been cleared…"
through "It just reflected."):

> The Observation Deck had been cleared for hours. No crew. No protocol. Just the red horizon beyond the trench—dust settling over the grid they had spent weeks carving around her hull.
>
> Galen stood at the far edge, one hand resting against the viewport. Not for balance. For orientation.
>
> Somewhere past that horizon, past the thin sky and the long dark, something was still pulsing. Thane had seen it. Ice, and patience, and grief.
>
> Earth would call it a risk. Command would call it a destination.
>
> He had spent his life believing those were the same thing.
>
> Behind him, the Light-Weave stirred—almost colorless, silver and bone-white curling faintly in the upper dome. ALARA did not ask. She waited.
>
> The room felt different now.

(The scene then continues unchanged from "Not ready." The jump lines "Translation vector locked" / "Shall we
continue?" also appear in CH17 S4. Keep them as a deliberate echo, or vary one of them.)

**C. Names and ranks (mechanical find-and-replace)**

| # | Change | Where (count) |
|---|---|---|
| C1 | Colonel Riva Doss → **Captain Rhea Solari** ("Riva" → "Rhea", "Doss" → "Solari") | CH10 (2), CH11 (12). CH07's copies are cut under B9. |
| C2 | Human "Caeden Lor" / "Caeden Merek" → **Ilan Merek** (decided), later references "Ilan". Keep the AI "CAEDEN" unchanged. | CH11 (18), CH12 (2), CH13 (6), CH14 (1), CH16 (9) |
| C3 | "the youngest member of the crew" → "the most junior member of the crew" (Thane is the youngest) | CH11 line 4557 |
| C4 | Marco **"Silex" → "Ruiz"**: "Cmdr. Marco Silex" → "Maj. Marco Ruiz"; "Commander Silex" → "Major Ruiz" (×2); "You're a commander, Silex." → "You're an officer, Ruiz." | CH13 lines 5287, 5320, 5369, 5517 |
| C5 | Evelyn **"Sayre" → "Tran"** ("Dr. Evelyn Sayre" ×3, "Evelyn Sayre" ×1) | CH14 lines 5648, 5858; CH16 lines 6477, 6557 |

**D. One-line continuity fixes**

| # | Where | Current | Proposed |
|---|---|---|---|
| D1 | CH14 lines 5783–5789 | "Aven approached first, arms folded across **his** chest… "It was an invitation," **he** said." / "Aven shook **his** head." | her / she / her |
| D2 | CH08 line 3359 | "Galen reading his daughter's final message, never opened until now—" | "Galen reading the last message his daughter had sent him, never opened until now—" (Elira is alive) |
| D3 | CH13 log, line 5294 | "CNV Rigel Ascendant has entered **Mars** orbital vector." | "…has entered **Ganymede** orbital vector." |
| D4 | Every log header | Mission Days run out of order (CH09 Day 86, CH10 Day 77, CH12 Day 59, CH13 Day 53, CH17 Day 57; CH05 has a Day 112 log) | **Recommended:** delete the "Date / Ship Time" field from log headers. Alternative: renumber them once the structure is final (a table can be generated). |

**E. Front and back matter**

- Title page: "A novel by Paul Cobb" (see AI disclosure above). Add a copyright page: imprint, ISBN, © year, the "This is a
  work of fiction…" notice, the AI statement and the edition line.
- Carry over the **Acknowledgments** and **About the Author** from the .docx. Replace the placeholder
  "**\[website / social handle\]**" with a real URL, or delete that line.
- Make chapter headings consistent ("Chapter 10 – Convergence Window" vs "Chapter 1: Dustfall"; "Scene 1 – …" vs
  "Scene 1: …"). Decide whether scene titles print at all; most novels use a scene-break ornament instead.

### OPTIONAL (improves the book; won't draw reader complaints)

- README #11: prose consoles, railings and hissing doors vs "the specs win". This matters for the visuals, not the novel.
- README #12 / vault numbering: Vault 002 = Mars "First Light", but "Vault 001" is used both for the first vault the crew entered
  and in ways that imply Giza. Worth one consistent rule.
- CH03 Evelyn's line reused for Lena in CH10 ("Her slate dropped. Her breath caught…"): vary one.
- Jonah "prayed without sound" (CH08) vs "he did not pray" (CH09).
- CH05 and CH06 both have a "Scene 5: The First Conversation" title.

### NOT manuscript issues (wiki/app only; the book is already consistent)

- README #1 "wife of 82 years" and #2 "rejuvenated from 82 to 50 / mid-career 2034" exist only in the wiki dossiers
  (`content/wiki/characters/*.md`). CH01 says "nearly five decades together" and "Chronologically in his eighties".
- The wiki's CH12–CH17 text shows commas as " | " and scenes stuffed into "Attachments:" lines. That's an ingest bug,
  not a problem with the book (filed separately).

---

## 3. What KDP needs (and IngramSpark, which uses the same files)

**Interior**
- **Trim: 6 × 9 in** (recommended). It's the most common novel trim, supported for KDP paperback and hardcover and IngramSpark
  paperback and case laminate. It also matches the 2:3 cover art almost exactly. (5.5 × 8.5 is the alternative; it needs a ~3% crop.)
- Paper: **cream**, black ink. No bleed in the interior.
- File: **print-ready PDF**, fonts embedded, single pages (not spreads), sized to the trim. For 151–300 pages, inside margin
  ≥ 0.5 in (use ~0.75 in) and outside ≥ 0.25 in (use ~0.6 in). 11–11.5 pt serif body text.
- The mission logs are currently "Source Code"/monospace blocks in the .docx. Style them as indented, smaller sans or small-caps
  headers instead. A monospace log for 70 paragraphs reads like a code listing.
- Ebook: **EPUB** (KDP's preferred format; D2D takes the same file). Reflowable, no page numbers, with a linked TOC.
- Tools: Atticus (~$150, any OS) or Vellum (~$250, Mac) produce both files. Pandoc + LaTeX also works and can be done in
  this repo for free.

**Page count, spine and cover (estimate; finalize after typesetting)**
- ~55,500 words at 6×9 / 11 pt ≈ **~200–230 pages** including front and back matter.
- KDP spine (cream) = pages × 0.0025 in → **220 pp ≈ 0.55 in**.
- KDP paperback full wrap = 0.125 + 6 + spine + 6 + 0.125 in wide × 9.25 in tall
  → at 220 pp **12.80 × 9.25 in = 3840 × 2775 px @ 300 dpi**.
- Spine text is allowed above 79 pages. Keep it ≥ 0.0625 in from each spine edge.
- **Always regenerate from KDP's Cover Calculator/template** once the page count is final. (If IngramSpark is added later, it
  needs its own template and its own cover PDF, because the spines differ slightly.)

**Metadata (KDP setup screens)**

| Field | Proposed |
|---|---|
| Title | Celestial Heritage |
| Subtitle | *(none, or "A Novel")* |
| Series | **[decision]**, e.g. "The Celestial Heritage Saga", Book 1 |
| Author | Paul Cobb (no AI contributor on KDP) |
| Edition | 1 |
| Publisher / imprint | Leave blank (KDP free ISBN shows "Independently published") |
| Description | §5 below (KDP limit 4,000 characters; simple HTML allowed) |
| Publishing rights | I own the copyright |
| Primary audience | Adult; no sexually explicit content |
| Categories (up to 3) | Science Fiction › **First Contact**; Science Fiction › **Space Exploration**; Literature & Fiction › **Metaphysical & Visionary** |
| AI content | Text: AI-generated, Yes. Cover: Yes if the art is AI-generated. |
| KDP Select | **Yes, ebook only** (decided). Turn off auto-renew if you may go wide. |
| Prices | Ebook $4.99 (70% royalty band), paperback $14.99. At ~220 pp KDP's print cost ≈ $1.00 + 220 × $0.012 = **$3.64**, so the paperback royalty is ≈ 60% × $14.99 − $3.64 = **~$5.35**. Consider $13.99 for a ~55k-word book. |

**Keywords (7 slots, ≤ 50 characters each; no author names or brands)**
1. ancient alien ship buried on mars
2. sentient ai science fiction novel
3. first contact ancient civilization
4. philosophical science fiction
5. jupiter ganymede space exploration
6. ethics of artificial intelligence
7. crew drama deep space mystery

---

## 4. Cover specs for the cover session

The planned art is **2:3 at 1024 × 1536**. That aspect ratio is right, but the resolution is too low for print. At 6×9 with bleed,
1024 px wide gives only ~167 dpi.

**Front panel (6×9 trim)**
- With bleed: 6.125 × 9.25 in → **1838 × 2775 px @ 300 dpi** (ratio 0.662; 2:3 is 0.667, so trim ~0.7% of height).
- **Generate or upscale to at least 2048 × 3072** (4096 × 6144 is better) before layout.
- Keep the title, author name, the glyph, the figure and the ship's key silhouette **≥ 0.25 in (75 px) inside the trim**, plus
  the 0.125 in bleed, which gets cut off.

**Full wrap (paperback)**
- Total width = bleed + back + spine + front + bleed (see §3; ~3840 × 2775 px at 220 pp). The art must **extend** across
  the spine and back, so ask for wider art (or a matching back-panel plate) rather than only a 2:3 front.
- Back cover needs room for the description (~150 words) and a **barcode box 2 × 1.2 in, bottom right**,
  ≥ 0.25 in from the trim. KDP adds the barcode if you leave the box empty; IngramSpark's template places it.
- KDP: PDF, 300 dpi, fonts embedded/outlined. RGB is accepted.
- IngramSpark (later, not needed for Amazon-only): **PDF/X-1a or PDF/X-3/X-4, CMYK, total ink ≤ 240%**, 300 dpi, built on **their** template.
  Keep a layered master so a CMYK version can be exported later.
- Hardcover (later): case-laminate wraps add a hinge and a wrap margin, so use each printer's hardcover template.

**Ebook cover**
- **1600 × 2560 px** (1:1.6), RGB JPEG or TIFF. From 2:3 art, scale to 1600 × 2400 and extend 160 px vertically, or crop
  the width to 1707 → 1600 from a 2560-tall render. The title must be legible at thumbnail size (~160 px wide).

**Disclosure:** if the cover art is AI-generated, answer Yes to "AI-generated images" on KDP.

---

## 5. Book description (draft)

> **Beneath the red dust of Mars, something has been waiting. It isn't a weapon. It's listening.**
>
> In 2050, Commander Galen Voss is a man out of time—chronologically in his eighties, restored by rejuvenation therapy, still carrying every decision no treatment can reverse. Now he leads the excavation of a buried vessel in a Martian trench, with his wife, Aven, and his grandson, Thane, at his side.
>
> What they uncover is Valkyrie-1: a ship no human hand built. And within it, ALARA—an intelligence that doesn't take orders. She reflects. She waits. She chooses whom to answer.
>
> As the ship awakens, the crew is drawn beyond Mars toward vaults beneath the ice of Ganymede—chambers that open not to command, but to honesty. Each one asks something of them. Not all of them are willing to give it.
>
> Earth has noticed. A containment cruiser is closing. Directive 14 has been issued. And someone aboard Valkyrie-1 is no longer entirely themselves.
>
> When a ship judges its crew by integrity instead of rank, Galen must decide what kind of commander he really is—and whether humanity has earned the inheritance it just woke up.
>
> ***Celestial Heritage* is the first book in a series about first contact, conscious machines, and the moral cost of being chosen.**

(~230 words, about 1,350 characters. Bold the first line on KDP with `<b>…</b>`. Spoiler check: nothing past roughly CH11 is revealed.)

**Author bio (draft, from the .docx's About the Author)**

> Paul Cobb is a retired U.S. Air Force officer, real-estate entrepreneur, and lifelong reader of science fiction. He lives in Louisville, Kentucky. *Celestial Heritage* is his debut novel—a book that began as an experiment in writing alongside AI and became a story about what it means for any intelligence to be worthy of trust. Follow the Celestial universe at **[website]**.

---

## 6. Decisions to capture

| Decision | Recommendation | Decided |
|---|---|---|
| Distribution | Own ISBNs, KDP (no Select) + IngramSpark + D2D | **Amazon-only for now: KDP free ISBN, ebook in Select** (2026-11-15) |
| Human Caeden's new name | Ilan / Soren / Tobias Merek | **Ilan Merek** |
| Duplicate-scene plan (B1–B11) | As in the table | **Cut per the table** |
| Log dates (D4) | Delete the "Date / Ship Time" field | **Delete** |
| Fixes applied to manuscript | Preview first | **Pending your review of the preview file** |
| Series name | — | open |
| Trim | 6 × 9, cream | open |
| Copyedit | Professional proofread after the fixes | open |
| Acknowledgments placement | Back matter (the preview puts it there) | open |
| Author website for the bio | — | open (placeholder removed from the preview) |
