/* ============================================================================
   HERMITAGE WORLD — the loggia
   ----------------------------------------------------------------------------
   A limestone loggia high above a sea of islands at sunset. A great arch opens
   on the view through a wall two meters thick, its jambs splayed open toward
   the room; beside it a vaulted gallery runs away from you, its left side an
   arcade, its far end a tall narrow door onto the water. The sun stands low
   in the great arch, and its light crosses the floor and lays a bar of gold
   through every bay of the gallery.
   Scroll walks you from the room, through the portal, down the gallery to
   the far door. The pointer turns your head a little.

   Self-mounting ES module. Expects the markup contract:
     <section class="loggia" id="loggia">
       <div class="loggia__stage">
         <canvas class="loggia__gl" id="loggia-gl"></canvas>
       </div>
     </section>
   The view beyond the arches is a photograph (assets/img/photo/loggia-view.jpg)
   laid on the sky by direction. Everything else is generated at runtime.

   THE PLAN (meters, Y up). The plan is not orthogonal, and that is the point:
   read from the reference image, the wall that holds the great arch stands
   39° off square to the gallery, so from the gallery's axis you see the
   arch wall's thick lit reveal and its shadowed face as two faces of one
   pier, and the gallery beside it runs straight away from you.
     - The gallery runs down -z, centered on x = 0, 3.9 m wide. Its mouth
       (the room face of the portal) is at z = P.gallery.portalZ.
     - The arch wall ("front") is built flat in its own frame (x along the
       wall from the arch toward the pier, z into the room, the inner face at
       z = 0) and turned by P.front.angle about the pier's corner, which sits
       at P.front.corner in world. Everything that belongs to that wall (the
       seats, the bowl, the rug, the olive by the arch) lives in its frame.
     - The gallery's right wall runs on into the room, and the room is the
       wedge between it and the arch wall.
     - You start 18 m back on the gallery's axis, looking straight down it
       with the lens shifted left, which is how the reference is drawn.
   ============================================================================ */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js/+esm';
import { Pass, FullScreenQuad } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/Pass.js/+esm';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js/+esm';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/ShaderPass.js/+esm';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/OutputPass.js/+esm';
import { Reflector } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/objects/Reflector.js/+esm';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js/+esm';
import { RectAreaLightUniformsLib } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/lights/RectAreaLightUniformsLib.js/+esm';
import { mergeGeometries, toCreasedNormals } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/utils/BufferGeometryUtils.js/+esm';

const canvas  = document.getElementById('loggia-gl');
const section = canvas && canvas.closest('.loggia');
if (!canvas || !section) throw new Error('loggia.js: #loggia-gl inside .loggia not found');
const stage   = canvas.parentElement;

const RM     = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE = matchMedia('(max-width: 820px)').matches;
const HOVER  = matchMedia('(hover: hover) and (pointer: fine)').matches;
const VIEW_URL = new URL('../img/photo/loggia-view.jpg', import.meta.url).href;
const DEG = Math.PI / 180;

/* ---------------------------------------------------------------- tuning -- */
const P = {
  eye:   1.40,                                                 // the camera's height on the walk
  edge:  0.13,                                                 // radius every stone edge is rounded to
  /* the arch wall, in its own frame (see the plan above) */
  front: { angle: 39, corner: [-3.73, 0.6], t: 2.2, h: 7.6, x0: -12, x1: 3, edge: 0.16,
           arch: { cx: -2.83, hw: 2.83, spring: 4.0, sill: 0.3, K: 1.1, splay: 20 } },
  /* the gallery: a thick portal, then bays under a barrel vault, divided by
     transverse arches; an arcade on the left, a plain wall on the right */
  gallery: { hw: 1.95, wallT: 1.0, bays: 5, bay: 4.0, rib: 0.7, ribIn: 0.25,
             portalZ: -0.7, portalT: 2.0, spring: 3.7, K: 1.15, roof: 6.6,
             win: { hw: 1.3, sill: 0.5, spring: 3.2, K: 1.1 },        // the arcade on the left
             end: { hw: 1.3, spring: 4.1, K: 1.15, t: 1.2, terrace: 0 } },   // the far door
  room:    { zBack: 26, ceil: 7.6 },
  /* the photograph: px per degree, its horizon row, and where its sun sits.
     sunAz puts the photo's sun in the great arch, as in the reference. */
  view:    { w: 1536, h: 1024, K: 36, horizon: 570, sunPx: [316, 383], sunAz: -26 },
  /* the sun's light stands a little left of and above the photo's sun, so it
     reaches the floor in front of the arch and through the arcade */
  sun:     { color: 0xffe2c2, intensity: 10, az: -36, el: 8 },
  /* the light of the open sky to the left and behind you, which the
     reference paints on the arch's reveal and the gallery's right wall */
  fill:    { color: 0xfff0da, intensity: 1.5, az: -118, el: 24 },
  hemi:    { sky: 0xe6e2da, ground: 0x9c8d7a, intensity: 0.3 },
  stone:   { wall: 0xd2c3a8, pier: 0xd0bd9c, floor: 0xa89885, bench: 0xd4c2a2, urn: 0x857a6d },
  haze:    { density: 0.0032, room: 0.35, g: 0.2, ext: 0.005, steps: MOBILE ? 26 : 44, scale: MOBILE ? 0.34 : 0.5 },
  floor:   { reflect: 1.0, scale: MOBILE ? 0.35 : 0.5 },
  /* camera keyframes. yaw > 0 turns left; fov is vertical; shift is the lens
     shift as a fraction of the frame (x < 0 shows more of the left, y > 0
     more above). The opening frame reproduces the reference's lens. */
  path: [
    { at: 0.00, pos: [-0.2, 1.40, 18.0], yaw: 0, pitch:  0.0, fov: 30.5, shift: [-0.305, 0.057] },
    { at: 0.30, pos: [-0.2, 1.45,  5.0], yaw: 0, pitch:  0.0, fov: 40.0, shift: [-0.14, 0.05] },
    { at: 0.64, pos: [ 0.0, 1.50, -9.5], yaw: 4, pitch:  0.0, fov: 48.0, shift: [0, 0.04] },
    { at: 1.00, pos: [ 0.0, 1.50, -22.0], yaw: 0, pitch:  0.0, fov: 44.0, shift: [0, 0.03] }
  ],
  pathTall: [
    { at: 0.00, pos: [-0.2, 1.40, 16.0], yaw: 16, pitch: 0.0, fov: 60, shift: [0, 0.06] },   // between the arch and the gallery
    { at: 0.30, pos: [-0.2, 1.45,  4.0], yaw: 0,  pitch: 0.0, fov: 60, shift: [0, 0.05] },
    { at: 0.64, pos: [ 0.0, 1.50, -9.5], yaw: 5,  pitch: 0.0, fov: 60, shift: [0, 0.04] },
    { at: 1.00, pos: [ 0.0, 1.50, -21.5], yaw: 0, pitch:  0.0, fov: 58, shift: [0, 0.03] }
  ],
  parallax:  { yaw: 2.0, pitch: 1.4 },   // degrees, pointer-driven
  post:      { bloom: 0.18, bloomThreshold: 3.0, exposure: 0.92, grain: 0.010, vig: 0.28 }
};

const G = P.gallery;
const ZP   = G.portalZ;                                          // the room face of the portal
const ZBAY = (i) => ZP - G.portalT - i * (G.bay + G.rib);         // where bay i begins
const ZEND = ZBAY(G.bays) + G.rib;                               // the room face of the far wall
const GHW  = G.hw;
const RIB_HW = G.hw - G.ribIn;
const RIB_K  = (G.hw * G.K - G.ribIn) / RIB_HW;                  // the ribs step evenly inside the vault
const vaultY = (d) => G.spring + GHW * G.K * Math.sqrt(Math.max(0, 1 - (d / GHW) ** 2));
const SUNK = -0.5;                                               // walls run on below the floor

/* the arch wall's frame */
const FA = P.front.angle * DEG;
const FC = new THREE.Vector2(P.front.corner[0], P.front.corner[1]);
const frontToWorld = (lx, lz) => new THREE.Vector2(
  FC.x + lx * Math.cos(FA) + lz * Math.sin(FA), FC.y - lx * Math.sin(FA) + lz * Math.cos(FA));
const FRONT_N = new THREE.Vector2(Math.sin(FA), Math.cos(FA));    // the wall's inward normal, in xz
const FRONT_D = FRONT_N.dot(FC);                                  // p.xz · N > D is the room side

/* directions: azimuth measured from -z toward +x, elevation up */
const dirAt = (az, el) => new THREE.Vector3(
  Math.sin(az * DEG) * Math.cos(el * DEG), Math.sin(el * DEG), -Math.cos(az * DEG) * Math.cos(el * DEG)).normalize();
const SUN_EL   = (P.view.horizon - P.view.sunPx[1]) / P.view.K;  // where the photo's sun stands
const SUN_DIR  = dirAt(P.view.sunAz, SUN_EL);                     // the disc you see
const LIGHT_DIR = dirAt(P.sun.az, P.sun.el);                      // the light that falls
const FILL_DIR  = dirAt(P.fill.az, P.fill.el);

/* ---------------------------------------------------------------- renderer */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const maxDPR = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2);
let dpr = maxDPR;
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap;      // soft-edged, like the reference's light
renderer.shadowMap.autoUpdate = false;      // the sun and the stone never move: draw the shadows once
renderer.toneMapping = THREE.NeutralToneMapping;   // keeps the photograph's colors where they are
renderer.toneMappingExposure = P.post.exposure;
RectAreaLightUniformsLib.init();

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(P.path[0].fov, 1, 0.08, 1200);
camera.rotation.order = 'YXZ';

/* =============================================================== SHADER LIB */
const NOISE = /* glsl */`
float hash31(vec3 p){
  p = fract(p * 0.3183099 + vec3(0.1, 0.7, 0.4));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float hash21(vec2 p){ return hash31(vec3(p, 3.7)); }
float vnoise(vec3 x){
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash31(i+vec3(0,0,0)), hash31(i+vec3(1,0,0)), f.x),
                 mix(hash31(i+vec3(0,1,0)), hash31(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash31(i+vec3(0,0,1)), hash31(i+vec3(1,0,1)), f.x),
                 mix(hash31(i+vec3(0,1,1)), hash31(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p){
  float a = 0.5, s = 0.0;
  for(int i = 0; i < 3; i++){ s += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return s;
}
`;

/* shared clocks, so every material breathes together */
const live = { uTime: { value: 0 } };

/* -------------------------------------------------------------- the stone */
/*
   One warm limestone in three dressings, all procedural in world space.
   'plaster' is the lime render of the gallery and the vault: smooth, matte
   and cloudy, with fine pinholes and the faint vertical drag of a
   hand-floated wall. 'travertine' is the arch wall, the portal and the
   seats: honed, banded with its bedding, pocked with the stone's voids,
   which run with the bedding, and flecked with the crystal that catches a
   raking light. 'clay' is the jars: matte and speckled. The relief is a
   height field whose gradient tilts the normal, so the low sun rakes it.
*/
const KINDS = { plaster: 'KIND_PLASTER', travertine: 'KIND_TRAV', clay: 'KIND_CLAY' };
function stoneMaterial({ kind = 'plaster', color = P.stone.wall, rough = 0.92, bump = 1, side = THREE.FrontSide, env = 0.25 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, side, dithering: true });
  mat.envMapIntensity = env;
  mat.defines = { [KINDS[kind]]: '' };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBump = { value: bump };
    sh.vertexShader = 'varying vec3 vWPos;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = 'uniform float uBump;\nvarying vec3 vWPos;\n' + NOISE + /* glsl */`
      // the travertine's voids: cells squashed vertically, so they run with the bedding
      float voids(vec3 p, float sc){
        vec3 q = p * vec3(1.0, 3.0, 1.0) * sc;
        return smoothstep(0.66, 0.76, vnoise(q) * 0.65 + vnoise(q * 2.3 + 5.0) * 0.35);
      }
      float stoneH(vec3 p){
      #if defined(KIND_TRAV)
        return fbm(p * 9.0) * 0.22 - voids(p, 6.0) * 0.36 - voids(p + 3.1, 14.0) * 0.20
             - smoothstep(0.88, 0.97, vnoise(p * 64.0)) * 0.06
             + sin(p.y * 24.0 + fbm(p * 1.4) * 6.0) * 0.008;
      #elif defined(KIND_CLAY)
        return fbm(p * 14.0) * 0.35 - step(0.9, vnoise(p * 70.0)) * 0.2;
      #else
        return fbm(p * 2.6) * 0.30 + fbm(p * 16.0) * 0.10 - smoothstep(0.82, 0.92, vnoise(p * 38.0)) * 0.30;
      #endif
      }
    ` + sh.fragmentShader;

    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', /* glsl */`
      float m1 = fbm(vWPos * 0.22);
      float m2 = fbm(vWPos * 1.6 + 7.0);
      diffuseColor.rgb *= 0.90 + 0.16 * m1;
      diffuseColor.rgb *= 0.96 + 0.08 * m2;
      #if defined(KIND_TRAV)
        float bed = fbm(vec3(vWPos.x * 0.6, vWPos.y * 10.0 + m1 * 5.0, vWPos.z * 0.6));
        diffuseColor.rgb *= 0.96 + 0.07 * bed;
        diffuseColor.rgb *= 1.0 - 0.26 * voids(vWPos, 6.0) - 0.12 * voids(vWPos + 3.1, 14.0);
        diffuseColor.rgb *= 1.0 + 0.07 * smoothstep(0.9, 0.97, vnoise(vWPos * 90.0 + 2.0));   // crystal flecks
      #elif defined(KIND_CLAY)
        diffuseColor.rgb *= 0.84 + 0.26 * fbm(vWPos * 3.0);
        diffuseColor.rgb *= 1.0 - 0.22 * step(0.86, vnoise(vWPos * 70.0)) + 0.12 * step(0.9, vnoise(vWPos * 55.0 + 9.0));
      #else
        float drag = fbm(vec3(vWPos.x * 2.2, vWPos.y * 0.22, vWPos.z * 2.2));
        diffuseColor.rgb *= 0.95 + 0.09 * drag;
      #endif
      diffuseColor.rgb *= mix(0.84, 1.0, smoothstep(0.0, 0.7, vWPos.y));
    `);
    sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', /* glsl */`
      float roughnessFactor = clamp(roughness + (m2 - 0.5) * 0.16, 0.3, 1.0);
    `);
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', /* glsl */`
      #include <normal_fragment_begin>
      {
        float e = 0.006;
        float h0 = stoneH(vWPos);
        vec3 g = vec3(stoneH(vWPos + vec3(e, 0.0, 0.0)) - h0,
                      stoneH(vWPos + vec3(0.0, e, 0.0)) - h0,
                      stoneH(vWPos + vec3(0.0, 0.0, e)) - h0) / e;
        vec3 gv = mat3(viewMatrix) * g;
        vec3 gt = gv - dot(gv, normal) * normal;
        normal = normalize(normal - gt * uBump * 0.012);
      }
    `);
  };
  mat.customProgramCacheKey = () => 'loggia-stone';
  return mat;
}

const wallMat   = stoneMaterial();                                    // lime plaster
const vaultMat  = stoneMaterial({ side: THREE.BackSide });
const pierMat   = stoneMaterial({ kind: 'travertine', color: P.stone.pier, rough: 0.84, bump: 1.6 });
const benchMat  = stoneMaterial({ kind: 'travertine', color: P.stone.bench, rough: 0.74, bump: 0.9 });
const urnMat    = stoneMaterial({ kind: 'clay', color: P.stone.urn, rough: 0.8, bump: 0.8, env: 0.7 });

/* ============================================================== THICK WALLS */
/*
   Every wall is a slab built flat in its own frame (x along the wall, y up,
   the inner face at z = 0, the body toward -z) and then placed, so the plan
   can take any angle. Openings are lofted through the thickness: a
   round-headed profile, a little stilted, that can splay (widest on the
   room side, narrowing toward the view), with every edge rounded over by a quarter-circle fillet so a
   raking light catches it. The result is one creased-normal mesh.
*/
function archPts(cx, hw, ry, spring, sill, n = 36) {
  const pts = [[cx - hw, sill], [cx - hw, spring]];
  for (let i = 1; i < n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    pts.push([cx + hw * Math.cos(a), spring + ry * Math.sin(a)]);
  }
  pts.push([cx + hw, spring], [cx + hw, sill]);
  return pts;
}
const pathOf = (pts) => new THREE.Path(pts.map(([x, y]) => new THREE.Vector2(x, y)));
const rectShape = (x0, x1, y0, y1) => {
  const s = new THREE.Shape();
  s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.lineTo(x0, y0);
  return s;
};

function thickWall({ x0, x1, y0, y1, t, r = P.edge, openings = [], crease = 0.4 }) {
  const pos = [];
  const tri = (a, b, c) => pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  // a quad whose normal is made to agree with n
  const quad = (a, b, c, d, n) => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const cr = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (cr[0] * n[0] + cr[1] * n[1] + cr[2] * n[2] < 0) { tri(a, c, b); tri(a, d, c); }
    else { tri(a, b, c); tri(a, c, d); }
  };
  const ring = (o, d, extra) => {
    const s = -d * Math.tan((o.splay || 0) * DEG) + extra;   // splay > 0: widest at the inner face
    return archPts(o.cx, o.hw + s, o.hw * o.K + s, o.spring, o.sill - s, o.n || 36);
  };
  // the stations through the thickness: fillet in, the straight run, fillet out
  const F = 6, depths = [];
  for (let i = 0; i <= F; i++) { const a = (i / F) * Math.PI / 2; depths.push([r * (1 - Math.cos(a)), r * (1 - Math.sin(a))]); }
  for (let i = 0; i <= F; i++) { const a = (i / F) * Math.PI / 2; depths.push([t - r + r * Math.sin(a), r * (1 - Math.cos(a))]); }

  for (const o of openings) {
    const rings = depths.map(([d, e]) => ring(o, d, e).map(([x, y]) => [x, y, -d]));
    for (let k = 0; k < rings.length - 1; k++) {
      const A = rings[k], B = rings[k + 1], n = A.length;
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        tri(A[i], B[i], B[j]); tri(A[i], B[j], A[j]);
      }
    }
  }
  // the slab's outer boundary
  quad([x0, y1, 0], [x1, y1, 0], [x1, y1, -t], [x0, y1, -t], [0, 1, 0]);
  quad([x0, y0, 0], [x1, y0, 0], [x1, y0, -t], [x0, y0, -t], [0, -1, 0]);
  quad([x0, y0, 0], [x0, y1, 0], [x0, y1, -t], [x0, y0, -t], [-1, 0, 0]);
  quad([x1, y0, 0], [x1, y1, 0], [x1, y1, -t], [x1, y0, -t], [1, 0, 0]);
  const ribbon = new THREE.BufferGeometry();
  ribbon.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));

  const inner = rectShape(x0, x1, y0, y1);
  for (const o of openings) inner.holes.push(pathOf(ring(o, 0, r)));
  const gi = new THREE.ShapeGeometry(inner, 1).toNonIndexed();
  gi.deleteAttribute('uv'); gi.deleteAttribute('normal');
  const outer = rectShape(-x1, -x0, y0, y1);                     // mirrored, then turned to face -z
  for (const o of openings) outer.holes.push(pathOf(ring(o, t, r).map(([x, y]) => [-x, y])));
  const go = new THREE.ShapeGeometry(outer, 1).toNonIndexed();
  go.deleteAttribute('uv'); go.deleteAttribute('normal');
  go.rotateY(Math.PI); go.translate(0, 0, -t);

  return toCreasedNormals(mergeGeometries([ribbon, gi, go]), crease);
}

/* ================================================================= THE ROOM */
const shell = new THREE.Group();
scene.add(shell);

function addMesh(geo, mat, parent = shell, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = cast; m.receiveShadow = receive;
  parent.add(m);
  return m;
}
function box(x0, x1, y0, y1, z0, z1, mat = wallMat, parent = shell, opts) {
  const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return addMesh(g, mat, parent, opts);
}

/* the arch wall's frame: x from the arch toward the pier, z into the room */
const FRONT = new THREE.Group();
FRONT.rotation.y = FA;
FRONT.position.set(FC.x, 0, FC.y);
shell.add(FRONT);
FRONT.updateMatrixWorld(true);

/* the great arch through a wall two meters thick, its jambs splayed */
{
  const f = P.front;
  const g = thickWall({ x0: f.x0, x1: f.x1, y0: SUNK - 0.5, y1: f.h, t: f.t, r: f.edge, openings: [f.arch] });
  addMesh(g, pierMat, FRONT);
  // the room's far-left wall, square to the arch wall, and its ceiling: never in the sun
  box(f.x0 - 1, f.x0, SUNK, f.h, -f.t, 24, wallMat, FRONT, { cast: false });
}

/* the room: the wedge between the arch wall and the gallery's right wall.
   Its outline is the floor's. */
const roomPts = (() => {
  const a = frontToWorld(P.front.x0, 0);           // the far-left end of the arch wall
  const e = frontToWorld((FC.y - ZP) / Math.sin(FA), 0);   // where the wall's inner face meets the portal plane
  const b = frontToWorld(P.front.x0, 24);          // the back corner
  return { a, e, b };
})();
const roomShape = (zSign) => {
  const { a, e, b } = roomPts;
  const s = new THREE.Shape();
  const pt = (x, z) => s.lineTo(x, z * zSign);
  s.moveTo(a.x, a.y * zSign);
  pt(e.x, e.y);
  pt(-GHW - G.wallT, ZP); pt(-GHW - G.wallT, ZEND - G.end.t - G.end.terrace);
  pt(GHW + G.wallT, ZEND - G.end.t - G.end.terrace); pt(GHW + G.wallT, ZP);
  pt(GHW + G.wallT, P.room.zBack);
  pt(b.x, b.y);
  pt(a.x, a.y);
  return s;
};
{
  // the right wall, which is the gallery's right wall run on into the room
  box(GHW, GHW + G.wallT, SUNK, P.room.ceil + 0.4, ZEND - G.end.t - G.end.terrace, P.room.zBack + 1);
  // the back wall and the ceiling, never seen and never in the sun
  box(-14, GHW + G.wallT, SUNK, P.room.ceil + 0.4, P.room.zBack, P.room.zBack + 1, wallMat, shell, { cast: false });
  box(-14, GHW + G.wallT + 1, P.room.ceil, P.room.ceil + 0.4, ZP - 1, P.room.zBack + 1, wallMat, shell, { cast: false });
}

/* ============================================================== THE GALLERY */
/* the portal and the transverse arches: thick walls with a round-headed
   opening stepped inside the vault, every edge rounded */
{
  const ribWall = (t, top = G.roof) => thickWall({
    x0: -GHW - G.wallT, x1: GHW + G.wallT, y0: SUNK - 1, y1: top, t, r: P.edge,
    openings: [{ cx: 0, hw: RIB_HW, spring: G.spring, sill: SUNK - 0.5, K: RIB_K }]
  });
  addMesh(ribWall(G.portalT, P.room.ceil + 0.4).translate(0, 0, ZP), pierMat);
  const rib = ribWall(G.rib);
  for (let k = 1; k < G.bays; k++) addMesh(rib.clone().translate(0, 0, ZBAY(k) + G.rib), wallMat);
}
/* the left wall: an arcade, one tall opening in every bay */
{
  const len = ZP - ZEND;
  const openings = [];
  for (let i = 0; i < G.bays; i++) {
    openings.push({ cx: ZP - ZBAY(i) + G.bay / 2, hw: G.win.hw, spring: G.win.spring, sill: G.win.sill, K: G.win.K });
  }
  const g = thickWall({ x0: 0, x1: len, y0: SUNK - 0.5, y1: G.roof, t: G.wallT, openings });
  g.rotateY(Math.PI / 2);                 // shape x runs down -z, the body runs -x
  g.translate(-GHW, 0, ZP);
  addMesh(g, wallMat);
}
/* barrel vault, stilted like the arches */
{
  const len = ZP - ZEND;
  const g = new THREE.CylinderGeometry(GHW, GHW, len, 72, 1, true, Math.PI / 2, Math.PI);
  g.rotateX(Math.PI / 2);
  g.scale(1, G.K, 1);
  g.translate(0, G.spring, ZP - len / 2);
  addMesh(g, vaultMat, shell, { cast: false });
  // the vault is drawn from inside only; solid fill above it and a roof keep the sun out
  box(-GHW, GHW, vaultY(0) + 0.02, G.roof + 0.4, ZEND, ZP, wallMat, shell, { cast: false });
  box(-GHW - G.wallT, GHW + G.wallT, G.roof, G.roof + 0.4, ZEND - G.end.t, ZP, wallMat, shell, { cast: false });
}
/* the far wall and its tall door onto the water */
{
  const { hw, spring, K, t } = G.end;
  const g = thickWall({ x0: -GHW - G.wallT, x1: GHW + G.wallT, y0: SUNK - 1, y1: G.roof + 0.4, t,
    openings: [{ cx: 0, hw, spring, sill: SUNK - 0.5, K }] });
  g.translate(0, 0, ZEND);
  addMesh(g, wallMat);
}

/* ================================================================== FLOOR */
/*
   Big honed slabs laid square to the gallery, polished enough to hold the
   arches. The reflection is a real mirror render of the scene (three's
   Reflector, kept off-scene and driven by hand), blurred by the slab's
   roughness and added by Fresnel, so the bright openings lie on the floor.
*/
const reflector = new Reflector(new THREE.PlaneGeometry(60, 80), {
  textureWidth: 512, textureHeight: 512, clipBias: 0.003, multisample: MOBILE ? 0 : 4
});
reflector.rotation.x = -Math.PI / 2;
reflector.position.set(-4, 0, 0);
reflector.updateMatrixWorld();

const floorU = {
  tRefl:   { value: reflector.getRenderTarget().texture },
  uTexMat: { value: reflector.material.uniforms.textureMatrix.value },
  uReflect:{ value: P.floor.reflect }
};
const floorMat = new THREE.MeshStandardMaterial({ color: P.stone.floor, roughness: 0.3, metalness: 0, dithering: true });
floorMat.envMapIntensity = 0;
floorMat.onBeforeCompile = (sh) => {
  Object.assign(sh.uniforms, floorU);
  sh.vertexShader = 'uniform mat4 uTexMat;\nvarying vec3 vWPos;\nvarying vec4 vRefl;\n' + sh.vertexShader.replace(
    '#include <begin_vertex>', /* glsl */`
    #include <begin_vertex>
    vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
    vRefl = uTexMat * vec4(vWPos, 1.0);`);
  sh.fragmentShader = 'uniform sampler2D tRefl;\nuniform float uReflect;\nvarying vec3 vWPos;\nvarying vec4 vRefl;\n' + NOISE + /* glsl */`
    // a plain grid of big slabs, 1.3 m across the gallery and 2.0 m along it
    const vec2 SLAB = vec2(1.3, 2.0);
    vec4 slab(vec2 q){
      vec2 c = floor(q / SLAB);
      vec2 f = fract(q / SLAB) * SLAB;
      float edge = min(min(f.x, SLAB.x - f.x), min(f.y, SLAB.y - f.y));
      return vec4(c, edge, hash21(c));
    }
  ` + sh.fragmentShader;

  sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', /* glsl */`
    vec4 sl = slab(vWPos.xz);
    float joint = 1.0 - smoothstep(0.002, 0.007, sl.z);
    float cloud = fbm(vWPos * vec3(0.45, 0.0, 0.45) + sl.w * 13.0);
    float vein  = fbm(vWPos * vec3(1.1, 0.0, 0.5) + sl.w * 3.0);
    float fine  = fbm(vWPos * vec3(6.0, 0.0, 6.0));
    // hairline cracks: thin isolines of a slow noise, only here and there
    float crk = 1.0 - smoothstep(0.0, 0.0022, abs(fbm(vWPos * vec3(1.6, 0.0, 1.6) + sl.w * 5.0) - 0.5));
    crk *= smoothstep(0.62, 0.8, vnoise(vWPos * vec3(0.7, 0.0, 0.7) + 3.0)) * 0.6;
    diffuseColor.rgb *= 0.88 + 0.16 * sl.w;
    diffuseColor.rgb *= mix(vec3(0.72, 0.72, 0.75), vec3(1.05, 1.01, 0.96), smoothstep(0.22, 0.68, cloud));
    diffuseColor.rgb *= 0.92 + 0.14 * smoothstep(0.3, 0.7, vein);
    diffuseColor.rgb *= 0.95 + 0.08 * fine;
    diffuseColor.rgb *= 1.0 - 0.22 * crk;
    diffuseColor.rgb *= 1.0 - 0.35 * joint;
  `);
  sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', /* glsl */`
    float roughnessFactor = mix(0.05 + 0.13 * cloud + 0.05 * sl.w, 0.9, max(joint, crk * 0.5));
  `);
  sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', /* glsl */`
    #include <normal_fragment_begin>
    {
      // each slab sits a hair off level; the joints dip
      vec3 tilt = vec3(hash21(sl.xy + 1.3) - 0.5, 0.0, hash21(sl.xy + 7.1) - 0.5) * 0.010;
      float e = 0.004;
      float j0 = slab(vWPos.xz).z;
      vec2 gj = vec2(slab(vWPos.xz + vec2(e, 0.0)).z - j0, slab(vWPos.xz + vec2(0.0, e)).z - j0) / e;
      vec3 gw = tilt + vec3(gj.x, 0.0, gj.y) * joint * 0.35;
      normal = normalize(normal - mat3(viewMatrix) * gw);
    }
  `);
  sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', /* glsl */`
    {
      vec2 ruv = vRefl.xy / vRefl.w + normal.xy * 0.01;
      float r = roughnessFactor * 0.035;
      vec3 refl = texture2D(tRefl, ruv).rgb * 0.24;
      refl += texture2D(tRefl, ruv + vec2( 0.50,  1.6) * r).rgb * 0.095;
      refl += texture2D(tRefl, ruv + vec2(-0.50, -1.6) * r).rgb * 0.095;
      refl += texture2D(tRefl, ruv + vec2( 0.35, -0.9) * r).rgb * 0.095;
      refl += texture2D(tRefl, ruv + vec2(-0.35,  0.9) * r).rgb * 0.095;
      refl += texture2D(tRefl, ruv + vec2( 0.00,  3.0) * r).rgb * 0.095;
      refl += texture2D(tRefl, ruv + vec2( 0.00, -3.0) * r).rgb * 0.095;
      refl += texture2D(tRefl, ruv + vec2( 0.90,  0.0) * r).rgb * 0.095;
      refl += texture2D(tRefl, ruv + vec2(-0.90,  0.0) * r).rgb * 0.095;
      refl = min(refl, vec3(1.4));   // the sun's own image would burn a hole in the floor
      float NoV = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
      float F = 0.04 + 0.96 * pow(1.0 - NoV, 5.0);
      float gloss = 1.0 - smoothstep(0.15, 0.6, roughnessFactor);
      outgoingLight = outgoingLight * (1.0 - F * gloss * 0.5) + refl * F * gloss * uReflect;
      // the sun's glint on honed stone, looking into the light, would bloom across the screen
      outgoingLight = min(outgoingLight, vec3(2.0));
    }
    #include <opaque_fragment>
  `);
};
floorMat.customProgramCacheKey = () => 'loggia-floor';

const floors = [];
{
  const g = new THREE.ShapeGeometry(roomShape(-1), 1);   // shape y = -z, turned to face up
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, floorMat);
  m.receiveShadow = true;
  shell.add(m);
  floors.push(m);
}

/* ============================================================ FURNISHINGS */
const props = new THREE.Group();
scene.add(props);

function bench(w, h, d, x, z, ry = 0, parent = props) {
  const g = new RoundedBoxGeometry(w, h, d, 4, 0.05);
  g.translate(0, h / 2, 0);
  const m = addMesh(g, benchMat, parent);
  m.position.set(x, 0, z); m.rotation.y = ry;
  return m;
}
/* the stepped travertine seats in the great arch (in the wall's frame: the
   big block set back in the reveal, a low step, and the bowl's block against
   the right jamb), and one by the right wall */
bench(1.95, 0.65, 1.00, -4.50, -0.40, 0, FRONT);
bench(2.70, 0.40, 0.90, -2.25, -0.05, 0, FRONT);
bench(1.90, 0.56, 0.90, -0.95,  0.05, 0, FRONT);
bench(0.62, 0.50, 1.60, GHW - 0.33, 5.0);

/* two turned stone stools by the small olive in the first bay */
{
  const stool = (r, h) => new THREE.LatheGeometry([[0, 0], [r - 0.03, 0], [r, 0.03], [r, h - 0.03], [r - 0.03, h], [0, h]]
    .map(([a, b]) => new THREE.Vector2(a, b)), 40);
  addMesh(stool(0.24, 0.42), benchMat, props).position.set(-GHW + 0.55, 0, ZBAY(0) - 1.2);
  addMesh(stool(0.2, 0.36), benchMat, props).position.set(-GHW + 1.05, 0, ZBAY(0) - 1.5);
}

/* a wide bronze bowl on the seat beside the pier */
const bronze = new THREE.MeshStandardMaterial({ color: 0xb08a55, metalness: 0.9, roughness: 0.3 });
{
  const pts = [[0, 0], [0.10, 0], [0.17, 0.025], [0.24, 0.075], [0.275, 0.13], [0.28, 0.145],
               [0.265, 0.145], [0.255, 0.13], [0.21, 0.08], [0.14, 0.045], [0, 0.035]]
    .map(([r, y]) => new THREE.Vector2(r * 1.6, y * 1.5));
  const m = addMesh(new THREE.LatheGeometry(pts, 64), bronze, FRONT);
  m.position.set(-0.85, 0.56, 0.10);
}

/* jars: wide-shouldered, a short neck and a rolled lip, as in the image */
const JAR_TOP = 0.98;
function urn(scale = 1) {
  const pts = [[0, 0], [0.19, 0], [0.25, 0.03], [0.36, 0.16], [0.44, 0.34], [0.46, 0.48], [0.44, 0.63],
               [0.37, 0.77], [0.28, 0.87], [0.22, 0.93], [0.205, 0.97], [0.225, 1.0], [0.235, 1.03],
               [0.215, 1.045], [0.19, 1.03], [0.18, JAR_TOP]]
    .map(([r, y]) => new THREE.Vector2(r * scale, y * scale));
  const grp = new THREE.Group();
  addMesh(new THREE.LatheGeometry(pts, 56), urnMat, grp);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.18 * scale, 32).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x3b2f24, roughness: 1 }));
  soil.position.y = (JAR_TOP - 0.01) * scale;
  soil.receiveShadow = true;
  grp.add(soil);
  return grp;
}

/* ------------------------------------------------------------ olive trees */
/*
   Grown, not modeled: a few slender stems rise from the jar and fork, and
   fork again, into long arching twigs. Every twig carries its leaves in
   pairs, narrow and pointed forward, so each reads as a feathery spray, dark
   above and silver beneath. The leaves are one instanced mesh per tree and
   tremble in the vertex shader, each at its own phase.
*/
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function taperTube(curve, r0, r1, segs, radial) {
  const frames = curve.computeFrenetFrames(segs, false);
  const pos = [], nor = [], idx = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, c = curve.getPointAt(t), r = r0 + (r1 - r0) * t;
    const N = frames.normals[i], B = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2, s = Math.sin(a), co = -Math.cos(a);
      const nx = co * N.x + s * B.x, ny = co * N.y + s * B.y, nz = co * N.z + s * B.z;
      nor.push(nx, ny, nz);
      pos.push(c.x + r * nx, c.y + r * ny, c.z + r * nz);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = a + radial + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  return g;
}

const barkMat = new THREE.MeshStandardMaterial({ color: 0x655a4c, roughness: 0.92, side: THREE.DoubleSide });
const leafGeo = (() => {
  const L = 0.085, w = 0.013;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -w, L * 0.45, 0.003, 0, L, 0, w, L * 0.45, 0.003], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  return g;
})();
const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide });
leafMat.onBeforeCompile = (sh) => {
  sh.uniforms.uTime = live.uTime;
  sh.uniforms.uStill = { value: RM ? 0 : 1 };
  sh.vertexShader = 'uniform float uTime, uStill;\n' + sh.vertexShader.replace('#include <begin_vertex>', /* glsl */`
    #include <begin_vertex>
    #ifdef USE_INSTANCING
      vec3 ip = vec3(instanceMatrix[3]);
      float ph = uTime * 1.6 + ip.x * 4.1 + ip.y * 2.7 + ip.z * 3.3;
      float gust = 0.6 + 0.4 * sin(uTime * 0.37 + ip.x * 0.8);
      transformed.x += (sin(ph) * 0.16 + sin(ph * 2.3) * 0.05) * transformed.y * gust * uStill * 2.0;
      transformed.z += cos(ph * 0.8) * 0.10 * transformed.y * gust * uStill * 2.0;
    #endif
  `);
};
leafMat.customProgramCacheKey = () => 'loggia-leaf';

function oliveTree(seed, { stems = 2, height = 1.0, girth = 0.034, depthMax = 5, density = 1, leaf = 1 } = {}) {
  const rnd = seeded(seed);
  const V = THREE.Vector3;
  const tubes = [], twigs = [];
  const grow = (a, dir, len, r, depth) => {
    const b = a.clone().addScaledVector(dir, len);
    const bend = new V(rnd() - 0.5, (rnd() - 0.5) * 0.3, rnd() - 0.5).multiplyScalar(len * 0.3);
    if (depth >= depthMax - 1) bend.y -= len * 0.2;           // the twigs arch over and droop
    const curve = new THREE.QuadraticBezierCurve3(a, a.clone().lerp(b, 0.5).add(bend), b);
    const rEnd = Math.max(r * 0.7, 0.0028);
    tubes.push(taperTube(curve, r, rEnd, depth < 2 ? 8 : 4, depth < 2 ? 7 : 4));
    if (depth >= depthMax - 3) twigs.push({ curve, len });
    if (depth >= depthMax) return;
    const n = depth === 0 ? 2 : (rnd() < 0.55 ? 2 : 3);
    const endDir = curve.getTangentAt(1);
    for (let k = 0; k < n; k++) {
      const yawA = (k / n) * Math.PI * 2 + rnd() * 1.6;
      const tilt = 0.3 + rnd() * 0.45;
      const out = new V(Math.cos(yawA), 0.15, Math.sin(yawA)).normalize();
      const d = endDir.clone().multiplyScalar(Math.cos(tilt)).addScaledVector(out, Math.sin(tilt) * 1.25).normalize();
      d.y = Math.max(d.y, depth >= 2 ? -0.1 : 0.35);
      d.normalize();
      grow(b, d, len * (0.64 + rnd() * 0.14), rEnd, depth + 1);
    }
  };
  for (let s = 0; s < stems; s++) {
    const a = (s / stems) * Math.PI * 2 + rnd();
    const dir = new V(Math.cos(a) * 0.2, 1, Math.sin(a) * 0.2).normalize();
    grow(new V(Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03), dir, height * (0.85 + rnd() * 0.3), girth, 0);
  }

  const tree = new THREE.Group();
  const wood = new THREE.Mesh(mergeGeometries(tubes), barkMat);
  wood.castShadow = wood.receiveShadow = true;
  tree.add(wood);

  // leaves in pairs along each twig, turning a quarter turn pair to pair
  const mats = [], cols = [];
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Q2 = new THREE.Quaternion();
  const S = new V(), Y = new V(0, 1, 0), C = new THREE.Color();
  const dark = new THREE.Color(0x5e6648), silver = new THREE.Color(0xa1a68e);
  const ang = 48 * DEG;
  for (const { curve, len } of twigs) {
    const pairs = Math.max(4, Math.round(len / 0.022 * density));
    const spin = rnd() * Math.PI;
    for (let i = 0; i < pairs; i++) {
      const t = 0.18 + 0.82 * (i / pairs);
      const p = curve.getPointAt(t), T = curve.getTangentAt(t);
      const ref = Math.abs(T.y) > 0.9 ? new V(1, 0, 0) : Y;
      const side = new V().crossVectors(T, ref).normalize().applyAxisAngle(T, spin + i * Math.PI / 2);
      for (const sgn of [-1, 1]) {
        const dir = T.clone().multiplyScalar(Math.cos(ang)).addScaledVector(side, sgn * Math.sin(ang)).normalize();
        Q.setFromUnitVectors(Y, dir);
        Q2.setFromAxisAngle(dir, rnd() * 0.8 - 0.4);
        Q.premultiply(Q2);
        const s = (0.75 + rnd() * 0.45) * (0.7 + 0.3 * t) * leaf;
        S.set(s, s, s);
        mats.push(M.compose(p, Q, S).clone());
        cols.push(C.copy(dark).lerp(silver, rnd() * rnd() * 1.2).clone());
      }
    }
    // a leaf at the tip, along the twig
    Q.setFromUnitVectors(Y, curve.getTangentAt(1));
    mats.push(M.compose(curve.getPointAt(1), Q, S.set(0.9 * leaf, 0.9 * leaf, 0.9 * leaf)).clone());
    cols.push(dark.clone());
  }
  const inst = new THREE.InstancedMesh(leafGeo, leafMat, mats.length);
  mats.forEach((m, i) => { inst.setMatrixAt(i, m); inst.setColorAt(i, cols[i]); });
  inst.castShadow = inst.receiveShadow = true;
  tree.add(inst);
  return tree;
}

function plantedOlive(seed, x, z, { urnScale = 1, ry = 0, parent = props, ...tree } = {}) {
  const grp = new THREE.Group();
  grp.add(urn(urnScale));
  const t = oliveTree(seed, tree);
  t.position.y = (JAR_TOP - 0.02) * urnScale;
  grp.add(t);
  grp.position.set(x, 0, z);
  grp.rotation.y = ry;
  parent.add(grp);
  return grp;
}
const LEAVES = MOBILE ? 0.6 : 1;
/* the big olive by the great arch leans out over the view; a slender one by
   the right wall; a small one in the first bay of the gallery */
plantedOlive(1931, -6.3, 1.9, { parent: FRONT, urnScale: 1.3, stems: 3, height: 1.6, girth: 0.06, depthMax: 6, density: LEAVES * 1.3, leaf: 1.3, ry: 0.6 });
plantedOlive(2207, GHW - 0.62, 1.0, { urnScale: 1.2, stems: 2, height: 0.7, girth: 0.028, depthMax: 5, density: LEAVES * 0.9, ry: 1.2 });
plantedOlive(4409, -GHW + 0.7, ZBAY(0) - 2.2, { urnScale: 0.8, stems: 2, height: 0.6, girth: 0.026, depthMax: 5, density: LEAVES, ry: 2.4 });

/* --------------------------------------------------------------- the rug */
const rugMat = new THREE.MeshStandardMaterial({ color: 0xc3ab86, roughness: 0.95 });
rugMat.onBeforeCompile = (sh) => {
  sh.fragmentShader = NOISE + sh.fragmentShader.replace('#include <map_fragment>', /* glsl */`
    // chunky braided jute: rows of fat loops, each row offset half a loop
    vec2 q = vUv * vec2(3.6, 2.6) * 9.0;
    float row = floor(q.y);
    vec2 cellId = vec2(floor(q.x + 0.5 * mod(row, 2.0)), row);
    vec2 f = vec2(fract(q.x + 0.5 * mod(row, 2.0)), fract(q.y)) - 0.5;
    float cord = (1.0 - smoothstep(0.22, 0.5, length(f * vec2(1.0, 1.35)))) * (0.8 + 0.2 * hash21(cellId));
    float fib = vnoise(vec3(q * 7.0, 0.0));
    float border = step(min(min(vUv.x, 1.0 - vUv.x) * 3.6, min(vUv.y, 1.0 - vUv.y) * 2.6), 0.07);
    diffuseColor.rgb *= (0.5 + 0.5 * cord) * (0.9 + 0.2 * fib) * (1.0 - 0.12 * border);
  `);
  sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', /* glsl */`
    #include <normal_fragment_begin>
    {
      vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
      float hx = dFdx(cord), hy = dFdy(cord);
      vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
      float det = dot(dpx, r1);
      vec3 grad = sign(det) * (hx * r1 + hy * r2);
      normal = normalize(abs(det) * normal - grad * 0.004);
    }
  `);
};
rugMat.customProgramCacheKey = () => 'loggia-rug';
rugMat.defines = { USE_UV: '' };
{
  // laid square to the arch wall, in front of the arch
  const g = new THREE.PlaneGeometry(3.6, 2.6);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, rugMat);
  m.position.set(-6.4, 0.014, 9.0);
  m.receiveShadow = true;
  FRONT.add(m);
}

/* ------------------------------------- tube lights and pinpoints in the vault */
/* long glowing tubes hung on fine cables, as in the image, and a scatter of
   tiny lights set into the vault */
const tubeMat  = new THREE.MeshBasicMaterial({ color: new THREE.Color(6.0, 4.4, 2.6) });
const cableMat = new THREE.MeshBasicMaterial({ color: 0x1c1712 });
function pendant(x, z, y0, y1, top) {
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, y1 - y0, 12), tubeMat);
  t.position.set(x, (y0 + y1) / 2, z);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, top - y1, 4), cableMat);
  c.position.set(x, (y1 + top) / 2, z);
  props.add(t, c);
}
pendant(GHW - 0.26, 3.0, 1.9, 3.8, P.room.ceil);                              // by the right wall, before the portal
for (let i = 1; i < G.bays; i += 2) pendant(GHW - 0.3, ZBAY(i) - G.bay / 2, 2.0, 3.4, vaultY(GHW - 0.3));
const slotGlow = new THREE.PointLight(0xffc98c, 3.0, 6, 2);
slotGlow.position.set(GHW - 0.5, 2.9, 3.0);
scene.add(slotGlow);
{
  const rnd = seeded(5150), n = 54;
  const m = new THREE.InstancedMesh(new THREE.SphereGeometry(0.013, 6, 4),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(8, 6.4, 4.2) }), n);
  const M = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    const a = (rnd() - 0.5) * 2.0;                        // angle from the crown
    const z = ZEND + rnd() * (ZP - ZEND);
    M.makeTranslation(Math.sin(a) * (GHW - 0.012), G.spring + Math.cos(a) * (GHW * G.K - 0.012), z);
    m.setMatrixAt(i, M);
  }
  props.add(m);
}

/* =================================================================== LIGHT */
const BOUNDS = new THREE.Box3(
  new THREE.Vector3(-16, -1.0, ZEND - G.end.t - G.end.terrace - 0.5),
  new THREE.Vector3(GHW + G.wallT + 0.5, P.room.ceil + 0.5, P.room.zBack + 0.5));
/* a directional light whose shadow camera is fitted to the building */
function fitShadow(light, dir, size, radius) {
  light.castShadow = true;
  light.shadow.mapSize.set(size, size);
  light.shadow.bias = -0.0006;
  light.shadow.normalBias = 0.03;
  light.shadow.radius = radius;
  light.shadow.blurSamples = 16;
  scene.add(light, light.target);
  const c = BOUNDS.getCenter(new THREE.Vector3());
  light.position.copy(c).addScaledVector(dir, 80);
  light.target.position.copy(c);
  light.updateMatrixWorld(); light.target.updateMatrixWorld();
  const cam = light.shadow.camera;
  cam.position.copy(light.position); cam.lookAt(c); cam.updateMatrixWorld();
  const inv = cam.matrixWorld.clone().invert();
  const lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = lo.clone().negate(), v = new THREE.Vector3();
  for (let i = 0; i < 8; i++) {
    v.set(i & 1 ? BOUNDS.max.x : BOUNDS.min.x, i & 2 ? BOUNDS.max.y : BOUNDS.min.y, i & 4 ? BOUNDS.max.z : BOUNDS.min.z).applyMatrix4(inv);
    lo.min(v); hi.max(v);
  }
  cam.left = lo.x; cam.right = hi.x; cam.bottom = lo.y; cam.top = hi.y;
  cam.near = -hi.z - 1; cam.far = -lo.z + 1;
  cam.updateProjectionMatrix();
  return light;
}
/* the sun, a little left of the photograph's own */
const sun = fitShadow(new THREE.DirectionalLight(P.sun.color, P.sun.intensity), LIGHT_DIR, MOBILE ? 2048 : 4096, MOBILE ? 7 : 14);
/* the open sky to the left and behind, on the reveal and the right wall */
const fill = fitShadow(new THREE.DirectionalLight(P.fill.color, P.fill.intensity), FILL_DIR, MOBILE ? 1024 : 2048, MOBILE ? 5 : 10);

/* sky and bounce: warm from below where the sun lies on the floor */
const hemi = new THREE.HemisphereLight(P.hemi.sky, P.hemi.ground, P.hemi.intensity);
scene.add(hemi);

/* skylight through the openings: soft panels that light the stone around them */
function skyPanel(w, h, pos, look, intensity, color = 0xffe7cc) {
  const l = new THREE.RectAreaLight(color, intensity, w, h);
  l.position.set(...pos);
  l.lookAt(...look);
  scene.add(l);
  return l;
}
{
  const a = P.front.arch, mid = (a.sill + a.spring + a.hw * a.K) / 2;
  const at = frontToWorld(a.cx, -P.front.t / 2), to = frontToWorld(a.cx, 8);
  skyPanel(a.hw * 2 + 1, a.spring + a.hw * a.K - a.sill, [at.x, mid, at.y], [to.x, mid, to.y], 0.9);
}
skyPanel(ZP - ZEND, 2.6, [-GHW + 0.02, 1.9, (ZP + ZEND) / 2], [5, 1.9, (ZP + ZEND) / 2], 0.3);
skyPanel(G.end.hw * 2, 4.4, [0, 2.5, ZEND - 0.2], [0, 2.5, 0], 1.2);

/* ================================================================ THE VIEW */
/*
   The photograph laid on the sky by direction: K px per degree, its horizon
   row at eye level, its sun turned to P.view.sunAz. Past the photo's left and
   right edges the islands mirror on and settle into haze; above its top it
   fades into the sky's own color, below its bottom into the water. The photo's sun,
   clipped at white, gets back its real brightness so the bloom can find it,
   and the water under it glitters.
*/
const viewTex = new THREE.Texture();
viewTex.colorSpace = THREE.SRGBColorSpace;
const backdrop = new THREE.Mesh(
  new THREE.SphereGeometry(600, 64, 32),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      tView: { value: viewTex }, uTime: live.uTime,
      uSunDir: { value: SUN_DIR }, uSunCol: { value: new THREE.Color(1.0, 0.86, 0.66) },
      uK: { value: P.view.K }, uSize: { value: new THREE.Vector2(P.view.w, P.view.h) },
      uHorizon: { value: P.view.horizon }, uSunPx: { value: new THREE.Vector2(...P.view.sunPx) },
      uSunAz: { value: P.view.sunAz }, uGain: { value: 1.0 }, uZenith: { value: new THREE.Color(0x97bbe0) },
      uSea: { value: new THREE.Color(0x4f6d8a) }, uHaze: { value: new THREE.Color(0xdccbb8) }
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main(){
        vDir = position;
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: NOISE + /* glsl */`
      uniform sampler2D tView; uniform float uTime, uK, uHorizon, uSunAz, uGain;
      uniform vec2 uSize, uSunPx; uniform vec3 uSunDir, uSunCol, uZenith, uSea, uHaze;
      varying vec3 vDir;
      const float D = 57.2957795;
      void main(){
        vec3 d = normalize(vDir);
        float az = atan(d.x, -d.z) * D;
        float el = asin(clamp(d.y, -1.0, 1.0)) * D;
        vec2 px = vec2(uSunPx.x + (az - uSunAz) * uK, uHorizon - el * uK);
        vec2 uv = vec2(px.x / uSize.x, 1.0 - px.y / uSize.y);
        float side = max(-uv.x, uv.x - 1.0);
        // past the photograph's sides the islands mirror on, then settle into
        // haze; its top row gives way to the sky's own color and its bottom
        // row to the water, the blends starting just inside the edge
        float m = mod(uv.x, 2.0);
        if (m > 1.0) m = 2.0 - m;
        vec2 c = vec2(clamp(m, 0.002, 0.998), clamp(uv.y, 0.01, 0.99));
        vec3 col = texture2D(tView, c).rgb;
        vec3 far = mix(uSea, uHaze, smoothstep(-1.5, 1.0, el));
        col = mix(col, far, smoothstep(0.02, 0.3, side));
        col = mix(col, uZenith, smoothstep(0.96, 1.0, uv.y));
        col = mix(col, uSea, smoothstep(0.04, 0.0, uv.y));

        // the sun: its disc and a little bloom fuel
        float mu = dot(d, uSunDir);
        col += uSunCol * (smoothstep(0.99955, 0.99972, mu) * 7.0 + pow(max(mu, 0.0), 900.0) * 1.6 + pow(max(mu, 0.0), 60.0) * 0.08);

        // glitter on the water under the sun
        float daz = abs(az - uSunAz);
        float lane = exp(-daz * daz / (8.0 + 2.0 * max(-el, 0.0))) * smoothstep(-0.4, -1.6, el) * smoothstep(-20.0, -6.0, el);
        float sp = vnoise(vec3(az * 9.0, el * 38.0, uTime * 1.3));
        col += uSunCol * pow(sp, 14.0) * lane * 2.5;

        gl_FragColor = vec4(col * uGain, 1.0);
      }`
  })
);
backdrop.renderOrder = -10;
backdrop.frustumCulled = false;
scene.add(backdrop);

/* ======================================================== MOTES IN THE SUN */
/* dust that only shows where it crosses a beam: each mote tests the sun's
   own shadow map, so the beams draw themselves out of the dark */
const shadowU = { tShadow: { value: null }, uShadowM: { value: sun.shadow.matrix } };
const inRoom = (x, z) => x * FRONT_N.x + z * FRONT_N.y > FRONT_D + 0.2 && x < GHW && z > ZP;
const motes = (() => {
  const N = MOBILE ? 900 : 2200;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N * 2);
  const rnd = seeded(77);
  for (let i = 0; i < N; i++) {
    let x, z;
    if (rnd() < 0.55) { do { x = -11 + rnd() * 13; z = ZP + rnd() * 20; } while (!inRoom(x, z)); }
    else { x = -GHW + rnd() * 2 * GHW; z = ZEND + rnd() * (ZP - ZEND); }
    pos[i * 3] = x; pos[i * 3 + 1] = rnd() * 5.0; pos[i * 3 + 2] = z;
    seed[i * 2] = rnd(); seed[i * 2 + 1] = 0.2 + Math.pow(rnd(), 2.0) * 0.9;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 2));
  const m = new THREE.Points(g, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: Object.assign({ uTime: live.uTime, uPR: { value: dpr }, uMove: { value: RM ? 0 : 1 } }, shadowU),
    vertexShader: /* glsl */`
      #include <packing>
      attribute vec2 aSeed;
      uniform float uTime, uPR, uMove; uniform sampler2D tShadow; uniform mat4 uShadowM;
      varying float vI;
      void main(){
        vec3 p = position;
        float t = uTime * uMove, s = aSeed.x * 6.2831;
        p.y = mod(p.y + t * (0.03 + aSeed.x * 0.05), 5.0);
        p.x += sin(t * 0.21 + s) * 0.3;
        p.z += cos(t * 0.17 + s * 1.7) * 0.3;
        vec4 sc = uShadowM * vec4(p, 1.0);
        vec3 q = sc.xyz / sc.w;
        float lit = 0.0;
        if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0) lit = step(q.z - 0.002, texture2D(tShadow, q.xy).r);
        vI = (0.01 + lit * 0.55) * aSeed.y;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = min((aSeed.y * 1.1 + 0.35) * uPR * (32.0 / max(-mv.z, 0.001)), 8.0 * uPR);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vI;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vI;
        gl_FragColor = vec4(vec3(1.0, 0.88, 0.70) * a, a);
      }`
  }));
  m.frustumCulled = false;
  m.renderOrder = 4;
  scene.add(m);
  return m;
})();

/* ============================================================ POST PROCESS */
/*
   One pass draws the scene and the light in the air. It renders the mirror
   for the floor, then the scene into a target with a depth texture, then
   marches each pixel's ray through the building at reduced resolution,
   asking the sun's shadow map at every step whether that bit of air is in
   the sun. Lit air scatters forward (Henyey-Greenstein), so the beams glow
   when you look toward the sun and soften when you look away.
*/
const VOL_FRAG = /* glsl */`
  #include <packing>
  uniform sampler2D tDepth, tShadow;
  uniform mat4 uProjInv, uCamWorld, uShadowM;
  uniform vec3 uCamPos, uSunDir, uBoxMin, uBoxMax, uRoomMin, uRoomMax, uGalMin, uGalMax;
  uniform vec2 uWallN; uniform float uWallD;
  uniform float uTime, uDensity, uG, uRoomAir;
  float inside(vec3 p, vec3 lo, vec3 hi){ return step(lo.x, p.x) * step(p.x, hi.x) * step(lo.y, p.y) * step(p.y, hi.y) * step(lo.z, p.z) * step(p.z, hi.z); }
  varying vec2 vUv;
  ${NOISE}
  float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
  void main(){
    float z = texture2D(tDepth, vUv).x;
    vec4 v = uProjInv * vec4(vUv * 2.0 - 1.0, z * 2.0 - 1.0, 1.0);
    v /= v.w;
    vec3 wp = (uCamWorld * v).xyz;
    vec3 rd = wp - uCamPos;
    float tHit = length(rd);
    rd /= tHit;
    vec3 inv = 1.0 / rd;
    vec3 t0 = (uBoxMin - uCamPos) * inv, t1 = (uBoxMax - uCamPos) * inv;
    vec3 tn = min(t0, t1), tf = max(t0, t1);
    float a = max(max(tn.x, tn.y), max(tn.z, 0.0));
    float b = min(min(tf.x, tf.y), min(tf.z, tHit));
    if (b <= a) { gl_FragColor = vec4(0.0); return; }
    float dt = (b - a) / float(STEPS);
    float j = ign(gl_FragCoord.xy);
    float lit = 0.0, air = 0.0;
    for (int i = 0; i < STEPS; i++) {
      float tt = a + (float(i) + j) * dt;
      vec3 p = uCamPos + rd * tt;
      // the haze is indoor air: none outside, where the view must stay clear. The
      // room is the part of its box on this side of the arch wall; its air is
      // thinner, so the great arch's beam does not veil the view, and the air at
      // your face is clear: a beam reads only at a distance
      float room = inside(p, uRoomMin, uRoomMax) * step(uWallD, dot(p.xz, uWallN));
      float inAir = max(room * uRoomAir, inside(p, uGalMin, uGalMax)) * smoothstep(1.0, 6.0, tt);
      air += inAir;
      if (inAir < 0.01) continue;
      vec4 sc = uShadowM * vec4(p, 1.0);
      vec3 q = sc.xyz / sc.w;
      float s = 1.0;
      if (q.x > 0.0 && q.x < 1.0 && q.y > 0.0 && q.y < 1.0 && q.z < 1.0)
        s = step(q.z - 0.0015, textureLod(tShadow, q.xy, 0.0).r);
      float n = vnoise(p * 0.5 + vec3(uTime * 0.05, -uTime * 0.02, uTime * 0.03));
      lit += s * (0.45 + 1.1 * n) * inAir;
    }
    float mu = dot(rd, uSunDir);
    float g2 = uG * uG;
    float hg = (1.0 - g2) / pow(1.0 + g2 - 2.0 * uG * mu, 1.5);
    float phase = mix(1.0, hg, 0.8) / 12.566;
    gl_FragColor = vec4(lit * dt * uDensity * phase, air * dt, 0.0, 1.0);
  }`;

const BLUR_FRAG = /* glsl */`
  uniform sampler2D tIn; uniform vec2 uStep;
  varying vec2 vUv;
  void main(){
    vec4 s = texture2D(tIn, vUv) * 0.227;
    s += (texture2D(tIn, vUv + uStep * 1.385) + texture2D(tIn, vUv - uStep * 1.385)) * 0.316;
    s += (texture2D(tIn, vUv + uStep * 3.231) + texture2D(tIn, vUv - uStep * 3.231)) * 0.070;
    gl_FragColor = s;
  }`;

const QUAD_VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

class LoggiaPass extends Pass {
  constructor() {
    super();
    this.needsSwap = true;
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(1, 1) });
    const half = { type: THREE.HalfFloatType, depthBuffer: false };
    this.volA = new THREE.WebGLRenderTarget(1, 1, half);
    this.volB = new THREE.WebGLRenderTarget(1, 1, half);
    this.vol = new FullScreenQuad(new THREE.ShaderMaterial({
      defines: { STEPS: P.haze.steps },
      uniforms: Object.assign({
        tDepth: { value: this.target.depthTexture },
        uProjInv: { value: camera.projectionMatrixInverse }, uCamWorld: { value: camera.matrixWorld },
        uCamPos: { value: new THREE.Vector3() }, uSunDir: { value: LIGHT_DIR },
        uBoxMin: { value: BOUNDS.min }, uBoxMax: { value: BOUNDS.max },
        uRoomMin: { value: new THREE.Vector3(-14, 0, ZP) }, uRoomMax: { value: new THREE.Vector3(GHW, P.room.ceil, P.room.zBack) },
        uGalMin: { value: new THREE.Vector3(-GHW, 0, ZEND) }, uGalMax: { value: new THREE.Vector3(GHW, G.spring + GHW * G.K, ZP) },
        uWallN: { value: FRONT_N }, uWallD: { value: FRONT_D },
        uTime: live.uTime, uDensity: { value: P.haze.density }, uG: { value: P.haze.g }, uRoomAir: { value: P.haze.room }
      }, shadowU),
      vertexShader: QUAD_VERT, fragmentShader: VOL_FRAG, depthTest: false, depthWrite: false
    }));
    this.blur = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tIn: { value: null }, uStep: { value: new THREE.Vector2() } },
      vertexShader: QUAD_VERT, fragmentShader: BLUR_FRAG, depthTest: false, depthWrite: false
    }));
    this.comp = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: this.target.texture }, tVol: { value: this.volA.texture },
        uSunCol: { value: new THREE.Color(P.sun.color).multiplyScalar(P.sun.intensity) },
        uAir: { value: new THREE.Color(0xf3dcc0) }, uExt: { value: P.haze.ext }
      },
      vertexShader: QUAD_VERT,
      fragmentShader: /* glsl */`
        uniform sampler2D tScene, tVol; uniform vec3 uSunCol, uAir; uniform float uExt;
        varying vec2 vUv;
        void main(){
          vec3 col = texture2D(tScene, vUv).rgb;
          vec2 v = texture2D(tVol, vUv).rg;
          float T = exp(-v.y * uExt);
          gl_FragColor = vec4(col * T + uAir * (1.0 - T) * 0.6 + uSunCol * v.x, 1.0);
        }`,
      depthTest: false, depthWrite: false
    }));
  }
  setSize(w, h) {
    this.target.setSize(w, h);
    const vw = Math.max(1, Math.round(w * P.haze.scale)), vh = Math.max(1, Math.round(h * P.haze.scale));
    this.volA.setSize(vw, vh); this.volB.setSize(vw, vh);
    this.texel = new THREE.Vector2(1 / vw, 1 / vh);
    reflector.getRenderTarget().setSize(Math.max(1, Math.round(w * P.floor.scale)), Math.max(1, Math.round(h * P.floor.scale)));
  }
  render(renderer, writeBuffer) {
    // the mirror first, with the floor itself out of the way
    for (const f of floors) f.visible = false;
    reflector.onBeforeRender(renderer, scene, camera);
    for (const f of floors) f.visible = true;

    renderer.setRenderTarget(this.target);
    renderer.clear();
    renderer.render(scene, camera);
    shadowU.tShadow.value = sun.shadow.map ? sun.shadow.map.texture : null;

    const vu = this.vol.material.uniforms;
    vu.uCamPos.value.setFromMatrixPosition(camera.matrixWorld);
    renderer.setRenderTarget(this.volA);
    this.vol.render(renderer);
    const bu = this.blur.material.uniforms;
    bu.tIn.value = this.volA.texture; bu.uStep.value.set(this.texel.x, 0);
    renderer.setRenderTarget(this.volB); this.blur.render(renderer);
    bu.tIn.value = this.volB.texture; bu.uStep.value.set(0, this.texel.y);
    renderer.setRenderTarget(this.volA); this.blur.render(renderer);

    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
    this.comp.render(renderer);
  }
}

const composer = new EffectComposer(renderer);
const mainPass = new LoggiaPass();
composer.addPass(mainPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), P.post.bloom, 0.55, P.post.bloomThreshold);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* final grade, after OutputPass, in sRGB: a warm split tone, a highlight knee
   so lit stone lands on cream rather than white, a soft vignette toward the
   page ground, and a whisper of grain */
const GROUND = new THREE.Vector3(0x1f / 255, 0x14 / 255, 0x05 / 255);
const CREAM  = new THREE.Vector3(1.0, 0.95, 0.86);
const gradePass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null }, uTime: live.uTime, uRes: { value: new THREE.Vector2(1, 1) },
    uGround: { value: GROUND }, uCream: { value: CREAM }, uGrain: { value: P.post.grain }, uVig: { value: P.post.vig }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uGrain, uVig; uniform vec2 uRes; uniform vec3 uGround, uCream;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col * vec3(0.96, 0.97, 1.02), col * vec3(1.02, 1.0, 0.97), smoothstep(0.05, 0.6, l));
      {
        vec3 knee = vec3(0.84);
        vec3 room = uCream - knee;
        vec3 over = max(col - knee, 0.0);
        col = min(col, knee) + room * (1.0 - exp(-over / room));
      }
      float v = smoothstep(0.16, 0.85, dot(c, c)) * uVig;
      col = mix(col, uGround, v);
      col += (hash(vUv * uRes + fract(uTime) * 137.0) - 0.5) * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`
});
gradePass.renderToScreen = true;
composer.addPass(gradePass);

/* ============================================================ CAMERA PATH */
/*
   The walk is a Catmull-Rom curve through the keyframes; yaw, pitch, lens
   shift and focal length ease between them. Progress comes from the section:
   0 at its top, 1 when the sticky stage is about to release.
*/
function makePath(keys) {
  return {
    keys,
    curve: new THREE.CatmullRomCurve3(keys.map(k => new THREE.Vector3(...k.pos)), false, 'centripetal')
  };
}
const paths = { wide: makePath(P.path), tall: makePath(P.pathTall) };
let path = paths.wide;

const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const rig = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, fov: 40, sx: 0, sy: 0 };

function sampleRig(p) {
  const k = path.keys;
  let i = 0;
  while (i < k.length - 2 && p > k[i + 1].at) i++;
  const a = k[i], b = k[i + 1];
  const local = ss(0, 1, (p - a.at) / (b.at - a.at));
  // the curve's parameter runs evenly across keyframes
  path.curve.getPoint((i + local) / (k.length - 1), rig.pos);
  rig.yaw   = a.yaw + (b.yaw - a.yaw) * local;
  rig.pitch = a.pitch + (b.pitch - a.pitch) * local;
  rig.fov   = a.fov + (b.fov - a.fov) * local;
  rig.sx    = a.shift[0] + (b.shift[0] - a.shift[0]) * local;
  rig.sy    = a.shift[1] + (b.shift[1] - a.shift[1]) * local;
  return rig;
}

const mouse = new THREE.Vector2(0, 0), mouseT = new THREE.Vector2(0, 0);
if (HOVER && !RM) {
  addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    mouseT.set((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2);
  }, { passive: true });
}

let scrollP = 0, scrollS = 0, seekPinned = null;
function readScroll() {
  if (seekPinned !== null) { scrollP = seekPinned; return; }
  const rect = section.getBoundingClientRect();
  const range = section.offsetHeight - innerHeight;
  scrollP = range > 0 ? Math.min(Math.max(-rect.top / range, 0), 1) : 0;
}
addEventListener('scroll', () => { seekPinned = null; readScroll(); }, { passive: true });

let viewW = 1, viewH = 1;
function placeCamera(p, t) {
  sampleRig(p);
  camera.position.copy(rig.pos);
  let yaw = rig.yaw, pitch = rig.pitch;
  if (!RM) {
    camera.position.x += Math.sin(t * 0.11) * 0.04;
    camera.position.y += Math.sin(t * 0.083 + 1.2) * 0.025;
    yaw   -= mouse.x * P.parallax.yaw;
    pitch -= mouse.y * P.parallax.pitch;
  }
  camera.rotation.set(pitch * DEG, yaw * DEG, 0);
  if (camera.fov !== rig.fov) { camera.fov = rig.fov; camera.updateProjectionMatrix(); }
  camera.setViewOffset(viewW, viewH, rig.sx * viewW, -rig.sy * viewH, viewW, viewH);
  backdrop.position.copy(camera.position);
}

/* ================================================================== RESIZE */
function resize() {
  const w = stage.clientWidth || innerWidth, h = stage.clientHeight || innerHeight, a = w / h;
  viewW = w; viewH = h;
  path = a < 0.95 ? paths.tall : paths.wide;
  camera.aspect = a;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  gradePass.uniforms.uRes.value.set(w, h);
  readScroll();
}
function applyDPR() {
  renderer.setPixelRatio(dpr);
  if (composer.setPixelRatio) composer.setPixelRatio(dpr);
  motes.material.uniforms.uPR.value = dpr;
  resize();
}
addEventListener('resize', resize);
if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
resize();

/* ==================================================================== LOOP */
const clock = new THREE.Clock();
let t = 0, frames = 0, acc = 0;
let inView = true, frozen = false, rafId = 0, ready = false;

function running() { return ready && inView && !document.hidden && !frozen; }
function wake() { if (!rafId && running()) { clock.getDelta(); rafId = requestAnimationFrame(frame); } }

document.addEventListener('visibilitychange', wake);
if ('IntersectionObserver' in window) {
  new IntersectionObserver((entries) => { inView = entries[0].isIntersecting; wake(); }, { threshold: 0 }).observe(section);
}

function frame() {
  rafId = 0;
  if (!running()) return;
  rafId = requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;
  live.uTime.value = t;

  readScroll();
  scrollS += (scrollP - scrollS) * (1 - Math.pow(0.0008, dt));
  mouse.lerp(mouseT, 1 - Math.pow(0.002, dt));
  placeCamera(scrollS, t);

  composer.render();

  acc += dt; frames++;
  if (acc > 0.5) {
    const fps = frames / acc;
    frames = 0; acc = 0;
    if (fps < 42 && dpr > 0.75) { dpr = Math.max(0.75, dpr - 0.25); applyDPR(); }
    else if (fps > 58 && dpr < maxDPR) { dpr = Math.min(maxDPR, dpr + 0.25); applyDPR(); }
  }
}

/* =================================================================== BOOT */
/* a soft environment for the bronze and the stone: the lit room itself,
   captured once from the floor in front of the arch after the shadows are drawn */
function captureEnvironment() {
  const cubeRT = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
  const cubeCam = new THREE.CubeCamera(0.1, 1000, cubeRT);
  cubeCam.position.set(-3, 1.6, 7);
  backdrop.position.copy(cubeCam.position);
  motes.visible = false;
  cubeCam.update(renderer, scene);
  motes.visible = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromCubemap(cubeRT.texture).texture;
  pmrem.dispose();
  cubeRT.dispose();
}

new THREE.ImageLoader().load(VIEW_URL, (img) => {
  viewTex.image = img;
  viewTex.needsUpdate = true;
  readScroll();
  scrollS = scrollP;
  placeCamera(scrollS, 0);
  renderer.shadowMap.needsUpdate = true;
  composer.render();                 // draws the shadow maps
  captureEnvironment();
  composer.render();
  section.classList.add('is-ready');
  ready = true;
  wake();
}, undefined, () => {
  console.warn('loggia.js: the view photograph did not load:', VIEW_URL);
});

/* tuning from the console */
window.__loggia = {
  P, scene, camera, sun, fill, hemi, bloom, gradePass, renderer, composer, mainPass, backdrop, reflector, motes, FRONT,
  freeze: (v = true) => { frozen = v; if (!v) wake(); },
  render: () => composer.render(),
  setDPR: (v) => { dpr = v; applyDPR(); },
  // park the walk at a point, no easing; the next real scroll releases it
  seek: (f) => {
    seekPinned = Math.min(Math.max(f, 0), 1);
    scrollP = scrollS = seekPinned;
    placeCamera(scrollS, t);
    composer.render();
  },
  get progress() { return scrollS; }
};
