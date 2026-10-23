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
