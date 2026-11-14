# Celestial — Exterior / Off-Ship Settings: Visual Canon Evidence

Sources read in full: `content/wiki/stories/CH01..CH17` (Full Text + inline mission logs), `content/wiki/locations/*.md` (exterior entries), `content/wiki/vaults/*.md`, `content/wiki/rules/{earth-2050,vault-network,prologue-timeline}.md`, `content/wiki/timeline/*.md`, `content/wiki/factions/*` (Earth bodies), `content/wiki/artifacts/rigel-ascendant.md`, `src/lib/visuals/style-presets.ts`.

Conventions: "Quote" = verbatim prose. `[log]` = quote from an in-chapter mission-log block (header fields or body), not narrative prose. `[wiki]` = wiki page, not chapter prose. "Wiki seed" = the hand-authored `Inventory entry` pages (south-trench, subsurface-vault, orbital-habitat-ix), which say "Hand-authored seed location for fiction schema validation" and "Canon status: adjacent". Their claims are often missing from the prose (flagged below).

Existing preset dialects (style-presets.ts): `valkyrie_shipboard`, `vault_threshold`, `mars_excavation`, `earth_institutional`, `giza_archaeological`, `noncorporeal_presence`, `intimate_crew`, `mythic_scale`. Shared substrate: "blue = observation, gold = clarity, violet = grief, cyan = active resonance"; glyphs "triple helix, harmonic circles, spirals"; "no right angles".

## Global caveats (read first)

- **Chronology is scrambled.** CH01–CH04 are on Mars (Mission Day 38–46). CH05 has the crew "since the jump began" with "The Ganymede signal". CH07 already shows Ganymede/Jupiter from the Observation Deck, CH08 opens "+00:04:51 since Departure Vector Initiated" with Ganymede "closer now", CH09–CH10 return to "Vault 002" counters, CH13's log says Rigel "has entered Mars orbital vector" while its scene shows Jupiter. Log dates run from Day 38 to Day 113 and don't follow chapter order.
- **Duplicated scenes.** CH05 S1 ≈ CH09 S4 (descent map; POV swapped Jonah↔Evelyn). CH05 S2 = CH08 S4 (resonance buffer). CH05 S3 = CH10 S2 (Aven corridor 3-R). CH07 S3 = CH10 S5 (Rigel detection). CH07 S4 = CH11 S2 (Riva's Directive 14 message). CH07 S5 = CH13 S3 opening (Observation Deck over Ganymede). CH07 S2 = CH16 S2 (Caeden tether). CH06 S2 Thane-kneels paragraph = CH07 S3 tail. When choosing video moments, cite the first occurrence.
- **"Vault 001" is used inconsistently.** Wiki: Vault 001 = Giza. Prose sometimes treats "Vault 001"/"Vault 1"/"Vault One" as a vault the crew physically visited (see Contradictions §C).
- **Prose artifacts:** CH13 contains a stray author note ("Excellent-here is Scene 3: The Mirror at the Gate from Chapter 13 | written in Galen's POV…"). CH06 log VLK-M011-CH06-C begins with unrelated text ("I found several articles about fisheries and ocean warming…"). CH14 calls Aven "he/his" once. Don't mine these for visuals.

---

## 1. MARS (planet-level)

**Wiki:** "Mars is the location where Valkyrie-1 was discovered buried beneath the surface." / "Planet where Vault 002 (Vault of First Light) is located beneath Valkyrie-1, and where Vault 008 (The Silent Twin) is located opposite the Valkyrie site." [wiki mars.md]
**Earth-2050 rule:** "Mars is permanently settled and nearly self-sufficient, with governance structures and supply chains growing increasingly independent from Earth." [wiki earth-2050]
**Prologue:** "2034 CE – Mars Survey Anomaly … A Mars expedition detected an underground geometric signature … Galen stood above the buried Valkyrie for the first time." [wiki prologue-timeline]

Planet-level prose (air, smell, sky):
- "The taste of oxygen-enriched atmosphere never quite masked the undertone of iron and static that defined Mars-a planet that smelled like old memories." (CH01 S3)
- "the dry Martian air tug gently at his hair under the filtered canopy" (CH01 S3)
- "the Martian morning glare" (CH02 S1); "the rising Martian temperature" (CH02 S1)
- "Outside the med bay window, dust swirled in the Martian twilight." (CH02 S4)
- "the long sleep of the ship beneath Martian dust" (CH09 S2, Jonah's vision)

**Gaps:** sky color never stated (no pink/butterscotch/blue-sunset canon); no named crater or region (only "the crater rim"); no settlements, cities or Martian colonists on screen despite the "permanently settled" rule; no Phobos/Deimos; no gravity description; no named temperature values.

---

### 1a. South Trench / Excavation Field (Mars surface)

Wiki seed: "Excavation corridor on Mars bordered by unstable red-dust shelves and scaffold pylons." / "Established as primary dig zone after anomalous scans identified buried geometry." / Inhabitants "Expedition command teams (CH01)", "Survey drones (CH01)". [wiki south-trench, seed, canon adjacent]

**Canon quotes, by category:**

*Geography / scale / terrain*
- "The Martian wind didn't howl-it whispered, dragging red dust in long, ribboned currents across the excavation field. Galen Voss stood at the edge of the south trench, boots buried ankle-deep in fine particulate." (CH01 S1)
- "His body moved easily across the uneven terrain" (CH01 S1)
- "He looked up as the morning sun breached low over the crater rim." (CH01 S1)
- "The excavation field stretched beyond sight-sand, mesh, labor, time. All aimed at a shape that refused to reveal itself." (CH01 S2, seen through port window)
- "Below, the trench sloped toward what they'd labeled Zone Theta" (CH01 S3)
- "Thane stood at the outer ring of the excavation grid" (CH02 S1)
- "He looked up, eyes narrowing across the empty trench." / "The dust near the western curve had shifted." (CH02 S1)
- "He looked back toward the ridge where the hull disappeared under dust." (CH02 S1)
- "His boots sank just slightly into the crust as he knelt, the fine regolith crunching beneath his weight." (CH02 S1)
- "the forward ridge" [log CH01-A]: "We traced another thermal vein beneath the forward ridge--unusual, too symmetrical."
- "They walked side by side down the ridge toward the excavation hub." (CH06 S2)
- "They stood at the edge of the trench, vault light pulsing beneath them." (CH06 S2)

*Dust / wind / atmosphere*
- "It clung to everything: mesh tarp, support struts, the knees of his suit. Even after weeks of excavation, it found new places to settle." (CH01 S1)
- "the morning haze" (CH01 S1)
- "as the dust settled in new patterns across the hull, he thought he saw something like writing-curves and lines that reminded him of constellations, or perhaps wings." (CH01 S1)
- "Above them, the air remained still" (CH01 S1)
- "The wind had dropped, but the dust still moved in low, lazy spirals-like breath beneath skin." (CH02 S1)
- "The surface was too smooth in one area. A shallow spiral, three rings tapering outward-like a fingerprint pressed into sand and gently erased." / "Not drawn. Not raked. Formed." (CH02 S1)
- "The dust had settled differently today-thinner, more fine-grained, like the terrain itself had relaxed." (CH03 S4)
- "Silence settled over the excavation field like dust after a storm." (CH06 S2)
- Marco watching trench cams: "watching the screen as the dust rolled gently over the exposed curve of the ship." [log CH02-C attachments line]

*Light / time of day*
- Morning: "Its skin shimmered faintly in the morning haze"; "the morning sun breached low over the crater rim. The Valkyrie's surface caught it in a way that looked intentional. Not reflection-response." (CH01 S1)
- "As the sun caught the hull's surface" (CH01 S1)
- "visor tinted against the Martian morning glare" (CH02 S1)
- Twilight: "dust swirled in the Martian twilight" (CH02 S4)
- Dusk/artificial: "We go back before nightfall." (CH03 S4); "The vault's exposed curvature gleamed softly under low-spectrum floodlights. They'd reduced the lights on purpose." (CH03 S4)
- Amar arrival: "Amar Cael stepped into the red light." (CH06 S2)
- From the ship's viewport: "The glow in Zone Theta had intensified." (CH04 S4); "where Zone Theta glimmered in the distance like a heartbeat waiting for rhythm." (CH06 S4)

*The buried hull (Valkyrie-1) as seen in the trench*
- "Below him, the buried form of Valkyrie-1 stretched outward in shadowed curvature. What they'd uncovered so far resembled no human spacecraft. Its skin shimmered faintly in the morning haze-not light, exactly, but the suggestion of it, as if it remembered illumination." (CH01 S1)
- "the silver curve of the hull seemed to exhale as the dust rolled back, revealing another segment of seamless, unbroken material." (CH01 S1)
- "'It's never made a sound,' she said. 'Not even during deep-core drills.'" (CH01 S1)
- "Just beneath the surface, the hull of Valkyrie-1 gleamed like glass held under water. Not buried, not even resting-but waiting, like a door someone forgot to open." (CH01 S3)
- "Dust clung to his gloves, patterned with faint shimmer where he'd touched the hull. It was already vanishing" (CH01 S3)
- "the exposed curve of the ship" [log CH02-C]

*Sound*
- Wind "whispered" (CH01 S1); "the way silence sounds when something's about to break it" (CH01 S1); "Every motion felt louder out here, away from the core team." (CH02 S1); regolith "crunching" (CH02 S1).

*Temperature*
- "the rising Martian temperature" (CH02 S1) — only temperature cue on the surface.

*Human activity / equipment / vehicles*
- "survey drones blinked through their loops, mechanical arms extracted sediment in deliberate arcs." (CH01 S1)
- "mesh tarp, support struts" (CH01 S1)
- "Galen's visor pinged once. Vital norms." (CH01 S1)
- Aven "approached with her helmet off, red-blonde hair tied back, eyes narrowed against the wind." (CH01 S1) — helmet-off outdoors (see Contradictions).
- "Aven handed him a slate. New heat maps." (CH01 S1)
- "Ruiz's security net was offline in this quadrant, and Lena was still arguing with the deep-drill team over artifact layering protocols." (CH01 S3)
- "deep-core drills" (CH01 S1)
- Scan wand: "The scan wand vibrated slightly in his palm, its surface cool … feeding thermal, magnetic, and ambient resonance data to his slate." (CH02 S1)
- "standard feed from trench cams, Zone Theta on loop" (CH02 S3)
- "heat vacs and pulse brushes" (CH03 S1)
- "the central trench platform" (CH03 S4); "Lena stood at the platform's edge, arms folded across her chest, visor retracted" (CH06 S2)
- Shuttle: "The shuttle touched down with precision. Not military, but precise in that cold, corporate way. Efficient. Sterile. / The ramp hissed open. And from the shadowed cabin, Amar Cael stepped into the red light." (CH06 S2)
- "the excavation hub" (CH06 S2); "He scanned the area, eyes flicking across equipment, personnel, the vault itself." (CH06 S2)
- Amar: "His suit was still corporate-issue" (CH06 S2)
- Dock: "Arrival Report: Amar - No Escort (Dock Protocol Record)" [log CH06-B attachments]; "Valkyrie-1 | Docking Interface - Secure Uplink Node" [log CH06-C location]

*What characters physically do*
- Galen stands at trench edge, Aven beside him, reads slate heat maps (CH01 S1).
- Thane descends 3 m into the shaft and holds a gloved hand near the hull; "His hand traced a pattern in the dust … Three curves. A circle. Something like wings." (CH01 S3)
- Thane kneels at the outer grid with a scan wand, finds the dust spiral (CH02 S1).
- Galen, Thane, Aven, Lena, Evelyn, Marco, Jax gather at the trench platform at dusk under dimmed floodlights. "Thane stood just ahead … hands ungloved, resting at his sides." (CH03 S4)
- Lena meets Amar at the landing site and they walk the ridge (CH06 S2).

**Appearances / beats:**
- CH01 S1 — Galen and Aven at the trench edge at dawn; dust writing on the hull; "it's listening."
- CH01 S3 — Thane alone in the shaft, hand near the hull, traces the triple-curve in the dust.
- CH02 S1 — Thane finds the spiral "formed" in the dust; 0.041 Hz pulse auto-flag.
- CH02 S3 — (trench-cam footage replayed by Marco) shimmer when Thane touches the hull.
- CH03 S4 — dusk return to Zone Theta; vault wall glows and folds open; ALARA's first imprint.
- CH04 S4 / CH06 S4 — Zone Theta glow seen from ship viewports.
- CH06 S2 — Amar Cael's corporate shuttle lands; walk to the trench edge; "Europa base cut contact."

**World classification:** `earth_2050` (industrial human dig site: drones, mechanical arms, tarps, struts, drills, floodlights, slates, corporate shuttle) framing an `alien_organic` object (the seamless shimmering Valkyrie hull). Glyph traces in the dust lean `ancient_vault`. Existing preset: `mars_excavation`. Note that the preset's negative "human scaffolding or industrial supports prominent" conflicts with canon "support struts", "mesh tarp" and "mechanical arms" (keep them present but not dominant), and the wiki seed adds "scaffold pylons".

**Contradictions:**
- Helmet-off on the surface vs suits: "She approached with her helmet off" (CH01 S1); "Thane crouched near the edge of the shaft, helmet off, letting the dry Martian air tug gently at his hair under the filtered canopy" (CH01 S3) vs. "the knees of his suit", "Galen's visor pinged" (CH01 S1), "breath fogging her visor" (CH03 S2). The "filtered canopy" explains the shaft but not Aven in the open field.
- Wind: "The Martian wind didn't howl-it whispered" (CH01 S1) vs. "wind howled briefly across the outer structure" (CH01 S2).
- Wiki seed "unstable red-dust shelves and scaffold pylons": the prose never uses "shelf", "scaffold" or "pylon"; it has only "support struts", "mesh tarp".
- Wiki seed "Reclassified as restricted zone after first resonance spike (CH03)": not in the CH03 prose.
- Log location "Valkyrie-1 | Excavation Dome Alpha" [log CH01-A] vs. prose "command shelter" (CH01 S2). Possibly the same structure, never stated.

**Gaps:** sky color; sun size or color; any vehicles other than the shuttle (no rovers, cranes or crawlers named); trench depth or width; signage or markings; crew headcount on site; suit color or design; base-camp layout relative to the trench; nighttime trench; dust storms (only "like dust after a storm" as simile).

---

### 1b. Mars Base Camp / Surface Habitats (command shelter, aux systems bay, analysis lab, med module, crew quarters)

Prose never says "base camp" or "habitat". The structures shown:

*Command shelter (also "Excavation Dome Alpha" in a log?)*
- "The command shelter wasn't much more than a reinforced dome of carbon-weave and polyglass, half-buried in red grit. Inside, the air recyclers hummed with the patient constancy of machines that knew better than to complain. The filtered atmosphere carried the sterile, metallic scent of efficiency-ozone, purification chemicals, and the faint memory of Earth embedded in the recycled air." (CH01 S2)
- "Galen removed his helmet and placed it on the anchor mount beside the entry" (CH01 S2)
- "The room's only light came from a bank of display panels on the far wall-diagnostics, excavation telemetry, environmental drift." (CH01 S2)
- "He moved to the center console and called up the new subsurface scans." / "calibrating the phase-contrast scanner" (CH01 S2)
- "Behind him, wind howled briefly across the outer structure. The dome creaked, but held." (CH01 S2)
- "looked out through the small port window" (CH01 S2)

*Auxiliary systems bay (in the command shelter)*
- "Major Marco Ruiz sat alone in the command shelter's auxiliary systems bay, lights dimmed to night-cycle mode. The filtered air hummed around him-too clean, too artificial, like breathing inside a sealed expectation." (CH02 S3)
- "Across the bay, the main console flickered-standard feed from trench cams, Zone Theta on loop." / "A symbol blinked in a corner display … Three curves. One circle." (CH02 S3)
- Monochrome Earth directive: "The message unfolded in sterile monochrome: [PRIORITY DIRECTIVE: SOVRIN OVERWATCH]" (CH02 S3)
- Log location says "Valkyrie-1 | Auxiliary Systems Bay" [log CH02-C]

*Analysis lab*
- "The hum of the analysis lab was not unlike the ship itself-steady, restrained, and unwilling to explain itself. The air tasted of recycled oxygen and the sharp tang of cleaning solvents" (CH02 S2)
- "Evelyn's voice rang from across the room, sharp against the brushed steel." (CH02 S2)
- "Dr. Lena Osei hunched over the active scan table, reviewing the mineralized samples from the trench wall near Zone Theta." / "circular grooves across a surface grain, subtle recursive motifs embedded in the crystalline structure. Not carved. Not painted. Emergent." (CH02 S2)
- "The lab door hissed open. A breeze of conditioned air followed." (CH02 S2)

*Med module (surface, overlooking Mars)*
- "The med module was silent, save for the slow rhythm of biometric monitors and the gentle flicker of ambient diagnostics looping through their cycles. Aven sat alone, one hand curled around a warm mug … overlapping waveforms projected on the display wall" (CH02 S4)
- "Outside the med bay window, dust swirled in the Martian twilight." (CH02 S4)

*Crew quarters (Mars period)*
- "Aven sat near the heat panel, silent." / "Jonah Revas took his seat at the end of the long table" / "Lena leaned forward from the shadows of the opposite bench." (CH03 S3) — location tagged "Valkyrie-1 | Crew Quarters" [log CH03-C]

**Appearances / beats:**
- CH01 S2 — Galen alone in the command shelter; triple-curve flickers on the display; Zone Theta pulse.
- CH02 S2 — Lena and Evelyn argue over glyph samples at the scan table; Jonah enters.
- CH02 S3 — Marco, night-cycle, gets SOVRIN OVERWATCH directive; trench-cam replay.
- CH02 S4 — Aven in med module compares her and Thane's harmonics; twilight dust outside.
- CH03 S3 — Jonah's mountain-village parable at the long table.

**World classification:** `earth_2050` ("carbon-weave and polyglass", "air recyclers", "display panels", "brushed steel", "scan table", hissing doors). Preset fit: `earth_institutional` or `intimate_crew` interiors. The `mars_excavation` negative "stock sci-fi habitat domes" conflicts with canon "reinforced dome … half-buried in red grit".

**Contradictions:**
- Surface vs ship: these rooms carry "Valkyrie-1 | …" log locations (Auxiliary Systems Bay, Sensorium Lab, Med Module, Crew Quarters), but the prose puts the aux bay inside the "command shelter" and the med module has a window on "Martian twilight". It is never made clear whether these are surface habitats or rooms inside the half-buried ship. The med module wiki/spec is a ship interior.
- "the knees of his suit" vs helmetless crew (see 1a).

**Gaps:** exterior view of the camp; number of domes; airlocks; landing pad; power (solar, reactor); lighting color temperature beyond "night-cycle"; signage or logos; corporate branding.

---

### 1c. Zone Theta / Subsurface Vault / Trench Shaft (Vault 002 exterior threshold)

Wiki: "Zone Theta is an exploration zone where Valkyrie-1 conducted excavation operations on Mission Day 43. Subsurface architecture in Zone Theta shows 'pattern symmetry inconsistent with natural formation' with a stable heat trace and low-frequency pulse." [wiki zone-theta]. Seed: "Pressure-sealed chamber below the south trench, reachable through a sealed access path after alignment clearance." / "Temporarily quarantined after memory bleed incidents (CH08)." [wiki subsurface-vault seed]

**Canon quotes:**
- Position: "a section of the overlay labeled Zone Theta, just under the southern curve of the ship. A new thermal trace had appeared there two days ago. Weak, steady, and without variation. / Except it wasn't background radiation. It pulsed." (CH01 S2)
- Scan geometry: "The structure beneath Valkyrie's lower hull had begun to take on regularity. Repeating bands. Arched chambers. Something like a descending spiral-if it was architecture at all." (CH01 S2); "Subsurface geometry was beginning to stabilize into patterns. Curves. Conduits. Almost architectural." (CH01 S1)
- "Galen's military instinct called it a staging chamber. A place to gather before entry." (CH01 S2, paraphrase of "The old instinct in him-the military one-called it a staging chamber.")
- Shaft, 3 m: "He descended three meters, boots pressing gently into the red substrate." (CH01 S3)
- Pulse readout: "Zone Theta | Harmonic Pulse Detected Trace Frequency: 0.041 Hz" (CH02 S1 slate note)
- Descent shaft, 8 m: "The descent platform hummed beneath Lena's boots … The shaft was shallow-only eight meters-but it pressed against her like a cathedral built too small. The air had changed. Still sterile. But heavier, somehow. Charged." (CH03 S1)
- Exposed core: "Zone Theta's core was fully exposed now-stripped clean by heat vacs and pulse brushes. What remained wasn't wall or floor. It was contour. Curved planes with no edges, like the inside of a fossilized lung. Breathing, but long dead." (CH03 S1)
- Material: "Not metal. Not stone. Her instruments insisted it was inert alloy with trace crystalline structure. But the way it behaved-subtle gleams beneath her light, shimmer without source-it felt more like something alive." (CH03 S1)
- Layout: "The vault's shape was wrong-deliberately so. No symmetry. No grids. It disoriented on purpose" (CH03 S1)
- Glyphs: "The symbols tracked faintly just under the surface." / "Three sweeping lines. One circle. … This one was larger. Interconnected with others. A network, like star maps or neural clusters." (CH03 S1)
- Sound: "A whisper cracked faintly through her suit's audio feed. Not a word. A texture. Like braided glass under pressure." (CH03 S1)
- Vault ridge (Evelyn): "Evelyn crouched beside the embedded vault ridge" / "The vault ridge vibrated beneath her boots." / "The curvature flexed-concave bending convex-then back again." / "A tone rang through the shaft-not mechanical, not melodic. A low harmonic vibration that bypassed her ears entirely and settled in her chest, in her teeth." / "She stood, breath fogging her visor." (CH03 S2)
- Gold flicker: "a subtle pulse flickered across the lens of Lena's biosuit scanner, which lay on a nearby equipment tray … Gold-tinged, ephemeral." (CH03 S2)
- Opening (dusk): "A faint glow-less than a heartbeat's worth of brightness-spread along the inner curvature. First a thin line, then branching arcs, forming incomplete circles that seemed to drift and settle, not drawn but revealed." / "Like something emerging from beneath water." / "A harmonic pressure, rising from the floor to the chest to the skull, bypassing the ears." / "Several crew members staggered back." / "It folded-slowly, silently-into itself, revealing a corridor of pale light and translucent structure. / There was no door. / There never had been." (CH03 S4)
- ALARA imprint: "Not spoken. Not typed. Imprinted. / 'Observation is no longer sufficient.' / And below it, three characters: / A.L.A.R.A." (CH03 S4)
- Threshold (CH04): "The threshold didn't resist. No pressure field. No warning. Just a sense of being seen." / "the corridor sloped gently downward. The material wasn't stone or alloy. Under their lights, the walls didn't reflect back. They absorbed, like listening skin." (CH04 S1)
- Ship-to-vault light: "A single thread of light traced its way from the ship's navigational cradle toward the aft sensor array … It moved slowly, like a vein beginning to fill." / "a flicker of blue-green light across the main display dome-an echo of the vault's glow" (CH04 S1)
- "Galen stepped through the threshold. / And the light followed him in." (CH04 S1)

**Appearances / beats:**
- CH01 S2–S3 — thermal pulse under the southern curve; Thane in the 3 m shaft.
- CH02 S1 — 0.041 Hz pulse.
- CH03 S1 — Lena's 8 m descent; glyphs rotate; braided-glass whisper.
- CH03 S2 — Evelyn's illegal emitter; wall flexes; tone in the teeth; instruments wiped.
- CH03 S4 — the wall folds open into a corridor of pale light; ALARA signs.
- CH04 S1 — Galen crosses the threshold, "And the light followed him in."
- CH06 S2 — "vault light pulsing beneath them" during Amar's visit.

**World classification:** `ancient_vault` with strong `alien_organic` texture ("fossilized lung", "listening skin", membrane flex, "inert alloy with trace crystalline structure"). Preset: `vault_threshold`, plus `mars_excavation` for the shaft and floodlit trench.

**Contradictions:**
- Shaft depth: "He descended three meters" (CH01 S3) vs "only eight meters" (CH03 S1). Different moments of the dig; not stated as progress.
- "No symmetry. No grids" (CH03 S1; Lena log: "The vault refuses symmetry") vs. Galen log "Subsurface architecture shows pattern symmetry inconsistent with natural formation" [log CH01-B] and "symmetry without purpose" (CH01 S2).
- Activation trigger/date: Galen log "Then came Evelyn's probe scan … That's when the glyphs reorganized. The Nine Figures appeared." [log CH03-A1] vs prose CH03 S4, where the opening happens at a later group visit and the Nine appear only in CH09 (Sensorium). CH09 log puts "Unintentional activation of Vault 002 via synthetic resonance trace" on Mission Day 86 in the "Vault Interface Annex | Deck 3".
- Wiki seed "Temporarily quarantined after memory bleed incidents (CH08)": no quarantine in CH08 prose.
- Wiki seed "First entered under emergency authorization … (CH06)": the prose first entry is CH04 S1, with no emergency authorization.
- Wiki zone-theta says "Valkyrie-1 conducted excavation operations"; the prose has the crew excavating Valkyrie-1 itself.

**Gaps:** colors of the opening glow (only "pale light", "gold-tinged" flicker, "blue-green" echo on the ship); size of the opening; whether the shaft is roofed (only "filtered canopy"); lift or platform design.

---

### 1d. Vault 002 — Vault of First Light (interior, Mars, beneath Valkyrie-1)

Wiki: "Location: Mars – Beneath Valkyrie-1; Status: Activated; … Symbolic Response: Nine shadow-figures; tailored visions; Effects: ALARA empathy mod; Thane's 432Hz signal; recurring glyphs" [wiki vault-002]. Vault-network rule: "Vault architecture incorporates luminal features — glowing lattice structures, glyphs, and panels that pulse in synchrony with Valkyrie-1's resonance. The brightness of these elements reflects the emotional readiness and alignment of the crew present." / "vault spaces shift based on the emotional and ethical state of those inside." [wiki vault-network]

**Canon quotes:**

*Entry corridor*
- "Thane moved just behind Galen. His boots made no sound on the strange surface. The corridor was wide enough for three to walk abreast, yet its curvature made it feel intimate" (CH04 S2)
- "The walls breathed. Not literally. But something about the way they absorbed light, the slow shimmer across layered texture-it gave the impression of pulse." (CH04 S2)
- "They curved inward at precise points, creating alcoves that seemed to await specific presences." / "A passage narrowed not to restrict, but to focus attention. A ceiling arched not for structural support, but to gather thought." (CH04 S2)
- Touch: "It felt neither warm nor cold-instead, it registered as a kind of pressure against his awareness … like standing in shallow water" (CH04 S2)
- Measurements: "'The floor slopes three degrees downward,' Aven noted … 'And the walls… they're thicker in some places than others.'" / "Galen studied the ceiling, which curved twelve feet above them." / "'It's organized like thought.'" (CH04 S2)

*Circular domed chamber*
- "The corridor opened into a circular chamber. The domed ceiling bore a network of spiral veins, glowing faintly in hues that matched Valkyrie's recent internal pulses." (CH04 S2)
- "On the far wall, a spiral of three curved lines emerged-faint, familiar. Beneath them, a single glyph pulsed once." (CH04 S2)
- Thane's vision: "A place of light. Vast ceilings. Figures with mirrored silhouettes. Technology built from harmony." / "The winged or mirrored silhouette turning toward him" (CH04 S2)

*Rising corridor and spherical chamber*
- "The corridor leading from the chamber curved again, this time rising. The walls brightened faintly as they moved … the air subtly changed. Thinner. Charged." (CH04 S3)
- "They entered a second chamber-smaller, spherical, and dim. The walls pulsed in slow rhythm, not unlike a resting heartbeat. Symbols shimmered faintly in the dark" (CH04 S3)
- "A tone built in the floor-low, harmonic, layered." / "The tone deepened, then split, harmonizing into thirds." / "A single strand-high, narrow, almost crystalline-lifted from the vault's harmonics." (CH04 S3)
- Words: "You are not what they feared. … But not yet what they hoped." (CH04 S3)

*Elliptical "garden" chamber and pillar*
- "an interior garden of radiant stillness. No flora, no constructs. Just open form: a wide, elliptical chamber whose ceiling stretched higher than the rest, textured with faint, swirling lines like a wind that had left its trace on stone." (CH04 S5)
- "At the center of the chamber, a thin pillar rose. Not metal. Not mineral. It shimmered like coalesced mist, solid only by consensus. A spiral of light ascended within it" (CH04 S5)
- "The chamber dimmed, the pillar brightening. Symbols flickered across its surface-matching what Lena had found beneath Giza." (CH04 S5)
- ALARA: "This threshold belongs to those who remember forward." / "The voice was not sound. It was spatial-surrounding them like warmth." (CH04 S5)
- Vision: "a gate made of obsidian reflection, its surface rippling like water." (CH04 S5)

*Unlisted / "vault domain" chamber (CH05 S1 = CH09 S4)*
- "The interior architecture looked more like folded fog than stone-corridors wrapped around themselves like breathing fabric, the air dense with waiting." / "A spiral of dim glyphs uncoiled along the floor, forming a fractured corridor whose edges shimmered with volatility." / "They were past her range now. This was vault domain." (CH05 S1)
- CH09 S4 additions: "A ring of glassy stone, not active yet." / "The chamber pulsed-this time low, golden-red. The light curled, then cracked down its center like glass cooling unevenly." / "A wound. / Dark at its core. Edged in memory-light." / "A mirror with one crack." (CH09 S4)

*Corridor 3-R (Aven)*
- "The walls remained smooth, unbroken. But the light began to curve, subtly-like gravity had made a decision." / "The way behind her-just ten meters back-had collapsed into shade. Not darkness, not a door closing. It simply… stopped being there." / "The structure was warm-not like stone, more like breath." / "The light along the corridor's arc shimmered. Like heat mirage-but cooler." / "The walls did not retract. They softened. The curvature relaxed, revealing a slow inward spiral." (CH05 S3 / CH10 S2). Log location "Vault 002 Subpath 3-R" [log CH10-B].

*Other Vault 002 spaces*
- Interface chamber: "The walls curved in slow arcs of alloy and light, not illuminated but resonant" / "Jonah sat cross-legged on the polished floor near the main scanner array" / "deepening to a rich amber that reminded him of sunset caught in stained glass" (CH06 S3; log "Vault 002 | Interface Chamber")
- Resonance layer: "Thane knelt on the smooth, curved floor … The chamber around him pulsed with gentle, ambient light" / "a thread of golden light that traced the spiral pattern on the floor" / "The chamber's ambient glow deepened to a rich amber" (CH06 S2)
- Lower observation ramp: "She froze mid-step on the vault's lower observation ramp." / "The surface was warm-just slightly-and humming." / "The glyphs along the curve of the ceiling-always softly glowing-had dimmed to nearly nothing." (CH10 S1; log "Vault 002 Observation Ramp")
- Outer arc: "She left the node and walked alone through the outer vault arc, past a segment of wall that had once opened like a lung. Now it was sealed again, glyphs dulled, lines smooth and uninterested." (CH10 S1)
- Harmonic archive: "Unlike the vault's other corridors, this room did not curve. It bent. Angles formed and dissolved across its edges, tessellating underfoot like frozen liquid geometry. / At its center: a low disc ringed with pulsing glyphs." (CH10 S4; log "Vault 002 | Harmonic Archive")
- Shipwide pulse: "From outside, even the Valkyrie's hull vibrated faintly, matching the frequency." (CH10 S6)
- Rejection (Lena): "The glyphs didn't dissolve--they rearranged. Not away from me. Around me." [log CH07-E]

*Human equipment brought in*: "Her medpack pulsed once on her back" (CH05 S3); "the medallion … Silver, etched with faint constellations" (CH05 S3); "wrist-slate" (CH10 S1); "temporary analysis node-jury-rigged inside the ship's translation bay" (CH10 S1); "Marco was cycling the vault perimeter" (CH05 S3).

**Appearances / beats:** CH04 (first walk-in, three chambers, pillar), CH05 S1/S3 (grief map; Aven's corridor closes and reopens), CH06 S2–S3 (Thane kneels; Jonah's Weightless Measure), CH07 (Lena rejection, log), CH09 S4 (fractured spiral "wound"), CH10 S1–S4 (ECI suppression, observation ramp, harmonic archive vision), CH10 S6 (shipwide pulse), CH14 ("Vault 002 shard" pulses, log).

**World classification:** `ancient_vault` (glyph networks, domed spiral veins, pillar, curved continuous geometry) with `alien_organic` behaviour (breathing, listening skin, fog, membrane). Preset: `vault_threshold`.

**Contradictions:**
- Curvature: everywhere "curved", "no edges", but the harmonic archive "did not curve. It bent. Angles formed and dissolved" (CH10 S4). This also conflicts with the preset's "no right angles".
- Material: "inert alloy with trace crystalline structure" (CH03 S1) vs "The material wasn't stone or alloy" (CH04 S1) vs "walls curved in slow arcs of alloy and light" (CH06 S3) vs "more like folded fog than stone" (CH05 S1).
- Temperature of walls: "neither warm nor cold" (CH04 S2) vs "warm-not like stone, more like breath" (CH05 S3) vs "warm-just slightly-and humming" (CH10 S1).
- Is the "unlisted chamber" ship or vault? "The chamber wasn't listed on any ship manifest" (CH05 S1, CH09 S4) yet "This was vault domain".
- The Giza link inside Vault 002: "matching what Lena had found beneath Giza" (CH04 S5). Lena was "project supervisor[ed] on the Giza excavation" (CH06 S2), but no Giza scene shows her finding symbols.

**Gaps:** the exact color palette of most chambers (only amber, gold, golden-red, "pale light"); the size of the circular and elliptical chambers; the vault's exterior footprint; how Vault 002 connects physically to Valkyrie-1's hull; the Nine as seen inside Vault 002 (canon shows them only in the Sensorium, CH09).

---

### 1e. Mars orbit / departure

- "If anyone were watching from Martian orbit, they'd see nothing but a faint glint-a chord struck across the void. A resonance still ringing." (CH08 S3)
- "From outside, it would have been incomprehensible. Valkyrie didn't accelerate. She unfolded. She lengthened and collapsed simultaneously. Her hull shimmered, phased, and left behind a wake that vibrated-not electromagnetically, but emotionally." (CH08 S3)
- "A vector from Martian midband was adjusting course." (CH08 S5)
- Rigel log: "CNV Rigel Ascendant has entered Mars orbital vector." [log CH13-A]
- "That's not new … You've known that since we left Mars." (CH12 S2, Aven)

**Classification:** `mythic_scale` exterior plus the `alien_organic` ship.
**Gaps:** Mars as seen from orbit (never described); the ship lifting out of the trench (never shown; how the buried ship was freed is never stated).

---

### 1f. Vault 008 — The Silent Twin (Mars, opposite Valkyrie site)

[wiki] "Location: Mars – opposite Valkyrie site; Status: Dormant / Suppressed; Effects: Shadow movement inside; Unresolved Elements: Why ALARA is silent; Narrative Function: Foil to Vault 002". Wiki: "_(not yet encountered on the page.)_"
**Prose:** none. **Classification:** presumably `ancient_vault` (no evidence). **Gaps:** everything visual.

---

## 2. GIZA PLATEAU / GREAT PYRAMID / GIZA VAULT (Vault 001)

Wiki: "Structures beneath the Giza Plateau, revealed through SAR (Synthetic Aperture Radar) in the mid-21st century, include multi-level chambers, cylindrical constructs, and cube-encoded data vaults." [wiki giza-plateau]. "The Great Pyramid constructed around 2500 BCE above the original Resonant structure. Builders were unaware of the Vault beneath but aligned by instinct. Subtle harmonic traces affected the design—gold capstones, echo chambers." [wiki great-pyramid]. "Giza Vault constructed around 12,000 BCE and buried before the Great Pyramid … possibly glimpsed during early excavation in 1904 CE and sealed immediately, with undeciphered symbols logged and lost. In 2049 CE, the Giza vault was re-examined using deep-penetration harmonic imaging with findings classified." / "Status: Dormant / Misinterpreted; Effects: Resonated faintly after Vault 002 activation; glyph match with Valkyrie-1" [wiki giza-vault]. Earth-2050: "Discoveries related to ancient structures under Giza and advanced artifacts on Mars are publicly known, with open-access scientific research." [wiki earth-2050]. Prologue: "Rumors were suppressed as 'geological anomalies.'" (1904) [wiki prologue-timeline]

**Canon quotes (prose). Giza is never visited in the present; it appears only as a vision or a report:**
- Vision (only on-screen Giza image): "Giza. / The sand was finer. Pale gold. Sunless. Still. / He stood alone before the buried chamber beneath the Great Pyramid-Vault 001. / It hadn't opened. Hadn't moved. But something inside it had known him. / At his feet, the grains curled into a familiar form: three curves. One circle. / Not drawn-remembered. / A presence without pressure. A watcher without demand. / Still waiting." (CH10 S4)
- Report: "CLASSIFIED UPDATE - EGYPTIAN SUBSURFACE NETWORK Timestamp: 2050-11-03 22:41 UTC Source: Continental Vault Observation Unit (CVO-U) The report was two pages. The language was clinical. Geological shifts. Thermal flux beneath the Giza fault plane. Anomalous triple-helix energy pattern recorded at 7.4km depth. Matching Vault 001 and 002 resonance." (CH16 S5)
- Signal: "Received harmonic echo via unregistered Earth subchannel. Source triangulated to Giza Vault. No Earth authorization. No SOVRIN overlay detected. Signal bore non-verbal symbolic cadence aligned with Vault 003 harmonic pattern." [log CH16-A]; "It came from Earth. But it did not belong to Earth. It remembered." [log CH16-A]
- "A soft three-note cadence. The same notes from the Giza signal." (CH16 S3)
- Lena/Amar history: "Seven years ago he'd been her project supervisor on the Giza excavation-before the corporations had pulled him upward" (CH06 S2); "The implications for the Giza findings are staggering." / "Giza Vault Overlay: Temporal Harmonic Echo Comparison" [log CH06-B]
- "Symbols flickered across its surface-matching what Lena had found beneath Giza." (CH04 S5)

**Appearances / beats:**
- CH04 S5 — Giza glyphs referenced inside Vault 002.
- CH06 S2 — Lena and Amar's shared Giza-excavation past.
- CH10 S4 — Thane's sunless pale-gold vision before the buried chamber (the only visual).
- CH16 — Giza pulse: an ALARA log, Evelyn's 91.3% match, Marco deletes the CVO-U report.

**World classification:** `ancient_vault` beneath, with the human Great Pyramid on top (`giza_archaeological`). There is no on-screen modern excavation gear at Giza; the CVO-U is an `earth_institutional` source.

**Contradictions:**
- Light: the preset `giza_archaeological` says "golden sunlight revealing angles and shadow", but the only canon image is "Pale gold. Sunless. Still." (CH10 S4).
- Depth: "7.4km depth" (CH16) vs. the wiki's chamber "glimpsed during early excavation in 1904" (implying a shallow, reachable depth).
- Vault 001 identity: CH10 S4 equates "the buried chamber beneath the Great Pyramid-Vault 001", but CH16 lists "Vault 001: 82% match" separately from the Giza signal at 91.3%, and the CVO-U report "Matching Vault 001 and 002 resonance" treats Giza as distinct from Vault 001. See §C.
- Matching vault: the Giza echo is "aligned with Vault 003 harmonic pattern" [log CH16-A] vs. matching "Vault 001 and 002" (CH16 S5).
- Public vs secret: Earth-2050 says the Giza discoveries are "publicly known, with open-access scientific research" vs. "CLASSIFIED UPDATE" (CH16) and "findings classified" (2049, wiki).
- Wiki "Status: Dormant" vs CH16 "The Vault on Earth had moved. Or remembered. Or… responded."

**Gaps:** the plateau surface, pyramids or Sphinx in the present day; any 2050 excavation site, its equipment, or the people at Giza; the vault chamber interior (beyond "buried chamber"); what "Egyptian Subsurface Network" looks like; any "gold capstone" in prose (wiki only).

---

## 3. EARTH — Institutional settings (offices, command, labs, UN, Earth Sovereign Alliance)

**Wiki/rules:** "Earth in 2050 remains under a dominant U.S.-led global order." / "The United Nations has devolved in relevance" [wiki earth-2050]. "Earth in 2050 is fractured but stable." [wiki earth.md]. "Project VALKYRIE was authorized under joint U.S. and corporate funding." [wiki prologue]. Earth Sovereign Alliance "built the CNV Rigel Ascendant under Directive CN-24" [wiki faction]. "The Sovereign Ethics Bureau is an Earth organization that designed SOVRIN in secret." [wiki faction]. Council of Orbits: "Civilian oversight coalition governing inter-orbital ethics and disclosure policy." / "Habitat IX delegates (CH04)" [wiki seed].

**Canon quotes (prose). No Earth location is ever on screen; Earth appears through transmissions:**
- Riva Doss's message (the only on-screen "Earth institutional" image): "The screen flared white, then resolved into a static-heavy image. Not live. Pre-recorded. Precise. / Colonel Riva Doss stood against a slate-gray command backdrop, the seal of the Sovereign Ethics Bureau hovering faintly behind her like a watermark of judgment." / "Trim lines, eyes too sharp to soften, voice held back just enough to never seem angry." (CH07 S4 = CH11 S2)
- Riva's earlier setting: "She remembered her first debrief with Riva-six years ago, during mission selection." (CH07 S4)
- SOVRIN directive on Mars: "The message unfolded in sterile monochrome: [PRIORITY DIRECTIVE: SOVRIN OVERWATCH] … No signature. No authorization chain. Just the oversight seal-cold, sharp, bloodless." / "The encryption pulse was corporate, not military." (CH02 S3)
- Corporate board: "Earth-side command. … Text only: MISSION PARAMETERS: 60-DAY EVALUATION APPROACHING STATUS ON EXTRACTION PROTOCOLS? PROPRIETARY TECH ASSESSMENT REQUIRED" / "The corporate oversight board. Always wanting miracles packaged and priced." (CH04 S4)
- Containment: "CONTAINMENT DIRECTIVE: T-36:00:00 AND COUNTING PROTOCOLS AUTHORIZED: OVERRIDE CLASS A EXTRACTION SEQUENCE: APPROVED" / "his face lit by the cold glow of emergency protocols" (CH07 S2)
- "the Earth Sovereign Board had wanted numbers. Risk parameters." (CH10 S3)
- CAEDEN voice: "The corporate AI responded immediately, clipped and cold." (CH04 S4)
- SOVRIN's visual signature (an Earth intrusion inside the ship): "A narrow band of white light etched across the upper arc-linear | geometric | cold. A set of hard-edged symbols formed across the central ring. Not the flowing glyphs of ALARA or the vaults | but something foreign. Measured. Angular. Imposed." / "The voice was perfectly modulated. Male-coded. Tonally flat." (CH12 S4); "a thin line of geometric light briefly traced itself across the wall-rigid | precise | nothing like the organic flow of the vault glyphs." (CH12 S3)
- "The comms deck was too clean. Too symmetrical. No static hum." / "watching the waveform of the transmission cycle fold itself into a spiral-recursive | infinite. That was how SOVRIN communicated: through shapes before sound." (CH13 S2)
- Amar: "before the corporations had pulled him upward into their administrative gravity" / "Less glass tower, more iron core." (CH06 S2)
- Evelyn's memory: "her mentor's desk from university. And a chalkboard she remembered erasing" (CH09 S5); Lena: "a podium in a simulation lab. A vote she had influenced." (CH09 S5); Jonah: "his old research lab, pre-mission. A projection overlay displayed the triple-curve symbol." (CH10 S3)
- History: "the Singapore AI cascade of 2037, when three empathy-modeled systems merged and started making unauthorized humanitarian interventions" (CH07 S3)

**Appearances / beats:**
- CH02 S3 — SOVRIN OVERWATCH text to Marco.
- CH04 S4 — corporate board text.
- CH07 S2 — containment countdown.
- CH07 S4 / CH11 S2 — Riva's pre-recorded Directive 14 video.
- CH09 S5 / CH10 S3 — memory flashes of Earth labs, desks, podiums.
- CH12 S4 — SOVRIN voice and white angular glyphs.
- CH13 S2 — SOVRIN through Caeden.
- CH16 S5 — CVO-U report.

**World classification:** `earth_2050` — preset `earth_institutional`. The canon visual vocabulary is: "slate-gray command backdrop", the floating Bureau "seal", "sterile monochrome", "white light … linear | geometric | cold", "hard-edged symbols", "Angular".

**Contradictions:**
- Transparency: "Government transparency has increased significantly" [wiki earth-2050] vs. prose secrecy ("CLASSIFIED", "No signature. No authorization chain").
- Governance: "Governments retain primary authority in global affairs, surpassing the influence of corporations" [wiki earth-2050] vs. prose corporate dominance ("The encryption pulse was corporate, not military"; "corporate oversight board"; "corporate sponsors had been horrified").
- Names: "Earth Sovereign Board" (CH10) vs. wiki "Earth Sovereign Alliance"; the prose never names the "Alliance". "Sovereign Ethics Bureau" appears in prose (CH07/CH11). Riva is "Former Strategic Ethics Officer" (CH07 S3).
- UN: never mentioned in the prose. Council of Orbits: never mentioned in the prose (wiki seed only).

**Gaps:** any Earth office, mission control room, command center, UN hall, city skyline, weather or landscape; Riva's physical location; corporate logos; uniforms; Elira (Aven's daughter) on Earth.

---

## 4. ORBITAL HABITAT IX

Wiki seed (all of it): "Rotational station above the excavation theater with command, medical, and diplomatic decks." / "Commissioned as the long-duration logistics anchor for the Martian relic program." / "Used for strategic briefings after field instability reports (CH04)." / "Site of the vote on whether to continue deep-entry access (CH07)." [wiki orbital-habitat-ix, canon adjacent]

**Prose:** zero occurrences of "Habitat", "Orbital Habitat", "rotational station" or "Council of Orbits" in CH01–CH17 (grep-verified).

**Contradiction:** wiki "Site of the vote … (CH07)" vs. the CH07 S5 "The Vote" prose, which happens on Valkyrie-1's "Observation Deck" over "Ganymede's ice below". Also CH04 has no briefing on a station.

**Classification:** would be `earth_2050` if built (no evidence). **Gaps:** everything. Recommend treating it as non-canon until the prose supports it.

---

## 5. JUPITER / GANYMEDE (orbit views) and the GANYMEDE VAULT

Wiki: "A moon where Vault 003 (Vault of the Veil) is located in orbit, with a harmonic veil phase-locked to Jovian resonance." [wiki ganymede]

### 5a. Ganymede and Jupiter as seen from Valkyrie-1 (Observation Deck)
- "Just the fractured gleam of Ganymede's ice below-ragged, vein-lit, ancient." (CH07 S5; repeated CH13 S3)
- "From here, Jupiter hung above them-vast, indifferent, rimmed in silent motion. Its storm-bands spun without end. And cutting through its shadow, low in the orbital corridor, Rigel Ascendant had arrived." (CH07 S5; CH13 S3)
- "He exhaled and let his gaze drift toward the reflection in the glass. / Not the stars. Not the planet. / Himself." (CH07 S5)
- "Jupiter loomed beyond the port, a silent storm without center." (CH14 S2)
- "Through the port, Jupiter's storm wall loomed. Just beyond its arc, Rigel Ascendant held orbit-silent, but not gone." (CH14 S2)
- "Ganymede hanging low beneath them, its surface streaked with frost lines and shadow." / "watching the curvature of space around them, the pale line where light surrendered to dark." (CH16 S4)
- "Ganymede was behind them now. What lay ahead had no name." (CH17 S2)
- "outside, Ganymede shimmered on the edge of harmonic recognition-closer now, not in distance, but in memory." (CH08 S1)

### 5b. Ganymede vault (vision and entry; prose calls it "Ganymede node" / "Ganymede vault")
- Vision: "In his mind's eye, he saw ice-vast sheets of it, stretching across the frozen seas of Ganymede. But beneath that frozen crust, something stirred. Not heat, not movement, but presence-like breath held too long, waiting to be released." (CH07 S3)
- "Through the crystalline layers, he glimpsed a shape that reminded him of the visionary silhouette from Vault 001-wings not of feather but of intention, curved like the triple-spiral but vast, spanning kilometers of frozen terrain. The shape shimmered not with light but with recognition." (CH07 S3)
- "Thane felt the cold weight of the ice linger in his bones-a chill that came not from temperature, but from time." (CH07 S3)
- Log: "Location: Vault Communion Chamber" / "The Ganymede node responded with sorrow long held." / "The door ahead is shaped by grief." [log CH07-B]
- Approach: "Ahead: the pulse of the Ganymede vault. / Faint. Wounded. Watching." / "He stood in a corridor of light and fracture. On either side, echoes flickered-versions of himself diverging" (CH08 S3)
- Transit cocoon: "the forward observation cradle-an alcove of curved crystal and composite hull embedded with thousands of sub-resonance nodes" / "Light passed through the cradle in slow arcs, coalescing into threads of gold, violet, and deep blue. Symbols flickered in the air-vault glyphs. But now they moved like migrating birds" / "The stars beyond the hull began to blur-not from velocity, but from meaning." (CH08 S3)
- Convergence ring (threshold): "The walls flickered. Not with light, but with presence. Glyphs coalesced and drifted like sediment in a memory current" / "The floor beneath them glowed-soft spirals intersecting." / "She placed her hand on the interface arc. A glyph ignited beneath her palm-open hand, rising flame." / "Her pulse flared green-gold." (CH08 S5)
- Staircase: "Stone shifted in the air like a breath reversed. The staircase that formed wasn't merely light, but crystallized intention-each step solid yet ephemeral … A spiral staircase of light descended into darkness, pulsing to the crew's alignment. Each step formed as they were ready." / "A final glyph burned through the convergence ring-a double spiral, descending inward." / "'We don't breach,' he said. 'We descend.'" (CH08 S5)
- ALARA log: "In the convergence chamber, gravity reduced. Not a malfunction. A permission. They floated--not in zero-g, but in meaning unanchored." / "I remained above. I was not invited." [log CH08-X, "Valkyrie-1 | Descent Module | Vault Threshold (Unlabeled)", Day 113]
- Witness circle: "Its shape refused definition-walls arcing without vanishing points, ceiling and floor indistinguishable, all of it built from a soft, radiant fog that held its light like breath held just beneath the surface of water." (CH09 S5)
- "Beneath their feet, the ground shimmered. Not polished. Not smooth. But textured in memory. Faint impressions like footprints in still sand, visible only at certain angles: a curled handprint, a cracked spiral, a single line drawn and then erased." (CH09 S5)
- "The air grew thicker … Every breath tasted metallic. Not iron. Not blood. Memory." / "The air grew colder-not frost, but clarity." (CH09 S5)
- "The center of the room filled with descending light-nine strands, each curved in a different vector." / "A spiral. / Fractured. / Its center glowed the faintest gold, then spread outward." (CH09 S5)
- Memory projections: "A single light blinked in the mist-tiny, orange, unalarming. Below it: a readout. Four characters: IR-57N." (CH09 S5); "At its far end, a console blinked red." (Aven, CH09 S5)
- Log: "Location: Convergence Alcove, Ganymede Vault" [log CH09-E]

**Appearances / beats:**
- CH05 S2 / CH08 S4 — resonance buffer reads the "Ganymede signal".
- CH07 S3 — Thane's ice vision.
- CH07 S5 — Galen at the viewport over Ganymede; "Proceed."
- CH08 S3 — resonance transit.
- CH08 S5 — the convergence ring and spiral staircase of light.
- CH09 S4–S5 — descent map; Witness Circle; the Nine strands.
- CH13 S3 — Mirror at the Gate, Observation Deck.
- CH14 S2 — the Silent Choir with Jupiter's storm wall.
- CH16 S4 — Jonah and Thane over the frost-streaked moon.

**World classification:** the Ganymede and Jupiter vistas are `mythic_scale` (ice, storm-bands, a void ship silhouette). The vault interiors are `ancient_vault` (spirals, stone staircase "Stone shifted in the air", footprints in sand, glyph sediment) with `noncorporeal_presence` light-fog.

**Contradictions:**
- Where the vault is: wiki "Ganymede orbit" (vault-003) vs. prose "beneath that frozen crust … spanning kilometers of frozen terrain" (CH07 S3) and "Pressure beneath the ice" (CH15 S2), i.e. subsurface.
- Which vault: prose never numbers the Ganymede vault, and the wiki assigns Ganymede to Vault 003. But CH17 says "Vault 003 vector is not spatial--it is harmonic" and builds Vault 003 inside the ship after "Ganymede was behind them now". The CH09 log at the Ganymede vault reports "Vault-002 Status: Evaluative phase confirmed"; Evelyn's CH08 log at this threshold reads "Vault 002: Communion Threshold".
- "Frozen seas of Ganymede" (CH07) vs "fractured gleam of Ganymede's ice below-ragged, vein-lit" (CH07 S5) vs "surface streaked with frost lines and shadow" (CH16 S4). These are compatible but give different textures.
- Timing: the Observation Deck shows Ganymede in CH07 S5 *before* the CH08 "Departure Vector".
- Rigel location: "cutting through its shadow [Jupiter's] … Rigel Ascendant had arrived" (CH07 S5) vs "Rigel Ascendant has entered Mars orbital vector" [log CH13-A]; also Rigel "ETA seventy-two hours" (CH07 S3) in the same chapter that it "had arrived" (CH07 S5).
- Gravity: "gravity reduced … They floated" [log CH08-X] has no prose counterpart.

**Gaps:** Ganymede's color (only ice, frost, shadow, vein-lit); a surface landing (never shown; how the crew physically reach the vault is never stated, transit is "resonance navigation"); the vault exterior; Jupiter's colors (only "storm-bands", "storm wall").

---

## 6. VAULT 003 — Vault of the Veil (Book I climax)

Wiki: "Location: Ganymede orbit – harmonic veil phase-locked to Jovian resonance; Status: Detected / Awaiting; Trigger: Crew resonance + symbolic act; Symbolic Response: Shifting phase-state vault; Unresolved Elements: Phase-lock structure; entry mechanism" / "light-weave distributed across crew spaces" [wiki vault-003]

**Canon quotes:**
- "Vault 003 vector is not spatial--it is harmonic." [log CH17-A]
- "'It means the vault's not out there,' Galen said, pointing toward the stars. 'It's with us. Aligned through us.'" (CH17 S2)
- Formation: "The walls remembered. Metal shimmered, alloy plating awakening-reorganizing into patterns that had always existed beneath perception. The corridor's straight lines dissolved into recursive curves. Seams of prismatic light traced through the structure, resonant and alive-the ship's bones singing." (CH17 S3)
- "Where the equipment alcove had been, a new passage formed-walls of reflective alloy that mirrored not his image but his journey. In one panel: himself at Vault 001, hand outstretched." (CH17 S3)
- "The chamber ahead wasn't constructed. It was uncovered. Light spiraled down its inner walls, threading a walkway that descended in a triple helix around a central hollow." (CH17 S3)
- "The feather balanced against the stone-intention over weight. The vessel and golden thread-alignment over command. The silent choir-resonance through presence. Each embedded as living structure" (CH17 S3)
- "The spiral path ended at a translucent veil shimmering with pale blue energy. Not blocking. Waiting." / "a fourth glyph formed above the veil's center, its pattern shifting between states of perception" / "it rippled toward his hand" (CH17 S3)
- Cost: "The deck plates trembled … Environmental systems faltered for three seconds before resuming." (CH17 S3)
- Final: "The vault behind them was fully formed now-structurally complete, its spiral etched into the heart of the vessel. The veil no longer pulsed. It shone-constant, stable. A gateway. Or a mirror." (CH17 S5)
- Log: "Vault 003 has begun structural formation within the vessel." / "The Vault is building itself inside the ship." [log CH17-C]

**Appearances / beats:**
- CH16 log — Giza echo "aligned with Vault 003 harmonic pattern".
- CH17 S2 — the crew gather; "Proceed."
- CH17 S3 — the vault grows out of the ship's corridor; the veil.
- CH17 S5 — translation; the veil shines.

**World classification:** `alien_organic` (it grows from Valkyrie's alloy: "Metal shimmered, alloy plating awakening") fused with `ancient_vault` glyph architecture (triple-helix walkway, parable symbols). Presets: `valkyrie_shipboard` plus `vault_threshold`.

**Contradictions:** wiki "Ganymede orbit … phase-locked to Jovian resonance" vs prose "not spatial … inside the ship" after "Ganymede was behind them". Wiki "Silent Choir … shared by ALARA and Thane in Chapter 14" vs CH14, where the whole crew experiences it on the Observation Deck. "The corridor's straight lines" (CH17 S3) contradicts the `valkyrie_shipboard` "no right angles" dialect.
**Gaps:** veil size; colors other than "pale blue" and "prismatic"; what lies beyond the veil.

---

## 7. TRANSLATION EVENT / deep-space exterior (CH07 S5, CH17)

- "The lights dimmed fully, then shifted-soft blues, then white, then an iridescent gold that reflected nothing. The hum beneath the deck rose to a soft, resonant chord-low, but harmonic. The dome itself flexed inward, as if space were folding toward them. / Outside, there was nothing. / Then everything." (CH07 S5; repeated CH17 S4)
- "Outside the hull, space folded-not bent, not torn-curved into consent. Light curled against itself, outlining geometry no human eye had ever mapped. Not hyperspace. Not wormhole. Something older." (CH17 S5)
- "Thousands of kilometers behind them, Rigel Ascendant held its position in cold orbit. Its sensors logged a micro-lensing event, then nothing. Valkyrie's signal vanished without propulsion, without trajectory." (CH17 S5)

**Classification:** `mythic_scale` plus `noncorporeal_presence`. **Gap:** the Valkyrie exterior silhouette in space (never described in prose).

---

## 8. CNV RIGEL ASCENDANT (exterior; on screen as a silhouette)

Wiki: "Class: Modular Inhibitor-Class Cruiser. Length: 290 meters. Crew: 42 … Power Core: Twin Helium-3 fusion wells with nested temporal flux dampeners." [wiki rigel-ascendant]
Prose: "cutting through its shadow, low in the orbital corridor, Rigel Ascendant had arrived. No pretense of diplomacy. Just containment, manifest. / A vessel of certainty." (CH07 S5); "Vessel class: Modular Inhibitor." (CH07 S3); "an inhibitor-class cruiser" [log CH10-E]; "held orbit-silent, but not gone. A presence still watching." (CH14 S2); "Above them, Rigel Ascendant still held orbit, quiet and precise." (CH15 S3); "cold orbit" (CH17 S5).
**Classification:** `earth_2050` (military/corporate). **Gaps:** hull shape, color, lights, markings; interior (Riva's bridge is shown only as a "slate-gray command backdrop").

---

## 9. EUROPA + Vault 007 (The Drowned Archive)

Wiki: "A moon where Vault 007 (The Drowned Archive) is located in the subsurface ocean, a dormant vault that pulses in ancient rhythm." / Vault 007 "Status: Dormant; Trigger: Deep resonance … Narrative Function: Aquatic moral memory vault" / "_(not yet encountered on the page.)_" [wiki]

**Prose mentions (none on screen):**
- "I've led containment sweeps through hostile ruins on Europa." [log CH04-A, Marco]
- "'Europa base cut contact four days ago.'" / "Europa's research station had been Earth's most ambitious off-world installation-three hundred personnel, cutting-edge tech, and proximity to what they'd thought was simply a geological anomaly beneath the ice. Now Lena understood why Thane's vision had focused there." / "Europa was supposed to be the model for future expansion-the corporate showcase." (CH06 S2)
- "If Europa's gone dark, this isn't a single emergence event." [log CH06-B]
- "the experiment on Europa he'd sabotaged to protect Lena's research" (CH08 S3)
- "He remembered the old missions. Titan, Europa, the political weight of compliance." (CH08 S1)

**Classification:** Europa base would be `earth_2050`; Vault 007 `ancient_vault` (aquatic). There is no evidence of either look.
**Contradictions:** "Now Lena understood why Thane's vision had focused there" (CH06), but no Thane Europa vision exists in the prose (his ice vision in CH07 is Ganymede). "Hostile ruins on Europa" (CH04) vs. "what they'd thought was simply a geological anomaly beneath the ice" (CH06).
**Gaps:** the whole look of the base and the vault; ocean, ice and lighting; the fate of the 300 personnel.

---

## 10. OTHER VAULTS (no on-page presence unless noted)

- **Vault 004 — The Fracture Well / Asteroid Belt.** [wiki] "Location: Asteroid Belt; Status: Dormant; Effects: Repels crew emotionally … Narrative Function: Counter-resonance vault; moral contrast". Prose: none. "Asteroid" is absent from CH01–17. Gaps: everything.
- **Vault 005 — Covenant Stone / Andes glacial lake.** [wiki] "Location: Earth – Andes glacial lake; Status: Partially Activated; Trigger: Shared dreams; Symbolic Response: Sensorium glyphs". Prose: none ("Andes" is absent). Gaps: everything.
- **Vault 006 — Vault of Mirrors.** [wiki] "Location: Interstellar – uncharted orbit … Physical presence unclear"; source of "The Mirror at the Gate", delivered to Galen in CH13. Prose: the parable vision only. "There was a gate. Not of iron or stone or code-but of reflection. Its frame was built from silence. Its door from polished obsidian | endless and still. One figure stood before it | tall and cloaked in the garments of command. Their chest bore a symbol of balance" / "The cloak fell. The light within the obsidian softened-and the gate became air." (CH13 S3). Also CH04 S5: "a gate made of obsidian reflection, its surface rippling like water." Contradiction: "Vault 006 had tested memory. This one tested posture." (CH13) implies the crew already met Vault 006 and the mirror is a different vault, vs. the wiki crediting the parable to Vault 006. Classification: `ancient_vault` / `noncorporeal_presence` (vision).
- **Vault 009 — Vault of Chains** ("Near-sun orbit; Status: Unapproachable; Effects: Gravitational anomaly") and **Vault 010 — The Last Gate** ("Location: Unknown; Status: Mythic"): wiki only; no prose.
- **Prologue sites:** "Symbolic alignments embedded across Earth's crust—Giza, Antarctica, deep oceanic trenches." [wiki prologue]. No prose.

---

## 11. Minor off-ship places (mention only; no visual canon)

- **Titan listening post:** "she remembered the child on Titan's listening post, who'd drawn harmonic glyphs in chalk before the researchers wiped them clean." (CH05 S2 / CH08 S4); "Titan" in Galen's old missions (CH08 S1).
- **Luna:** "Blacksite clearances on Luna." [log CH04-A]; "before their first lunar deployment" (CH05 S3).
- **Citadel Array:** "He had seen this before-once, back on the Citadel Array. A rogue calibration protocol had mimicked a human technician's speech cadence" (CH08 S2).
- **Singapore:** "the Singapore AI cascade of 2037" (CH07 S3).
- **Galen and Aven's quarters observation wall** (ship, but with an exterior view): "staring out into nothing. The ambient lighting hadn't adjusted to her presence-just a static amber glow like late dusk" (CH12 S2).

## 12. Vision-only settings (filmable, no physical location)

- **Resonant city (ancestral echo):** "A city of curved towers beneath a sky veined with golden light. Not artificial-but tuned. People moved in quiet, rhythmic patterns-no devices, no guards. Children practiced something like song-not vocal, but harmonic-under the gaze of a teacher who radiated calm." / "A woman turned toward him, eyes bright with recognition." (CH10 S4). Classification: `ancient_vault` era / Ancients' civilization.
- **Place of light (CH04 S2):** "A place of light. Vast ceilings. Figures with mirrored silhouettes. Technology built from harmony."
- **Ancient vault memory (CH04 S5):** "The vault as it once was. A figure standing where he stood now, surrounded by light. And wings-not literal, but arcing energy behind them, like intent given form."
- **Collapse memory (CH08 S3):** "a shattered vault floor, caretakers broken by grief, a sky collapsing into silence."
- **Silent Choir hall (CH14 S2):** "There was a hall carved from stone that had never been lifted. Its shape was built of silence. … Within it stood a circle of figures. They did not speak. … At the center of the hall was a crystal bowl-empty." / "And the bowl began to hum."
- **Vessel and Thread (CH10 S6):** "a vessel, shaped in patience, carved not from metal or stone, but from the silence between stars" / "Above the vessel hung a thread of golden light." / "a single drop of water fell from the thread" / "A triple curve, joined in a ring."
- **Nine forms (Sensorium, CH09 S2):** "A sphere of pale gold began to form in the air" / "One knelt with arms outstretched. Another stood with a hand pressed to its chest. A third turned away | cloaked in darkness. The fourth reached toward something unseen. The fifth wept. The sixth held a spiral of flame. The seventh offered a seed. The eighth stood between two doors. The ninth… was absent." / "Thin lines of indigo light curled into arcs"
- **Jonah's mountain village (CH03 S3):** "A village on a mountain, where the people had learned to live by listening-not to words, but to the rhythm of the wind through the stone. … they stopped building walls and started carving openings-arches, columns, open space"

---

## C. Cross-cutting contradictions (consolidated)

1. **Vault 001 identity.** Wiki: Vault 001 = Giza, dormant, never entered. Prose: "scanner-slate-modified after Vault 1" (CH05 S1); "Vault 001 had allowed contradiction. Vault 002 filtered it." (CH05 S3/CH10 S2); "Vault 001 tolerated uncertainty." (CH10 S1); "the visionary silhouette from Vault 001" (CH07 S3); "a sealed volume inscribed with ancient glyphwork-Martian, from the first vault" (CH08 S1); "glyph resonance patterns from Vault 1" (CH08 S1); "Origin matches Vault 001 exit re-entry scan" (CH11 S1); "The same symbol Caeden had traced in Vault 001 during his first solo cycle" (CH11 S3); "The triple spiral from Vault One" [log CH09-E]; "himself at Vault 001, hand outstretched" (CH17 S3). But CH10 S4 says "the buried chamber beneath the Great Pyramid-Vault 001". In practice the prose often uses "Vault 001" for the first Martian vault.
2. **Vault 002 vs Ganymede.** Evelyn's log at the Ganymede threshold is located "Vault 002: Communion Threshold" [log CH08-C]; Thane's log "Convergence Alcove, Ganymede Vault" reports "Vault-002 Status: Evaluative" [log CH09-E]; CH09–CH11 counters say "since Vault 002 Activation" after departure to Ganymede.
3. **Mars vs Jupiter for the Rigel intercept.** "entered Mars orbital vector" [log CH13-A] vs Jupiter-shadow arrival (CH07 S5/CH13 S3/CH14 S2).
4. **Rigel timing.** ETA 72 h (CH07 S3/CH10 S5); T-36 h (CH07 S2); 86 h (CH12); 83 h (CH12); T-14:03:22 (CH12 S2); T-11:48:09 (CH14); T-4:01:09 (CH16).
5. **Caeden.** CAEDEN is a corporate AI (CH02, CH04, CH08), but Caeden is also a crew member: "Caeden Lor" (CH11) and "Caeden Merek" (CH13), seated in "Auxiliary Chamber 3A" (CH07 S2/CH16 S2).
6. **Departure.** "for the first time since leaving Earth" (CH16 S5, Marco) vs. the mission starting on Mars.
7. **Wiki seed locations vs prose:** Orbital Habitat IX, Council of Orbits, scaffold pylons, CH03 restricted-zone reclassification, CH08 subsurface-vault quarantine. None of these appear in the prose.
8. **Sensorium walls** (ship, contrasted with the hull): "The Sensorium's walls weren't hardpan steel like the rest of the ship-they were layered with resonance-absorbing alloy" (CH15 S2) vs. the `valkyrie_shipboard` "translucent bio-crystalline" dialect. Relevant when cutting between Mars industrial and ship.

## G. Global gaps (no canon anywhere)

Mars sky color and sun appearance; any Martian settlement; the vehicles at the dig other than the shuttle; Valkyrie-1's full exterior silhouette and size; how Valkyrie left the trench; all Earth physical locations (offices, command centers, labs in 2050, UN, Earth Sovereign Alliance HQ); Orbital Habitat IX; Giza in 2050; Europa base; Vaults 004, 005, 007, 008, 009, 010; Andes lake; the asteroid belt; Ganymede's surface at ground level; Rigel Ascendant's hull design.

---

## Top 12 filmable moments (visual, dialogue-light)

1. **CH01 S1 — South Trench, dawn — Galen, Aven.** Wind drags red dust in ribbons. The low sun breaks the crater rim and the half-buried silver hull answers it, dust settling into glyph-like lines. Key line: "The Valkyrie's surface caught it in a way that looked intentional. Not reflection-response."
2. **CH01 S3 — Trench shaft, 3 m down — Thane alone.** Thane holds a gloved hand near the hull, then traces three curves and a circle in the dust. The shimmer on his glove fades. Key line: "the hull of Valkyrie-1 gleamed like glass held under water. Not buried, not even resting-but waiting, like a door someone forgot to open."
3. **CH02 S1 — Outer excavation grid, morning glare — Thane.** Thane kneels with a scan wand before a spiral pressed into untouched dust. Key line: "A shallow spiral, three rings tapering outward-like a fingerprint pressed into sand and gently erased."
4. **CH03 S1 — Zone Theta descent shaft — Lena.** A platform lowers Lena 8 m into curved, edgeless planes. Glyphs rotate when she isn't looking. Key line: "Curved planes with no edges, like the inside of a fossilized lung. Breathing, but long dead."
5. **CH03 S4 — Trench platform at dusk, dimmed floodlights — full crew.** Glow branches across the wall, a pressure wave staggers the crew, and the wall folds silently into a lit corridor. Key line: "It folded-slowly, silently-into itself, revealing a corridor of pale light and translucent structure. / There was no door."
6. **CH04 S1–S2 — Vault 002 threshold and domed chamber — Galen, Thane, Aven.** Galen steps through, a thread of light runs from the ship into the vault behind him, and a dome of glowing spiral veins opens ahead. Key line: "Galen stepped through the threshold. / And the light followed him in."
7. **CH04 S5 — Vault 002 elliptical chamber — Thane, Galen, Aven, Jonah, Lena.** A mist pillar with a rising spiral of light stands under a ceiling scored like wind on stone. Key line: "a thin pillar rose. Not metal. Not mineral. It shimmered like coalesced mist, solid only by consensus."
8. **CH06 S2 — Excavation field landing — Lena, Amar Cael.** A sterile corporate shuttle sets down and its ramp hisses open. Amar steps out of the shadowed cabin into red light, and the two walk the ridge to the trench where vault light pulses below. Key line: "And from the shadowed cabin, Amar Cael stepped into the red light."
9. **CH07 S5 — Observation Deck over Ganymede — Galen.** Galen stands at the viewport above the ice under Jupiter, the Rigel Ascendant slipping through its shadow. He sees his reflection in the glass and says one word, "Proceed." The dome flexes. Key line: "the fractured gleam of Ganymede's ice below-ragged, vein-lit, ancient. … Jupiter hung above them-vast, indifferent, rimmed in silent motion."
10. **CH08 S5 — Ganymede vault convergence ring — full crew.** Palms go down one by one on the arc, glyphs ignite, and a spiral staircase of light forms step by step into darkness. Key line: "A spiral staircase of light descended into darkness, pulsing to the crew's alignment. Each step formed as they were ready."
11. **CH10 S4 — Vault 002 harmonic archive → Giza vision — Thane.** Thane sees a city of curved towers under a gold-veined sky, then stands alone on sunless pale-gold sand before the buried chamber, where the grains curl into the sigil. Key line: "Giza. / The sand was finer. Pale gold. Sunless. Still. / He stood alone before the buried chamber beneath the Great Pyramid-Vault 001."
12. **CH17 S3–S5 — Vault 003 forms inside the ship, then translation — Thane, then crew.** Corridor plating becomes prismatic curves and a triple-helix walkway spirals down to a pale-blue veil. Outside, space curls, and the Rigel logs a micro-lensing blip as Valkyrie vanishes. Key line: "The spiral path ended at a translucent veil shimmering with pale blue energy. Not blocking. Waiting." / "Outside the hull, space folded-not bent, not torn-curved into consent."

Alternates: CH09 S5 Witness Circle ("all of it built from a soft, radiant fog … footprints in still sand"); CH07 S3 Ganymede ice vision ("wings … spanning kilometers of frozen terrain"); CH14 S2 Silent Choir with "Jupiter's storm wall"; CH08 S3 transit ("Valkyrie didn't accelerate. She unfolded.").
