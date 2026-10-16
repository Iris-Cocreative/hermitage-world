# Hermitage World — homepage prototype

Built from Munia's Figma frames in the `Hermitage-World` file (`lLDFhmwK4zbTuREtOc6sRC`),
with the temple animation as the hero, refined per the 9/18 weekly design review.

**LIVE: https://lab.iriscocreative.com/hermitage-world/**

Published from `iris-webflow-scripts/hermitage-world/` via the GitHub Git Data API — no
checkout, so the shared clone (which usually has a second session's uncommitted work in it)
is never touched. The deploy script refuses to run if any commit from outside this deploy has
touched the path upstream, because the API does no merge — it writes exactly the tree it is given.

| Round | Figma frame | Date |
|---|---|---|
| First build | `79:193` "MacBook Pro 16 - 1" | 2026-09-19 |
| Current | `175:425` "MacBook Pro 16 - 14" | 2026-09-22 |

To work on it locally, serve over http (three.js loads as ES modules):

```powershell
# from hermitage-world/v3
python -m http.server 8732 --bind 127.0.0.1
# then open http://127.0.0.1:8732/
```

## Files

| File | What |
|---|---|
| `index.html` | The page. Hero markup contract at the top of `<body>`; everything else follows the Figma section order. |
| `assets/hw3.css` / `assets/hw3.js` | Page styles + behaviors (reveal-on-scroll, five-lights slider, hallway accordion, newsletter demo submit). |
| `assets/temple.js` / `assets/temple.css` | The 3D hero as a section-mounted module. Ported from `iris-webflow-scripts/temple-hero/` (source untouched). `window.__temple` exposes tuning (`seek(p)`, `render()`, `freeze()`). |
| `hero-test.html` | Standalone harness for the hero alone. |
| `assets/hw-logo.js` | Animates the mark. One rAF for every instance; idles when nothing is on screen or the tab is hidden; does not run at all under `prefers-reduced-motion`. |
| `assets/logo/mark.weft.json` | The Weft patch the mark comes from — paste it onto the loom to retune it. |
| `assets/fig4/` | Exports from the current frame `175:425`. |
| `assets/figma/` | Exports from the first frame `79:193`, kept for what the current page still references. |

**Image exports are always compressed on the way in** — photos to JPEG (q82, progressive,
long edge capped at what the layout renders), art with alpha to WebP (q85), SVGs as exported.
Figma hands back raw PNGs of 6–8 MB apiece: round one was 28 MB → 1.9 MB, round two 22.1 MB → 2.1 MB.

## Decisions carried from the 9/18 meeting (artifact "Hermitage World — Weekly Design Review")

- **The stone-circle temple IS the landing page** (Garry, 11:03). In motion it says architectural, credibility and age, monastic without being religious.
- **"Entering a space."** Samuel (17:33): visitors expect a video-game-like sense of entering, not static word pages.
- **Renaissance, not medieval** (James, 24:57). Refined: lighter warmer stone, coffered dome + oculus, arches, more luminous fill, gentler grade.
- **Marcellus wins** for titles (28:02). The first frame used IvyPresto Headline Thin for secondary headings and the build overrode it to Marcellus; frame `175:425` now specifies Marcellus throughout, so design and build agree.
- **Warm nature palette** (26:43); sunrise through the canopy is the oculus image.
- Stained glass light casting colored shadows belongs in *another* moment, not the hero (25:25) — the new frame does exactly that at the threshold and behind the mission.
- Stick-figure friar as a recurring brand signature (13:04); glowing "Holos" treatment reserved for an AI mode. Not on the homepage yet.

## The 3D interaction (what changed vs the temple-hero source)

- The **floor collapse is gone**. For a place whose promise is "five lights hold this place up," the floor falling away was the wrong metaphor. Scroll now *enters*: the camera dollies forward and down through the beam toward the central dais, the ripple calms to a slow breath, the oculus light widens to bathe the floor, and the title rises out. The last frame's edges match the page ground `#1f1405` so the hand-off into "You are not alone in your longing" is continuous.
- **Renaissance pass:** coffered dome with an oculus, an arcade of round-headed arches on pilasters, warm travertine, luminous fill with cool shadows, and a highlight knee in the grade (`uCream`) so the lit pool never clips to white.
- **Eight-fold floor plan** nodding to the 8-around-1 mark, rotated 22.5° so no radial joint runs down the camera axis.
- **Pointer parallax** (±2–3° yaw/pitch, eased, off on touch) for the in-the-space feeling.
- Progress comes from the hero section (a sticky stage inside a ~260vh section), not the document.

## What changed in the 9/22 round (frame `175:425`)

- Hero type drops down the frame and grows; a hairline circle sits above the title.
- Nav gains real links (Friar Justin · The Library · Meditation) and a gold icon button.
- Threshold: the flat stained-glass line drawing becomes a **photographic arched window**; the big arch outline turns bronze.
- The oculus ground carries large faint bronze line-art; attribution becomes "— Friar Justin".
- Five lights: each value gets its own line-art glyph and its **own** sentence, replacing the one line repeated across all five.
- **Hallways restructured**: an arched photo card, and below it a separate **accordion** card (title + subtitle + chevron) that expands to the body copy.
- **New Friar Justin section** — "Founded on a Friar's conviction that peace *is learnable*" with the gold friar roundel — fills the slot where the first frame had an empty band. The build had provisionally put an "In Person · Indianapolis" section there; that is now removed.
- Newsletter goes gold: hairline card, gold inputs, gold submit. A **second signup strip** appears above the footer.
- Mission moves onto a photographic ground (the warm stained-glass hall at 30%).
- Footer gains an about line and two link columns.

## The mark

The wordmark's circle is the **eight-around-one mark**, animated: eight satellites
around one centre, each breathing on its own slightly detuned sine so the ring never
pulses in lockstep. It replaces the plain circle outlines the Figma frame uses as
placeholders, in both the nav and the footer lockups.

It came out of a Weft patch, and the patch stays the source of truth — the geometry
and the pulse expression are lifted verbatim into `assets/hw-logo.js`:

| | |
|---|---|
| satellites | 8, at radius 211 from centre |
| centre disc | radius 125 |
| satellite radius | 39.3 × pulse |
| pulse | `min + (max - min) * (0.5 + 0.5 * sin(t * (0.8 + 2.4 * Z) + Z * 39.7))`, min 0.79, max 1.01 |
| detune `Z` | 8 seeded values in [0, 0.01), Weft's `sets/random` with seed 262.8 |
| stroke | 7 units, fill and stroke the same colour |

Two departures from the patch, both deliberate. The patch paints on a dark canvas in
`#faf0c7`; the page draws the mark in `currentColor` so it takes the colour of the
lockup it sits in. And the mark is inline SVG rather than canvas — crisp at any size,
no DPR handling, and correct with JavaScript off, because the satellites are authored
at the midpoint of their pulse. The script only animates `r`.

The hero's large circle is left as the frame draws it: it is a compositional element
behind the title, not a logo lockup. Making it the live mark at 384px is an option
worth a look, but it would compete with the temple scene behind it.

## Copy

Figma copy is verbatim where it was real. Where the frame still shows lorem ipsum (threshold
lede, hallways lede, calendar row descriptions, newsletter paragraph) the build keeps the real
copy carried over from `v2/index.html`. Corrections made against the mockups, all deliberate:

- "Docterine" → "Doctrine"
- "Hermitageexists" → "Hermitage exists"
- Footer credit "C.Lab" (a leftover from another project) → "Hermitage World"
- The frame labels **both** Deepen and Remember "Friar Justin & the Library"; Deepen uses "Full living & the practice space"
- The footer's second column ends at "Formerly " → "Formerly hermitageindy.org"

## Known gaps

- The hero end state is a touch dim on some displays; `__temple.key.intensity` and `__temple.gradePass.uniforms.uCream` are the knobs.
- Nav and footer links point at page anchors or `#` — there are no subpages yet.
- No favicon (the lab root has none either).

## Open questions for Munia / the client

1. Hero title placement against the live scene — the frame positions type over a still, and the beam moves.
2. Is the five-lights row a slider (the frame has arrows) or a static staggered row on desktop?
3. The sitemap makes "In Person · Indianapolis" its own nav item, but the homepage frame no longer has an in-person moment. Does one belong here?
4. "Formerly hermitageindy.org" — confirm the wording for the old-site link.
