/* ============================================================================
   HERMITAGE WORLD — temple hero
   ----------------------------------------------------------------------------
   A Renaissance rotunda: coffered dome with an oculus, a ring of round-headed
   arches between pilasters, warm travertine underfoot laid in concentric
   rings on an eight-fold plan around a central dais. One shaft of daylight.
   Scroll walks you in: the camera dollies forward and down through the beam,
   the floor's slow ripple settles to a breath, and the light widens to bathe
   the whole floor.

   Self-mounting ES module. Expects the markup contract:
     <section class="hero" id="hero">
       <div class="hero__stage">
         <canvas class="hero__gl" id="hero-gl"></canvas>
         <div class="hero__scrim"></div>
         …words and cue, choreographed by hero.js…
       </div>
     </section>
   Everything is generated at runtime: no textures, no models.
   ============================================================================ */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
import { EffectComposer } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/EffectComposer.js/+esm';
import { RenderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/RenderPass.js/+esm';
import { UnrealBloomPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/UnrealBloomPass.js/+esm';
import { ShaderPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/ShaderPass.js/+esm';
import { OutputPass } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/postprocessing/OutputPass.js/+esm';

const canvas  = document.getElementById('hero-gl');
const section = canvas && (canvas.closest('.hero') || document.getElementById('hero'));
if (!canvas || !section) throw new Error('temple.js: #hero-gl inside .hero not found');
const stage   = canvas.parentElement;

const RM     = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE = matchMedia('(max-width: 820px)').matches;
const HOVER  = matchMedia('(hover: hover) and (pointer: fine)').matches;

/* ---------------------------------------------------------------- tuning -- */
const P = {
  room:      { radius: 18, wallH: 6.6, domeH: 7.4, bays: 16, coffers: 28, cofferRows: 5 },
  oculus:    { y: 14.0, r: 1.6 },
  pool:      new THREE.Vector3(3.6, 0, -1.2),      // where the shaft lands at rest
  rings:     { r0: 1.35, r1: 16.5, w: MOBILE ? 0.92 : 0.78, gapR: 0.05,
               arc: MOBILE ? 1.9 : 1.55, gapA: 0.05, h: 2.0, chamfer: 0.05,
               spokeGap: 0.09, markerRing: 11, markerRaise: 0.07 },
  ripple:    { amp: 0.42, ampEnd: 0.12, wave: 1.30, speed: 0.52, decay: 0.038 },
  /* landscape rigs: where you stand at the threshold, and where you end up
     after walking in (low, close, looking gently up at the dome) */
  camera:    { fov: 46, pos: new THREE.Vector3(-0.6, 7.2, 16.2),
               look: new THREE.Vector3(1.2, 2.6, -2.4) },
  entryCam:  { fov: 50, pos: new THREE.Vector3(0.9, 3.4, 9.2),
               look: new THREE.Vector3(0.3, 2.3, -4.0) },
  /* portrait gets its own rigs: closer and steeper so dais + pool both fit */
  cameraTall:{ fov: 56, pos: new THREE.Vector3(2.0, 8.6, 11.6),
               look: new THREE.Vector3(1.8, 1.4, -0.6) },
  entryCamTall:{ fov: 60, pos: new THREE.Vector3(1.2, 3.8, 8.4),
               look: new THREE.Vector3(0.3, 2.8, -4.0) },
  parallax:  { yaw: 2.6, pitch: 2.0 },             // degrees, pointer-driven
  colors:    { light: 0xffdcb0, stone: 0xb9a58a, dais: 0xc4b094, wall: 0xa9977b,
               ground: 0x1f1405 },
  post:      { bloom: 0.30, exposure: 1.0, exposureEnd: 0.96, grain: 0.012 }
};

/* ---------------------------------------------------------------- renderer */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !MOBILE, powerPreference: 'high-performance' });
const maxDPR = Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2);
let dpr = maxDPR;
renderer.setPixelRatio(dpr);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = P.post.exposure;

const scene  = new THREE.Scene();
scene.fog    = new THREE.FogExp2(0x2a2018, 0.0105);

const camera = new THREE.PerspectiveCamera(P.camera.fov, 1, 0.1, 140);
camera.position.copy(P.camera.pos);

/* =============================================================== SHADER LIB */
const NOISE = /* glsl */`
float hash31(vec3 p){
  p = fract(p * 0.3183099 + vec3(0.1, 0.7, 0.4));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
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

/* the ripple, injected into both the lit pass and the shadow-depth pass */
const RIPPLE_DECL = /* glsl */`
uniform float uTime, uAmp, uWave, uSpeed, uDecay;
attribute vec3 aLocal;
attribute vec2 aMeta;      // x = ring radius, y = per-block random
varying vec3  vLocal;
varying float vRand;
varying vec3  vWPos;
`;
const RIPPLE_BODY = /* glsl */`
  vLocal = aLocal;
  vRand  = aMeta.y;
  float r   = aMeta.x;
  float env = exp(-r * uDecay);
  float ph  = r * uWave - uTime * uSpeed;
  float h   = sin(ph) * uAmp;
  h += sin(ph * 0.43 + 1.7) * uAmp * 0.34;
  h += sin(r * 0.21 - uTime * 0.11) * uAmp * 0.22;
  transformed.y += h * env + (aMeta.y - 0.5) * 0.02;
  vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

/* classical order, carved procedurally: a recess depth field in world space.
   'dome' = coffers on a spheroid, 'wall' = round-headed arch alcoves with an
   archivolt, between the pilasters. The normal is tilted by the gradient of
   this field so the real light does the modelling.                        */
const R  = P.room.radius, WH = P.room.wallH, DH = P.room.domeH;
const DECO = /* glsl */`
const float PI2 = 6.28318530718;
float rimStep(float e, float rim, float w){ return smoothstep(rim, rim + w, e); }

float domeDepth(vec3 wp){
  vec3 n = vec3(wp.x / ${R.toFixed(2)}, (wp.y - ${WH.toFixed(2)}) / ${DH.toFixed(2)}, wp.z / ${R.toFixed(2)});
  float el = asin(clamp(n.y / max(length(n), 1e-4), 0.0, 1.0));
  float az = atan(n.z, n.x);
  float cu = az / PI2 * ${P.room.coffers.toFixed(1)};
  float cv = (el - 0.05) / 1.26 * ${P.room.cofferRows.toFixed(1)};
  if (cv < 0.0 || cv >= ${P.room.cofferRows.toFixed(1)}) return 0.0;
  vec2 f = fract(vec2(cu, cv));
  float e = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
  return 0.42 * rimStep(e, 0.10, 0.05) + 0.22 * rimStep(e, 0.22, 0.05);
}
float wallDepth(vec3 wp){
  float az = atan(wp.z, wp.x);
  float bayW = PI2 * ${R.toFixed(2)} / ${P.room.bays.toFixed(1)};
  float u = (fract(az / PI2 * ${P.room.bays.toFixed(1)} + 0.5) - 0.5) * bayW;
  float y = wp.y;
  float hw = 2.05, spring = 3.05;
  float d = (y < spring) ? (hw - abs(u)) : (hw - length(vec2(u, y - spring)));
  float alcove = smoothstep(0.0, 0.10, d);
  float archivolt = smoothstep(0.0, 0.08, -d) * smoothstep(0.34, 0.26, -d);   // proud band around
  float base = smoothstep(0.55, 0.45, y);                                     // dado under the alcove
  return 0.36 * alcove * (1.0 - base) - 0.05 * archivolt;
}
`;

/* --------------------------------------------------- procedural stone shell */
const stoneUniforms = {
  uTime:  { value: 0 },
  uAmp:   { value: RM ? 0.05 : P.ripple.amp },
  uWave:  { value: P.ripple.wave },
  uSpeed: { value: RM ? 0 : P.ripple.speed },
  uDecay: { value: P.ripple.decay }
};

function stoneMaterial({ displaced = false, color = P.colors.stone, rough = 0.82, bump = 0.22, grit = 0.5, deco = null } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.0, dithering: true });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, stoneUniforms);
    sh.uniforms.uBump = { value: bump };
    sh.uniforms.uGrit = { value: grit };

    if (displaced) {
      sh.vertexShader = RIPPLE_DECL + sh.vertexShader;
      sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + RIPPLE_BODY);
    } else {
      sh.vertexShader = 'varying vec3 vWPos;\nvarying vec3 vLocal;\nvarying float vRand;\n' + sh.vertexShader;
      sh.vertexShader = sh.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vWPos = (modelMatrix * vec4(transformed,1.0)).xyz;\n  vLocal = vec3(0.5, 0.5, 1.0);\n  vRand = 0.5;'
      );
    }

    sh.fragmentShader =
      'uniform float uBump; uniform float uGrit;\nvarying vec3 vWPos;\nvarying vec3 vLocal;\nvarying float vRand;\n'
      + NOISE + DECO + sh.fragmentShader;

    // albedo: fine travertine, gentle mottling, faint veining, per-block tint
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', /* glsl */`
      float nA = fbm(vWPos * 0.6);
      float nB = fbm(vWPos * 4.0);
      float vein = smoothstep(0.45, 0.49, abs(fbm(vWPos * 0.34) * 2.0 - 1.0));
      vec3 tint = mix(vec3(0.96,0.94,0.91), vec3(1.04,1.01,0.96), vRand);
      diffuseColor.rgb *= tint;
      diffuseColor.rgb *= (0.90 + 0.20 * nA);
      diffuseColor.rgb *= (0.96 + 0.08 * nB * uGrit);
      diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.08, vein * 0.5);

      // contact occlusion in the joints, a whisper of wear on the lip
      float eu = min(vLocal.x, 1.0 - vLocal.x);
      float ev = min(vLocal.y, 1.0 - vLocal.y);
      float edge = min(eu, ev);
      float ao = mix(0.16, 1.0, smoothstep(0.26, 1.0, vLocal.z));
      float up = clamp(vNormal.y, 0.0, 1.0);
      ao *= mix(1.0, mix(0.62, 1.0, smoothstep(0.0, 0.07, edge)), up);
      diffuseColor.rgb *= ao;
      ${deco === 'dome' ? 'diffuseColor.rgb *= 1.0 - 0.28 * clamp(domeDepth(vWPos) / 0.64, 0.0, 1.0);' : ''}
      ${deco === 'wall' ? 'diffuseColor.rgb *= 1.0 - 0.30 * clamp(wallDepth(vWPos) / 0.36, 0.0, 1.0);' : ''}
    `);

    sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', /* glsl */`
      float roughnessFactor = roughness;
      roughnessFactor = clamp(roughnessFactor + (fbm(vWPos * 2.1) - 0.5) * 0.22, 0.35, 1.0);
    `);

    // fine derivative bump, plus the carved order's edges for the dome and wall
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', /* glsl */`
      #include <normal_fragment_begin>
      {
        float sc = 3.1, e = 0.055;
        float n0 = fbm(vWPos * sc);
        vec3  g  = vec3(
          fbm((vWPos + vec3(e,0.0,0.0)) * sc) - n0,
          fbm((vWPos + vec3(0.0,e,0.0)) * sc) - n0,
          fbm((vWPos + vec3(0.0,0.0,e)) * sc) - n0);
        vec3 gt = g - dot(g, normal) * normal;
        normal = normalize(normal - gt * uBump * 6.0);
      }
      ${deco ? /* glsl */`
      {
        vec3 Tu = normalize(vec3(-vWPos.z, 0.0, vWPos.x));
        ${deco === 'dome'
          ? `vec3 Nw = normalize(vec3(vWPos.x / ${(R*R).toFixed(1)}, (vWPos.y - ${WH.toFixed(2)}) / ${(DH*DH).toFixed(1)}, vWPos.z / ${(R*R).toFixed(1)}));
             vec3 Tv = normalize(cross(Tu, Nw));
             float e2 = 0.06;
             float d0 = domeDepth(vWPos);
             float du = domeDepth(vWPos + Tu * e2) - d0;
             float dv = domeDepth(vWPos + Tv * e2) - d0;`
          : `vec3 Tv = vec3(0.0, 1.0, 0.0);
             float e2 = 0.06;
             float d0 = wallDepth(vWPos);
             float du = wallDepth(vWPos + Tu * e2) - d0;
             float dv = wallDepth(vWPos + Tv * e2) - d0;`}
        vec3 tiltW = (Tu * du + Tv * dv) / e2;
        vec3 tiltV = mat3(viewMatrix) * tiltW;
        normal = normalize(normal + tiltV * 0.9);
      }` : ''}
    `);
  };
  mat.customProgramCacheKey = () => 'stone' + (displaced ? 'D' : 'S') + bump + grit + (deco || '');
  return mat;
}

function displacedDepthMaterial() {
  const d = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  d.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, stoneUniforms);
    sh.vertexShader = RIPPLE_DECL + sh.vertexShader;
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + RIPPLE_BODY);
  };
  d.customProgramCacheKey = () => 'depthRipple';
  return d;
}

/* ================================================== CONCENTRIC MASONRY FLOOR */
/*
   Rings of chamfered voussoirs on an eight-fold plan: every ring is divided
   into eight sectors by a slightly wider radial joint, so the spokes read as
   eight lines from the dais to the wall. Within a sector the joints stagger
   ring to ring. One ring carries eight marker stones, one per sector, raised a
   touch and cut paler: "eight around one", read from above.
*/
function buildRings() {
  const pos = [], nor = [], idx = [], loc = [], met = [];
  const { r0, r1, w, gapR, arc, gapA, h, chamfer, spokeGap, markerRing, markerRaise } = P.rings;
  const SEG = 3;
  let vBase = 0;

  const pushBlock = (rIn, rOut, a0, a1, rMid, rnd, raise) => {
    const yTop = raise, yBot = -h;
    const loop = (inset) => {
      const pts = [];
      const ri = rIn + inset, ro = rOut - inset;
      const da = inset / Math.max(rMid, 0.001);
      const A0 = a0 + da, A1 = a1 - da;
      for (let k = 0; k <= SEG; k++) { const t = k / SEG, a = A0 + (A1 - A0) * t; pts.push([Math.cos(a) * ro, Math.sin(a) * ro, t, 1]); }
      for (let k = 0; k <= SEG; k++) { const t = 1 - k / SEG, a = A0 + (A1 - A0) * t; pts.push([Math.cos(a) * ri, Math.sin(a) * ri, t, 0]); }
      return pts;
    };
    const A = loop(0), B = loop(0), C = loop(chamfer);
    const N = A.length;
    const put = (p, y, z, shrink) => {
      pos.push(p[0], y, p[1]); nor.push(0, 1, 0);
      const u = shrink ? 0.5 + (p[2] - 0.5) * 0.86 : p[2];
      const v = shrink ? 0.5 + (p[3] - 0.5) * 0.86 : p[3];
      loc.push(u, v, z); met.push(rMid, rnd);
    };
    for (const p of A) put(p, yBot, 0.0, false);
    for (const p of B) put(p, yTop - chamfer, 0.93, false);
    for (const p of C) put(p, yTop, 1.0, true);
    let cx = 0, cz = 0;
    for (const p of C) { cx += p[0]; cz += p[1]; }
    pos.push(cx / N, yTop, cz / N); nor.push(0, 1, 0);
    loc.push(0.5, 0.5, 1.0); met.push(rMid, rnd);
    const CEN = vBase + 3 * N;
    for (let k = 0; k < N; k++) {
      const k2 = (k + 1) % N;
      const a = vBase + k, a2 = vBase + k2;
      const b = vBase + N + k, b2 = vBase + N + k2;
      const c = vBase + 2*N + k, c2 = vBase + 2*N + k2;
      idx.push(a, b2, a2, a, b, b2);
      idx.push(b, c, c2, b, c2, b2);
      idx.push(CEN, c2, c);
    }
    vBase += 3 * N + 1;
  };

  // spokes sit at 22.5 + k*45 degrees so none runs down the camera axis
  const SECT = 8, sectA = (2 * Math.PI) / SECT, sect0 = sectA * 0.5;
  let ring = 0;
  for (let r = r0; r < r1; r += w, ring++) {
    const rIn = r + gapR * 0.5, rOut = Math.min(r + w, r1) - gapR * 0.5;
    const rMid = (rIn + rOut) * 0.5;
    // blocks per sector alternate odd/even ring to ring so interior joints stagger
    let n = Math.max(1, Math.round((sectA * rMid) / arc));
    if (ring > 0 && (n % 2) === (ring % 2)) n += 1;
    const dA = sectA / n;
    const ga = (gapA * 0.5) / rMid, gs = (spokeGap * 0.5) / rMid;
    for (let s = 0; s < SECT; s++) {
      for (let i = 0; i < n; i++) {
        const a0 = sect0 + s * sectA + i * dA + (i === 0 ? gs : ga);
        const a1 = sect0 + s * sectA + (i + 1) * dA - (i === n - 1 ? gs : ga);
        const marker = ring === markerRing && i === (n >> 1);
        pushBlock(rIn, rOut, a0, a1, rMid, marker ? 1.0 : Math.random(), marker ? markerRaise : 0);
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aLocal',   new THREE.Float32BufferAttribute(loc, 3));
  g.setAttribute('aMeta',    new THREE.Float32BufferAttribute(met, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  g.boundingSphere.radius += 3;
  return g;
}

const floorGeo = buildRings();
const floorMat = stoneMaterial({ displaced: true, rough: 0.80, bump: 0.20 });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.castShadow = floor.receiveShadow = true;
floor.customDepthMaterial = displacedDepthMaterial();
floor.frustumCulled = false;
scene.add(floor);

/* central dais: a turned stone, the one thing in the room that never moves */
{
  const r = P.rings.r0 - 0.10;
  const profile = [
    new THREE.Vector2(r,        -2.00),
    new THREE.Vector2(r,        -0.08),
    new THREE.Vector2(r * 0.93,  0.05),
    new THREE.Vector2(r * 0.80,  0.11),
    new THREE.Vector2(0.0,       0.11)
  ];
  const m = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), stoneMaterial({ rough: 0.72, bump: 0.16, color: P.colors.dais }));
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
}

/* outer plinth: static stone from the last ring to the wall */
{
  const g = new THREE.RingGeometry(P.rings.r1 - 0.4, P.room.radius + 0.6, 128, 1);
  g.rotateX(-Math.PI / 2);
  g.translate(0, -0.16, 0);
  const m = new THREE.Mesh(g, stoneMaterial({ rough: 0.86, bump: 0.18, color: 0xa08d72 }));
  m.receiveShadow = true;
  scene.add(m);
}

/* ============================================================== THE CHAMBER */
const wallMat  = stoneMaterial({ rough: 0.88, bump: 0.22, color: P.colors.wall, grit: 0.6, deco: 'wall' });
wallMat.side = THREE.BackSide;
const domeMat  = stoneMaterial({ rough: 0.88, bump: 0.16, color: P.colors.wall, grit: 0.5, deco: 'dome' });
domeMat.side = THREE.BackSide;
const trimMat  = stoneMaterial({ rough: 0.80, bump: 0.14, color: 0xb8a686, grit: 0.4 });
const pilMat   = stoneMaterial({ rough: 0.82, bump: 0.16, color: 0xb5a385, grit: 0.4 });

/* drum wall with arch alcoves carved in the shader */
{
  const H = P.room.wallH + 3;
  const g = new THREE.CylinderGeometry(P.room.radius, P.room.radius, H, 160, 1, true);
  g.translate(0, P.room.wallH - H / 2, 0);
  const m = new THREE.Mesh(g, wallMat);
  m.receiveShadow = true;
  scene.add(m);
}

/* coffered dome, open at the crown */
{
  const holeAngle = Math.asin(P.oculus.r / P.room.radius) * 1.25;
  const g = new THREE.SphereGeometry(P.room.radius, 128, 48, 0, Math.PI * 2, holeAngle, Math.PI / 2 - holeAngle);
  g.scale(1, P.room.domeH / P.room.radius, 1);
  g.translate(0, P.room.wallH, 0);
  const m = new THREE.Mesh(g, domeMat);
  m.receiveShadow = true;
  scene.add(m);
}

/* entablature and string course: two ledges that give the wall its order */
{
  const mk = (y, out, hgt) => {
    const g = new THREE.CylinderGeometry(P.room.radius - out, P.room.radius - out, hgt, 160, 1, true);
    g.translate(0, y, 0);
    const m = new THREE.Mesh(g, trimMat); m.material = trimMat.clone(); m.material.side = THREE.BackSide;
    m.receiveShadow = true; scene.add(m);
    // top face so the ledge has thickness against the light from above
    const ring2 = new THREE.RingGeometry(P.room.radius - out, P.room.radius + 0.02, 160, 1);
    ring2.rotateX(-Math.PI / 2); ring2.translate(0, y + hgt / 2, 0);
    const rm2 = new THREE.Mesh(ring2, trimMat); rm2.receiveShadow = true; scene.add(rm2);
  };
  mk(P.room.wallH - 0.32, 0.55, 0.64);   // entablature under the dome
  mk(3.05 + 2.05 + 0.55, 0.16, 0.14);    // string course above the archivolts
}

/* pilasters: one between every pair of arches, base + shaft + capital */
{
  const grp = new THREE.Group();
  const COLS = P.room.bays, cr = P.room.radius - 0.28;
  const shaft = new THREE.BoxGeometry(1.0, P.room.wallH - 1.4, 0.80);
  const base  = new THREE.BoxGeometry(1.24, 0.46, 0.96);
  const cap   = new THREE.BoxGeometry(1.30, 0.40, 0.98);
  for (let i = 0; i < COLS; i++) {
    const a = ((i + 0.5) / COLS) * Math.PI * 2;
    const x = Math.cos(a) * cr, z = Math.sin(a) * cr;
    const c = new THREE.Group();
    const s = new THREE.Mesh(shaft, pilMat); s.position.y = 0.46 + (P.room.wallH - 1.4) / 2; c.add(s);
    const b = new THREE.Mesh(base,  pilMat); b.position.y = 0.23; c.add(b);
    const k = new THREE.Mesh(cap,   pilMat); k.position.y = P.room.wallH - 0.84; c.add(k);
    c.position.set(x, 0, z);
    c.rotation.y = -a + Math.PI / 2;
    c.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });
    grp.add(c);
  }
  scene.add(grp);
}

/* =================================================================== LIGHT */
const OC = new THREE.Vector3(0, P.oculus.y, 0);

const KEY_I = 2600, KEY_ANGLE = 0.215, KEY_ANGLE_END = 0.36;
const key = new THREE.SpotLight(P.colors.light, 1, 0, KEY_ANGLE, 0.92, 1.7);
key.intensity = KEY_I;
key.position.copy(OC);
key.target.position.copy(P.pool);
key.castShadow = true;
key.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
key.shadow.camera.near = 1.5;
key.shadow.camera.far  = 36;
key.shadow.bias        = -0.0012;
key.shadow.normalBias  = 0.035;
key.shadow.radius      = 3.5;
scene.add(key, key.target);

/* Renaissance light: the room is legible, shadows are warm, nothing goes to
   black. Sky through the aperture + warm bounce off the lit floor. */
const hemi = new THREE.HemisphereLight(0xc9b08c, 0x4a5262, 0.36);
scene.add(hemi);

/* daylight spilling through the aperture: wide, warm, unshadowed */
const SPILL_I = 85;
const spill = new THREE.SpotLight(0xd6dbe6, SPILL_I, 0, 1.25, 1.0, 1.4);
spill.position.copy(OC);
spill.target.position.set(0, 0, 0);
scene.add(spill, spill.target);

/* warm bounce coming back off the lit stone */
// kept weak and high: a point light this close to the dais blows the center out
const bounce = new THREE.PointLight(0xf2be5a, 7, 24, 1.6);
bounce.position.copy(P.pool).setY(1.6);
scene.add(bounce);

/* glowing aperture + halo */
{
  const g = new THREE.CircleGeometry(P.oculus.r, 64);
  g.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xfff1d8, toneMapped: false }));
  m.position.copy(OC).setY(OC.y + 0.02);
  scene.add(m);
  const h = new THREE.Mesh(
    new THREE.CircleGeometry(P.oculus.r * 2.6, 64).rotateX(Math.PI / 2),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uR: { value: P.oculus.r * 2.6 } },
      vertexShader: `varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec2 vP; uniform float uR;
        void main(){ float d = length(vP)/uR; float a = pow(1.0-clamp(d,0.0,1.0), 2.4);
        gl_FragColor = vec4(vec3(1.0,0.86,0.62) * a * 1.3, a); }`
    })
  );
  h.position.copy(OC).setY(OC.y - 0.05);
  h.renderOrder = 2;
  scene.add(h);
}

/* ======================================================= VOLUMETRIC SHAFT */
const shaft = (() => {
  const from = OC.clone(), to = P.pool.clone().setY(-0.2);
  const len = from.distanceTo(to);
  const g = new THREE.CylinderGeometry(P.oculus.r * 1.0, P.oculus.r * 2.3, len, 64, 24, true);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.BackSide, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uLen: { value: len }, uColor: { value: new THREE.Color(0xf6cf94) }, uInt: { value: 0.5 } },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vV; varying float vY; varying vec3 vW;
      uniform float uLen;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vV = normalize(cameraPosition - w.xyz);
        vY = position.y / uLen + 0.5;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: NOISE + /* glsl */`
      varying vec3 vN; varying vec3 vV; varying float vY; varying vec3 vW;
      uniform float uTime; uniform vec3 uColor; uniform float uInt;
      void main(){
        float core = pow(abs(dot(normalize(vN), normalize(vV))), 3.4);
        float top  = smoothstep(1.03, 0.80, vY);
        float bot  = smoothstep(-0.06, 0.20, vY);
        float dens = 0.60 + 0.40 * fbm(vW * 0.50 + vec3(0.0, -uTime * 0.08, 0.0));
        float a = core * top * bot * dens * uInt;
        a *= 1.0 - 0.25 * smoothstep(0.55, 1.0, vY);
        gl_FragColor = vec4(uColor * a * 1.25, a);
      }`
  });
  const m = new THREE.Mesh(g, mat);
  m.position.copy(from).lerp(to, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize());
  m.renderOrder = 3;
  m.frustumCulled = false;
  scene.add(m);
  return m;
})();

/* ==================================================== MOTES AND THEIR LINKS */
const MOTE_GLSL = /* glsl */`
vec3 moteAt(vec3 base, vec2 sd, float t){
  vec3 p = base;
  float s = sd.x * 6.2831;
  p.y = mod(p.y + t * (0.06 + sd.x * 0.09), 12.0);
  p.x += sin(t * 0.22 + s) * 0.55;
  p.z += cos(t * 0.18 + s * 1.7) * 0.55;
  return p;
}
float beamLit(vec3 p, vec3 a, vec3 b, float near, float far){
  vec3 ab = b - a, ap = p - a;
  float t = clamp(dot(ap, ab) / dot(ab, ab), 0.0, 1.0);
  return smoothstep(far, near, length(ap - ab * t));
}
`;

const linkU = {
  uLinkR: { value: 0.90 },   // connection radius
  uLinkA: { value: 0.05 }    // opacity: very faint throughout, never a network
};

let motes, links, linkCount;
{
  const N = MOBILE ? 1000 : 2600;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N * 2);
  for (let i = 0; i < N; i++) {
    const inShaft = Math.random() < 0.30;
    let x, z, y;
    if (inShaft) {
      const t = Math.random(), a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * (P.oculus.r * 1.3 + t * 3.0);
      const c = OC.clone().lerp(P.pool.clone().setY(0), t);
      x = c.x + Math.cos(a) * r; z = c.z + Math.sin(a) * r; y = c.y;
    } else {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 16;
      x = Math.cos(a) * r; z = Math.sin(a) * r; y = Math.random() * 12;
    }
    pos[i*3] = x; pos[i*3+1] = y; pos[i*3+2] = z;
    seed[i*2] = Math.random(); seed[i*2+1] = 0.18 + Math.pow(Math.random(), 2.2) * 0.9;
  }
  const beam = { uA: { value: OC }, uB: { value: P.pool.clone().setY(0) } };

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed',    new THREE.BufferAttribute(seed, 2));
  motes = new THREE.Points(g, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: Object.assign({ uTime: { value: 0 }, uPR: { value: renderer.getPixelRatio() } }, beam),
    vertexShader: /* glsl */`
      attribute vec2 aSeed; uniform float uTime, uPR; uniform vec3 uA, uB;
      varying float vI;
      ${MOTE_GLSL}
      void main(){
        vec3 p = moteAt(position, aSeed, uTime);
        vI = (0.016 + beamLit(p, uA, uB, 0.5, 4.2) * 0.46) * aSeed.y;
        vec4 mv = viewMatrix * modelMatrix * vec4(p, 1.0);
        gl_PointSize = min((aSeed.y * 1.15 + 0.30) * uPR * (46.0 / max(-mv.z, 0.001)), 9.0 * uPR);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      varying float vI;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vI;
        gl_FragColor = vec4(vec3(1.0, 0.88, 0.68) * a, a);
      }`
  }));
  motes.renderOrder = 4;
  motes.frustumCulled = false;
  scene.add(motes);

  // candidate link graph, built once on rest positions via a spatial hash
  const R_MAX = 1.9, K = MOBILE ? 2 : 3;
  const cell = R_MAX, buckets = new Map();
  const ckey = (a, b, c) => a + ':' + b + ':' + c;
  for (let i = 0; i < N; i++) {
    const k = ckey(Math.floor(pos[i*3] / cell), Math.floor(pos[i*3+1] / cell), Math.floor(pos[i*3+2] / cell));
    let b = buckets.get(k); if (!b) buckets.set(k, b = []);
    b.push(i);
  }
  const pairs = [], seen = new Set(), cand = [];
  for (let i = 0; i < N; i++) {
    const x = pos[i*3], y = pos[i*3+1], z = pos[i*3+2];
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell);
    cand.length = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const b = buckets.get(ckey(cx + dx, cy + dy, cz + dz));
      if (!b) continue;
      for (let n = 0; n < b.length; n++) {
        const j = b[n]; if (j === i) continue;
        const ax = pos[j*3] - x, ay = pos[j*3+1] - y, az = pos[j*3+2] - z;
        const d2 = ax*ax + ay*ay + az*az;
        if (d2 <= R_MAX * R_MAX) cand.push(d2, j);
      }
    }
    const take = Math.min(K, cand.length >> 1);
    for (let s = 0; s < take; s++) {
      let best = s;
      for (let q = s + 1; q < cand.length >> 1; q++) if (cand[q*2] < cand[best*2]) best = q;
      if (best !== s) {
        const d0 = cand[s*2], i0 = cand[s*2+1];
        cand[s*2] = cand[best*2]; cand[s*2+1] = cand[best*2+1];
        cand[best*2] = d0; cand[best*2+1] = i0;
      }
      const j = cand[s*2+1], a = Math.min(i, j), b = Math.max(i, j), kk = a * N + b;
      if (seen.has(kk)) continue;
      seen.add(kk);
      pairs.push(a, b);
    }
  }
  const L = pairs.length / 2;
  const lp = new Float32Array(L * 6), lo = new Float32Array(L * 6);
  const ls = new Float32Array(L * 4), lt = new Float32Array(L * 4);
  for (let e = 0; e < L; e++) {
    const i = pairs[e*2], j = pairs[e*2+1];
    for (let side = 0; side < 2; side++) {
      const self = side ? j : i, other = side ? i : j, v = e * 2 + side;
      lp[v*3] = pos[self*3];  lp[v*3+1] = pos[self*3+1];  lp[v*3+2] = pos[self*3+2];
      lo[v*3] = pos[other*3]; lo[v*3+1] = pos[other*3+1]; lo[v*3+2] = pos[other*3+2];
      ls[v*2] = seed[self*2];  ls[v*2+1] = seed[self*2+1];
      lt[v*2] = seed[other*2]; lt[v*2+1] = seed[other*2+1];
    }
  }
  const lg = new THREE.BufferGeometry();
  lg.setAttribute('position',   new THREE.BufferAttribute(lp, 3));
  lg.setAttribute('aOther',     new THREE.BufferAttribute(lo, 3));
  lg.setAttribute('aSeedSelf',  new THREE.BufferAttribute(ls, 2));
  lg.setAttribute('aSeedOther', new THREE.BufferAttribute(lt, 2));
  links = new THREE.LineSegments(lg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: Object.assign({ uTime: { value: 0 } }, beam, linkU),
    vertexShader: /* glsl */`
      attribute vec3 aOther; attribute vec2 aSeedSelf; attribute vec2 aSeedOther;
      uniform float uTime, uLinkR, uLinkA; uniform vec3 uA, uB;
      varying float vI;
      ${MOTE_GLSL}
      void main(){
        vec3 p0 = moteAt(position, aSeedSelf,  uTime);
        vec3 p1 = moteAt(aOther,   aSeedOther, uTime);
        float d   = distance(p0, p1);
        float vis = 1.0 - smoothstep(uLinkR * 0.5, uLinkR, d);
        float lit = max(beamLit(p0, uA, uB, 0.6, 4.4), beamLit(p1, uA, uB, 0.6, 4.4));
        vI = vis * uLinkA * (0.02 + lit * lit * 0.98);
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p0, 1.0);
      }`,
    fragmentShader: /* glsl */`
      varying float vI;
      void main(){ gl_FragColor = vec4(vec3(1.0, 0.87, 0.66) * vI, vI); }`
  }));
  links.renderOrder = 3;
  links.frustumCulled = false;
  scene.add(links);
  linkCount = L;
}

/* ============================================================ POST PROCESS */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), P.post.bloom, 0.5, 0.62);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* final grade: warm split tone, a soft vignette that settles toward the page
   ground color, and a whisper of grain. No chromatic aberration. */
// the grade runs after OutputPass, in sRGB: pass raw sRGB values, not THREE.Color
// (which color management would convert to linear)
const GROUND = new THREE.Vector3(0x1f / 255, 0x14 / 255, 0x05 / 255);
const CREAM  = new THREE.Vector3(0.99, 0.91, 0.77);   // asymptote lands near #f0dcb8
const gradePass = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) },
    uGround: { value: GROUND }, uSettle: { value: 0 }, uGrain: { value: P.post.grain },
    uCream: { value: CREAM }
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime, uSettle, uGrain; uniform vec2 uRes; uniform vec3 uGround, uCream;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      // warm shadows, gold highlights
      col = mix(col * vec3(0.90, 0.95, 1.12), col * vec3(1.02, 1.00, 0.95), smoothstep(0.04, 0.55, l));
      col = (col - 0.5) * 1.03 + 0.5;
      col = max(col, 0.0);
      // soft highlight knee: everything above the knee rolls off toward a warm
      // cream ceiling, so the lit stone never reaches pure white
      {
        vec3 knee = vec3(0.70);
        vec3 room = uCream - knee;
        vec3 over = max(col - knee, 0.0);
        col = min(col, knee) + room * (1.0 - exp(-over / room));
      }
      // vignette pulls toward the page ground, not black; deeper as you enter
      float v = smoothstep(0.10, 0.80, r2) * mix(0.62, 0.74, uSettle);
      col = mix(col, uGround, v);
      // nothing darker than the page ground
      col = max(col, uGround * mix(0.35, 1.0, uSettle));
      float g = hash(vUv * uRes + fract(uTime) * 137.0) - 0.5;
      col += g * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`
});
gradePass.renderToScreen = true;
composer.addPass(gradePass);

/* ============================================================ CAMERA MOTION */
const look = P.camera.look.clone();
const basePos = P.camera.pos.clone();
const mouse = new THREE.Vector2(0, 0), mouseT = new THREE.Vector2(0, 0);
let rigA = P.camera, rigB = P.entryCam;
let fovScale = 1;

if (HOVER && !RM) {
  addEventListener('pointermove', (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    mouseT.set((e.clientX / innerWidth - 0.5) * 2, (e.clientY / innerHeight - 0.5) * 2);
  }, { passive: true });
}

/* ================================================================== SCROLL */
/*
   Progress comes from the section, not the document: 0 at the top of the
   hero, 1 when the sticky stage is about to release. Everything in the entry
   is a window on it.
*/
let scrollP = 0, scrollS = 0, seekPinned = null;
const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

function readScroll() {
  if (seekPinned !== null) { scrollP = seekPinned; return; }
  const rect = section.getBoundingClientRect();
  const range = section.offsetHeight - innerHeight;
  scrollP = range > 0 ? Math.min(Math.max(-rect.top / range, 0), 1) : 0;
}
addEventListener('scroll', () => { seekPinned = null; readScroll(); }, { passive: true });

const _up = new THREE.Vector3(0, 1, 0), _dir = new THREE.Vector3(), _mid = new THREE.Vector3();
const shaftLen = OC.distanceTo(P.pool.clone().setY(-0.2));
const poolNow = P.pool.clone();
let keyScale = 1;

function applyScroll(p) {
  /* --- calm arrives as you enter: the ripple eases to a slow breath --- */
  const e = ss(0.0, 1.0, p);
  if (!RM) {
    stoneUniforms.uAmp.value   = P.ripple.amp + (P.ripple.ampEnd - P.ripple.amp) * e;
    stoneUniforms.uSpeed.value = P.ripple.speed * (1 - 0.45 * e);
  }

  /* --- dawn: the oculus light widens and brightens, the pool drifts toward the dais --- */
  key.angle = KEY_ANGLE + (KEY_ANGLE_END - KEY_ANGLE) * e;
  keyScale  = 1 - 0.55 * e;   // the cone widens; three.js spots do not conserve flux, and the pool must stay cream
  spill.intensity = SPILL_I * (1 + 0.8 * e);
  hemi.intensity  = 0.36 + 0.22 * e;
  poolNow.copy(P.pool).lerp(new THREE.Vector3(1.6, 0, -0.8), e * 0.7);
  key.target.position.copy(poolNow); key.target.updateMatrixWorld();
  bounce.position.set(poolNow.x, 1.6, poolNow.z);
  bounce.intensity = 7 * (1 + 0.3 * e);
  motes.material.uniforms.uB.value.copy(poolNow).setY(0);
  _dir.copy(poolNow).setY(-0.2).sub(OC);
  const dLen = _dir.length();
  _mid.copy(OC).addScaledVector(_dir, 0.5);
  shaft.position.copy(_mid);
  shaft.quaternion.setFromUnitVectors(_up, _dir.normalize());
  shaft.scale.set(1 + 0.5 * e, dLen / shaftLen, 1 + 0.5 * e);

  /* --- exposure settles so the dark edges meet the page ground --- */
  renderer.toneMappingExposure = P.post.exposure + (P.post.exposureEnd - P.post.exposure) * e;
  gradePass.uniforms.uSettle.value = ss(0.5, 1.0, p);

  /* the words over the scene are choreographed by assets/js/hero.js */
}

/* ================================================================== RESIZE */
function resize() {
  const w = stage.clientWidth || innerWidth, h = stage.clientHeight || innerHeight, a = w / h;
  camera.aspect = a;
  const tall = a < 0.95;
  rigA = tall ? P.cameraTall : P.camera;
  rigB = tall ? P.entryCamTall : P.entryCam;
  fovScale = tall ? 1 / Math.pow(Math.min(a, 0.95), 0.22) : 1;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  bloom.setSize(w, h);
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
let inView = true, frozen = false, rafId = 0;

function running() { return inView && !document.hidden && !frozen; }
function wake() { if (!rafId && running()) { clock.getDelta(); rafId = requestAnimationFrame(frame); } }

document.addEventListener('visibilitychange', wake);
if ('IntersectionObserver' in window) {
  new IntersectionObserver((entries) => {
    inView = entries[0].isIntersecting;
    wake();
  }, { threshold: 0 }).observe(section);
}

const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const DEG = Math.PI / 180;

function frame() {
  rafId = 0;
  if (!running()) return;
  rafId = requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  t += dt;

  stoneUniforms.uTime.value = t;
  shaft.material.uniforms.uTime.value = t;
  motes.material.uniforms.uTime.value = t;
  links.material.uniforms.uTime.value = t;
  gradePass.uniforms.uTime.value = t;

  // living light: a slow breath, as if a cloud passes the sun
  const flick = 1 + Math.sin(t * 0.31) * 0.04 + Math.sin(t * 1.13) * 0.012;
  key.intensity = KEY_I * flick * keyScale;
  shaft.material.uniforms.uInt.value = 0.5 * flick;

  readScroll();
  scrollS += (scrollP - scrollS) * (1 - Math.pow(0.0008, dt));
  applyScroll(scrollS);

  // walk in: hero rig eases into the entry rig across the scroll
  const cb = ss(0.04, 0.96, scrollS);
  basePos.copy(rigA.pos).lerp(rigB.pos, cb);
  look.copy(rigA.look).lerp(rigB.look, cb);
  const fov = (rigA.fov + (rigB.fov - rigA.fov) * cb) * fovScale;
  if (Math.abs(fov - camera.fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }

  if (!RM) {
    const sway = 1 - cb * 0.5;
    camera.position.copy(basePos).add(new THREE.Vector3(
      Math.sin(t * 0.11) * 0.30 * sway,
      Math.sin(t * 0.083 + 1.2) * 0.14 * sway,
      Math.cos(t * 0.07) * 0.22 * sway
    ));
    camera.lookAt(look);
    // pointer parallax: a couple of degrees of yaw and pitch, eased
    mouse.lerp(mouseT, 1 - Math.pow(0.002, dt));
    _euler.setFromQuaternion(camera.quaternion);
    _euler.y -= mouse.x * P.parallax.yaw * DEG;
    _euler.x -= mouse.y * P.parallax.pitch * DEG;
    camera.quaternion.setFromEuler(_euler);
  } else {
    camera.position.copy(basePos);
    camera.lookAt(look);
  }

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
renderer.compile(scene, camera);
Promise.all([
  document.fonts ? document.fonts.ready : Promise.resolve(),
  new Promise(r => setTimeout(r, 200))
]).then(() => {
  readScroll();
  scrollS = scrollP;
  applyScroll(scrollS);
  camera.position.copy(rigA.pos); camera.lookAt(rigA.look);
  composer.render();
  section.classList.add('is-ready');
  wake();
});

/* tuning from the console */
window.__temple = {
  P, scene, camera, key, spill, hemi, bounce, bloom, gradePass, stoneUniforms, renderer, composer,
  links, linkU, linkCount, motes, shaft,
  freeze: (v = true) => { frozen = v; if (!v) wake(); },
  render: () => composer.render(),
  setDPR: (v) => { dpr = v; applyDPR(); },
  // park the entry at a point, no easing; the next real scroll releases it
  seek: (f) => {
    seekPinned = Math.min(Math.max(f, 0), 1);
    scrollP = scrollS = seekPinned;
    applyScroll(scrollS);
    const cb = ss(0.04, 0.96, scrollS);
    basePos.copy(rigA.pos).lerp(rigB.pos, cb);
    look.copy(rigA.look).lerp(rigB.look, cb);
    camera.fov = (rigA.fov + (rigB.fov - rigA.fov) * cb) * fovScale; camera.updateProjectionMatrix();
    camera.position.copy(basePos); camera.lookAt(look);
    composer.render();
  },
  get progress() { return scrollS; }
};
