# Hermitage World

The website for **Hermitage World** (formerly hermitageindy.org): an interfaith center for meditation and spirituality founded by Friar Justin Belitz, OFM. Built by Iris Cocreative.

**Live (preview):** https://iris-cocreative.github.io/hermitage-world/ (the custom domain comes later)

## Run it locally

Static files, no build step. Serve the folder over http (the icon sprite and three.js need http, not `file://`):

```bash
python -m http.server 8741 --bind 127.0.0.1
# then open http://127.0.0.1:8741/
```

## Deploy

Push to `main`. GitHub Pages publishes the repository root.

## How it's organized

| Path | What |
|---|---|
| `index.html` and `*/index.html` | One folder per page, matching the sitemap in Collab OS |
| `assets/css/tokens.css` | **Every color, size, space, radius and duration.** Restyle the site here |
| `assets/css/main.css` | The only stylesheet a page links. Imports the layers in order |
| `assets/css/{base,layout,components,pages,temple}.css` | Element defaults, layout primitives, components, one-off compositions, the home hero |
| `assets/js/site.js` | The sitemap (`SITE`), plus `<hw-header>`, `<hw-footer>`, `<hw-signup>`, `<hw-mark>` and shared behaviors |
| `assets/js/temple.js`, `hero.js` | The 3D temple on the home page, and the three-beat scroll over it |
| `assets/data/gatherings.js` | The weekly schedule: one list feeds the home page, Gatherings, Calendar and the event page |
| `assets/data/library.js` | The recordings catalog (samples until the real catalog arrives) |
| `assets/img/` | `photo/`, `art/` (line-art and glyphs, used as CSS masks), `brand/`, `icons.svg` |
| `design-system/` | Live reference of every token and component |
| `docs/` | Product brief, brand guidelines, earlier design notes, timeline |
| `archive/` | v1, v2 and v3 prototypes, kept for reference |

See `HERMITAGE-WORLD-BUILD.md` for decisions, sources and open questions.
