# Hermitage World: project instructions

Own repo: `Iris-Cocreative/hermitage-world` (public). GitHub Pages serves `main` at https://iris-cocreative.github.io/hermitage-world/. Push to deploy. `HERMITAGE-WORLD-BUILD.md` is the source of truth for status, decisions and open questions; update it when something changes.

## Working rules

- **Static, no build step.** Plain HTML, CSS and JS. Every page is `folder/index.html` and links only `assets/css/main.css` and `assets/js/site.js` (in `<head>`, not deferred, so the custom elements render in place).
- **Relative paths only.** The site lives under `/hermitage-world/` today and will move to a custom domain. `site.js` resolves every generated link from its own URL. The one exception is `404.html`, which needs absolute `/hermitage-world/` paths and must be updated at the domain move.
- **Design system first.** Never hardcode a color, size or space in a page: use the tokens in `assets/css/tokens.css`. Components read semantic tokens (`--surface`, `--text`, `--accent`, `--line`…) only. A section sets its ground with `data-room="dark|deep|plaster|stone|photo"`. Anything used twice belongs in `components.css`; one-off compositions go in `pages.css`.
- **Sitemap in one place.** Add or rename pages in `SITE` in `assets/js/site.js`; header, drawer and footer follow.
- **Content that a CMS will own** lives in `assets/data/*.js` (gatherings, library). Keep the fields CMS-shaped.
- **Honesty.** Never invent facts, quotes, times, prices or names. Unknowns get a `<span class="draft-mark">…</span>`; missing images get a `.pending` frame naming the asset and its source. Quote Friar Justin only from sources (Collab OS docs, his books, the obituary).
- **Brand.** Marcellus (one weight, never bold) for display, Alegreya Sans for body, Alegreya italic only for a person's voice. Gold is the only interactive accent; glass colors (amber, blue, verdigris, madder) are light, never UI. Calm motion; everything respects `prefers-reduced-motion`.
- **American English** in copy and comments.
- After changes, check pages over http at 1440 and 390 wide: no console errors, no horizontal overflow.

## Sources

- Figma `lLDFhmwK4zbTuREtOc6sRC`, page **Website** (`71:114`). Newest frames: `282:2`, `282:8`, `282:15` (hero beats) and `282:32` (full homepage).
- Collab OS: https://www.collab-os.com/collaboration/hermatage-world (Surface = the living sitemap with client notes; docs "Meditation", "Justin obituary", "History of the Hermi…").
- `docs/PRODUCT.md`, `docs/BRAND-GUIDELINES.md`.
