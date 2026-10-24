"""Print exports: the friar door sign and the static sun mark.

    python print/brand/export.py [--font path/to/Marcellus-Regular.ttf]

Writes next to this file:

- friar-roundel-4in.pdf        the friar roundel, 4 in across, verdigris on white (CMYK)
- friar-roundel-4in-black.pdf  the same in one color, K100, for vinyl or engraving
- friar-roundel-4in.png        a 300 ppi preview of the first
- hw-mark[-umber|-plaster].{svg,pdf,png}   the sun mark, still (no breathing)
- hw-lockup.{svg,pdf,png}      mark beside HERMITAGE WORLD (needs the font)

The roundel comes from assets/img/art/friar-roundel.svg (Figma 282:1352), the
mark from MARK in assets/js/site.js (Figma 282:1342). Both are drawn as vectors;
nothing is rasterized except the previews. The site animates the mark's eight
satellites between 93% and 100% of their radii; the still mark uses 100%.

The wordmark is set in Marcellus (OFL) and converted to outlines, so a vendor
needs no font. The font file is not in the repo: pass --font, or put it in
print/brand/local/.
"""

import argparse
import re
from pathlib import Path

from lxml import etree
from reportlab.graphics import renderPDF
from reportlab.graphics.shapes import Group
from reportlab.lib.colors import CMYKColor
from reportlab.pdfgen import canvas
from svglib.svglib import svg2rlg

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SVG_NS = 'http://www.w3.org/2000/svg'
INCH = 72.0

# Brand colors (assets/css/tokens.css), with plain CMYK builds for print.
# A printer may tune the CMYK to their press; the hex values are the truth.
COLORS = {
    'verdigris': ('#62878e', CMYKColor(0.31, 0.05, 0, 0.44)),   # --glass-verdigris
    'gold': ('#a68140', CMYKColor(0, 0.22, 0.61, 0.35)),         # --gold-500, marks
    'umber': ('#1f1405', CMYKColor(0, 0.36, 0.84, 0.88)),        # --umber-900, ink
    'plaster': ('#f1ebdf', CMYKColor(0, 0.02, 0.07, 0.05)),      # --plaster-100
    'black': ('#000000', CMYKColor(0, 0, 0, 1)),
}

# Figma 282:1342, as inlined in assets/js/site.js
MARK_VB = (74.0, 72.063)
MARK_CORE = (37.39, 35.84, 18.79)
MARK_SATS = [
    (37.0, 5.23, 5.23), (58.89, 14.14, 5.91), (67.99, 36.03, 5.91), (58.5, 57.73, 5.81),
    (37.0, 66.44, 5.62), (15.5, 57.34, 5.42), (6.39, 35.84, 6.39), (15.3, 14.14, 5.23),
]


def recolor(node, color):
    """Every stroke in a svglib drawing takes one CMYK color."""
    if isinstance(node, Group):
        for child in node.contents:
            recolor(child, color)
        return
    if getattr(node, 'strokeColor', None) is not None:
        node.strokeColor = color
    if getattr(node, 'fillColor', None) is not None:
        node.fillColor = color


# ------------------------------------------------------------------ roundel

def roundel_parts():
    """Split the roundel SVG into what the mask clips and the ring it doesn't.

    The Figma export clips the stained-glass lines with an alpha mask (a filled
    circle). svglib has no masks, so the mask comes out and the same circle is
    applied as a clip on the PDF canvas instead; the outer ring sits outside
    the mask and is drawn after, unclipped."""
    src = (ROOT / 'assets/img/art/friar-roundel.svg').read_bytes()
    tree = etree.fromstring(src)
    size = float(tree.get('width'))

    mask = tree.find(f'.//{{{SVG_NS}}}mask')
    mc = mask.find(f'{{{SVG_NS}}}circle')
    clip = tuple(float(mc.get(k)) for k in ('cx', 'cy', 'r'))
    mask.getparent().remove(mask)
    for el in tree.iter():
        el.attrib.pop('mask', None)

    ring = next(el for el in tree.iter(f'{{{SVG_NS}}}circle') if el.get('id') == 'Ellipse 22')
    ring_geo = tuple(float(ring.get(k)) for k in ('cx', 'cy', 'r'))
    ring_w = float(ring.get('stroke-width'))
    ring.getparent().remove(ring)

    tmp = HERE / 'local'
    tmp.mkdir(exist_ok=True)
    lines_svg = tmp / 'roundel-lines.svg'
    lines_svg.write_bytes(etree.tostring(tree))
    return svg2rlg(str(lines_svg)), size, clip, ring_geo, ring_w


def door_sign(name, color, diameter_in=4.0, page_in=4.5):
    """The roundel at diameter_in across, centered on a white page_in square."""
    lines, size, (cx, cy, r), (rx, ry, rr), ring_w = roundel_parts()
    recolor(lines, color)
    page = page_in * INCH
    s = diameter_in * INCH / size
    off = (page - diameter_in * INCH) / 2

    out = HERE / f'{name}.pdf'
    c = canvas.Canvas(str(out), pagesize=(page, page))
    c.setTitle('Hermitage World: friar roundel, door sign')
    c.setAuthor('Iris Cocreative')
    c.setFillColor(CMYKColor(0, 0, 0, 0))
    c.rect(0, 0, page, page, stroke=0, fill=1)

    # svglib flips y into the drawing; the clip is in the same flipped space
    c.saveState()
    c.translate(off, off)
    c.scale(s, s)
    p = c.beginPath()
    p.circle(cx, size - cy, r)
    c.clipPath(p, stroke=0, fill=0)
    renderPDF.draw(lines, c, 0, 0)
    c.restoreState()

    c.saveState()
    c.translate(off, off)
    c.scale(s, s)
    c.setStrokeColor(color)
    c.setLineWidth(ring_w)
    c.circle(rx, size - ry, rr, stroke=1, fill=0)
    c.restoreState()

    c.showPage()
    c.save()
    return out


# ------------------------------------------------------------------- mark

def mark_svg(hex_color):
    w, h = MARK_VB
    circles = [MARK_CORE] + MARK_SATS
    body = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}"/>' for x, y, r in circles)
    return (f'<svg xmlns="{SVG_NS}" viewBox="0 0 {w} {h}" width="{w * 10:g}" height="{h * 10:g}">'
            f'<title>Hermitage World</title><g fill="{hex_color}">{body}</g></svg>\n')


def draw_mark(c, color, x0, y0, s):
    """The mark with its top-left at (x0, y0 + height) in PDF space, scaled by s."""
    h = MARK_VB[1]
    c.setFillColor(color)
    for x, y, r in [MARK_CORE] + MARK_SATS:
        c.circle(x0 + x * s, y0 + (h - y) * s, r * s, stroke=0, fill=1)


def mark_pdf(name, color, width_in=2.0):
    w, h = MARK_VB
    s = width_in * INCH / w
    out = HERE / f'{name}.pdf'
    c = canvas.Canvas(str(out), pagesize=(w * s, h * s))
    c.setTitle('Hermitage World: mark')
    c.setAuthor('Iris Cocreative')
    draw_mark(c, color, 0, 0, s)
    c.showPage()
    c.save()
    return out


# ------------------------------------------------------------------ lockup

def wordmark_paths(font_path, text, size, tracking):
    """Glyph outlines for text, as (svg_d, ops) per glyph, with advances.

    ops is a list of reportlab path calls in font space scaled to size
    (y up, baseline at 0)."""
    from fontTools.pens.basePen import BasePen
    from fontTools.pens.svgPathPen import SVGPathPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.ttLib import TTFont

    font = TTFont(font_path)
    upm = font['head'].unitsPerEm
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    k = size / upm

    class OpsPen(BasePen):
        def __init__(self, glyphset):
            super().__init__(glyphset)
            self.ops = []

        def _moveTo(self, p): self.ops.append(('moveTo', p))
        def _lineTo(self, p): self.ops.append(('lineTo', p))
        def _curveToOne(self, a, b, p): self.ops.append(('curveTo', a, b, p))
        def _closePath(self): self.ops.append(('close',))

    glyphs, x = [], 0.0
    for ch in text:
        name = cmap[ord(ch)]
        g = gs[name]
        if ch != ' ':
            svg_pen = SVGPathPen(gs)
            g.draw(TransformPen(svg_pen, (k, 0, 0, -k, x, 0)))
            ops_pen = OpsPen(gs)
            g.draw(TransformPen(ops_pen, (k, 0, 0, k, x, 0)))
            glyphs.append((svg_pen.getCommands(), ops_pen.ops))
        x += g.width * k + tracking * size
    cap = font['OS/2'].sCapHeight * k
    return glyphs, x - tracking * size, cap


def lockup(font_path, mark_color, ink_color):
    """Horizontal lockup per the brand guidelines, section 04: the mark at 160
    beside HERMITAGE WORLD in Marcellus 34, tracked 18%. The gap is a quarter
    of the mark's height; the wordmark's cap height centers on the mark."""
    mark_h = 160.0
    s = mark_h / MARK_VB[1]
    mark_w = MARK_VB[0] * s
    gap = mark_h / 4
    glyphs, text_w, cap = wordmark_paths(font_path, 'HERMITAGE WORLD', 34.0, 0.18)
    W, H = mark_w + gap + text_w, mark_h
    base = H / 2 + cap / 2          # baseline in SVG space (y down)
    tx = mark_w + gap

    hex_mark, cmyk_mark = mark_color
    hex_ink, cmyk_ink = ink_color
    circles = ''.join(f'<circle cx="{x * s:.3f}" cy="{y * s:.3f}" r="{r * s:.3f}"/>'
                      for x, y, r in [MARK_CORE] + MARK_SATS)
    paths = ''.join(f'<path d="{d}"/>' for d, _ in glyphs)
    svg = (f'<svg xmlns="{SVG_NS}" viewBox="0 0 {W:.3f} {H:.3f}" width="{W:.0f}" height="{H:.0f}">'
           f'<title>Hermitage World</title>'
           f'<g fill="{hex_mark}">{circles}</g>'
           f'<g fill="{hex_ink}" transform="translate({tx:.3f} {base:.3f})">{paths}</g></svg>\n')
    (HERE / 'hw-lockup.svg').write_text(svg, encoding='utf-8')

    out = HERE / 'hw-lockup.pdf'
    k = 4.0 * INCH / W                                  # 4 in wide; it is vector
    c = canvas.Canvas(str(out), pagesize=(W * k, H * k))
    c.setTitle('Hermitage World: horizontal lockup')
    c.setAuthor('Iris Cocreative')
    draw_mark(c, cmyk_mark, 0, 0, s * k)
    c.setFillColor(cmyk_ink)
    for _, ops in glyphs:
        p = c.beginPath()
        for op in ops:
            pts = [((tx + px) * k, (H - base + py) * k) for px, py in op[1:]]
            if op[0] == 'moveTo':
                p.moveTo(*pts[0])
            elif op[0] == 'lineTo':
                p.lineTo(*pts[0])
            elif op[0] == 'curveTo':
                p.curveTo(*pts[0], *pts[1], *pts[2])
            else:
                p.close()
        c.drawPath(p, stroke=0, fill=1, fillMode=0)
    c.showPage()
    c.save()
    return out


# ---------------------------------------------------------------- previews

def preview(pdf, png, dpi=300, alpha=False):
    import pymupdf
    doc = pymupdf.open(str(pdf))
    pix = doc[0].get_pixmap(dpi=dpi, alpha=alpha)
    pix.save(str(png))
    doc.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--font', default=str(HERE / 'local' / 'Marcellus-Regular.ttf'))
    args = ap.parse_args()

    sign = door_sign('friar-roundel-4in', COLORS['verdigris'][1])
    door_sign('friar-roundel-4in-black', COLORS['black'][1])
    preview(sign, HERE / 'friar-roundel-4in.png')

    for name, key in (('hw-mark', 'gold'), ('hw-mark-umber', 'umber'), ('hw-mark-plaster', 'plaster')):
        (HERE / f'{name}.svg').write_text(mark_svg(COLORS[key][0]), encoding='utf-8')
        pdf = mark_pdf(name, COLORS[key][1])
        preview(pdf, HERE / f'{name}.png', dpi=600, alpha=True)   # 1200 px wide

    if Path(args.font).exists():
        pdf = lockup(args.font, COLORS['gold'], COLORS['umber'])
        preview(pdf, HERE / 'hw-lockup.png', dpi=600, alpha=True)
    else:
        print(f'no font at {args.font}: skipped the lockup')

    for f in sorted(HERE.glob('*.*')):
        if f.suffix in ('.pdf', '.svg', '.png'):
            print(f'{f.name:32} {f.stat().st_size:>8,} bytes')


if __name__ == '__main__':
    main()
