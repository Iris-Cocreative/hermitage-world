# Hermitage World: build log and source of truth

**Repo:** `Iris-Cocreative/hermitage-world` · **Preview:** https://iris-cocreative.github.io/hermitage-world/ · **Old prototype URL** (`lab.iriscocreative.com/hermitage-world/`) now redirects here.

## Status (2026-10-16)

Moved out of `iris-webflow-scripts/hermitage-world/` into its own repo and rebuilt as a multi-page site on one design system.

| Area | State |
|---|---|
| Home | Built from Munia's newest Figma frames (282:2/8/15 hero beats, 282:32 page). Temple hero now runs three beats on one scroll: the line, then the welcome, then the name |
| Design system | Tokens (3 tiers), rooms, cascade layers, ~30 components, live reference at `/design-system/` |
| Pages | All 27 pages in the Collab OS sitemap v2 exist, as real layouts with real copy where it exists |
| Data | Gatherings (time zones, "happening now" until the end, add-to-calendar, month view) and library (filterable) render from `assets/data/` |
| Forms | All demo: they say so, and send nothing |
| Phase two | Membership, the community platform, and the Soul Guide are shown as clearly labeled previews |

QA at the time of writing: every page loads with no console errors and no horizontal overflow at 1440, 768 and 390px; all internal links resolve; all text tokens pass WCAG AA on their grounds.

## What came from where

- **Figma** (`lLDFhmwK4zbTuREtOc6sRC`, page Website): new sun mark (`282:1342`, geometry inlined in `site.js`), hero beats, the threshold (the stained-glass room through a glowing door outline, `282:1532/1533/1536`), the friar roundel in verdigris (`282:1352`), five lights, hallways, calendar, newsletter, mission, footer.
- **Collab OS Surface** (sitemap v2, Sept 8, plus notes on the map):
  - Page list and sections per page.
  - Samuel's notes: *"Meditation is the practice. Spiritual transformation is the journey. Cherished belonging is the community experience."* (now the hallways lede); the seven-stage pathway Discover → Serve (Programs); the five values as five program doorways (Programs); *"Meditation is to the mind as exercise is to the body"* (Meditation).
  - **Calendar note:** the old site marked an event "past" as soon as it started. Gatherings here stay "Happening now" until they end.
  - **Member portal ask:** purchases, favorites, notifications, member-only material. Previewed on Community and Membership as phase two.
- **Collab OS docs:** "Meditation" (Oct 12) is the Meditation page's two-practices section, nearly verbatim; "Justin obituary" (Oct 12) is the Friar Justin timeline and the About story; "History of the Hermi…" (Oct 14) is background.
- **hermitageindy.org:** address (1100 W 42nd St, Suite 350), phone, email, and the Jampolsky and Kreskin endorsements. The Dyer and Stahura lines came back garbled and are marked to verify, not quoted.

## Decisions taken in this build

1. **Static, no build step,** with shared chrome as custom elements defined synchronously in `<head>`. One sitemap object drives header, drawer and footer. Ports cleanly to Webflow or a framework later, because the system is CSS variables plus plain markup.
2. **Rooms over variants.** `data-room` remaps semantic tokens, so no component has a dark/light modifier.
3. **Art as masks.** Line-art and value glyphs are SVG files used as CSS masks, so their color is a token.
4. **The overlay header** floats transparent over the home hero (links visible, logo hidden) and turns solid after it, so a 35–65+ visitor can navigate from the first second.
5. **The sun button opens the whole map** (all sections and subpages) on every screen size; it doubles as the mobile menu.
6. **Community as "eight around one."** The mark becomes a map: seats for Indianapolis, the United States, Australia and Europe, open seats, and "a seat for you."
7. **Contrast for a 35–65+ audience.** Figma's light label on gold buttons is 3.1:1; the build uses umber on the same gold (5:1). It's one token, `--on-accent` in `tokens.css`. Subtle text was nudged to pass AA on every ground, and `--accent-display` gives large gold type a deeper gold on light grounds.
8. **Honest placeholders everywhere:** `.pending` frames for missing photos and `.draft-mark` for unconfirmed facts. Hide them all with `<html class="hide-pending">` for a clean review.

## Open questions and content still needed

- **Real schedule:** days and times for Energy Circle, Contemplative Unity, The Way Between, Yvonne's classes, and Train Your Mind cohorts. Edit `assets/data/gatherings.js` and set `confirmed: true`.
- **Library catalog** (Garry, due Oct 16): titles, durations, free vs paid, media files. Replace the samples in `assets/data/library.js`.
- **Photos:** Justin portraits (glass-chapel photo), the stickman stained glass, the September in-person gatherings, teacher portraits, book covers.
- **Three prayers** wording (Friar Justin page) and the Train Your Mind phase outlines: drafted, need Samuel.
- **Mission statement** final wording (board).
- **Endorsements:** verify the Dyer and Stahura quotes and permissions.
- **Providers:** donation processor, newsletter platform (3,300+ list), registration and payment, video and audio hosting.
- **Membership:** tier names and pricing ("Friend" and "Family" are proposals).
- **Domain:** when hermitageworld.org is connected, update the absolute paths in `404.html`.

## Print: wall panels over the windows (started 2026-10-16)

A refined render of the temple hero, hung over the three windows to hide the off-center one. The client's brief:

- **Overall 168 × 64 in**, hung as three panels: **52, 63 and 51 in** wide (seams at 52 and 115 in from the left). Panel 2 sits within half an inch of the wall's center, so it carries the focal point (dais and light pool). Nothing important goes on a seam.
- Panels are furred out about 1 in (two electrical conduits) and hung on French cleats.
- The stick-priest door sign (4 in roundel, maybe 8–10 in on a panel) is James's, as vector or PDF/JPG.

**Pipeline:**
1. **Compose** (built): `print/wall-panels/` loads the live `temple.js` unchanged, freezes its loop and owns the camera. It has panel seams, an eye line from the viewer's height, a "match this viewer" lens (the angle the wall fills from where they stand, level camera, lens rise onto the eye line), a room mockup with draggable corners, and exports: proof sheet, PNG up to 5040 px, and a setup JSON for Blender. A framing is a URL hash, so a link reproduces it. The client photo lives in the gitignored `print/wall-panels/local/`.
2. **Blender** (started): `print/wall-panels/blender/temple_print.py` rebuilds the room headless from temple.js's numbers as real geometry (carved coffers, recessed arches with archivolts, molded entablature, stepped pilaster capitals, 816 beveled floor blocks set at the ripple height) under real light (one sun through the oculus, sky, path-traced bounce, a thin haze for the shaft). Stone is procedural travertine with per-block tone, pits, veins, crevice grime and ashlar coursing on the drum. Options: `--light down` (sun straight onto the dais), `--ring-width` (0.5 shows the ripple as a wave; the website uses 0.78), `--motes 2600` (the website's dust, with its faint links; `--no-links` to drop them), `--exposure` (trim in stops), `--sun-angle` (degrees; 6 gives a soft, diffused pool), `--dust` (mote and link brightness; 0.35 is the subtle setting), `--denoiser oidn|optix|none`, `--save` (writes the .blend). A light portal over the oculus and clamped indirect light keep the bounce-lit walls clean; without them the denoiser smears low-contrast detail. Current favorite: `renders/down9.png` (light down, sun 0.30 at 6°, rings 0.5, ripple 0.38, dust 0.35, exposure +0.75, camera 3.4 m with lens rise -0.35). It takes a composer link or setup JSON as `--framing`; a 2100 px test renders in about 30 s on the RTX 5080. Renders go to the gitignored `local/renders/`.
3. **Render and finish:** 100 ppi at final size (16,800 × 6,400 px plus bleed), grade, grain at print scale, split into three files, soft-proof in the printer's profile, 1:1 test crop.

**Findings so far:** a level, eye-height camera ("Doorway, eye level") reads best on the wall. The web lighting leaves the dome nearly black, so framings that look up need the Blender lighting pass. With physical light the 1.6 m oculus gives a smaller, sharper pool than the web's (which is faked wider); widening the oculus is a design call. The floor ripple, frozen in a still, reads as stepped terraces around the dais.

**Waiting on the client:** height of the panels' bottom edge (30 in is an estimate from the photo), whether people stand or sit in the room and how far back, printer and substrate (bleed, ppi, color profile, whether the 1 in edges wrap), which moment of the scene (threshold or walked in), and whether any text or the roundel goes on the panels.

## Print: the stained-glass hall (started 2026-10-16)

A Blender reconstruction of `assets/img/photo/stained-glass-hall.jpg`, in `print/stained-glass-hall/hall.py` (headless, like the temple). One window design (`SHAPES` and `BARS`, traced in the reference's pixel space) drives both the steel leading (real geometry, so it casts the shadow lines) and the glass color texture (so the panes throw colored light). The view and the light come from a CC0 Poly Haven HDRI, `camdeboo_road` (sun on the horizon between hills), rotated so its sun sits just right of the window's center; a sun lamp is aimed along it, and a portal in the opening keeps the sky light clean. There's also a polished slab floor, ashlar limestone walls with arched niches and a doorway, benches, urns, a bowl, an art panel and two procedurally grown olive trees. The HDRIs, textures, renders and `.blend` live in the gitignored `local/`. A 1536 px render takes about a minute.

**Differences from the reference, still open:** the view is a near hill rather than a misty valley seen from above (no HDRI matches; a backplate photo would); the photograph's sky is a real sunset, less saturated than the generated image; no sun starburst or bloom yet; the floor's colored pools are fainter.

## Live scene: the loggia (started 2026-10-16; architecture rebuilt 2026-10-17)

A third scene, live in the browser like the temple: a limestone loggia high above a sea of islands at sunset, after a reference image James supplied (kept in the gitignored `scenes/loggia/local/`). Preview at `/scenes/loggia/` (noindex, not in the sitemap); the module is `assets/js/loggia.js`, the styles `assets/css/loggia.css`.

- **The plan is not orthogonal (2026-10-17).** Read from the reference's vanishing points: the wall that holds the great arch stands 39° off square to the gallery, so from the gallery's axis that wall's thick lit reveal and its shadowed inner face read as two faces of one pier, with the gallery running straight away beside it. The arch wall is 2.2 m thick, its jambs splayed 20° (widest on the room side); the great arch is 5.65 m wide at the inner face with a 4 m springing; the pier's inner face is 2.1 m. The gallery is 3.9 m wide: a 2 m thick portal, then five 4 m bays under a stilted barrel vault, divided by 0.7 m transverse arches stepped 0.25 m inside the vault, an arcade on the left, a plain wall on the right that runs on into the room, and a tall narrow door (2.6 × 5.6 m) onto the water at the far end. The room is the wedge between the arch wall and that right wall. The rug lies square to the arch wall and the floor slabs (1.3 × 2.0 m) square to the gallery, as in the image. All of it is in `P` at the top of the module.
- **The camera** stands 18 m back on the gallery's axis, 1.4 m up, looking straight down it with a 30.5° vertical field and the lens shifted 30% left and 6% up, which reproduces the reference's framing (checked by projecting the pier corner, both jambs, the portal and the far door against the image: all within about 20 px at 1536 wide). The walk widens the lens to 44° as it enters the gallery.
- **Walls are lofted** (`thickWall()`): each is a slab built flat in its own frame, its openings lofted through the thickness (profile, splay, a quarter-circle fillet at both faces), then placed at any angle; the result is one creased-normal mesh. Every opening's edge rounds over, which is what catches the raking light on the portal's jambs.
- **Light:** the sun stands 10° left of and 3° above the photograph's sun (azimuth -36°, elevation 8°), so its light reaches the floor in front of the arch and through the arcade. A second, weaker light from the open sky to the left and behind (azimuth -118°, elevation 24°) paints the reveal and the gallery's right wall the way the reference does; the room's unseen walls do not block it. Both shadows are variance maps blurred once, so every edge is soft. Hemisphere light, three sky panels in the openings and an environment captured from the lit room fill the rest.
- **Organic pass (2026-10-17), kept:** three stone dressings in one shader (lime plaster; travertine with pits in bands and crystal flecks; speckled clay), big glossy floor slabs with a mirror reflection, olives grown as multi-stem trees, the chunky jute rug, tube lights and pinpoints in the vault, stools and jars.
- **The view** is James's panorama (`assets/img/photo/loggia-view.jpg`) laid on the sky at 36 px per degree, its sun at azimuth -26°, so it stands in the great arch; past the photo's sides the islands mirror on and settle into haze, above its top the sky's color, below its bottom the water.
- **Live:** scroll walks from the room, through the portal and down the gallery to the far door (`P.path`, with its own portrait path); the pointer turns the head a few degrees; leaves tremble; dust and haze drift. Reduced motion keeps the walk and drops the sway.
- **Fallback:** without WebGL the stage shows `assets/img/photo/loggia-still.jpg`, the opening frame.
- QA: no console errors and no horizontal overflow at 1536 and 390; frames checked at the start, at the portal, mid-gallery and at the far door. The `local/` folder holds the comparison shots (`v3-*.png`).

**Still open:** the travertine reads as pitted at a distance but as soft blotches up close (the portal's jambs a third of the way in); the far door's view at the walk's end is a mirrored island settling into haze, since the panorama ends there; where the scene lives on the site, and whether words go over it.

## Print: door sign and static mark (2026-10-24)

`print/brand/export.py` writes both, as vectors, next to itself (`python print/brand/export.py`). The previews are the only rasters.

- **Door sign.** `friar-roundel-4in.pdf`: the friar roundel (Figma 282:1352, `assets/img/art/friar-roundel.svg`) 4.00 in across, centered on a white 4.5 in square, lines in verdigris as CMYK (C31 M5 Y0 K44, from `--glass-verdigris`). `friar-roundel-4in-black.pdf` is the same in K100 for vinyl or engraving. The lines print at 1.1 pt at this size; the vector scales cleanly to the 8–10 in panel version. The Figma export clips the lines with an alpha mask, which the PDF library can't read, so the script lifts the mask's circle out and applies it as a clip instead; the outer ring is drawn after, unclipped.
- **Static mark.** `hw-mark.{svg,pdf,png}` (gold), `-umber` (ink) and `-plaster` (for dark grounds): the eight-around-one sun from `site.js` with every satellite at full size (the site breathes them between 93% and 100%). `hw-lockup.{svg,pdf,png}` sets it beside HERMITAGE WORLD as the brand guidelines' horizontal lockup specifies (mark 160, Marcellus 34, tracked 18%), with the wordmark converted to outlines so a vendor needs no font. Marcellus (OFL) is read from the gitignored `print/brand/local/`.
- **Interim, not final.** The final mark is still open (Brand refresh, "The final mark"). These export the mark the site uses today, so print and swag already in production aren't held up; rerun the script once the mark is chosen.
- CMYK builds are plain conversions of the brand hex values; a printer may tune them to their press.

## Library prototype (started 2026-10-23)

The Holos Library prototype (`iris-webflow-scripts/holos-library/`), rebuilt for the Hermitage at `/library/` (noindex, not in the sitemap). The page is `library/index.html`, styles are in `assets/css/library.css`, the renderer is `assets/js/library-room.js`, and the data is `assets/data/catalog.js`.

- **Real catalog.** Every title, volume and track number, credit, description and price comes from the old hermitageindy.org shop (its WooCommerce store API, read 2026-10-23): 41 MP3 tracks across 11 Opus CDs, Vol. 22 *We Are One*, the Success: Full Living album, the three books and the trilogy, plus the spring 2026 classes. The three named videos and the homily and teaching hours come from the Collab OS surface. 70 items in all.
- **Four ways in**, all sharing one search and filter set (kind, when, voice, access): **Shelves** (objects keep their own shape: an arch with light for a meditation, a disc for an album, a spine for a book, a frame for a video, numerals for a program, eight seats around one for a reading circle); **The window** (the catalog as a rose window: 13 albums around the sun mark, their tracks behind them, everything else in the border; matches stay lit); **Paths** (four ordered paths on the `.pathway` component); and the **Catalog** (the `.board` list).
- **What changed from Holos:** holons become companions (morning and evening, private and group, explanation then experience, Vol. 9 as the companion to Vol. 6) and *Read together* (Rohr's *The Universal Christ* beside the circle that read it). Member uploads are dropped, because this library is curated. The 12 domains become "When" (moments of the day and reasons to reach for something). The personas are Guest, Friend (free account with a saved shelf) and Family (phase two, everything included).
- **Honest gaps:** durations show as "length to come". The free list follows the stated policy (the healing meditations) and is marked draft. Volumes the shop credits only to the "Hermitage Meditation Series" say "voice to confirm". Curator notes and paths are marked draft for Samuel. Buttons say what they will do and show a "(prototype)" toast. Cover art from the old site isn't used until Garry approves it.
- **Not yet:** the two existing library pages (`meditation/library/`, `friar-justin/library/`) still read the sample `library.js`. If this direction is accepted, they become views of `catalog.js` and `library.js` retires.
- QA: no console errors and no horizontal overflow at 1440 and 390 wide. Search, filters, persona switch, save, the empty state, the drawer and the window's dimming were all checked.

## Next steps

1. Review with Garry and Samuel; collect the content above through Collab OS.
2. Mobile pass on the Figma side for inner pages (only the homepage has frames).
3. Choose the production path: Webflow (as in the Collab OS timeline) or keep this codebase and add a backend (Supabase) for membership and community features. The tokens and components carry over either way.
