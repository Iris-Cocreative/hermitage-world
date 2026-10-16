# Hermitage World homepage v2 — notes

Prototype v0.2, built 2026-09-08 from the 2026-08-04 review with Garry and Samuel. Same world as v1 (Concrete & Light, `DESIGN.md`); v1 is untouched at `../index.html`. Open `v2/index.html` over http (not `file://`) so fonts and the walk line load.

## What changed, and which review point it answers

| Section | v1 | v2 | Answers |
|---|---|---|---|
| Hero | Plaster wall with a scatter of apertures | **The atrium**: a punched clerestory wall receding to the right in one-point perspective, the morning sun coming through it as blurred shafts and landing on the floor as skewed squares of light; ribs of a vault converge on a point above the frame so the ceiling never arrives. Light arrives once on load (opacity only), static under reduced motion. | Garry: spacious, volume without containment, the airport atrium; "squares with the sun streaming through" as the textured take on the hero. Clean and textured are one composition, not two options. |
| Nav | The Path · Gatherings · Friar Justin · Library | The Path · Gatherings · **In Person · Indianapolis** · Friar Justin; wordmark carries a nine-circle ring mark (placeholder for the logo stream). Hero wayfinding line: "Online, from anywhere · In person, Indianapolis." | Decision: online is the dominant framing; in-person gets its own nav presence. |
| Threshold | Door | Door with a faint oculus at eye height: the circle inside the block. | Samuel: block and circle together. |
| Five lights | Unchanged | Unchanged (values as lit apertures). | — |
| The path | Three equal portals in a row | **The walk**: a "You are here" aperture, then an orthogonal path line drawn from the portals' real positions, with square turn markers; the three hallways sit at stepped heights. Hovering or focusing a hallway lights the turn that leads to it. Copy: "None of them run straight… That is not a flaw in the path. It is the path." A square-and-circle lattice sits faintly in the wall. | Samuel: the spiritual path is not linear (Monument Valley, Escher); the pattern Garry responded to, tradition-neutral. |
| The week | Three hairline rows | A real **seven-day board**: Tue Worldwide Energy Circle, Wed The Way Between, Thu Yvonne's classes, Sat Train Your Mind, Sun Contemplative Unity; empty days stay empty on purpose. Each slot has a lit glass pane. "Shown in your time (zone)" is filled from the visitor's browser; a note states that times and links are placeholders. | Samuel's September online schedule as the independent front door. |
| In person | (none) | **"Also in person, in Indianapolis"** board beneath the week: Sunday in the room at the Indiana Interchurch Center, the Prayer of Quiet retreat, visiting teachers. | James's answer in the call: in-person proves real people in a real place, and is where the photographs come from. |
| Community | Headline + signup | **The ring**: eight seats around "the quiet space within"; Indianapolis, United States, Australia and Europe lit, one seat drawn open, "A seat for you." | Block and circle; the 8-around-1 form as a structural motif, not only a logo. |
| Founder | "Founded on a friar's conviction… not a memorial" | Reframed as **foundation, still being built on**: "Peace is learnable. That was the founder's whole claim." The italic question "what can these thoughts do for you?" and a four-step **lineage board** (1985 house → Success: Full Living → Worldwide Energy Circle since 2020 → Train Your Mind and the teachers after him, lit as "Now"). Photo stays a labeled pending frame. | Garry: don't push Justin too hard, Richard Rohr as the model; Samuel: living legacy through teachers and new programs. |
| Close / footer | Unchanged | Footer nav gains In Person; disclaimer bumped to v0.2. | — |

Kept from the system: Marcellus / Alegreya Sans / Alegreya italic rules, square corners, amber as the only UI accent, glass-only blue and madder, apertures igniting as the one authored moment, no eyebrows, no gray, no stock imagery, forms that say what they are.

## Verified

- Desktop 1440×900 and mobile 390×844, every section, headless Chrome via Playwright. No horizontal overflow; console clean on both.
- Impeccable detector: one advisory (an SVG label size inside the ring figure, a scaled SVG unit rather than a CSS type step). No defects.

## Open questions for Garry and Samuel

1. **Times.** The week shows 7 pm and 10 am Eastern as placeholders. What are the real times, and should the board show Indianapolis time with the visitor's own beneath it, or only the visitor's?
2. **Yvonne's classes and The Way Between.** Which day and cadence should each sit on? Both are placed by guess.
3. **In person.** Is Sunday Contemplative Unity really happening in the room at the Interchurch Center from September, and is the Prayer of Quiet retreat in person this year?
4. **The ring's seats.** Indianapolis, the United States, Australia and Europe are lit. Should seats name cities or circles instead (energy circles, wisdom circles)?
5. **The hero wall.** The apertures are punched in the wall with no glass color on the light side. Do you want a few of them to carry the amber, blue and madder glass tints more strongly, or stay as pure openings?
6. **The lineage.** Four steps are shown. Are there teachers or programs that must be named here (Yvonne by full name, Mark Bedwood's retreats), or is naming better left to the Friar Justin page?
