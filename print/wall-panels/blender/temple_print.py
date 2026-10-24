"""
HERMITAGE WORLD — the temple, rebuilt for print (Blender 5, Cycles)
----------------------------------------------------------------------------
The same room as assets/js/temple.js, from the same numbers, but as real
geometry under real light: the coffers and arch alcoves the web shader only
paints are carved here, every floor block has worn (beveled) edges, and the
only light is the sun through the oculus plus the sky, bounced by the
path tracer. A thin haze in the room makes the shaft.

Run headless (Git Bash):
  "/c/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b \
      -P print/wall-panels/blender/temple_print.py -- \
      --framing "#x=0.4&y=1.65&z=15.6&yaw=-3&pitch=0&fov=30&shift=0&p=0.5" \
      --out print/wall-panels/local/renders/doorway.png --width 2100 --samples 256

--framing takes either a composer link / hash or the composer's
"Setup for Blender" .json. --save writes the .blend so the scene can be
opened and refined by hand.

Coordinates: everything is computed in three.js space (Y up, meters) like
temple.js and converted once in B(): (x, y, z) -> Blender (x, -z, y).
"""

import argparse
import json
import math
import os
import random
import sys
import time
import urllib.parse
from math import cos, exp, pi, radians, sin, sqrt

import bmesh
import bpy
from mathutils import Euler, Vector
from mathutils.kdtree import KDTree

# ------------------------------------------------------------- the room --
# mirrors P in assets/js/temple.js
R, WH, DH = 18.0, 6.6, 7.4               # drum radius, wall height, dome rise
BAYS, COFFERS, COFFER_ROWS = 16, 28, 5
OCULUS_Y, OCULUS_R = 14.0, 1.6
RINGS = dict(r0=1.35, r1=16.5, w=0.78, gapR=0.05, arc=1.55, gapA=0.05,
             spokeGap=0.09, markerRing=11, markerRaise=0.07)
RIPPLE = dict(wave=1.30, speed=0.52, decay=0.038)
POOL, POOL_END = Vector((3.6, 0, -1.2)), Vector((1.6, 0, -0.8))
ALCOVE = dict(hw=2.05, spring=3.05, sill=0.5, depth=0.36, band=0.30, proud=0.05)

HEX = dict(stone='b9a58a', dais='c4b094', wall='a9977b', trim='b8a686',
           pilaster='b5a385', plinth='a08d72', mortar='3a3127', sun='ffdcb0')

EXPOSURE_TRIM = 0.0                      # stops, set from --exposure

DOORWAY = dict(x=0.4, y=1.65, z=15.6, yaw=-3, pitch=0, fov=30, shift=0, p=0.5,
               t=24, rip=0.3, sun=1, shaft=1)


def B(x, y, z):
    return Vector((x, -z, y))


def ss(a, b, x):
    t = min(max((x - a) / (b - a), 0.0), 1.0)
    return t * t * (3 - 2 * t)


def srgb(hexstr):
    """hex sRGB -> linear RGBA, which is what Blender color sockets take"""
    out = []
    for i in (0, 2, 4):
        c = int(hexstr[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return (*out, 1.0)


# ------------------------------------------------------------ arguments --
def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument('--framing', default='')
    ap.add_argument('--out', default='print/wall-panels/local/renders/render.png')
    ap.add_argument('--width', type=int, default=2100)
    ap.add_argument('--samples', type=int, default=256)
    ap.add_argument('--save', default='')
    ap.add_argument('--no-render', action='store_true')
    ap.add_argument('--light', choices=('web', 'down'), default='web',
                    help='web: the sun lands where the website puts the pool; down: straight down onto the dais')
    ap.add_argument('--ring-width', type=float, default=0.78,
                    help='floor ring width in meters (the website uses 0.78); narrower rings show the ripple as a wave')
    ap.add_argument('--motes', type=int, default=0, help='dust motes in the room (the website uses 2600)')
    ap.add_argument('--no-links', action='store_true', help='motes without the faint lines between them')
    ap.add_argument('--exposure', type=float, default=0.0, help='exposure trim in stops')
    ap.add_argument('--sun-angle', type=float, default=0.9,
                    help='apparent size of the sun in degrees; larger gives a softer, more diffused pool')
    ap.add_argument('--denoiser', choices=('oidn', 'optix', 'none'), default='oidn')
    ap.add_argument('--dust', type=float, default=1.0, help='brightness of the motes and links (1 = default)')
    return ap.parse_args(argv)


def read_framing(arg):
    s = dict(DOORWAY)
    if not arg:
        return s
    if arg.lower().endswith('.json'):
        with open(arg, encoding='utf-8') as f:
            j = json.load(f)
        cam, sc = j['camera'], j['scene']
        x, y, z = cam['position']
        s.update(x=x, y=y, z=z, yaw=cam['yaw_deg'], pitch=cam['pitch_deg'],
                 fov=cam['vfov_deg'], shift=cam['lens_rise_half_heights'],
                 p=sc['entry'], t=sc['time_s'], rip=sc['ripple']['amp'])
        return s
    q = urllib.parse.parse_qs(arg.split('#', 1)[-1])
    for k, v in q.items():
        if k in s:
            s[k] = float(v[0])
    return s


# ---------------------------------------------------------------- mesh --
def finish_mesh(name, bm, mat, smooth_angle=None, recalc=True):
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
    m.width = width
    m.segments = segments
    m.limit_method = 'ANGLE'
    m.angle_limit = radians(angle)
    m.harden_normals = False
    return m


def lathe(name, profile, segs, mat, smooth_angle=radians(40)):
    """closed (r, y) profile spun around the vertical axis"""
    bm = bmesh.new()
    rings = []
    for r, y in profile:
        if r < 1e-6:
            rings.append([bm.verts.new(B(0, y, 0))])
        else:
            rings.append([bm.verts.new(B(r * cos(2 * pi * k / segs), y, r * sin(2 * pi * k / segs)))
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


# ------------------------------------------------------------ materials --
def node(nt, kind, x=0, y=0, **props):
    n = nt.nodes.new(kind)
    n.location = (x, y)
    for k, v in props.items():
        setattr(n, k, v)
    return n


def mix_rgba(nt, x, y):
    n = node(nt, 'ShaderNodeMix', x, y, data_type='RGBA')
    ins = [i for i in n.inputs if i.type == 'RGBA']
    out = [o for o in n.outputs if o.type == 'RGBA'][0]
    return n, n.inputs['Factor'], ins[0], ins[1], out


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


def stone_material(name, hexstr, rough=0.7, scale=1.0, pores=1.0, veins=1.0, per_block=False, bump=0.25,
                   ashlar=False, grime=0.35):
    """Travertine: warm mottling, faint veins, small pits, per-block tint"""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    L = nt.links.new
    out = node(nt, 'ShaderNodeOutputMaterial', 1400, 0)
    bsdf = node(nt, 'ShaderNodeBsdfPrincipled', 1100, 0)
    L(bsdf.outputs['BSDF'], out.inputs['Surface'])

    tc = node(nt, 'ShaderNodeTexCoord', -1200, 0)
    mp = node(nt, 'ShaderNodeMapping', -1000, 0)
    mp.inputs['Scale'].default_value = (scale, scale, scale)
    L(tc.outputs['Object'], mp.inputs['Vector'])
    co = mp.outputs['Vector']

    # broad mottling and fine grain
    nA = node(nt, 'ShaderNodeTexNoise', -800, 300)
    nA.inputs['Scale'].default_value = 0.6
    nA.inputs['Detail'].default_value = 4
    L(co, nA.inputs['Vector'])
    nB = node(nt, 'ShaderNodeTexNoise', -800, 100)
    nB.inputs['Scale'].default_value = 9.0
    nB.inputs['Detail'].default_value = 8
    nB.inputs['Roughness'].default_value = 0.6
    L(co, nB.inputs['Vector'])

    # veins: the thin band where a distorted noise crosses its midpoint
    nV = node(nt, 'ShaderNodeTexNoise', -800, -100)
    nV.inputs['Scale'].default_value = 0.45
    nV.inputs['Detail'].default_value = 3
    nV.inputs['Distortion'].default_value = 1.2
    L(co, nV.inputs['Vector'])
    vd = math_node(nt, 'ABSOLUTE', math_node(nt, 'SUBTRACT', nV.outputs['Fac'], 0.5))
    vr = node(nt, 'ShaderNodeMapRange', -400, -100)
    vr.inputs['From Min'].default_value, vr.inputs['From Max'].default_value = 0.0, 0.012
    vr.inputs['To Min'].default_value, vr.inputs['To Max'].default_value = veins, 0.0
    L(vd, vr.inputs['Value'])
    vein = vr.outputs['Result']

    # pits: small voronoi cells, only where a mask noise allows
    vo = node(nt, 'ShaderNodeTexVoronoi', -800, -350)
    vo.inputs['Scale'].default_value = 22.0
    L(co, vo.inputs['Vector'])
    pr = node(nt, 'ShaderNodeMapRange', -500, -350)
    pr.inputs['From Min'].default_value, pr.inputs['From Max'].default_value = 0.05, 0.18
    pr.inputs['To Min'].default_value, pr.inputs['To Max'].default_value = 1.0, 0.0
    L(vo.outputs['Distance'], pr.inputs['Value'])
    nM = node(nt, 'ShaderNodeTexNoise', -800, -550)
    nM.inputs['Scale'].default_value = 1.7
    L(co, nM.inputs['Vector'])
    mk = node(nt, 'ShaderNodeMapRange', -500, -550)
    mk.inputs['From Min'].default_value, mk.inputs['From Max'].default_value = 0.46, 0.62
    L(nM.outputs['Fac'], mk.inputs['Value'])
    pit = math_node(nt, 'MULTIPLY', math_node(nt, 'MULTIPLY', pr.outputs['Result'], mk.outputs['Result']), pores)

    # brightness: mottling, grain, a lighter vein, darker pits
    br = math_node(nt, 'MULTIPLY_ADD', nA.outputs['Fac'], 0.30, 0.74)
    br = math_node(nt, 'MULTIPLY_ADD', nB.outputs['Fac'], 0.12, br)
    br = math_node(nt, 'MULTIPLY_ADD', vein, 0.08, br)
    br = math_node(nt, 'MULTIPLY_ADD', pit, -0.45, br)
    rand = None
    if per_block:
        # each block its own stone: tone and warmth vary block to block
        at = node(nt, 'ShaderNodeAttribute', -800, 550, attribute_name='rand', attribute_type='GEOMETRY')
        rand = at.outputs['Fac']
        br = math_node(nt, 'MULTIPLY_ADD', rand, 0.32, math_node(nt, 'SUBTRACT', br, 0.16))

    mortar = None
    if ashlar:
        # cut-stone courses on the drum, in cylinder coordinates; the brick width
        # divides the circumference exactly so the coursing closes on itself
        sep = node(nt, 'ShaderNodeSeparateXYZ', -1000, -800)
        L(tc.outputs['Object'], sep.inputs['Vector'])
        ang = math_node(nt, 'ARCTAN2', sep.outputs['Y'], sep.outputs['X'])
        cmb = node(nt, 'ShaderNodeCombineXYZ', -800, -800)
        L(math_node(nt, 'MULTIPLY', ang, R), cmb.inputs['X'])
        L(sep.outputs['Z'], cmb.inputs['Y'])
        bk = node(nt, 'ShaderNodeTexBrick', -600, -800, offset=0.5, offset_frequency=2)
        L(cmb.outputs['Vector'], bk.inputs['Vector'])
        bk.inputs['Scale'].default_value = 1.0
        bk.inputs['Brick Width'].default_value = 2 * pi * R / 87
        bk.inputs['Row Height'].default_value = 0.55
        bk.inputs['Mortar Size'].default_value = 0.016
        bk.inputs['Mortar Smooth'].default_value = 0.4
        bk.inputs['Bias'].default_value = 0.0
        bk.inputs['Color1'].default_value = (0.86, 0.86, 0.86, 1)
        bk.inputs['Color2'].default_value = (1.10, 1.10, 1.10, 1)
        bk.inputs['Mortar'].default_value = (1, 1, 1, 1)
        mortar = bk.outputs['Fac']
        br = math_node(nt, 'MULTIPLY', br, bk.outputs['Color'])
        br = math_node(nt, 'MULTIPLY_ADD', mortar, -0.5, br)

    # grime: crevices, joints and the feet of walls hold a little dark
    ao = node(nt, 'ShaderNodeAmbientOcclusion', 400, 600, samples=4)
    ao.inputs['Distance'].default_value = 0.35
    grime_k = math_node(nt, 'MULTIPLY_ADD', ao.outputs['AO'], grime, 1 - grime)
    br = math_node(nt, 'MULTIPLY', br, grime_k)

    # a cooler and a warmer version of the stone, mixed by noise (and the block)
    base = srgb(hexstr)
    warm = tuple(min(c * k, 1) for c, k in zip(base[:3], (1.07, 1.0, 0.86))) + (1,)
    cool = tuple(min(c * k, 1) for c, k in zip(base[:3], (0.95, 0.98, 1.05))) + (1,)
    mx, fac, A, Bc, mo = mix_rgba(nt, -100, 300)
    A.default_value, Bc.default_value = cool, warm
    nH = node(nt, 'ShaderNodeTexNoise', -400, 450)
    nH.inputs['Scale'].default_value = 0.25
    L(co, nH.inputs['Vector'])
    hf = nH.outputs['Fac']
    if rand is not None:
        hf = math_node(nt, 'MULTIPLY_ADD', rand, 0.6, math_node(nt, 'MULTIPLY', hf, 0.4))
    L(hf, fac)
    col = node(nt, 'ShaderNodeVectorMath', 200, 300, operation='SCALE')
    L(mo, col.inputs[0])
    L(br, col.inputs['Scale'])
    L(col.outputs['Vector'], bsdf.inputs['Base Color'])

    rr = math_node(nt, 'MULTIPLY_ADD', nB.outputs['Fac'], 0.25, rough - 0.12)
    rr = math_node(nt, 'MULTIPLY_ADD', pit, 0.25, rr)
    if mortar is not None:
        rr = math_node(nt, 'MULTIPLY_ADD', mortar, 0.3, rr)
    L(rr, bsdf.inputs['Roughness'])

    # tooled surface: a broad unevenness under the grain, pits and joints sunk
    nT = node(nt, 'ShaderNodeTexNoise', -800, -1000)
    nT.inputs['Scale'].default_value = 2.5
    nT.inputs['Detail'].default_value = 2
    L(co, nT.inputs['Vector'])
    h = math_node(nt, 'MULTIPLY_ADD', nT.outputs['Fac'], 3.0, nB.outputs['Fac'])
    h = math_node(nt, 'MULTIPLY_ADD', pit, -1.5, h)
    if mortar is not None:
        h = math_node(nt, 'MULTIPLY_ADD', mortar, -3.0, h)
    bp = node(nt, 'ShaderNodeBump', 800, -300)
    bp.inputs['Strength'].default_value = bump
    bp.inputs['Distance'].default_value = 0.004
    L(h, bp.inputs['Height'])
    L(bp.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def plain_material(name, hexstr, rough=0.9):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    b = mat.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = srgb(hexstr)
    b.inputs['Roughness'].default_value = rough
    return mat


def haze_material(density):
    mat = bpy.data.materials.new('Haze')
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial', 600, 0)
    vol = node(nt, 'ShaderNodeVolumePrincipled', 300, 0)
    vol.inputs['Color'].default_value = srgb('f2e2c8')
    vol.inputs['Anisotropy'].default_value = 0.55
    # a little unevenness, like dust that has not quite settled
    tc = node(nt, 'ShaderNodeTexCoord', -400, 0)
    nz = node(nt, 'ShaderNodeTexNoise', -200, 0)
    nz.inputs['Scale'].default_value = 0.35
    nz.inputs['Detail'].default_value = 3
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    d = math_node(nt, 'MULTIPLY_ADD', nz.outputs['Fac'], density * 0.9, density * 0.55)
    nt.links.new(d, vol.inputs['Density'])
    nt.links.new(vol.outputs['Volume'], out.inputs['Volume'])
    return mat


# ------------------------------------------------------------ the floor --
def ripple_at(r, s, speed):
    amp, t = s['rip'], s['t']
    env = exp(-r * RIPPLE['decay'])
    ph = r * RIPPLE['wave'] - t * speed
    h = sin(ph) * amp + sin(ph * 0.43 + 1.7) * amp * 0.34 + sin(r * 0.21 - t * 0.11) * amp * 0.22
    return h * env


def set_ring_width(w):
    k = w / RINGS['w']
    marker_r = RINGS['r0'] + RINGS['markerRing'] * RINGS['w']
    RINGS.update(w=w, arc=RINGS['arc'] * k, markerRing=round((marker_r - RINGS['r0']) / w))


def build_floor(s, mat):
    """rings of voussoirs on an eight-fold plan, each a rigid block set at its
    ring's ripple height (as in the web shader), with a hair of settling tilt"""
    random.seed(7)
    e = ss(0, 1, s['p'])
    speed = RIPPLE['speed'] * (1 - 0.45 * e)
    g = RINGS
    bm = bmesh.new()
    rl = bm.faces.layers.float.new('rand')
    SECT = 8
    sectA = 2 * pi / SECT
    sect0 = sectA * 0.5
    ring, r = 0, g['r0']
    blocks = 0
    while r < g['r1']:
        rIn = r + g['gapR'] * 0.5
        rOut = min(r + g['w'], g['r1']) - g['gapR'] * 0.5
        rMid = (rIn + rOut) * 0.5
        n = max(1, math.floor(sectA * rMid / g['arc'] + 0.5))
        if ring > 0 and (n % 2) == (ring % 2):
            n += 1
        dA = sectA / n
        ga, gs = g['gapA'] * 0.5 / rMid, g['spokeGap'] * 0.5 / rMid
        for sct in range(SECT):
            for i in range(n):
                a0 = sect0 + sct * sectA + i * dA + (gs if i == 0 else ga)
                a1 = sect0 + sct * sectA + (i + 1) * dA - (gs if i == n - 1 else ga)
                marker = ring == g['markerRing'] and i == (n >> 1)
                rnd = 1.0 if marker else random.random()
                lift = ripple_at(rMid, s, speed) + (rnd - 0.5) * 0.02 + (g['markerRaise'] if marker else 0)
                tr, ta = random.uniform(-0.004, 0.004), random.uniform(-0.004, 0.004)
                block(bm, rl, rIn, rOut, a0, a1, rMid, lift, tr, ta, rnd)
                blocks += 1
        r += g['w']
        ring += 1
    ob = finish_mesh('Floor', bm, mat)
    bevel(ob, 0.022, 3)
    print(f'floor: {ring} rings, {blocks} blocks')
    return ob


def block(bm, rl, rIn, rOut, a0, a1, rMid, lift, tr, ta, rnd, depth=0.9):
    segs = max(3, math.ceil((a1 - a0) * rOut / 0.12))
    am = (a0 + a1) * 0.5
    def y_at(rr, a):
        return lift + (rr - rMid) * tr + (a - am) * rMid * ta
    ot, it, ob_, ib = [], [], [], []
    for k in range(segs + 1):
        a = a0 + (a1 - a0) * k / segs
        for lst, rr, top in ((ot, rOut, True), (it, rIn, True), (ob_, rOut, False), (ib, rIn, False)):
            y = y_at(rr, a) - (0 if top else depth)
            lst.append(bm.verts.new(B(rr * cos(a), y, rr * sin(a))))
    faces = []
    for k in range(segs):
        faces.append(bm.faces.new((it[k], ot[k], ot[k + 1], it[k + 1])))     # top
        faces.append(bm.faces.new((ib[k + 1], ob_[k + 1], ob_[k], ib[k])))   # bottom
        faces.append(bm.faces.new((ot[k], ob_[k], ob_[k + 1], ot[k + 1])))   # outer
        faces.append(bm.faces.new((it[k + 1], ib[k + 1], ib[k], it[k])))     # inner
    faces.append(bm.faces.new((it[0], ib[0], ob_[0], ot[0])))
    faces.append(bm.faces.new((ot[-1], ob_[-1], ib[-1], it[-1])))
    for f in faces:
        f[rl] = rnd


# ------------------------------------------------------------- the walls --
def cyl_prism(bm, theta_c, cols, r_front, r_back):
    """a solid between two cylinders: cols are (u, y_bottom, y_top) in meters
    along the arc, mapped onto the wall around angle theta_c"""
    def P(u, y, r):
        a = theta_c + u / R
        return bm.verts.new(B(r * cos(a), y, r * sin(a)))
    F = [(P(u, yb, r_front), P(u, yt, r_front)) for u, yb, yt in cols]
    K = [(P(u, yb, r_back), P(u, yt, r_back)) for u, yb, yt in cols]
    for j in range(len(cols) - 1):
        (fb0, ft0), (fb1, ft1) = F[j], F[j + 1]
        (kb0, kt0), (kb1, kt1) = K[j], K[j + 1]
        bm.faces.new((fb0, fb1, ft1, ft0))
        bm.faces.new((kb1, kb0, kt0, kt1))
        bm.faces.new((fb0, kb0, kb1, fb1))
        bm.faces.new((ft1, kt1, kt0, ft0))
    bm.faces.new((F[0][0], F[0][1], K[0][1], K[0][0]))
    bm.faces.new((F[-1][1], F[-1][0], K[-1][0], K[-1][1]))


def arch_cols(hw, spring, bottom, n=48):
    # cosine spacing puts the samples evenly around the semicircle
    cols = []
    for j in range(n + 1):
        u = -hw * cos(pi * j / n)
        cols.append((u, bottom, spring + sqrt(max(hw * hw - u * u, 0.0))))
    return cols


def build_walls(mats):
    A = ALCOVE
    wall = lathe('Drum', [(R, -0.5), (R, WH + 0.02), (R + 0.8, WH + 0.02), (R + 0.8, -0.5)], 384, mats['wall'])

    cut = bmesh.new()
    frm = bmesh.new()
    for k in range(BAYS):
        th = 2 * pi * k / BAYS
        cyl_prism(cut, th, arch_cols(A['hw'], A['spring'], A['sill']), R - 0.4, R + A['depth'])
        cyl_prism(frm, th, arch_cols(A['hw'] + A['band'], A['spring'], -0.2), R - A['proud'], R + 0.05)
    bmesh.ops.triangulate(cut, faces=cut.faces[:])
    cutter = finish_mesh('AlcoveCutter', cut, None)
    cutter.hide_render = True
    cutter.display_type = 'WIRE'
    frames = finish_mesh('Archivolts', frm, mats['trim'], radians(40))

    for ob in (wall, frames):
        m = ob.modifiers.new('Alcoves', 'BOOLEAN')
        m.operation = 'DIFFERENCE'
        m.solver = 'EXACT'
        m.object = cutter
    bevel(frames, 0.012, 2)

    # entablature: architrave, frieze, and a cornice that catches the light
    lathe('Entablature', [
        (R + 0.3, WH - 0.64), (R - 0.22, WH - 0.64), (R - 0.22, WH - 0.46), (R - 0.27, WH - 0.44),
        (R - 0.27, WH - 0.40), (R - 0.24, WH - 0.38), (R - 0.24, WH - 0.16), (R - 0.32, WH - 0.12),
        (R - 0.44, WH - 0.07), (R - 0.55, WH - 0.05), (R - 0.55, WH), (R + 0.3, WH)
    ], 384, mats['trim'])
    # string course above the archivolts
    sy = A['spring'] + A['hw'] + 0.55
    lathe('StringCourse', [(R + 0.3, sy - 0.07), (R - 0.12, sy - 0.07), (R - 0.16, sy - 0.03),
                           (R - 0.16, sy + 0.07), (R + 0.3, sy + 0.07)], 384, mats['trim'])

    # pilasters between the arches: plinth, torus, shaft, necking, echinus, abacus
    bm = bmesh.new()
    cr = R - 0.28
    # (width along the wall, y0, y1, depth into the room); the plinth block
    # runs down into the floor so the column stands on it, whatever the ripple
    parts = [
        (1.24, -0.6, 0.30, 0.96), (1.12, 0.30, 0.46, 0.90), (1.00, 0.46, WH - 1.04, 0.80),
        (1.06, WH - 1.04, WH - 0.98, 0.84), (1.18, WH - 0.98, WH - 0.78, 0.92), (1.30, WH - 0.78, WH - 0.64, 0.98)]
    for i in range(BAYS):
        a = (i + 0.5) / BAYS * 2 * pi
        n = Vector((cos(a), 0, sin(a)))
        t = Vector((-sin(a), 0, cos(a)))
        for w, y0, y1, d in parts:
            c = n * (cr + 0.40 - d / 2 + 0.02)      # every part's back sits in the wall
            vs = []
            for sy_, sx, sz in [(y0, -1, -1), (y0, 1, -1), (y0, 1, 1), (y0, -1, 1),
                                (y1, -1, -1), (y1, 1, -1), (y1, 1, 1), (y1, -1, 1)]:
                p = c + t * (sx * w / 2) + n * (sz * d / 2)
                vs.append(bm.verts.new(B(p.x, sy_, p.z)))
            for f in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
                bm.faces.new([vs[j] for j in f])
    pil = finish_mesh('Pilasters', bm, mats['pilaster'])
    bevel(pil, 0.015, 2)
    return wall


# -------------------------------------------------------------- the dome --
def build_dome(mat):
    """a spheroid with five rows of stepped coffers, carved as geometry: the
    grid lines sit exactly on the shader's step edges, so each step is a clean
    chamfer"""
    F = [0, .10, .15, .22, .27, .40, .5, .60, .73, .78, .85, .90]
    def depth(f):
        e = min(f, 1 - f)
        ramp = lambda a, b: min(max((e - a) / (b - a), 0), 1)
        return ramp(0.10, 0.15), ramp(0.22, 0.27)

    az = [((c + f) / COFFERS * 2 * pi, f) for c in range(COFFERS) for f in F]
    row_h = 1.26 / COFFER_ROWS
    el_top = pi / 2 - math.asin(OCULUS_R / R) * 1.25
    els = [(0.0, None)]
    els += [(0.05 + (rw + f) * row_h, f) for rw in range(COFFER_ROWS) for f in F]
    els += [(0.05 + 1.26, None)]
    els += [(0.05 + 1.26 + (el_top - 1.31) * k / 3, None) for k in (1, 2, 3)]

    bm = bmesh.new()
    grid = []
    for el, fv in els:
        row = []
        for a, fu in az:
            p = Vector((R * cos(el) * cos(a), WH + DH * sin(el), R * cos(el) * sin(a)))
            n = Vector((p.x / R ** 2, (p.y - WH) / DH ** 2, p.z / R ** 2)).normalized()
            d = 0.0
            if fv is not None:
                u1, u2 = depth(fu)
                v1, v2 = depth(fv)
                d = 0.42 * min(u1, v1) + 0.22 * min(u2, v2)
            p = p + n * d
            row.append(bm.verts.new(B(p.x, p.y, p.z)))
        grid.append(row)
    N = len(az)
    for i in range(len(els) - 1):
        for k in range(N):
            k2 = (k + 1) % N
            bm.faces.new((grid[i][k], grid[i][k2], grid[i + 1][k2], grid[i + 1][k]))
    # normals face into the room; the shell then thickens outward
    bm.normal_update()
    for f in bm.faces:
        c = f.calc_center_median()
        if f.normal.dot(Vector((c.x, c.y, (c.z - WH) * (R / DH) ** 2))) > 0:
            f.normal_flip()
    ob = finish_mesh('Dome', bm, mat, radians(35), recalc=False)
    so = ob.modifiers.new('Shell', 'SOLIDIFY')
    so.thickness = 0.6
    so.offset = -1
    return ob


# ------------------------------------------------------------ the light --
def pool_for(s, light):
    if light == 'down':
        return Vector((0, 0, 0))
    return POOL.lerp(POOL_END, ss(0, 1, s['p']) * 0.7)


def build_light(s, light, sun_angle=0.9):
    pool = pool_for(s, light)
    oc = Vector((0, OCULUS_Y, 0))
    d3 = (pool - oc).normalized()
    d = Vector((d3.x, -d3.z, d3.y))
    sun = bpy.data.lights.new('Sun', 'SUN')
    sun.energy = 7.5 * s['sun']
    sun.angle = radians(sun_angle)
    sun.color = srgb(HEX['sun'])[:3]
    ob = bpy.data.objects.new('Sun', sun)
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    bpy.context.scene.collection.objects.link(ob)

    w = bpy.data.worlds.new('Sky')
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = srgb('c9c2b2')      # a pale, hazy sky: warm fill, not blue
    bg.inputs['Strength'].default_value = 2.2
    bpy.context.scene.world = w

    # a portal over the oculus tells the path tracer where the sky gets in, so
    # it samples the opening instead of hoping to find it (far less noise)
    el_top = pi / 2 - math.asin(OCULUS_R / R) * 1.25
    portal = bpy.data.lights.new('Oculus portal', 'AREA')
    portal.shape = 'DISK'
    portal.size = 2 * R * cos(el_top) + 0.4
    portal.cycles.is_portal = True
    po = bpy.data.objects.new('Oculus portal', portal)
    po.location = B(0, WH + DH * sin(el_top) + 0.7, 0)
    bpy.context.scene.collection.objects.link(po)

    # the haze that makes the shaft: fills the room, follows the dome
    prof = [(0, -0.3), (R - 0.15, -0.3), (R - 0.15, WH)]
    prof += [((R - 0.15) * cos(el), WH + (DH - 0.15) * sin(el)) for el in [i / 24 * 1.48 for i in range(1, 25)]]
    prof += [(0, OCULUS_Y + 0.5)]
    haze = lathe('Haze', prof, 96, haze_material(0.006 * s['shaft']), None)
    return pool


# ---------------------------------------------------------- motes, links --
def emission_material(name, hexstr, strength):
    """glow read from the face attribute 'glow', seen by the camera only"""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = node(nt, 'ShaderNodeOutputMaterial', 400, 0)
    em = node(nt, 'ShaderNodeEmission', 200, 0)
    em.inputs['Color'].default_value = srgb(hexstr)
    at = node(nt, 'ShaderNodeAttribute', -200, 0, attribute_name='glow', attribute_type='GEOMETRY')
    nt.links.new(math_node(nt, 'MULTIPLY', at.outputs['Fac'], strength), em.inputs['Strength'])
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    mat.cycles.emission_sampling = 'NONE'      # they light nothing; they are seen
    return mat


def camera_only(ob):
    for k in ('visible_diffuse', 'visible_glossy', 'visible_transmission', 'visible_volume_scatter', 'visible_shadow'):
        setattr(ob, k, False)


def build_motes(s, pool, n, links=True, dust=1.0):
    """the website's motes (assets/js/temple.js MOTE_GLSL), frozen at time t:
    a third of them in the shaft, the rest adrift in the room. Each glows by
    how close it is to the beam. Links join near neighbours, very faint, and
    only really show in the light."""
    random.seed(11)
    oc = Vector((0, OCULUS_Y, 0))
    foot = Vector((pool.x, 0, pool.z))
    t = s['t']

    def beam_lit(p, near, far):
        ab, ap_ = foot - oc, p - oc
        u = min(max(ap_.dot(ab) / ab.dot(ab), 0), 1)
        d = (ap_ - ab * u).length
        return ss(far, near, d) if far > near else 0.0

    rest, seeds = [], []
    for _ in range(n):
        if random.random() < 0.30:
            tt, a = random.random(), random.random() * 2 * pi
            r = sqrt(random.random()) * (OCULUS_R * 1.3 + tt * 3.0)
            c = oc.lerp(foot, tt)
            p = Vector((c.x + cos(a) * r, c.y, c.z + sin(a) * r))
        else:
            a, r = random.random() * 2 * pi, sqrt(random.random()) * 16
            p = Vector((cos(a) * r, random.random() * 12, sin(a) * r))
        rest.append(p)
        seeds.append((random.random(), 0.18 + random.random() ** 2.2 * 0.9))

    def mote_at(p, sd):
        sp = sd[0] * 2 * pi
        return Vector((p.x + sin(t * 0.22 + sp) * 0.55,
                       (p.y + t * (0.06 + sd[0] * 0.09)) % 12.0,
                       p.z + cos(t * 0.18 + sp * 1.7) * 0.55))
    now = [mote_at(p, sd) for p, sd in zip(rest, seeds)]

    bm = bmesh.new()
    gl = bm.faces.layers.float.new('glow')
    for p, sd in zip(now, seeds):
        glow = (0.016 + beam_lit(p, 0.5, 4.2) * 0.46) * sd[1]
        r = 0.0038 * (sd[1] * 1.15 + 0.3)
        res = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
        bmesh.ops.translate(bm, verts=res['verts'], vec=B(p.x, p.y, p.z))
        for f in {f for v in res['verts'] for f in v.link_faces}:
            f[gl] = glow
    motes = finish_mesh('Motes', bm, emission_material('Mote glow', 'ffe0ad', 9.0 * dust), recalc=False)
    camera_only(motes)

    if not links:
        return
    # candidate pairs from the rest positions, as on the website: up to three
    # nearest neighbours within 1.9 m; then only pairs still close at time t
    kd = KDTree(n)
    for i, p in enumerate(rest):
        kd.insert(p, i)
    kd.balance()
    pairs = set()
    for i, p in enumerate(rest):
        for _, j, dist in kd.find_n(p, 4):
            if j != i and dist <= 1.9:
                pairs.add((min(i, j), max(i, j)))
    bm = bmesh.new()
    gl = bm.faces.layers.float.new('glow')
    kept = 0
    for i, j in pairs:
        p0, p1 = now[i], now[j]
        d = (p1 - p0).length
        vis = 1 - ss(0.45, 0.9, d)
        lit = max(beam_lit(p0, 0.6, 4.4), beam_lit(p1, 0.6, 4.4))
        glow = vis * 0.05 * (0.02 + lit * lit * 0.98)      # uLinkA: very faint, never a network
        if glow < 0.002:
            continue
        # a hair-thin three-sided tube
        a, b = B(p0.x, p0.y, p0.z), B(p1.x, p1.y, p1.z)
        axis = (b - a).normalized()
        side = axis.orthogonal().normalized()
        up = axis.cross(side)
        rad = 0.0012
        ring = lambda c: [bm.verts.new(c + (side * cos(k * 2 * pi / 3) + up * sin(k * 2 * pi / 3)) * rad) for k in range(3)]
        ra, rb = ring(a), ring(b)
        for k in range(3):
            f = bm.faces.new((ra[k], ra[(k + 1) % 3], rb[(k + 1) % 3], rb[k]))
            f[gl] = glow
        kept += 1
    lines = finish_mesh('Links', bm, emission_material('Link glow', 'ffdeaa', 3.0 * dust), recalc=False)
    camera_only(lines)
    print(f'motes: {n}, links: {kept} of {len(pairs)} candidates')


# ----------------------------------------------------------- the camera --
def build_camera(s, width):
    scn = bpy.context.scene
    aspect = 168 / 64
    cam = bpy.data.cameras.new('Camera')
    cam.sensor_fit = 'VERTICAL'
    cam.angle_y = radians(s['fov'])
    cam.shift_y = s['shift'] * 0.5 / aspect      # Blender shifts in units of the image width
    cam.clip_start, cam.clip_end = 0.05, 200
    ob = bpy.data.objects.new('Camera', cam)
    ob.location = B(s['x'], s['y'], s['z'])
    ob.rotation_euler = Euler((radians(90 + s['pitch']), 0, radians(s['yaw'])), 'XYZ')
    scn.collection.objects.link(ob)
    scn.camera = ob
    scn.render.resolution_x = width
    scn.render.resolution_y = round(width / aspect)
    scn.render.resolution_percentage = 100


def setup_render(samples, denoiser='oidn'):
    scn = bpy.context.scene
    scn.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'OPTIX'
    prefs.refresh_devices()
    for d in prefs.devices:
        d.use = d.type == 'OPTIX'
    c = scn.cycles
    c.device = 'GPU'
    c.samples = samples
    c.use_adaptive_sampling = True
    c.adaptive_threshold = 0.004
    c.use_denoising = denoiser != 'none'
    c.denoiser = 'OPTIX' if denoiser == 'optix' else 'OPENIMAGEDENOISE'
    c.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
    c.denoising_prefilter = 'ACCURATE'
    for k, v in (('denoising_quality', 'HIGH'), ('denoising_use_gpu', True)):
        if hasattr(c, k):
            setattr(c, k, v)
    c.max_bounces = 10
    c.diffuse_bounces = 6
    c.glossy_bounces = 4
    c.transmission_bounces = 2
    c.volume_bounces = 0              # single scattering is enough for a thin haze
    c.sample_clamp_indirect = 40.0    # no fireflies from the bounce light
    c.caustics_reflective = c.caustics_refractive = False
    c.volume_step_rate = 2.0
    scn.view_settings.view_transform = 'AgX'
    try:
        scn.view_settings.look = 'AgX - Medium High Contrast'
    except TypeError:
        pass
    scn.view_settings.exposure = 3.6 + EXPOSURE_TRIM
    scn.render.image_settings.file_format = 'PNG'
    scn.render.image_settings.color_depth = '16'


# --------------------------------------------------------------- main --
def main():
    args = parse_args()
    s = read_framing(args.framing)
    global EXPOSURE_TRIM
    EXPOSURE_TRIM = args.exposure
    if args.ring_width != RINGS['w']:
        set_ring_width(args.ring_width)
    print('framing:', s, '| light:', args.light, '| rings:', args.ring_width, '| motes:', args.motes)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    t0 = time.time()
    mats = dict(
        floor=stone_material('Travertine floor', HEX['stone'], rough=0.45, scale=1.0, per_block=True, bump=0.25, grime=0.45),
        dais=stone_material('Dais', HEX['dais'], rough=0.5, scale=1.3, pores=0.6),
        plinth=stone_material('Plinth', HEX['plinth'], rough=0.8),
        wall=stone_material('Wall stone', HEX['wall'], rough=0.85, scale=0.8, pores=0.0, veins=0.4, bump=0.15, ashlar=True),
        dome=stone_material('Dome plaster', HEX['wall'], rough=0.9, scale=0.6, pores=0.0, veins=0.0, bump=0.12, grime=0.5),
        trim=stone_material('Trim stone', HEX['trim'], rough=0.8, scale=1.2, pores=0.4, veins=0.3, bump=0.15),
        pilaster=stone_material('Pilaster stone', HEX['pilaster'], rough=0.8, scale=1.2, pores=0.4, veins=0.5, bump=0.15),
        mortar=plain_material('Mortar', HEX['mortar'], 0.95),
    )
    build_floor(s, mats['floor'])
    lathe('Dais', [(0, -2.0), (1.25, -2.0), (1.25, -0.08), (1.25 * 0.93, 0.05), (1.25 * 0.80, 0.11), (0, 0.11)],
          192, mats['dais'], radians(30))
    lathe('Plinth', [(RINGS['r1'] - 0.4, -0.5), (R + 0.6, -0.5), (R + 0.6, -0.16), (RINGS['r1'] - 0.4, -0.16)],
          384, mats['plinth'])
    # the bed sits below the deepest trough of the ripple, so no ring ever sinks into it
    bed = 0.24 + 1.6 * s['rip']
    lathe('Mortar bed', [(0, -bed - 0.5), (R + 0.6, -bed - 0.5), (R + 0.6, -bed), (0, -bed)], 192, mats['mortar'])
    build_walls(mats)
    build_dome(mats['dome'])
    pool = build_light(s, args.light, args.sun_angle)
    if args.motes:
        build_motes(s, pool, args.motes, links=not args.no_links, dust=args.dust)
    build_camera(s, args.width)
    setup_render(args.samples, args.denoiser)
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
