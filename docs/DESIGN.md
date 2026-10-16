---
name: Hermitage World
description: Concrete & Light — a sacred-modernism material world for HermitageWorld.org (design system v0.1, seed f03e9f46)
colors:
  plaster: "#F1EBDF"
  plaster-deep: "#E6DECC"
  concrete: "#A79D8C"
  concrete-deep: "#7E7566"
  shadow: "#221B12"
  shadow-2: "#2C241A"
  ink: "#2B241B"
  ink-soft: "#5C5344"
  lumen: "#F5EDDC"
  lumen-soft: "#C4B69C"
  amber: "#D99A2B"
  amber-bright: "#F2BE5A"
  amber-deep: "#8A5F14"
  glass-blue: "#5B7BAE"
  glass-blue-deep: "#33507D"
  madder: "#B14A31"
  madder-deep: "#8C3822"
  bronze: "#8A6B3F"
typography:
  display:
    fontFamily: "Marcellus, 'Times New Roman', serif"
    fontSize: "clamp(2.6rem, 6.4vw, 5.5rem)"
    fontWeight: 400
    lineHeight: 1.12
  headline:
    fontFamily: "Marcellus, 'Times New Roman', serif"
    fontSize: "clamp(1.9rem, 3.6vw, 2.9rem)"
    fontWeight: 400
    lineHeight: 1.12
  voice:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "clamp(1.35rem, 2.6vw, 1.75rem)"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "'Alegreya Sans', 'Segoe UI', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.65
  inscription:
    fontFamily: "Marcellus, 'Times New Roman', serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    letterSpacing: "0.22em"
  mono:
    fontFamily: "Consolas, monospace"
    fontSize: "0.82rem"
  scale:
    stage-marker: "0.78rem"
    free-tag: "0.8rem"
    inscription: "0.8125rem"
    code: "0.82rem"
    fine-print: "0.85rem"
    note: "0.875rem"
    caption: "0.9rem"
    secondary: "0.95rem"
    card-body: "0.98rem"
    control: "1rem"
    wordmark: "1.05rem"
    styleguide-body: "1.0625rem"
    quote-compact: "1.1rem"
    body: "1.125rem"
    lede-min: "1.15rem"
    title-sm: "1.2rem"
    title: "1.25rem"
    title-md: "1.35rem"
    bay-title: "1.4rem"
    wing-title: "1.5rem"
    portal-title-min: "1.6rem"
    section-alt-min: "1.7rem"
    voice-max: "1.75rem"
    founder-min: "1.8rem"
    headline-min: "1.9rem"
    specimen-min: "2rem"
    portal-title-max: "2.1rem"
    styleguide-head-min: "2.2rem"
    hall-hero-min: "2.3rem"
    styleguide-h2-max: "2.4rem"
    display-min: "2.6rem"
    headline-max: "2.9rem"
    community-max: "3.2rem"
    specimen-max: "3.4rem"
    styleguide-head-max: "3.6rem"
    hall-hero-max: "4.2rem"
    display-max: "5.5rem"
rounded:
  none: "0"
  focus-ring: "1px"
spacing:
  s1: "0.5rem"
  s2: "1rem"
  s3: "1.5rem"
  s4: "2.5rem"
  s5: "4rem"
  s6: "6rem"
  s7: "9rem"
components:
  button-primary:
    backgroundColor: "linear-gradient(180deg, #F2BE5A, #D99A2B)"
    textColor: "#2A1E06"
    rounded: "{rounded.none}"
    padding: "0.85em 1.7em"
  button-primary-hover:
    backgroundColor: "linear-gradient(180deg, #F7CB74, #F2BE5A)"
    textColor: "#2A1E06"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.85em 1.7em"
  input-field:
    backgroundColor: "#FBF8F1"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0.8em 1.1em"
---

# Design System: Hermitage World — Concrete & Light

## Overview

**Creative North Star: "Concrete & Light" — the hermitage built as a modern chapel.**

This world is sacred modernism in the lineage of Ronchamp and Breuer: vast quiet planes of warm material — sunlit plaster, board-formed concrete, umber shadow — with light entering only through deliberate, punched apertures. It refuses the category defaults (serene nature photos, sage gradients, lotus minimalism) and builds architecture instead: mass, proportion, threshold, light. Sacred without announcing itself; interfaith by construction, because mass and light belong to no single tradition.

A page is a sequence of rooms. Grounds own whole sections — daylight plaster, a concrete passage, an umber interior, daylight again — and the visitor's scroll is a walk through the building. The system's one signature element is the aperture: a splayed opening cut through the wall with glass set deep in the reveal, dark in daylight rooms and ignited in shadow rooms. Its ignition is the site's single authored motion moment.

The truth source for tokens and components is `assets/hw.css`; behavior lives in `assets/hw.js`. `styleguide.html` is the human-readable companion to this file — a rendered specimen page of the same system, useful for review, not a second source of truth. Everything renders and reads without JavaScript; JS only adds choreography.

**Key Characteristics:**
- Materials, not colors: grounds own entire sections; no stripes, no accent panels.
- Light is the only decoration, and it is always authored (an aperture, a doorway glow, a control).
- Amber is the sole UI accent; glass blue and madder exist only as glass.
- Square corners everywhere; depth is carved inward (inset shadows), never floated.
- One motion moment: apertures ignite, staggered, as the visitor enters a dark room.
- Nothing warmer than plain words: no eyebrows, no badges, no decorative chrome.

## Colors

The palette is a set of building materials plus three colors of glass; every value is warm-biased — even the darks are umber, never blue-black.

### Primary
- **Amber** (`#D99A2B`, bright `#F2BE5A`, deep `#8A5F14`): the hand of the place. Every primary action is amber — buttons, links, lit glass, the wordmark's lit pane, focus rings. `amber-deep` is the legible form on plaster (link text); `amber-bright` is light itself (lit glass, links on shadow grounds).

### Secondary
- **Glass Blue** (`#5B7BAE`, deep `#33507D`): appears only inside aperture glass and bay glows. Never on text, buttons, borders, or any interactive element.

### Tertiary
- **Madder** (`#B14A31`, deep `#8C3822`): the third glass color, same restriction as blue — with one carved-out functional exception: form error states use madder (`madder` for the invalid input border/ring, `madder-deep` for error text on plaster, `#E89A82` for error text on shadow).

### Neutral
- **Plaster** (`#F1EBDF`) / **Plaster, raking light** (`#E6DECC`): the two light grounds.
- **Board-formed concrete** (`#A79D8C` → `#7E7566`): passage sections and pending-asset frames; always rendered as a top-to-bottom gradient (e.g. `#6B6254 → #4E483D` for the concrete ground band).
- **Shadow** (`#221B12`) / **Shadow raised** (`#2C241A`): the dark interior grounds and footer.
- **Ink** (`#2B241B`) / **Ink soft** (`#5C5344`): text on plaster; `ink-soft` is the secondary voice — warm, never gray.
- **Lumen** (`#F5EDDC`) / **Lumen soft** (`#C4B69C`): text on shadow, same primary/secondary pairing.
- **Bronze** (`#8A6B3F`): hardware — fine rules, list markers, small standalone glyphs.

### Functional (the shadow/light modeling ramp and set pieces)
The architecture is carved with translucent overlays, never with new opaque surfaces:

- **Shadow modeling ramp** (`rgba(0,0,0,.05–.75)`): the black alpha steps that build every splayed reveal, inset recess, and hairline on light grounds — .05 (quiet-button hover wash, board-form seams), .12 (aperture splay mid-stop), .26/.30/.38/.42 (reveal gradient stops), .35–.6 (inset recess shadows), .75 (the door's deepest inset).
- **Light modeling ramp** (`rgba(255,255,255,.03–.5)`): the white alpha steps for opposing edge highlights (.03–.08), formwork seams and hairlines on shadow (.05–.22), button top-edge bevels (.45–.5).
- **Daylight wash** (`#FFFBEE`, applied as `rgba(255,251,238,.9)`): the hero's raking morning light across the plaster.
- **Glass hotspots** (`#FFF8E6` amber, `#FFF3D8` wordmark pane, `#EEF3FC` blue, `#FDEEE8` madder): the near-white centers of lit-glass radial gradients.
- **Unlit glass darks** (`#1A1408`, `#171208`, `#201503`): the near-black amber-tinted stops inside unlit and lit aperture panes; `#241A08` is the symbol color inside a lit aperture.
- **Interior gradient stops** (section set pieces, always as top-to-bottom or radial pairs): door `#14100A → #1B150C`; portals `#191309 → #241D12`; bays `#4A3D28/#3A2F1E`, `#322A1C/#271F13`, `#1D1810/#14100A`; concrete ground band `#6B6254 → #4E483D`; pending-asset frame `#6B6254 → #56503F`.
- **Control tints**: `#F7CB74` (primary-button hover top stop), `#2A1E06` (the button's engraved text), `#FBF8F1` (input field background), `#E89A82` (error text on shadow grounds).

### Named Rules
**The Grounds Rule.** Colors behave like materials: a ground owns a full-bleed section (`.ground-plaster`, `.ground-deep`, `.ground-concrete`, `.ground-shadow`, `.ground-shadow-2`). Dark sections take `.on-shadow` to switch the text/link palette. Never use a ground color as a stripe, chip, or accent inside another ground.

**The Glass-Only Rule.** Blue and madder never touch the UI. If it is clickable, focusable, or a state, it is amber (errors excepted, per Tertiary above).

**The Warm Dark Rule.** No neutral grays and no blue-blacks anywhere. Secondary text is `ink-soft`/`lumen-soft`; darks are umber.

**The Modeling Ramp Rule.** Pure black and pure white never appear as surfaces or text. They exist only as translucent modeling steps (the functional ramps above) that carve depth and light into documented grounds.

## Typography

**Display Font:** Marcellus (with 'Times New Roman', serif)
**Body Font:** Alegreya Sans (with 'Segoe UI', sans-serif)
**Voice Font:** Alegreya italic (with Georgia, serif)

**Character:** Lapidary Roman capitals over humanist warmth. Marcellus carries a single weight (400) — scale and case do all the hierarchy work, like letters cut into concrete. Alegreya Sans (400/500/700) is the reading and interface voice. Alegreya italic is reserved for one thing only: a human being speaking.

### Hierarchy
- **Display** (400, `clamp(2.6rem, 6.4vw, 5.5rem)`, 1.12): hero headline only. All headings use `text-wrap: balance`.
- **Headline** (400, `clamp(1.9rem, 3.6vw, 2.9rem)`, 1.12): section headings. Page-level heroes on sub-pages sit between display and headline (`clamp(2.3rem, 5vw, 4.2rem)`, may take uppercase + `.08em` tracking as on the Friar Justin hall).
- **Subheading** (Marcellus 400, 1.15–1.5rem): card and row titles (portals, bays, gatherings, library wings).
- **Voice** (Alegreya italic 400, `clamp(1.35rem, 2.6vw, 1.75rem)`, 1.5, max-width 30em): quoted human speech, always with a `cite` set in Alegreya Sans 0.95rem in the soft text color.
- **Body** (400, 1.125rem, 1.65): measure capped at 66ch (`--measure`). Ledes scale up to `clamp(1.15rem, 1.7vw, 1.35rem)` and use the soft color.
- **Inscription** (Marcellus 400, 0.8125rem, uppercase, tracked 0.22em, soft color): carved capitals. Component variants track and size differently (day markers 0.95rem/.14em, bay stage markers 0.78rem/.2em, wordmark 1.05rem/.18em).
- **Caption/secondary steps** (Alegreya Sans, 0.78–0.98rem): the built ramp's minor steps, always in the soft color — 0.98rem card body, 0.95rem secondary text and cites, 0.9rem compact cites, 0.875rem notes and disclaimers, 0.85rem fine print and durations, 0.8rem "Free" tags. The full enumerated ramp lives in the frontmatter `typography.scale`.
- **Mono** (Consolas, monospace, 0.82rem): code literals in `styleguide.html` only — never on the site pages.

### Named Rules
**The Voice Rule.** Alegreya italic appears exclusively as quotation — Friar Justin, the mission, named endorsers — inside `.voice` or the endorsement blockquotes, always cited. If it isn't a person speaking, it isn't italic serif.

**The Standalone Inscription Rule.** The inscription style is an architectural element: dedication lines, wayfinding, day-of-week markers, form labels, pending-asset captions. It is never placed as a small label above a heading — this system has no eyebrows or kickers.

**The One-Weight Rule.** Marcellus ships in one weight. Emphasis within display type comes from size, case, and tracking, never boldness.

## Layout

The page is a vertical sequence of full-bleed ground sections ("rooms"), each `padding-block: clamp(4rem, 10vw, 8.5rem)` (`.section`). Content sits in a single `.container`: max-width 1180px, `padding-inline: clamp(1.25rem, 4vw, 3rem)`. The spacing scale is `--s1`–`--s7` (0.5 / 1 / 1.5 / 2.5 / 4 / 6 / 9rem); prose measure is 66ch.

Grids are per-component and collapse to one column on small screens: portals `1.08fr 1fr .94fr` (aligned to `end`, deliberately unequal heights — collapses ≤900px), bays `repeat(3, 1fr)` (≤860px), library wings `1.2fr 1fr 1fr` (≤900px), founder band `minmax(260px, 380px) 1fr` (≤820px), gathering rows `11rem 1fr auto` (≤760px). The five-value row is a wrapping flex that locks to a single `nowrap` row ≥1100px. The nav collapses to a toggled panel ≤860px.

Composition habit: hero content anchors low (flex column, `justify-content: flex-end`, `min-height: 100svh`); dark sections often center their text; aperture scatters are hand-placed with inline `top/right/--ap-size` values, asymmetric like Ronchamp's south wall — never grids. On mobile the hero keeps a small four-aperture clerestory clear of the headline and hides the rest.

## Elevation & Depth

Depth is carved, not cast. This building has almost no drop shadows: apertures, portals, bays, the door, the pending-asset frame, and the wordmark's mark all model depth with **inset** shadows (e.g. `inset 3px 5px 14px rgba(0,0,0,.6)` plus a faint opposing highlight `inset -2px -2px 8px rgba(255,255,255,.03)`), so elements read as recesses cut into the wall.

Surface texture is part of depth: `.plaster` overlays a fractal-noise SVG at 0.045 opacity (multiply); `.shadowed` uses the same noise at 0.10 (screen); `.board-form` adds vertical formwork seams every 240px via repeating-linear-gradient.

### Shadow Vocabulary
- **Recess** (`inset 3px 4-6px 9-16px rgba(0,0,0,.5-.75)` + opposing white inset): apertures, portals, bays, door, pending frames.
- **Amber glow** (`0 2px 10px rgba(140,95,20,.35)` rest → `0 4px 20px rgba(140,95,20,.45)` hover, plus `inset 0 1px 0 rgba(255,255,255,.45)`): primary buttons only — light coming off a control.
- **Lit halo** (`0 2px 26px 4px` in the glass color at 55% alpha): a lit aperture casting into the room.
- **Canopy** (`0 1px 0 rgba(43,36,27,.12), 0 6px 24px rgba(43,36,27,.08)`): the scrolled nav bar; the mobile menu drops `0 18px 30px rgba(43,36,27,.18)`.
- **Hover lift** (`0 18px 40px rgba(0,0,0,.45)` + an inward amber underglow): portals on hover/focus, paired with a 4px rise.

### Named Rules
**The Carved-Not-Cast Rule.** Resting surfaces never float. Outward shadows exist only as light (amber glow, lit halo) or as a response to state (nav scrolled, portal hover).

## Shapes

Square corners everywhere — this building has no rounded edges. Buttons, inputs, apertures, frames, and cards are all hard-cornered (`border-radius` is never set; the sole documented exception is the `focus-ring` token — a 1px radius on the `:focus-visible` outline, a rendering nicety that softens the ring's corners, never a shape decision for surfaces). The recurring silhouettes are architectural: the splayed square aperture (three nested layers, each inset deeper), the tall 5/7 door, 4/5 portrait frames, and rule-separated boards (1px hairlines in the ground's foreground at 12–22% alpha) instead of boxed cards.

## Components

### The Aperture (signature element)
A splayed opening punched through the wall, glass set deep in the reveal. Class `.ap`, sized by `--ap-size` (observed 24–108px; 108px on the values wall, 34–40px in clerestory rows and closes), glass color by `--ap-glass`.
- **Anatomy (three layers):** the outer reveal (diagonal 135° gradient of shadow-to-highlight + deep inset shadows); an intermediate splay step (`::before`, inset 11%, opposing 315° gradient — makes the wall read thick); the glass pane (`::after`, inset 26%, radial gradient).
- **States:** unlit (default) — the glass is nearly black, the opening reads as shadow; **lit** (`.lit`) — the pane blooms from a near-white hotspot (`#fff8e6`) through the glass color, gains an inner glow and the lit halo. Transition: background and box-shadow over 0.9s on `--ease-out`.
- **Variants:** default amber; `.ap-blue`; `.ap-madder`.
- **Ignition (the one authored moment):** a container with `data-ignite-group` observed via IntersectionObserver (threshold 0.15, rootMargin -5% bottom); its `.ap[data-ignite]` children add `.lit` staggered at 200ms + 220ms per aperture. Under `prefers-reduced-motion`, every aperture is simply lit on load with no transition. Light grounds keep apertures unlit (the hero scatter never ignites).
- **Contents:** a lit aperture may hold one of the five value symbols (an SVG at 46% of the aperture, stroke 1.7, dim warm white `rgba(245,237,220,.5)` unlit → dark umber `#241A08` when lit). An unlit aperture is always empty.
- **Composition:** hand-placed asymmetric scatters or centered clerestory rows — never grids.

### The Five Symbols
One glyph per core value, drawn in a single 1.7 stroke weight, geometric and tradition-neutral (radiant point; unclosed circle; two overlapping circles; form being drawn; five points, one web). They live inside lit apertures and may appear alone as bronze line-work at small sizes. No other icon system exists.

### Buttons
- **Shape:** hard-cornered (0 radius), inline-flex, Alegreya Sans 700 at 1rem, tracked 0.02em, padding 0.85em/1.7em. Transitions 0.25s on `--ease-out`. Nav variant is compact (0.55em/1.2em, 0.9rem).
- **Primary:** vertical amber gradient (`#F2BE5A → #D99A2B`) with engraved dark-amber text `#2A1E06` and the amber glow. Hover lightens the gradient and widens the glow. The engraved text color never changes, even on shadow grounds where links go amber-bright.
- **Quiet:** transparent with a 1px outline in the ground's own foreground at 35–40% alpha; hover solidifies the outline and adds a 3.5–5% wash. Uses `ink` on plaster, `lumen` on shadow.
- **Disabled:** opacity 0.55, `cursor: not-allowed`.

### Portals & Bays
Doorway cards. **Portals** (homepage hallways) are tall dark recesses (min-heights 400–480px, deliberately unequal, bottom-aligned content) with an amber glow bleeding down from the lintel, uppercase Marcellus titles tracked 0.14em, `lumen-soft` body, and an `amber-bright` bold "go" line. Hover/focus: rise 4px, warm from below, gain the hover-lift shadow — never scale, never bounce. **Bays** (Friar Justin page) are the non-interactive sibling: same recess construction, each glowing in its own glass color (amber / blue / warm white), with an inscription-style stage marker pinned at top.

### Gathering Rows
Schedules are carved boards, not cards: a `11rem 1fr auto` baseline-aligned grid per row, separated by 1px hairlines (`rgba(43,36,27,.18)` on plaster). The day is an inscription; the title is Marcellus ~1.35rem; the description is `ink-soft`; the action is a bold amber text link with an `→`. Never boxed.

### Shelf Lists (library)
Hairline-separated `<ul>` rows on shadow grounds: title left, duration (`lumen-soft` 0.85rem) or a bold `amber-bright` "Free" tag right. Hover: a 7%-alpha amber wash and the title slides 0.4rem right (0.25s).

### Voice Quote
`.voice` blockquote — Alegreya italic at voice scale, max 30em, with a block `cite` in Alegreya Sans 0.95rem, soft color, tracked 0.04em, `--s3` above. Works on any ground. Endorsement quotes are the compact form (1.1rem) in an `auto-fit minmax(240px, 1fr)` grid.

### Pending Asset Frame
`.asset-pending` — the honest placeholder for unsupplied photography: a concrete-gradient recess (`#6B6254 → #56503F`, 1px inner white hairline + inset shadow, min-height 300px or an explicit aspect ratio, 4/5 for portraits) holding a centered inscription ("Photograph to come") and a small caption naming the real asset and its source. Never stock imagery.

### Inputs / Forms
- **Style:** hard-cornered, `font: inherit`, background `#FBF8F1`, 1px border in `ink` at 40% alpha, placeholder in `ink-soft`. Labels are inscriptions above the field.
- **Focus:** the global ring — `outline: 2px solid amber`, offset 3px (0 offset inside signup rows).
- **Error:** border and 1px ring in madder on the input; a `role="status"` message below in `madder-deep` (or `#E89A82` on shadow) naming the problem and the recovery ("Enter your email address so the letter can reach you."); cleared on input. The prototype never fakes success — valid submits state plainly that the live site will complete the action.
- **Disabled:** input opacity 0.65 (used for the not-yet-live Soul Guide preview, labeled "In development").

### Navigation
Fixed full-width bar, transparent at top; after 40px of scroll it gains a 92% plaster wash, 10px blur, and the canopy shadow. Wordmark: a 17px shadow-recess mark with a lit amber pane beside "HERMITAGE WORLD" in inscription-style Marcellus (1.05rem, tracked 0.18em) — a placeholder pending the logo design. Links are Alegreya Sans 500 at 0.95rem, `ink` → `amber-deep` on hover; one primary button rides at the end. Pages that open on a dark hero add `.on-dark`: until scrolled, wordmark and links render in `lumen` with `amber-bright` hovers. ≤860px, links collapse into a plaster dropdown panel behind a bordered "Menu" toggle (aria-expanded managed in JS; panel closes on link click).

### Footer
A shadow-ground room: `lumen` wordmark, `lumen-soft` text and links (hover `amber-bright`, no underline), link columns as `display: grid; gap: .45rem` navs, and a hairline-topped fine-print row (0.85rem) carrying the copyright and prototype disclaimers.

## Do's and Don'ts

### Do:
- **Do** give every section a single material ground and switch text palettes with `.on-shadow`; sequence light and dark sections like rooms.
- **Do** make every interactive accent amber — links `amber-deep` on plaster / `amber-bright` on shadow, actions on the primary button gradient, focus rings `2px solid #D99A2B` offset 3px.
- **Do** hand-place aperture scatters asymmetrically and reserve ignition (`data-ignite-group`) for dark sections; light every aperture immediately when `prefers-reduced-motion` is set.
- **Do** keep all content visible without JavaScript — `.reveal` choreography (14px rise, 0.9s on `cubic-bezier(.16,1,.3,1)`) only activates after JS adds `r-init`.
- **Do** hold missing photography with the labeled pending-asset frame, naming the asset and source.
- **Do** use inscriptions as standalone architectural elements: wayfinding, day markers, form labels, dedications.
- **Do** carve depth inward with inset shadows; let outward shadow exist only as light or as state.

### Don't:
- **Don't** round a corner. No `border-radius` on any surface; the sole documented exception is the 1px `focus-ring` radius on the `:focus-visible` outline.
- **Don't** put glass blue or madder on anything interactive or textual — glass only (madder's error-state duty is the sole exception).
- **Don't** place an eyebrow, kicker, or small label above a heading.
- **Don't** add motion beyond the one authored moment: nothing pulses, floats, scales, or bounces; hovers are architectural (lift, warm, slide).
- **Don't** use gray — secondary text is warm (`ink-soft` / `lumen-soft`), darks are umber.
- **Don't** box schedules or lists into cards; use hairline-separated boards.
- **Don't** use stock imagery, AI-generated likenesses of Friar Justin, or a bold Marcellus.
- **Don't** fake a working backend — prototype forms and disabled previews say what they are.
