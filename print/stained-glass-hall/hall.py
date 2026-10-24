"""
HERMITAGE WORLD — the stained-glass hall (Blender 5, Cycles)
----------------------------------------------------------------------------
A reconstruction of assets/img/photo/stained-glass-hall.jpg: a tall limestone
hall closed by a great window of mostly clear glass with blue and amber
panes, a low sun straight behind it laying long colored streaks across a
polished stone floor.

The view and the sun come from a photograph: an HDRI (360-degree photo) from
Poly Haven, CC0. A sun lamp is aimed along the HDRI's own sun so the light
matches the view. The window is one design (WINDOW below) that drives both
the steel leading (real geometry, so it casts the shadow lines) and the glass
color texture (so the panes cast colored light).

Run headless (Git Bash, from the repo root):
  "/c/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b \
      -P print/stained-glass-hall/hall.py -- \
      --out print/stained-glass-hall/local/renders/hall.png --width 1536 --samples 512

Meters, Blender Z up. The camera looks down +Y at the window wall.
"""

import argparse
import math
import os
import random
import sys
import time
from math import atan2, cos, pi, radians, sin, sqrt

import bmesh
import bpy
from mathutils import Euler, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
LOCAL = os.path.join(HERE, 'local')

# --------------------------------------------------------------- the hall --
HALL = dict(half_w=3.8, depth=7.6, height=11.0, back=-6.0)   # end wall at y = depth
WIN = dict(half_w=2.9, height=9.6, reveal=0.7)                 # opening in the end wall
EYE = 1.5

# the reference image's pixels -> window meters. The design was traced in the
# reference's own pixel space (window spans x 388..1200, sill at y 595); the
# window is mirrored about its center column so it reads as one design.
PX_CX, PX_SILL, PX_W = 794.0, 595.0, 812.0
def wx(px):
    return (px - PX_CX) / PX_W * (2 * WIN['half_w'])
def wz(py):
    return (PX_SILL - py) / PX_W * (2 * WIN['half_w'])

GLASS = dict(clear='f7f1e4', pale='f2cf74', amber='e8902a', blue='79a9d8', deep_blue='5a8cc4')

# Each shape: (kind, params, color or None). Rects are (x0, y0, x1, y1) in
# reference pixels (y down); discs are (cx, cy, r); quarter discs add which
# quadrant ('ul','ur','ll','lr'); arches are (cx, cy, r) upper semicircles.
# Leading follows every shape edge, plus the grid lines in BARS.
def mirror_rect(x0, y0, x1, y1):
    return (2 * PX_CX - x1, y0, 2 * PX_CX - x0, y1)

TOP = -760          # top of the window, above the frame of the photograph
SHAPES = []
def rect(r, c, mirror=True):
    SHAPES.append(('rect', r, c))
    if mirror:
        SHAPES.append(('rect', mirror_rect(*r), c))
def quarter(cx, cy, r, q, c):
    SHAPES.append(('quarter', (cx, cy, r, q), c))
    mq = {'ul': 'ur', 'ur': 'ul', 'll': 'lr', 'lr': 'll'}[q]
    SHAPES.append(('quarter', (2 * PX_CX - cx, cy, r, mq), c))

# outer columns: pale above, blue band, an amber quarter disc on the transom
rect((388, 68, 475, 250), 'blue')
rect((388, TOP, 475, 68), 'pale')
quarter(475, 250, 75, 'ul', 'amber')
# inner columns: blue below the big arch
rect((475, 70, 540, 250), 'blue')
# the tall blue strips either side of the middle
rect((540, 30, 578, 330), 'blue')
rect((540, 480, 578, 595), 'deep_blue')
# amber block on the strip, under a little arch
rect((540, 330, 578, 480), 'amber')
SHAPES.append(('arch', (527, 330, 52), None))
SHAPES.append(('arch', (2 * PX_CX - 527, 330, 52), None))
# amber quarter discs at the sill
quarter(578, 595, 48, 'ul', 'amber')
# the center strip, full height
rect((780, TOP, 808, 595), 'pale', mirror=False)
# the sun disc at the top of the middle, and the great arch around it
SHAPES.append(('disc', (794, 135, 95), 'pale'))
SHAPES.append(('arch', (794, 60, 319), None))
# above the great arch: blue spandrels, pale crown
rect((475, TOP, 640, -120), 'blue')

# straight leading lines (x0, y0, x1, y1) in reference pixels
FRAME = [(388, TOP, 388, 595), (1200, TOP, 1200, 595), (388, 595, 1200, 595), (388, TOP, 1200, TOP)]
BARS = []
for x in (475, 540, 578, 657, 780, 808):
    BARS += [(x, TOP, x, 595), (2 * PX_CX - x, TOP, 2 * PX_CX - x, 595)]
for y in (68, 250, 395):
    BARS += [(388, y, 475, y), (1113, y, 1200, y)]
BARS += [(578, 130, 1010, 130), (475, 250, 540, 250), (1048, 250, 1113, 250),
         (540, 330, 578, 330), (540, 480, 578, 480), (1010, 330, 1048, 330), (1010, 480, 1048, 480),
         (388, -260, 1200, -260), (388, -520, 1200, -520)]


# ------------------------------------------------------------- helpers --
def srgb(h):
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


def node(nt, kind, x=0, y=0, **props):
    n = nt.nodes.new(kind)
    n.location = (x, y)
    for k, v in props.items():
        setattr(n, k, v)
    return n


def math_node(nt, op, a=None, b=None, c=None):
    n = node(nt, 'ShaderNodeMath', operation=op)
    for i, v in enumerate((a, b, c)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            nt.links.new(v, n.inputs[i])
    return n.outputs[0]


def new_material(name):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial', 1400, 0)
    return mat, nt, out


def finish_mesh(name, bm, mat=None, smooth_angle=None, recalc=True):
    if recalc:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.normal_update()
    if smooth_angle is not None:
        for f in bm.faces:
            f.smooth = True
        for e in bm.edges:
            if len(e.link_faces) == 2:
                e.smooth = e.calc_face_angle(0.0) < smooth_angle
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if mat:
        me.materials.append(mat)
    return ob


def bevel(ob, width, segments=3, angle=35):
    m = ob.modifiers.new('Bevel', 'BEVEL')
    m.width, m.segments = width, segments
    m.limit_method = 'ANGLE'
    m.angle_limit = radians(angle)
    return m


def box(bm, x0, y0, z0, x1, y1, z1):
    v = [bm.verts.new(p) for p in (
        (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
        (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1))]
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
        bm.faces.new([v[i] for i in f])
    return v


def lathe(name, profile, segs, mat, at=(0, 0, 0), smooth_angle=radians(40)):
    """closed (r, z) profile spun around a vertical axis through `at`"""
    bm = bmesh.new()
    ax, ay, az = at
    rings = []
    for r, z in profile:
        if r < 1e-6:
            rings.append([bm.verts.new((ax, ay, az + z))])
        else:
            rings.append([bm.verts.new((ax + r * cos(2 * pi * k / segs), ay + r * sin(2 * pi * k / segs), az + z))
                          for k in range(segs)])
    n = len(rings)
    for i in range(n):
        a, b = rings[i], rings[(i + 1) % n]
        for k in range(segs):
            k2 = (k + 1) % segs
            if len(a) == 1 and len(b) == 1:
                continue
            if len(a) == 1:
                bm.faces.new((a[0], b[k], b[k2]))
            elif len(b) == 1:
                bm.faces.new((a[k], b[0], a[k2]))
            else:
                bm.faces.new((a[k], b[k], b[k2], a[k2]))
    return finish_mesh(name, bm, mat, smooth_angle)


# ----------------------------------------------------------- materials --
def limestone(name, hexstr, rough=0.75, joints=None, bump=0.12):
    """warm limestone: soft mottling, faint fossil grain; optional ashlar joints
    laid out in the wall plane (x+y along the wall, z up)"""
    mat, nt, out = new_material(name)
    L = nt.links.new
    bsdf = node(nt, 'ShaderNodeBsdfPrincipled', 1100, 0)
    L(bsdf.outputs['BSDF'], out.inputs['Surface'])
    tc = node(nt, 'ShaderNodeTexCoord', -1200, 0)
    co = tc.outputs['Object']
    nA = node(nt, 'ShaderNodeTexNoise', -800, 300)
    nA.inputs['Scale'].default_value = 0.5
    nA.inputs['Detail'].default_value = 5
    L(co, nA.inputs['Vector'])
    nB = node(nt, 'ShaderNodeTexNoise', -800, 0)
    nB.inputs['Scale'].default_value = 14
    nB.inputs['Detail'].default_value = 8
    L(co, nB.inputs['Vector'])
    br = math_node(nt, 'MULTIPLY_ADD', nA.outputs['Fac'], 0.22, 0.80)
    br = math_node(nt, 'MULTIPLY_ADD', nB.outputs['Fac'], 0.08, br)
    h = nB.outputs['Fac']
    if joints:
        sep = node(nt, 'ShaderNodeSeparateXYZ', -1000, -500)
        L(co, sep.inputs['Vector'])
        cmb = node(nt, 'ShaderNodeCombineXYZ', -800, -500)
        L(math_node(nt, 'ADD', sep.outputs['X'], sep.outputs['Y']), cmb.inputs['X'])
        L(sep.outputs['Z'], cmb.inputs['Y'])
        bk = node(nt, 'ShaderNodeTexBrick', -600, -500, offset=0.5, offset_frequency=2)
        L(cmb.outputs['Vector'], bk.inputs['Vector'])
        bk.inputs['Scale'].default_value = 1.0
        bk.inputs['Brick Width'].default_value = joints[0]
        bk.inputs['Row Height'].default_value = joints[1]
        bk.inputs['Mortar Size'].default_value = 0.006
        bk.inputs['Mortar Smooth'].default_value = 0.3
        bk.inputs['Color1'].default_value = (0.92, 0.92, 0.92, 1)
        bk.inputs['Color2'].default_value = (1.06, 1.06, 1.06, 1)
        bk.inputs['Mortar'].default_value = (1, 1, 1, 1)
        br = math_node(nt, 'MULTIPLY', br, bk.outputs['Color'])
        br = math_node(nt, 'MULTIPLY_ADD', bk.outputs['Fac'], -0.25, br)
        h = math_node(nt, 'MULTIPLY_ADD', bk.outputs['Fac'], -2.0, h)
    col = node(nt, 'ShaderNodeVectorMath', 200, 300, operation='SCALE')
    col.inputs[0].default_value = srgb(hexstr)[:3]
    L(br, col.inputs['Scale'])
    L(col.outputs['Vector'], bsdf.inputs['Base Color'])
    L(math_node(nt, 'MULTIPLY_ADD', nB.outputs['Fac'], 0.2, rough - 0.1), bsdf.inputs['Roughness'])
    bp = node(nt, 'ShaderNodeBump', 800, -300)
    bp.inputs['Strength'].default_value = bump
    bp.inputs['Distance'].default_value = 0.004
    L(h, bp.inputs['Height'])
    L(bp.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def polished_floor():
    """large honed-and-polished limestone slabs: a soft mirror, slab-to-slab
    tone, faint veining, fine joints"""
    mat, nt, out = new_material('Polished floor')
    L = nt.links.new
    bsdf = node(nt, 'ShaderNodeBsdfPrincipled', 1100, 0)
    L(bsdf.outputs['BSDF'], out.inputs['Surface'])
    tc = node(nt, 'ShaderNodeTexCoord', -1200, 0)
    co = tc.outputs['Object']
    bk = node(nt, 'ShaderNodeTexBrick', -700, -300, offset=0.5, offset_frequency=2)
    L(co, bk.inputs['Vector'])
    bk.inputs['Scale'].default_value = 1.0
    bk.inputs['Brick Width'].default_value = 1.5
    bk.inputs['Row Height'].default_value = 1.0
    bk.inputs['Mortar Size'].default_value = 0.004
    bk.inputs['Mortar Smooth'].default_value = 0.2
    bk.inputs['Color1'].default_value = (0.90, 0.90, 0.90, 1)
    bk.inputs['Color2'].default_value = (1.08, 1.08, 1.08, 1)
    bk.inputs['Mortar'].default_value = (1, 1, 1, 1)
    nA = node(nt, 'ShaderNodeTexNoise', -800, 300)
    nA.inputs['Scale'].default_value = 0.7
    nA.inputs['Detail'].default_value = 6
    L(co, nA.inputs['Vector'])
    nV = node(nt, 'ShaderNodeTexNoise', -800, 0)
    nV.inputs['Scale'].default_value = 0.9
    nV.inputs['Detail'].default_value = 4
    nV.inputs['Distortion'].default_value = 2.0
    L(co, nV.inputs['Vector'])
    vd = math_node(nt, 'ABSOLUTE', math_node(nt, 'SUBTRACT', nV.outputs['Fac'], 0.5))
    vr = node(nt, 'ShaderNodeMapRange', -400, 0)
    vr.inputs['From Min'].default_value, vr.inputs['From Max'].default_value = 0.0, 0.035
    vr.inputs['To Min'].default_value, vr.inputs['To Max'].default_value = 1.0, 0.0
    L(vd, vr.inputs['Value'])
    br = math_node(nt, 'MULTIPLY_ADD', nA.outputs['Fac'], 0.18, 0.82)
    br = math_node(nt, 'MULTIPLY', br, bk.outputs['Color'])
    br = math_node(nt, 'MULTIPLY_ADD', vr.outputs['Result'], -0.035, br)
    br = math_node(nt, 'MULTIPLY_ADD', bk.outputs['Fac'], -0.35, br)
    col = node(nt, 'ShaderNodeVectorMath', 200, 300, operation='SCALE')
    col.inputs[0].default_value = srgb('e2d7c3')[:3]
    L(br, col.inputs['Scale'])
    L(col.outputs['Vector'], bsdf.inputs['Base Color'])
    # polish: low roughness with soft variation; the joints stay matte
    r = math_node(nt, 'MULTIPLY_ADD', nA.outputs['Fac'], 0.10, 0.06)
    r = math_node(nt, 'MULTIPLY_ADD', bk.outputs['Fac'], 0.5, r)
    L(r, bsdf.inputs['Roughness'])
    bp = node(nt, 'ShaderNodeBump', 800, -300)
    bp.inputs['Strength'].default_value = 0.25
    bp.inputs['Distance'].default_value = 0.002
    L(math_node(nt, 'MULTIPLY', bk.outputs['Fac'], -1.0), bp.inputs['Height'])
    L(bp.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def principled(name, hexstr, rough=0.5, metal=0.0, extra=None):
    mat, nt, out = new_material(name)
    b = node(nt, 'ShaderNodeBsdfPrincipled', 1100, 0)
    b.inputs['Base Color'].default_value = srgb(hexstr)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    for k, v in (extra or {}).items():
        b.inputs[k].default_value = v
    nt.links.new(b.outputs['BSDF'], out.inputs['Surface'])
    return mat


def glass_material(tex_path):
    """thin cathedral glass: the texture tints what passes (and so the light
    that lands on the floor), a faint gloss on top, a little seedy texture"""
    mat, nt, out = new_material('Stained glass')
    L = nt.links.new
    tc = node(nt, 'ShaderNodeTexCoord', -900, 0)
    img = node(nt, 'ShaderNodeTexImage', -600, 0)
    img.image = bpy.data.images.load(tex_path)
    img.interpolation = 'Cubic'
    L(tc.outputs['UV'], img.inputs['Vector'])
    tr = node(nt, 'ShaderNodeBsdfTransparent', 0, 100)
    L(img.outputs['Color'], tr.inputs['Color'])
    gl = node(nt, 'ShaderNodeBsdfGlossy', 0, -100)
    gl.inputs['Roughness'].default_value = 0.04
    nz = node(nt, 'ShaderNodeTexNoise', -600, -300)
    nz.inputs['Scale'].default_value = 60
    L(tc.outputs['Object'], nz.inputs['Vector'])
    bp = node(nt, 'ShaderNodeBump', -300, -300)
    bp.inputs['Strength'].default_value = 0.08
    L(nz.outputs['Fac'], bp.inputs['Height'])
    L(bp.outputs['Normal'], gl.inputs['Normal'])
    lw = node(nt, 'ShaderNodeLayerWeight', 0, 300)
    lw.inputs['Blend'].default_value = 0.08
    mx = node(nt, 'ShaderNodeMixShader', 400, 0)
    L(lw.outputs['Fresnel'], mx.inputs['Fac'])
    L(tr.outputs['BSDF'], mx.inputs[1])
    L(gl.outputs['BSDF'], mx.inputs[2])
    L(mx.outputs['Shader'], out.inputs['Surface'])
    return mat


def leaf_material():
    mat, nt, out = new_material('Olive leaf')
    L = nt.links.new
    at = node(nt, 'ShaderNodeAttribute', -700, 200, attribute_name='tone', attribute_type='GEOMETRY')
    ramp = node(nt, 'ShaderNodeValToRGB', -400, 200)
    ramp.color_ramp.elements[0].color = srgb('55603a')
    ramp.color_ramp.elements[1].color = srgb('9aa17a')        # the silvery underside olive shows
    L(at.outputs['Fac'], ramp.inputs['Fac'])
    b = node(nt, 'ShaderNodeBsdfPrincipled', 0, 200)
    b.inputs['Roughness'].default_value = 0.55
    L(ramp.outputs['Color'], b.inputs['Base Color'])
    t = node(nt, 'ShaderNodeBsdfTranslucent', 0, -100)
    t.inputs['Color'].default_value = srgb('a8b25a')
    mx = node(nt, 'ShaderNodeMixShader', 400, 0)
    mx.inputs['Fac'].default_value = 0.25
    L(b.outputs['BSDF'], mx.inputs[1])
    L(t.outputs['BSDF'], mx.inputs[2])
    L(mx.outputs['Shader'], out.inputs['Surface'])
    return mat


# -------------------------------------------------------------- window --
def save_rgb(arr, path):
    """write an (h, w, 3) sRGB array, row 0 at the bottom, as a PNG via Blender"""
    import numpy as np
    h, w, _ = arr.shape
    img = bpy.data.images.new(os.path.basename(path), w, h, alpha=False)
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[..., :3] = arr
    img.pixels.foreach_set(rgba.ravel())
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)
    return path


def hex01(h):
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def draw_glass_texture(path, px_per_m=200):
    """paint the panes: every SHAPES fill over a clear ground, in window
    meters, so the texture maps 1:1 onto the glass plane's UVs"""
    import numpy as np
    W, H = 2 * WIN['half_w'], WIN['height']
    w, h = int(W * px_per_m), int(H * px_per_m)
    X, Z = np.meshgrid((np.arange(w) + 0.5) / px_per_m - WIN['half_w'], (np.arange(h) + 0.5) / px_per_m)
    arr = np.empty((h, w, 3), dtype=np.float32)
    arr[:] = hex01(GLASS['clear'])
    s = 2 * WIN['half_w'] / PX_W
    for kind, p, c in SHAPES:
        if c is None:
            continue
        if kind == 'rect':
            x0, x1 = sorted((wx(p[0]), wx(p[2])))
            z0, z1 = sorted((wz(p[1]), wz(p[3])))
            m = (X >= x0) & (X <= x1) & (Z >= z0) & (Z <= z1)
        elif kind == 'disc':
            m = (X - wx(p[0])) ** 2 + (Z - wz(p[1])) ** 2 <= (p[2] * s) ** 2
        elif kind == 'quarter':
            dx, dz = X - wx(p[0]), Z - wz(p[1])
            sx = -1 if p[3][1] == 'l' else 1
            sz = 1 if p[3][0] == 'u' else -1
            m = (dx ** 2 + dz ** 2 <= (p[2] * s) ** 2) & (dx * sx >= 0) & (dz * sz >= 0)
        arr[m] = hex01(GLASS[c])
    # a whisper of streakiness, as in hand-rolled glass
    rng = np.random.default_rng(3)
    streak = rng.normal(1.0, 0.008, size=(1, w, 1)).astype(np.float32)
    arr = np.clip(arr * streak, 0, 1)
    return save_rgb(arr, path)


def build_window(mats):
    yw = HALL['depth']                       # glass plane
    hw, H = WIN['half_w'], WIN['height']

    # the glass: one plane with UVs over the whole opening
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new('UV')
    vs = [bm.verts.new((x, yw, z)) for x, z in ((-hw, 0), (hw, 0), (hw, H), (-hw, H))]
    f = bm.faces.new(vs)
    for loop, (u, v) in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        loop[uv].uv = (u, v)
    glass = finish_mesh('Glass', bm, mats['glass'], recalc=False)

    # the leading: square steel bars along every line, ring and arc
    bm = bmesh.new()
    def bar(x0, z0, x1, z1, w, d):
        a, b = Vector((x0, z0)), Vector((x1, z1))
        t = b - a
        if t.length < 1e-6:
            return
        n = Vector((-t.y, t.x)).normalized() * (w / 2)
        quad = [a + n, b + n, b - n, a - n]
        v0 = [bm.verts.new((p.x, yw - d / 2, p.y)) for p in quad]
        v1 = [bm.verts.new((p.x, yw + d / 2, p.y)) for p in quad]
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((v0[i], v0[j], v1[j], v1[i]))
        bm.faces.new(v0[::-1])
        bm.faces.new(v1)
    def arc(cx, cz, r, a0, a1, w, d, n=48):
        """one continuous curved bar (a swept square section), so rings stay round"""
        closed = abs((a1 - a0) - 2 * pi) < 1e-6
        m = n if closed else n + 1
        rings = []
        for k in range(m):
            a = a0 + (a1 - a0) * k / n
            ca, sa = cos(a), sin(a)
            rings.append([bm.verts.new((cx + (r + ro) * ca, yw + dy, cz + (r + ro) * sa))
                          for ro, dy in ((-w / 2, -d / 2), (w / 2, -d / 2), (w / 2, d / 2), (-w / 2, d / 2))])
        for k in range(m if closed else m - 1):
            A, Bq = rings[k], rings[(k + 1) % m]
            for i in range(4):
                j = (i + 1) % 4
                bm.faces.new((A[i], A[j], Bq[j], Bq[i]))
        if not closed:
            bm.faces.new(rings[0][::-1])
            bm.faces.new(rings[-1])
    s = 2 * hw / PX_W
    lead, lead_d = 0.07, 0.12
    for x0, y0, x1, y1 in FRAME:
        bar(wx(x0), wz(y0), wx(x1), wz(y1), 0.18, 0.2)
    for x0, y0, x1, y1 in BARS:
        bar(wx(x0), wz(y0), wx(x1), wz(y1), lead, lead_d)
    for kind, p, _ in SHAPES:
        if kind == 'rect':
            x0, y0, x1, y1 = p
            for a, b in (((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))):
                bar(wx(a[0]), wz(a[1]), wx(b[0]), wz(b[1]), lead, lead_d)
        elif kind == 'disc':
            arc(wx(p[0]), wz(p[1]), p[2] * s, 0, 2 * pi, lead * 1.3, lead_d, 96)
        elif kind == 'arch':
            arc(wx(p[0]), wz(p[1]), p[2] * s, 0, pi, lead, lead_d, 64)
        elif kind == 'quarter':
            a0 = {'ul': pi / 2, 'ur': 0, 'll': pi, 'lr': -pi / 2}[p[3]]
            arc(wx(p[0]), wz(p[1]), p[2] * s, a0, a0 + pi / 2, lead, lead_d, 24)
    finish_mesh('Leading', bm, mats['steel'])
    return glass


# ---------------------------------------------------------------- hall --
def build_hall(mats):
    hw, D, Hh, back = HALL['half_w'], HALL['depth'], HALL['height'], HALL['back']
    wh, H, rv = WIN['half_w'], WIN['height'], WIN['reveal']

    # floor and ceiling slabs
    bm = bmesh.new()
    box(bm, -hw - 0.5, back, -0.3, hw + 0.5, D + rv + 0.5, 0.0)
    finish_mesh('Floor', bm, mats['floor'])
    bm = bmesh.new()
    box(bm, -hw - 0.5, back, Hh, hw + 0.5, D + rv + 0.5, Hh + 0.4)
    finish_mesh('Ceiling', bm, mats['wall_plain'])

    # side walls, the back wall behind the camera, and the end wall around the
    # window: separate solids, so each niche cut sees one clean closed mesh
    def wall(name, *b):
        bm = bmesh.new()
        box(bm, *b)
        return finish_mesh(name, bm, mats['wall'])
    left = wall('Wall left', -hw - 0.6, back, 0, -hw, D + rv, Hh)
    right = wall('Wall right', hw, back, 0, hw + 0.6, D + rv, Hh)
    wall('Wall back', -hw, back - 0.6, 0, hw, back, Hh)
    wall('End wall left', -hw, D, 0, -wh, D + rv, Hh)
    wall('End wall right', wh, D, 0, hw, D + rv, Hh)
    wall('End wall over', -wh, D, H, wh, D + rv, Hh)

    # recesses cut into the side walls: two tall arched niches on the left, an
    # arched doorway on the right behind a pair of steps
    def arch_cut(wall_ob, x_face, inward, yc, half, spring, depth):
        """a round-headed prism through the wall face, from below the floor"""
        cut = bmesh.new()
        n = 32
        prof = [(yc - half, -0.05)] + [(yc - half * cos(pi * k / n), spring + half * sin(pi * k / n)) for k in range(n + 1)] + [(yc + half, -0.05)]
        x_in, x_out = x_face - inward * 0.3, x_face + inward * depth
        a = [cut.verts.new((x_in, y, z)) for y, z in prof]
        b = [cut.verts.new((x_out, y, z)) for y, z in prof]
        cut.faces.new(a)
        cut.faces.new(b[::-1])
        for i in range(len(prof)):
            j = (i + 1) % len(prof)
            cut.faces.new((a[i], a[j], b[j], b[i]))
        cutter = finish_mesh(wall_ob.name + ' cut %.1f' % yc, cut)
        cutter.hide_render = True
        cutter.display_type = 'WIRE'
        m = wall_ob.modifiers.new('Niche', 'BOOLEAN')
        m.operation, m.solver, m.object = 'DIFFERENCE', 'EXACT', cutter
    arch_cut(left, -hw, -1, 4.3, 0.85, 3.9, 0.55)
    arch_cut(left, -hw, -1, 6.5, 0.6, 3.4, 0.55)
    arch_cut(right, hw, 1, 6.75, 0.5, 2.6, 0.9)

    # pilasters framing the window, lit edge-on by the sun
    bm = bmesh.new()
    box(bm, -wh - 0.55, D - 0.35, 0, -wh, D, Hh)
    box(bm, wh, D - 0.35, 0, wh + 0.55, D, Hh)
    bevel(finish_mesh('Window pilasters', bm, mats['wall']), 0.01, 2)

    # steps up to the doorway on the right
    bm = bmesh.new()
    box(bm, hw - 1.1, 6.05, 0, hw, 7.45, 0.16)
    box(bm, hw - 0.7, 6.2, 0.16, hw, 7.3, 0.32)
    bevel(finish_mesh('Steps', bm, mats['stone_light']), 0.012, 2)


def build_props(mats):
    hw = HALL['half_w']
    # benches: a slab on two blocks
    def bench(name, x0, y0, x1, y1, h=0.46):
        bm = bmesh.new()
        box(bm, x0, y0, h - 0.09, x1, y1, h)
        ins = 0.12
        if (x1 - x0) > (y1 - y0):
            box(bm, x0 + ins, y0 + 0.05, 0, x0 + ins + 0.16, y1 - 0.05, h - 0.09)
            box(bm, x1 - ins - 0.16, y0 + 0.05, 0, x1 - ins, y1 - 0.05, h - 0.09)
        else:
            box(bm, x0 + 0.05, y0 + ins, 0, x1 - 0.05, y0 + ins + 0.16, h - 0.09)
            box(bm, x0 + 0.05, y1 - ins - 0.16, 0, x1 - 0.05, y1 - ins, h - 0.09)
        bevel(finish_mesh(name, bm, mats['bench']), 0.01, 2)
    bench('Bench left', -hw + 0.05, 3.4, -hw + 0.5, 5.2)
    bench('Bench right', hw - 0.5, 4.2, hw - 0.05, 5.7)

    # urns: a swelling body, a short neck, a lip
    urn = [(0, 0), (0.17, 0), (0.24, 0.12), (0.28, 0.3), (0.25, 0.48), (0.17, 0.6), (0.15, 0.64),
           (0.17, 0.67), (0.15, 0.68), (0.14, 0.62), (0, 0.6)]
    for name, pos, k in (('Urn left', (-hw + 0.5, 5.6, 0), 1.0), ('Urn right', (hw - 0.4, 3.6, 0), 0.95)):
        lathe(name, [(r * k, z * k) for r, z in urn], 72, mats['ceramic'], at=pos)
        olive_tree(name.replace('Urn', 'Olive'), Vector(pos) + Vector((0, 0, 0.58 * k)), 1.0 * k, mats)
    # the bowl on the right bench
    bowl = [(0, 0.47), (0.09, 0.47), (0.17, 0.52), (0.21, 0.6), (0.2, 0.6), (0.16, 0.54), (0, 0.52)]
    lathe('Bowl', bowl, 64, mats['ceramic_dark'], at=(hw - 0.28, 5.3, 0))

    # the art panel on the right wall: limestone with gold-leaf circle and arcs
    import numpy as np
    w, h = 600, 1500
    U, V = np.meshgrid((np.arange(w) + 0.5) / w, (np.arange(h) + 0.5) / h)     # V from the bottom
    arr = np.empty((h, w, 3), dtype=np.float32)
    arr[:] = hex01('d9c8a6')
    gold, line = hex01('c99a45'), hex01('a07a36')
    # a sun disc above, a half disc below, a gold rule between, a fine border
    arr[((U - 0.58) / 0.40) ** 2 + ((V - 0.76) / 0.16) ** 2 <= 1] = gold
    arr[(((U - 0.5) / 0.42) ** 2 + ((V - 0.30) / 0.25) ** 2 <= 1) & (U <= 0.5)] = gold
    arr[np.abs(U - 0.5) < 0.004] = line
    border = (np.minimum(np.minimum(U, 1 - U) * w, np.minimum(V, 1 - V) * h))
    arr[(border > 24) & (border < 30)] = line
    tex = save_rgb(arr, os.path.join(LOCAL, 'textures', 'art-panel.png'))
    mat, nt, out = new_material('Art panel')
    img = node(nt, 'ShaderNodeTexImage', -400, 0)
    img.image = bpy.data.images.load(tex)
    b = node(nt, 'ShaderNodeBsdfPrincipled', 200, 0)
    nt.links.new(img.outputs['Color'], b.inputs['Base Color'])
    # the gold reads as metal where the texture is saturated
    sep = node(nt, 'ShaderNodeSeparateColor', -100, -200, mode='HSV')
    nt.links.new(img.outputs['Color'], sep.inputs['Color'])
    mr = node(nt, 'ShaderNodeMapRange', 50, -200)
    mr.inputs['From Min'].default_value, mr.inputs['From Max'].default_value = 0.4, 0.6
    nt.links.new(sep.outputs['Green'], mr.inputs['Value'])
    nt.links.new(mr.outputs['Result'], b.inputs['Metallic'])
    nt.links.new(math_node(nt, 'MULTIPLY_ADD', mr.outputs['Result'], -0.35, 0.65), b.inputs['Roughness'])
    nt.links.new(b.outputs['BSDF'], out.inputs['Surface'])
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('UV')
    x = hw - 0.04
    y0, y1, z0, z1 = 4.5, 5.6, 1.1, 3.6
    v = [bm.verts.new(p) for p in ((x, y0, z0), (x, y1, z0), (x, y1, z1), (x, y0, z1))]
    f = bm.faces.new(v[::-1])
    for loop in f.loops:
        p = loop.vert.co
        loop[uvl].uv = ((p.y - y0) / (y1 - y0), (p.z - z0) / (z1 - z0))
    finish_mesh('Art panel', bm, mat, recalc=False)


def olive_tree(name, base, scale, mats, seed=None):
    """a small olive: a leaning, twisting trunk that forks, thin branches, and
    sprays of narrow two-toned leaves at the ends"""
    rnd = random.Random(seed if seed is not None else sum(map(ord, name)))
    wood = bmesh.new()
    leaves = bmesh.new()
    tone = leaves.faces.layers.float.new('tone')

    def limb(p, d, length, radius, depth):
        segs = 4
        pts = [p]
        dd = d.copy()
        for i in range(segs):
            dd = (dd + Vector((rnd.uniform(-.25, .25), rnd.uniform(-.25, .25), rnd.uniform(-.05, .2)))).normalized()
            pts.append(pts[-1] + dd * (length / segs))
        for i in range(segs):
            r0 = radius * (1 - 0.35 * i / segs)
            r1 = radius * (1 - 0.35 * (i + 1) / segs)
            tube(pts[i], pts[i + 1], r0, r1)
        tip = pts[-1]
        if depth == 0 or radius < 0.004:
            spray(tip, dd)
            for q in pts[2:-1]:
                spray(q, dd, n=18)
            return
        kids = rnd.choice((2, 2, 3))
        for k in range(kids):
            nd = (dd + Vector((rnd.uniform(-.9, .9), rnd.uniform(-.9, .9), rnd.uniform(-.1, .5)))).normalized()
            limb(tip, nd, length * rnd.uniform(0.62, 0.8), radius * 0.62, depth - 1)

    def tube(a, b, r0, r1, sides=6):
        ax = (b - a).normalized()
        u = ax.orthogonal().normalized()
        w = ax.cross(u)
        ra = [wood.verts.new(a + (u * cos(2 * pi * k / sides) + w * sin(2 * pi * k / sides)) * r0) for k in range(sides)]
        rb = [wood.verts.new(b + (u * cos(2 * pi * k / sides) + w * sin(2 * pi * k / sides)) * r1) for k in range(sides)]
        for k in range(sides):
            wood.faces.new((ra[k], ra[(k + 1) % sides], rb[(k + 1) % sides], rb[k]))

    def spray(p, d, n=44):
        for _ in range(n):
            c = p + Vector((rnd.gauss(0, .07), rnd.gauss(0, .07), rnd.gauss(0.02, .06))) * scale
            ld = (d + Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-.6, .4)))).normalized()
            side = ld.orthogonal().normalized()
            side.rotate(Euler((0, 0, rnd.uniform(0, pi))))
            L, W = 0.065 * scale, 0.011 * scale
            q = [leaves.verts.new(v) for v in (c, c + ld * L * 0.5 + side * W, c + ld * L, c + ld * L * 0.5 - side * W)]
            f = leaves.faces.new(q)
            f[tone] = rnd.random() ** 1.5

    trunk_dir = Vector((rnd.uniform(-.2, .2), rnd.uniform(-.2, .2), 1)).normalized()
    limb(base, trunk_dir, 0.6 * scale, 0.04 * scale, 5)
    finish_mesh(name + ' wood', wood, mats['bark'], radians(60))
    lv = finish_mesh(name + ' leaves', leaves, mats['leaf'], recalc=False)
    for p in lv.data.polygons:
        p.use_smooth = False


# ---------------------------------------------------------------- haze --
def build_haze(density):
    """a little dust in the air so the low sun draws rays between the bars"""
    mat, nt, out = new_material('Haze')
    vol = node(nt, 'ShaderNodeVolumePrincipled', 800, 0)
    vol.inputs['Color'].default_value = srgb('f4ead8')
    vol.inputs['Anisotropy'].default_value = 0.65
    tc = node(nt, 'ShaderNodeTexCoord', 0, 0)
    nz = node(nt, 'ShaderNodeTexNoise', 300, 0)
    nz.inputs['Scale'].default_value = 0.4
    nz.inputs['Detail'].default_value = 3
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    nt.links.new(math_node(nt, 'MULTIPLY_ADD', nz.outputs['Fac'], density, density * 0.5), vol.inputs['Density'])
    nt.links.new(vol.outputs['Volume'], out.inputs['Volume'])
    bm = bmesh.new()
    hw = HALL['half_w'] - 0.02
    box(bm, -hw, HALL['back'] + 0.02, 0.01, hw, HALL['depth'] - 0.05, HALL['height'] - 0.02)
    finish_mesh('Haze', bm, mat)


# --------------------------------------------------------- light, view --
def sun_from_hdri(img):
    """direction of the brightest pixel of an equirectangular image"""
    import numpy as np
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    lum = px.reshape(h, w, 4)[..., :3].sum(axis=2)
    j, i = np.unravel_index(int(lum.argmax()), lum.shape)
    u, v = (i + 0.5) / w, (j + 0.5) / h            # v from the bottom row (Blender pixel order)
    el = (v - 0.5) * pi
    az = (0.5 - u) * 2 * pi                         # Cycles: u = -atan2(dir.y, dir.x) / 2pi + 0.5
    d = Vector((cos(el) * cos(az), cos(el) * sin(az), sin(el)))
    return d, float(lum.max())


def build_light(args):
    scn = bpy.context.scene
    w = bpy.data.worlds.new('Sky')
    w.use_nodes = True
    nt = w.node_tree
    bg = nt.nodes['Background']
    env = node(nt, 'ShaderNodeTexEnvironment', -400, 300)
    env.image = bpy.data.images.load(args.hdri)
    tc = node(nt, 'ShaderNodeTexCoord', -900, 300)
    mp = node(nt, 'ShaderNodeMapping', -650, 300)
    nt.links.new(tc.outputs['Generated'], mp.inputs['Vector'])
    nt.links.new(mp.outputs['Vector'], env.inputs['Vector'])
    nt.links.new(env.outputs['Color'], bg.inputs['Color'])
    bg.inputs['Strength'].default_value = args.sky
    scn.world = w

    # where the sun should be: just right of the window's middle, at the
    # photograph's own height above the horizon so view and shadows agree
    have, peak = sun_from_hdri(env.image)
    el = radians(args.sun_el) if args.sun_el is not None else math.asin(have.z)
    want = Vector((sin(radians(args.sun_az)) * cos(el), cos(radians(args.sun_az)) * cos(el), sin(el)))
    # spin the photograph about the vertical so its sun sits where we want it
    rot = atan2(have.y, have.x) - atan2(want.y, want.x)
    mp.inputs['Rotation'].default_value[2] = rot
    print(f'hdri sun: el {math.degrees(math.asin(have.z)):.1f} deg, peak {peak:.0f}; rotated {math.degrees(rot):.1f} deg')

    sun = bpy.data.lights.new('Sun', 'SUN')
    sun.energy = args.sun
    sun.angle = radians(0.6)
    sun.color = srgb('ffe4c2')[:3]
    ob = bpy.data.objects.new('Sun', sun)
    ob.rotation_euler = (-want).to_track_quat('-Z', 'Y').to_euler()
    scn.collection.objects.link(ob)

    # a portal in the window opening: the sky is sampled through it, not hunted for
    portal = bpy.data.lights.new('Window portal', 'AREA')
    portal.shape = 'RECTANGLE'
    portal.size, portal.size_y = 2 * WIN['half_w'], WIN['height']
    portal.cycles.is_portal = True
    po = bpy.data.objects.new('Window portal', portal)
    po.location = (0, HALL['depth'] + 0.3, WIN['height'] / 2)
    po.rotation_euler = (radians(-90), 0, 0)     # facing into the hall (-Y)
    scn.collection.objects.link(po)


def build_camera(args):
    scn = bpy.context.scene
    cam = bpy.data.cameras.new('Camera')
    cam.sensor_fit = 'HORIZONTAL'
    cam.angle = radians(args.hfov)
    cam.shift_y = args.shift
    ob = bpy.data.objects.new('Camera', cam)
    ob.location = (args.cam_x, 0.0, EYE)
    ob.rotation_euler = (radians(90), 0, 0)      # level, looking down +Y
    scn.collection.objects.link(ob)
    scn.camera = ob
    scn.render.resolution_x = args.width
    scn.render.resolution_y = round(args.width * 2 / 3)


def setup_render(args):
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.refresh_devices()
    for d in prefs.devices:
        d.use = d.type == 'OPTIX'
    c = scn.cycles
    c.device = 'GPU'
    c.samples = args.samples
    c.use_adaptive_sampling = True
    c.adaptive_threshold = 0.005
    c.use_denoising = True
    c.denoiser = 'OPENIMAGEDENOISE'
    c.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
    c.denoising_prefilter = 'ACCURATE'
    c.max_bounces = 12
    c.diffuse_bounces = 6
    c.glossy_bounces = 6
    c.transparent_max_bounces = 16
    c.sample_clamp_indirect = 30.0
    c.caustics_reflective = c.caustics_refractive = False
    c.volume_bounces = 0
    scn.view_settings.view_transform = 'AgX'
    try:
        scn.view_settings.look = 'AgX - Medium High Contrast'
    except TypeError:
        pass
    scn.view_settings.exposure = args.exposure
    scn.render.image_settings.file_format = 'PNG'


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(LOCAL, 'renders', 'hall.png'))
    ap.add_argument('--width', type=int, default=1536)
    ap.add_argument('--samples', type=int, default=512)
    ap.add_argument('--hdri', default=os.path.join(LOCAL, 'hdri', 'camdeboo_road_4k.hdr'))
    ap.add_argument('--sky', type=float, default=1.0, help='HDRI strength')
    ap.add_argument('--sun', type=float, default=6.0, help='sun lamp strength')
    ap.add_argument('--sun-az', type=float, default=10.0, help='degrees right of straight ahead')
    ap.add_argument('--sun-el', type=float, default=None, help='degrees above the horizon (default: the photograph\'s own sun)')
    ap.add_argument('--hfov', type=float, default=78.0, help='horizontal field of view, degrees')
    ap.add_argument('--shift', type=float, default=-0.085, help='lens shift; negative shows more floor')
    ap.add_argument('--cam-x', type=float, default=-0.15)
    ap.add_argument('--exposure', type=float, default=0.0)
    ap.add_argument('--haze', type=float, default=0.0015, help='density of the air in the hall (0 for none)')
    ap.add_argument('--save', default='')
    ap.add_argument('--no-render', action='store_true')
    return ap.parse_args(argv)


def main():
    args = parse_args()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    t0 = time.time()
    mats = dict(
        floor=polished_floor(),
        wall=limestone('Limestone', 'ebe2d0', joints=(1.6, 0.8)),
        wall_plain=limestone('Limestone plain', 'ebe2d0'),
        stone_light=limestone('Limestone steps', 'e8dcc2', rough=0.6),
        bench=limestone('Bench stone', 'b9a58a', rough=0.6),
        ceramic=principled('Urn', 'e6dccb', rough=0.7),
        ceramic_dark=principled('Bowl', '8a7a66', rough=0.5),
        steel=principled('Bronze leading', '2a2620', rough=0.35, metal=0.8),
        bark=principled('Olive bark', '6b5d4a', rough=0.85),
        leaf=leaf_material(),
        glass=glass_material(draw_glass_texture(os.path.join(LOCAL, 'textures', 'glass.png'))),
    )
    build_hall(mats)
    build_window(mats)
    build_props(mats)
    build_light(args)
    if args.haze > 0:
        build_haze(args.haze)
    build_camera(args)
    setup_render(args)
    print(f'built in {time.time() - t0:.1f}s')
    if args.save:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(args.save))
    if not args.no_render:
        out = os.path.abspath(args.out)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        bpy.context.scene.render.filepath = out
        t1 = time.time()
        bpy.ops.render.render(write_still=True)
        print(f'rendered {out} in {time.time() - t1:.1f}s')


main()
