# Visual Canon — foundation for stills and video

**Status:** draft, waiting on author review
**Created:** 2026-11-14

This folder is the reference for anything we render: character portraits, ship shots, location plates, and the 5–10 second video clips built from them. The binding values live as JSON specs under `content/wiki/specs/<slug>/`. The synthesizer loads those automatically (`src/lib/visuals/specs/loader.ts`). This README explains what's in them and what still needs your decision.

## Files

**Reference images** (`public/visual-references/`): images to attach alongside the prompt in ChatGPT, Gemini, Grok or Runway. Each spec declares its own in a `reference_images` array (`path`, `role`, `label`, `instruction`). The arrays inherit through `parent_entity`, views and states: `valkyrie-crew` attaches the patch to every crew member, and each character adds their identity portrait. The admin console shows them under every generated prompt, with **Copy prompt** and **Download all references** buttons, and the prompt names each reference so the generator knows to match it. To add one, put the file in `public/visual-references/` and add an entry to the right spec.
- `project-valkyrie-patch.png` (SVG source alongside): the canonical mission patch, with three crescent arcs over a circle per CH01's "Three curves. A circle." Attach it to every shot that shows the uniform. `project-valkyrie-patch-v1-two-arcs.png` is the original ChatGPT crop, kept for its embroidery texture.
- `aven-voss-portrait.png`: Aven's approved identity portrait.
- `thane-meric-portrait.png`: Thane's approved identity portrait.
- `lena-osei-portrait.png`: Lena's approved identity portrait.
- `galen-voss-portrait.png`: Galen's approved identity portrait, which also shows the full uniform. `galen-voss-portrait-v1-chatgpt.png` is the superseded first version.

| File | What it is |
|---|---|
| `evidence-characters.md` | Every appearance, gesture and gear line for the human cast, quoted with chapter refs, plus contradictions and gaps |
| `evidence-ai-ships-artifacts.md` | ALARA, SOVRIN, CAEDEN, Valkyrie-1, Rigel Ascendant and the glyphs, plus an audit of the existing Valkyrie specs against the prose |
| `evidence-settings.md` | Mars, the vaults, Giza, Ganymede and the other places, plus the **Top 12 filmable moments** |
| `teaser-shot-list.md` | A first 30–45 s teaser, shot by shot, with the spec, view, state and preset for each |

## Decisions already made (2026-11-14)

1. **Character looks:** the book describes almost no one physically. The only fixed traits are Aven's red-blonde hair and Evelyn's glasses. Claude drafted looks, and **you approve them before any portrait is generated** (see the checklist below).
2. **CAEDEN is the AI.** The human crewman "Caeden Lor" (CH11) / "Caeden Merek" (CH13) needs a new name in the manuscript.
3. **The Rigel Ascendant's captain is Captain Rhea Solari.** "Colonel Riva Doss" in CH07, CH10 and CH11 should be renamed.
4. **Valkyrie-1 interiors: the specs win over the prose.** No consoles, screens, railings or window frames on screen. Prose lines that describe consoles and so on are listed under "Manuscript fixes" so you can revise them when convenient.
5. **All images will be regenerated** with the latest models. Old approved images are used only as references for adjusting the looks.
6. **Uniforms: two tiers, plus a role tab.** Project VALKYRIE is jointly funded by the U.S. and a corporation, and CH12 names three civilians aboard.
   - **Mission crew** (Galen, Aven, Marco, Jax, Lena) wear a flight-suit-cut coverall.
   - **Civilians** (Jonah, Evelyn, Thane) wear a field jacket in the same fabric over their own clothes.
   - **Shared details:** weathered dark olive-charcoal ripstop over a charcoal tee; the round **PROJECT VALKYRIE** patch on the wearer's left chest (`public/visual-references/project-valkyrie-patch.png`); a faded olive-gray name tape on the right chest; a plain colored role tab on the left shoulder strap; a small U.S. flag and blank sponsor tab on the right sleeve; no service-branch or rank insignia.
   - **Role tab colors:** command muted gold (Galen); medical sage green (Aven); security oxblood (Marco); systems burnt orange (Jax); science slate blue (Lena, Evelyn, Thane); civilian advisor bone white (Jonah).
   - **Where it lives:** the shared parts are in `valkyrie-crew/states/shipboard.json`; each character's tier and tab are in `shipboard_uniform` in their `master.json`. Amar Cael is corporate, not crew, and keeps his own suit.
7. **Galen's look is approved.** His identity reference is `public/visual-references/galen-voss-portrait.png`, generated in the app with OpenAI using the spec references. It shows the face, uniform, three-arc patch, and tab and flag placement exactly as specified. The look: blue-gray eyes, brown hair graying at the temples in a military cut, a sun-weathered face with deep forehead lines, a square jaw, and early-to-mid 50s apparent age. The older ChatGPT portrait (`galen-voss-portrait-v1-chatgpt.png`, two-arc patch) and the Supabase USAF reference are superseded.

## What was added or changed

### New specs (`content/wiki/specs/`)

| Slug | Kind | Layers | Canon status |
|---|---|---|---|
| `valkyrie-crew` | shared parent for the crew | master + states `mars_surface`, `shipboard`, `vault_expedition`, `prep_bay_kit` | draft, needs review (no wardrobe in the prose) |
| `galen-voss`, `aven-voss`, `thane-meric`, `lena-osei`, `jax-reyes`, `marco-ruiz`, `evelyn-tran`, `jonah-revas`, `amar-cael` | characters | master + views `three_quarter` (identity portrait, the default), `full_body`, `profile` | draft, needs review |
| `rhea-solari` | character (Rigel captain) | master | draft, needs review |
| `alara` | AI | master + states `listening`, `present`, `hesitation`, `reflection`, `mourning`, `translation` | grounded in the prose |
| `sovrin` | AI | master | grounded in the prose |
| `caeden` | AI | master | draft, needs review (thin canon) |
| `rigel-ascendant` | ship | master | **fully proposed**: the prose describes no exterior at all |
| `south-trench` | Mars dig site | master + features `command-shelter`, `corporate-shuttle` | grounded in the prose |
| `zone-theta` | shaft / vault threshold | master | grounded in the prose |
| `vault-002` | Mars vault interior | master + views `domed_chamber`, `spherical_chamber`, `pillar_chamber`, `harmonic_archive` | grounded in the prose |
| `ganymede`, `ganymede-vault`, `vault-003`, `giza-vault` | off-ship places | master | grounded in the prose |

Use them from the Visuals admin console: Target Kind `entity`, Target ID = the slug, then View and/or State. Wardrobe is a **state**: for example, `galen-voss` with view `three_quarter` and state `mars_surface`. The character inherits wardrobe from `valkyrie-crew` through `parent_entity`.

### Code changes

- **Spec loader:** top-level and nested keys that start with `_` (`_canon_status`, `_provenance`, `_name_note`, …) are review annotations. They stay in the JSON so you can see where each value came from, but they are **never sent to the image or video model**.
- **Style presets now match the prose.** The old color rules ("violet = grief", "cyan = active resonance", ALARA "suggesting wings") contradicted the book. Here is what the prose actually does:
  - gold = presence / acceptance
  - blue = passive or withdrawn
  - gold and blue alternating = listening
  - violet = **hesitation or withholding**
  - silver / bone-white = pure reflection
  - grief = **dimming**, not a color
  - CH10: "no wings, no form-just pattern"
- **Mars preset:** it used to forbid the dome and struts that CH01 describes. It now matches CH01–CH03.
- `SYNTH_PROMPT_VERSION` bumped to `v10` so cached prompts regenerate.

## Your review checklist: proposed looks

Each character's `master.json` has a `_provenance` block that separates canon fields from proposed ones. Edit the JSON directly, or tell Claude what to change. Proposed looks at a glance:

| Character | Apparent age | Proposed look (the canon parts are in **bold**) |
|---|---|---|
| Galen Voss ✅ approved | early-to-mid 50s (**chronologically early 80s, rejuvenated**) | from the reference portrait: tall, lean pilot build; sun-weathered ruddy skin; **drawn face, tight jaw**, square jaw and deep forehead lines; blue-gray eyes (**"clear but hollow"**); brown military cut graying at the temples; clean-shaven |
| Aven Voss ✅ approved | ~50 (**rejuvenated**) | from `public/visual-references/aven-voss-portrait.png`: medium, athletic build; fair, heavily freckled skin; green-hazel eyes; **red-blonde (copper) hair tied back** in a loose low knot with loose strands; **silver constellation medallion**, shown at the open collar; coverall with a sage-green medical tab |
| Thane Meric ✅ approved | **early 30s** | from `public/visual-references/thane-meric-portrait.png`: lean; wavy, tousled copper auburn-brown hair; Galen's gray-blue eyes; freckles from Aven; light stubble; open, curious expression; civilian field jacket over a charcoal henley, MERIC name tape, slate-blue science tab. Generated with both grandparents attached as resemblance references |
| Lena Osei ✅ approved | mid-40s | from `public/visual-references/lena-osei-portrait.png`: mixed Ghanaian–Ethiopian heritage; tall and slender; warm brown skin, no makeup, tired eyes; long narrow angular face; dark almond eyes; long black hair in one low braid; thin gold hoop; GIZA wristband; tired, assessing skepticism (not a glare); mission coverall with a slate-blue science tab |
| Jax Reyes | late 30s | wiry; light olive-tan skin; messy black hair, short sides; uneven stubble; burn marks and grime on his fingers |
| Marco Ruiz | ~60, not rejuvenated (**"too old to pretend"**) | thickset, broad; medium brown skin; heavy brow; gray buzz cut; old chin scar |
| Evelyn Tran | late 20s (**young**) | petite; black hair in a messy bun with a stylus through it; **glasses** (thin rectangular frames); **chin tilted, slate in "attack posture"** |
| Jonah Revas | ~45, actually mid-50s (**"calm older than his face"**) | light olive skin; short dark curly hair and a neat beard, both flecked with gray; loose linen-like overshirt; **cold tea mug** |
| Amar Cael | late 50s (**"refined… less glass tower, more iron core"**) | tall, spare; medium brown skin; black-to-silver hair combed back; trimmed beard; **corporate-issue suit** |
| Rhea Solari | late 50s (**"trim lines, eyes too sharp to soften"**) | pale; ice-gray eyes; silver-white hair in a tight low chignon; high-collared slate-gray uniform with the **Sovereign Ethics Bureau seal** |

Also review: the whole `rigel-ascendant` exterior (a hard-edged graphite modular cruiser, built as the visual opposite of Valkyrie).

**Order of work after approval:** generate each `three_quarter` portrait first and approve the best one. Its seed and the vision fingerprint become the identity anchor that every later still and video reuses. This is what keeps a face the same across clips.

## Still open (smaller decisions)

- **Hull vein color:** the Valkyrie-1 specs disagree with each other. `master.json` and `resonance_veins.json` say violet / amethyst, while `states/*.json` say cyan / teal. The prose gives the hull no glow color at all ("shimmered faintly… as if it remembered illumination"). Pick one.
- **Dormant / wake states** add colored vein blooms that CH01 doesn't show. Keep them for drama, or remove them for fidelity?
- **Witness Circle:** `specs/witness-circle` puts it aboard Valkyrie-1, but CH09 puts it inside the Ganymede vault. A `ganymede-vault` spec now covers the CH09 version.
- **Ganymede vault number:** the prose never numbers it. The wiki puts Vault 003 near Ganymede, while CH17 grows Vault 003 inside the ship.
- **ALARA's voice:** "female-coded" comes from the wiki only; the prose never states a timbre. Confirm it before doing audio.
- **Sixteen ship spaces that appear in the prose have no spec yet.** The most filmable are the forward observation cradle (CH08), the resonance buffer chamber (CH05/CH08), the prep bay (CH08) and the comms junction (CH07/CH11). See evidence §D3.

## Manuscript fixes (found while mining; none are applied)

These came up while extracting the visuals. They're listed so the book and the videos agree. Full quotes are in the evidence files.

1. Aven: "Galen's wife of 82 years" (dossier) vs "nearly five decades together" (CH01).
2. Galen: "rejuvenated from 82 to 50" vs "mid-career" on the 2034 Mars survey.
3. Rename Riva Doss → Rhea Solari (CH07, CH10, CH11). Rank: Colonel vs Captain.
4. Rename the human Caeden (CH07, CH11–CH16), who also has two surnames (Lor / Merek), and drop his "youngest member of the crew" line (Thane is the youngest).
5. Marco: "Major" (CH02, CH04) vs "Cmdr." / "Commander Ruiz" (CH13).
6. CH14 uses "he/his" for Aven, twice.
7. Elira: Galen reads "his daughter's final message" (CH08), but she is alive and messaging Aven (CH05).
8. Duplicated scenes with swapped characters: CH05 S1 ≈ CH09 S4 (Thane, Jonah and Evelyn swap actions); the CH03 Evelyn line reappears as Lena's in CH10; Amar's CH06 log = Evelyn's CH11 log word for word.
9. Stray text: an author note in CH13 ("Excellent-here is Scene 3…") and unrelated fisheries text at the top of the CH06 log.
10. The Rigel's location: "entered Mars orbital vector" (CH13 log) vs arriving at Jupiter / Ganymede (CH07, CH13 S3).
11. **Interior prose that conflicts with "specs win":** consoles, helm and displays (CH05, CH12, CH13, CH17), railings (CH08, CH17), sliding / hissing doors (CH06, CH08), "hardpan steel like the rest of the ship" (CH15), and "Bridge" as a log location (CH17). This is optional. You could also keep them as on-demand light-formed surfaces.
12. "Vault 001" is used both for Giza (wiki) and for a vault the crew physically entered (CH05, CH07, CH08, CH10).
