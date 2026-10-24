/* ============================================================================
   HERMITAGE WORLD — wall panel composer
   ----------------------------------------------------------------------------
   Frames the live temple scene (assets/js/temple.js, loaded unchanged) for the
   wall over the three windows: 168 × 64 in, hung as three panels of 52, 63 and
   51 in. The scene's own loop is frozen; this file owns the camera and renders
   on demand.

   The camera can be "matched" to a viewer: the lens takes the angle the wall
   fills from where they stand, the camera stays level, and a lens rise puts
   the horizon on their eye line. That is the architectural-photography way of
   keeping columns upright, and what makes a flat panel read as a view in.

   State lives in the URL hash, so a framing is a link. "Setup for Blender"
   writes the same state plus the camera matrices for the print render.
   ============================================================================ */

import '../../assets/js/temple.js';

const W_IN = 168, H_IN = 64, PANELS = [52, 63, 51], SEAMS = [52, 115];
const ASPECT = W_IN / H_IN;
const DEG = Math.PI / 180;
const ROOM_R = 17.2;                         // keep the camera inside the drum

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ss = (a, b, x) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

/* ------------------------------------------------------------- framings -- */
// web rigs from temple.js, as yaw/pitch, with the lens widened so the panel
// keeps the same horizontal view the 16:9 hero had
const fromRig = (pos, look) => {
  const dx = look[0] - pos[0], dy = look[1] - pos[1], dz = look[2] - pos[2];
  return { x: pos[0], y: pos[1], z: pos[2],
           yaw: Math.atan2(-dx, -dz) / DEG, pitch: Math.atan2(dy, Math.hypot(dx, dz)) / DEG };
};
const widen = (vfov169) => 2 * Math.atan(Math.tan(vfov169 * DEG / 2) * (16 / 9) / ASPECT) / DEG;

const PRESETS = [
  { name: 'Web · threshold', note: 'The site’s opening view, widened to the wall',
    s: { ...fromRig([-0.6, 7.2, 16.2], [1.2, 2.6, -2.4]), fov: widen(46), shift: 0, p: 0 } },
  { name: 'Web · walked in', note: 'Where the scroll ends, light on the floor',
    s: { ...fromRig([0.9, 3.4, 9.2], [0.3, 2.3, -4.0]), fov: widen(50), shift: 0, p: 1 } },
  { name: 'Doorway, eye level', note: 'Standing just inside, camera level',
    s: { x: 0.4, y: 1.65, z: 15.6, yaw: -3, pitch: 0, fov: 30, shift: 0, p: 0.5 } },
  { name: 'Under the oculus', note: 'Level, lens raised to the opening in the dome',
    s: { x: 0.4, y: 3.0, z: 16.0, yaw: -3, pitch: 0, fov: 44, shift: 0.7, p: 0.5 } }
];

const DEFAULTS = {
  ...PRESETS[0].s,
  t: 24, sun: 1, shaft: 1, rip: 0.3, motes: 1,
  exp: 1, bloom: 0.3, vig: 1, grain: 0.012,
  bot: 30, eye: 62, dist: 120,
  name: ''
};

/* ------------------------------------------------------------- controls -- */
const CONTROLS = {
  camera: [
    { k: 'x',     label: 'Across',     min: -17,  max: 17,  step: 0.05, unit: 'm' },
    { k: 'y',     label: 'Height',     min: 0.3,  max: 12,  step: 0.05, unit: 'm' },
    { k: 'z',     label: 'Depth',      min: -17,  max: 17,  step: 0.05, unit: 'm' },
    { k: 'yaw',   label: 'Turn',       min: -180, max: 180, step: 0.1,  unit: '°' },
    { k: 'pitch', label: 'Tilt',       min: -60,  max: 60,  step: 0.1,  unit: '°' },
    { k: 'fov',   label: 'Lens',       min: 12,   max: 80,  step: 0.1,  unit: '° vertical' },
    { k: 'shift', label: 'Lens rise',  min: -1.5, max: 1.5, step: 0.01, unit: '× half height' }
  ],
  viewer: [
    { k: 'bot',   label: 'Bottom edge', min: 0,  max: 90,  step: 0.5, unit: 'in above floor' },
    { k: 'eye',   label: 'Eye height',  min: 20, max: 80,  step: 0.5, unit: 'in above floor' },
    { k: 'dist',  label: 'Distance',    min: 36, max: 360, step: 1,   unit: 'in from the wall' }
  ],
  light: [
    { k: 'p',     label: 'Entry',        min: 0, max: 1,    step: 0.01,  unit: 'threshold → walked in' },
    { k: 't',     label: 'Moment',       min: 0, max: 120,  step: 0.1,   unit: 's, ripple and motes' },
    { k: 'sun',   label: 'Sun',          min: 0, max: 2,    step: 0.01,  unit: '×' },
    { k: 'shaft', label: 'Shaft',        min: 0, max: 2.5,  step: 0.01,  unit: '×' },
    { k: 'rip',   label: 'Floor ripple', min: 0, max: 0.6,  step: 0.005, unit: 'm' },
    { k: 'motes', label: 'Motes', check: true }
  ],
  finish: [
    { k: 'exp',   label: 'Exposure', min: 0.5, max: 1.6,  step: 0.01,  unit: '×' },
    { k: 'bloom', label: 'Bloom',    min: 0,   max: 1.2,  step: 0.01,  unit: '' },
    { k: 'vig',   label: 'Vignette', min: 0,   max: 1.5,  step: 0.01,  unit: '×' },
    { k: 'grain', label: 'Grain',    min: 0,   max: 0.05, step: 0.001, unit: '' }
  ]
};
const KEYS = Object.values(CONTROLS).flat();
const decimals = (step) => (String(step).split('.')[1] || '').length;

let state = { ...DEFAULTS, ...readHash() };
const inputs = {};

for (const [group, items] of Object.entries(CONTROLS)) {
  const host = $(`[data-group="${group}"]`);
  const after = host.querySelector('h2');
  let anchor = after;
  for (const c of items) {
    const row = document.createElement('div');
    const id = 'c-' + c.k;
    if (c.check) {
      row.className = 'row row--check';
      row.innerHTML = `<label for="${id}">${c.label}</label><input type="checkbox" id="${id}">`;
      const box = row.querySelector('input');
      box.addEventListener('change', () => set({ [c.k]: box.checked ? 1 : 0 }));
      inputs[c.k] = { box };
    } else {
      row.className = 'row';
      row.title = c.unit;
      row.innerHTML = `<label for="${id}">${c.label}</label>
        <input type="range" id="${id}" min="${c.min}" max="${c.max}" step="${c.step}">
        <input type="number" min="${c.min}" max="${c.max}" step="${c.step}" aria-label="${c.label}, ${c.unit}">`;
      const [range, num] = row.querySelectorAll('input');
      range.addEventListener('input', () => set({ [c.k]: +range.value }));
      num.addEventListener('change', () => { if (num.value !== '') set({ [c.k]: clamp(+num.value, c.min, c.max) }); });
      inputs[c.k] = { range, num, d: decimals(c.step) };
    }
    anchor.after(row);
    anchor = row;
  }
}
const camReadout = document.createElement('p');
camReadout.className = 'readout';
$('[data-group="camera"]').append(camReadout);

function syncControls() {
  for (const c of KEYS) {
    const i = inputs[c.k], v = state[c.k];
    if (i.box) { i.box.checked = !!v; continue; }
    if (document.activeElement !== i.range) i.range.value = v;
    if (document.activeElement !== i.num) i.num.value = (+v).toFixed(i.d);
  }
  const hfov = 2 * Math.atan(Math.tan(state.fov * DEG / 2) * ASPECT) / DEG;
  camReadout.textContent = `Horizontal view ${hfov.toFixed(1)}°`;

  const eyeRel = state.eye - state.bot;
  const vNat = 2 * Math.atan((H_IN / 2) / state.dist) / DEG;
  const hNat = 2 * Math.atan((W_IN / 2) / state.dist) / DEG;
  const where = eyeRel < 0 ? 'below the panel' : eyeRel > H_IN ? 'above the panel'
              : `${eyeRel.toFixed(0)}″ up the panel${Math.abs(eyeRel - H_IN / 2) < 2 ? ' (its middle)' : ''}`;
  $('#viewer-readout').textContent =
    `From ${(state.dist / 12).toFixed(1)} ft the wall fills ${hNat.toFixed(0)}° × ${vNat.toFixed(0)}°. Eye line ${where}.`;
  if (document.activeElement !== $('#name')) $('#name').value = state.name;
}

function set(patch, { hash = true } = {}) {
  Object.assign(state, patch);
  const r = Math.hypot(state.x, state.z);
  if (r > ROOM_R) { state.x *= ROOM_R / r; state.z *= ROOM_R / r; }
  syncControls();
  invalidate();
  if (hash) writeHashSoon();
}

/* ---------------------------------------------------------------- hash -- */
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1)), out = {};
  for (const [k, v] of q) {
    if (k === 'name') out.name = v;
    else if (k in DEFAULTS && v !== '' && isFinite(+v)) out[k] = +v;
  }
  return out;
}
let hashTimer = 0;
function writeHashSoon() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    const q = new URLSearchParams();
    for (const k of Object.keys(DEFAULTS)) {
      if (k === 'name') { if (state.name) q.set('name', state.name); continue; }
      q.set(k, +(+state[k]).toFixed(4));
    }
    history.replaceState(null, '', '#' + q.toString());
  }, 250);
}

/* ---------------------------------------------------------------- scene -- */
const frame = $('#frame');
const glCanvas = $('#hero-gl');
let T = null, lastP = null;

function applyState({ prScale } = {}) {
  const s = state, cam = T.camera;
  if (s.p !== lastP) { T.seek(s.p); lastP = s.p; }   // light, pool and settle follow the entry
  const e = ss(0, 1, s.p);

  for (const u of [T.stoneUniforms.uTime, T.shaft.material.uniforms.uTime,
                   T.motes.material.uniforms.uTime, T.links.material.uniforms.uTime]) u.value = s.t;
  T.gradePass.uniforms.uTime.value = 0;
  T.stoneUniforms.uAmp.value = s.rip;
  T.key.intensity = 2600 * (1 - 0.55 * e) * s.sun;
  T.shaft.material.uniforms.uInt.value = 0.5 * s.shaft;
  T.motes.visible = T.links.visible = !!s.motes;
  T.motes.material.uniforms.uPR.value = prScale ?? T.renderer.getPixelRatio();
  T.renderer.toneMappingExposure = (1 - 0.04 * e) * s.exp;
  T.bloom.strength = s.bloom;
  T.gradePass.uniforms.uVig.value = s.vig;
  T.gradePass.uniforms.uGrain.value = s.grain;

  cam.position.set(s.x, s.y, s.z);
  cam.rotation.set(s.pitch * DEG, s.yaw * DEG, 0, 'YXZ');
  cam.fov = s.fov;
  cam.aspect = ASPECT;
  cam.updateProjectionMatrix();
  cam.projectionMatrix.elements[9] = s.shift;          // lens rise: off-axis frustum
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
  cam.updateMatrixWorld(true);
}

let dirty = false, settleTimer = 0, baseDPR = 1;
function invalidate() {
  if (!T) return;
  if (!dirty) { dirty = true; requestAnimationFrame(draw); }
  // while something is moving, draw at screen resolution; once it settles,
  // redraw supersampled so the still frame is clean
  clearTimeout(settleTimer);
  if (T.renderer.getPixelRatio() !== baseDPR) T.setDPR(baseDPR);
  settleTimer = setTimeout(() => { T.setDPR(Math.min(baseDPR * 2, 4)); requestAnimationFrame(draw); }, 350);
}
function draw() {
  dirty = false;
  applyState();
  T.composer.render();
  updateGuides();
  if (view === 'room') paintRoom();
}

/* --------------------------------------------------------------- guides -- */
const guides = $('.guides');
function horizonNdc() {
  const cam = T.camera, v = cam.position.clone();
  v.x += -Math.sin(state.yaw * DEG) * 1000;
  v.z += -Math.cos(state.yaw * DEG) * 1000;
  return v.project(cam).y;
}
function eyeFrac() { return (state.eye - state.bot) / H_IN; }   // 0 = bottom edge, 1 = top
function updateGuides() {
  const hy = horizonNdc(), hz = $('#g-horizon');
  hz.style.display = Math.abs(hy) <= 1 ? '' : 'none';
  hz.style.top = ((1 - hy) / 2 * 100) + '%';
  const f = eyeFrac(), eye = $('#g-eye');
  eye.style.top = ((1 - clamp(f, 0, 1)) * 100) + '%';
  eye.classList.toggle('is-off', f < 0 || f > 1);
}
for (const box of $$('[data-toggle]')) {
  const apply = () => {
    const g = box.dataset.toggle;
    if (g === 'thirds') guides.classList.toggle('show-thirds', box.checked);
    else guides.classList.toggle('hide-' + g, !box.checked);
  };
  box.addEventListener('change', apply);
  apply();
}
const guideOn = (g) => $(`[data-toggle="${g}"]`).checked;

/* ------------------------------------------------------- viewer matching -- */
function matchViewer() {
  const eyeRel = state.eye - state.bot;
  set({
    fov: +(2 * Math.atan((H_IN / 2) / state.dist) / DEG).toFixed(2),
    pitch: 0,
    shift: +clamp((H_IN / 2 - eyeRel) / (H_IN / 2), -1.5, 1.5).toFixed(3)
  });
}
$('#match-viewer').addEventListener('click', matchViewer);
for (const b of $$('#eye-chips button')) b.addEventListener('click', () => set({ eye: +b.dataset.eye }));

/* --------------------------------------------------------------- presets -- */
for (const p of PRESETS) {
  const b = document.createElement('button');
  b.innerHTML = `<b>${p.name}</b><small>${p.note}</small>`;
  b.addEventListener('click', () => set({ ...p.s }));
  $('#presets').append(b);
}

/* ------------------------------------------------------- direct handling -- */
{
  let drag = null;
  frame.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    frame.setPointerCapture(e.pointerId);
    frame.classList.add('is-dragging');
    drag = { x: e.clientX, y: e.clientY };
  });
  frame.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    drag = { x: e.clientX, y: e.clientY };
    if (e.shiftKey) {
      const k = 0.02, yaw = state.yaw * DEG;
      set({ x: state.x - Math.cos(yaw) * dx * k, z: state.z + Math.sin(yaw) * dx * k,
            y: clamp(state.y + dy * k, 0.3, 12) });
    } else {
      const k = state.fov / frame.clientHeight;      // the scene follows the pointer
      let yaw = state.yaw + dx * k;
      yaw = ((yaw + 540) % 360) - 180;
      set({ yaw, pitch: clamp(state.pitch + dy * k, -60, 60) });
    }
  });
  const end = () => { drag = null; frame.classList.remove('is-dragging'); };
  frame.addEventListener('pointerup', end);
  frame.addEventListener('pointercancel', end);
  frame.addEventListener('wheel', (e) => {
    e.preventDefault();
    const step = -e.deltaY * 0.008, yaw = state.yaw * DEG;
    set({ x: state.x - Math.sin(yaw) * step, z: state.z - Math.cos(yaw) * step });
  }, { passive: false });
}

$('#name').addEventListener('input', (e) => set({ name: e.target.value }));

/* ----------------------------------------------------------------- views -- */
let view = 'frame';
for (const tab of $$('[data-view]')) {
  tab.addEventListener('click', () => {
    view = tab.dataset.view;
    for (const t of $$('[data-view]')) t.setAttribute('aria-selected', t === tab);
    // the frame stays laid out while hidden so the canvas keeps its size for the mockup
    $('[data-pane="frame"]').classList.toggle('is-offstage', view !== 'frame');
    $('[data-pane="room"]').hidden = view !== 'room';
    if (view === 'room') layoutRoom();
    invalidate();
  });
}

/* ------------------------------------------------------------------ room -- */
const room = $('#room'), photo = $('#room-photo'), roomCanvas = $('#room-panel');
const handles = $$('.handle', room);
const CORNER_KEY = 'hw-panels-corners';
// the panel band in the client's 320 × 240 phone photo, wall corner to wall corner
const CORNERS_DEFAULT = [[21 / 320, 49 / 240], [305 / 320, 49 / 240], [305 / 320, 157 / 240], [21 / 320, 157 / 240]];
let corners = CORNERS_DEFAULT.map(c => c.slice());
try { const c = JSON.parse(localStorage.getItem(CORNER_KEY)); if (Array.isArray(c) && c.length === 4) corners = c; } catch {}
const MOCK_W = 1050, MOCK_H = MOCK_W / ASPECT;

photo.src = 'local/room.jpg';
photo.addEventListener('load', layoutRoom);
photo.addEventListener('error', () => { $('#status').textContent = 'No room photo found: drop one onto the room view'; });
$('#room-file').addEventListener('change', (e) => { const f = e.target.files[0]; if (f) usePhoto(f); });
room.addEventListener('dragover', (e) => { e.preventDefault(); room.classList.add('is-drop'); });
room.addEventListener('dragleave', () => room.classList.remove('is-drop'));
room.addEventListener('drop', (e) => {
  e.preventDefault(); room.classList.remove('is-drop');
  const f = [...e.dataTransfer.files].find(f => f.type.startsWith('image/'));
  if (f) usePhoto(f);
});
function usePhoto(f) { photo.src = URL.createObjectURL(f); }
$('#room-reset').addEventListener('click', () => {
  corners = CORNERS_DEFAULT.map(c => c.slice());
  try { localStorage.removeItem(CORNER_KEY); } catch {}
  layoutRoom();
});

// projective map from the mock canvas rectangle onto the four corners
function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [X, Y] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X]); b.push(X);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y]); b.push(Y);
  }
  for (let c = 0; c < 8; c++) {                          // Gaussian elimination, partial pivot
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < 8; r++) {
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const h = new Array(8);
  for (let r = 7; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < 8; k++) s -= A[r][k] * h[k];
    h[r] = s / A[r][r];
  }
  return h;
}
function layoutRoom() {
  if (view !== 'room' || !photo.naturalWidth) return;
  const w = room.clientWidth, h = room.clientHeight;
  const px = corners.map(([u, v]) => [u * w, v * h]);
  handles.forEach((el, i) => { el.style.left = px[i][0] + 'px'; el.style.top = px[i][1] + 'px'; });
  const [a, b, c, d, e, f, g, hh] = homography([[0, 0], [MOCK_W, 0], [MOCK_W, MOCK_H], [0, MOCK_H]], px);
  roomCanvas.style.width = MOCK_W + 'px';
  roomCanvas.style.height = MOCK_H + 'px';
  roomCanvas.style.transform = `matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
}
function paintRoom() {
  if (roomCanvas.width !== glCanvas.width || roomCanvas.height !== glCanvas.height) {
    roomCanvas.width = glCanvas.width; roomCanvas.height = glCanvas.height;
  }
  const g = roomCanvas.getContext('2d'), W = roomCanvas.width, H = roomCanvas.height;
  g.drawImage(glCanvas, 0, 0, W, H);
  // the joints between the three panels
  g.fillStyle = 'rgba(10, 6, 2, 0.55)';
  for (const s of SEAMS) g.fillRect(Math.round(s / W_IN * W) - 1, 0, 2, H);
}
handles.forEach((el, i) => {
  el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); el.dataset.drag = '1'; });
  el.addEventListener('pointermove', (e) => {
    if (!el.dataset.drag) return;
    const r = room.getBoundingClientRect();
    corners[i] = [clamp((e.clientX - r.left) / r.width, -0.2, 1.2), clamp((e.clientY - r.top) / r.height, -0.2, 1.2)];
    layoutRoom();
  });
  el.addEventListener('pointerup', () => {
    delete el.dataset.drag;
    try { localStorage.setItem(CORNER_KEY, JSON.stringify(corners)); } catch {}
  });
});
addEventListener('resize', layoutRoom);

/* ---------------------------------------------------------------- export -- */
// renders the scene at an exact pixel size, copies it out, then hands the
// canvas back to the on-screen size
// at up to twice the size and scaled down: the composer's buffers have no
// antialiasing of their own, so supersampling is what keeps stone edges clean
function renderTo(w, h) {
  const r = T.renderer, dpr = r.getPixelRatio(), cssW = frame.clientWidth || 1000;
  const k = Math.min(2, 8192 / w), W = Math.round(w * k), H = Math.round(h * k);
  r.setPixelRatio(1); r.setSize(W, H, false);
  T.composer.setPixelRatio(1); T.composer.setSize(W, H);
  T.gradePass.uniforms.uRes.value.set(W, H);
  applyState({ prScale: W / cssW });                  // motes keep their size relative to the frame
  T.composer.render();
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const g = out.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(r.domElement, 0, 0, w, h);
  T.setDPR(dpr);
  invalidate();
  return out;
}

const slug = (s) => (s || 'framing').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'framing';
const stamp = () => new Date().toISOString().slice(0, 10);
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function busy(btn, label, fn) {
  btn.disabled = true; $('#status').textContent = label;
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 30)));
  try { await fn(); $('#status').textContent = 'Saved'; }
  catch (err) { console.error(err); $('#status').textContent = 'Export failed: ' + err.message; }
  finally { btn.disabled = false; }
}
const toBlob = (c) => new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('canvas too large')), 'image/png'));

$('#x-image').addEventListener('click', (e) => busy(e.currentTarget, 'Rendering image…', async () => {
  const w = +$('#x-size').value, img = renderTo(w, Math.round(w / ASPECT));
  download(await toBlob(img), `hw-panels-${slug(state.name)}-${w}.png`);
}));

$('#x-sheet').addEventListener('click', (e) => busy(e.currentTarget, 'Rendering proof sheet…', async () => {
  await Promise.all([document.fonts.load('60px Marcellus'), document.fonts.load('30px "Alegreya Sans"')]);
  const IW = 2960, IH = Math.round(IW / ASPECT), M = 120;
  const img = renderTo(IW, IH);
  const W = IW + 2 * M, top = M + 150, H = top + IH + 270 + M;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#180f03'; g.fillRect(0, 0, W, H);

  g.fillStyle = '#f5eddc'; g.font = '60px Marcellus';
  g.fillText('Hermitage World · wall panels', M, M + 56);
  g.fillStyle = '#a1947f'; g.font = '32px "Alegreya Sans"';
  g.fillText(`${state.name || 'Untitled framing'} · proof ${stamp()} · 168 × 64 in overall, three panels`, M, M + 112);

  g.drawImage(img, M, top);
  g.strokeStyle = 'rgba(241,235,223,0.18)'; g.lineWidth = 2; g.strokeRect(M - 1, top - 1, IW + 2, IH + 2);
  const X = (inch) => M + inch / W_IN * IW;
  if (guideOn('seams')) {
    g.save(); g.setLineDash([18, 12]); g.strokeStyle = 'rgba(248,243,232,0.8)'; g.lineWidth = 3;
    for (const s of SEAMS) { g.beginPath(); g.moveTo(X(s), top); g.lineTo(X(s), top + IH); g.stroke(); }
    g.restore();
  }
  const f = eyeFrac();
  if (guideOn('eye') && f >= 0 && f <= 1) {
    const y = top + (1 - f) * IH;
    g.save(); g.setLineDash([24, 14]); g.strokeStyle = 'rgba(210,178,119,0.95)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(M, y); g.lineTo(M + IW, y); g.stroke(); g.restore();
    g.fillStyle = '#d2b277'; g.font = '26px "Alegreya Sans"'; g.textAlign = 'right';
    g.fillText(`eye line, ${state.eye}″ above the floor`, M + IW - 16, y - 12); g.textAlign = 'left';
  }

  // dimension ruler
  const ry = top + IH + 40;
  g.strokeStyle = 'rgba(166,129,64,0.6)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(M, ry); g.lineTo(M + IW, ry);
  for (const s of [0, ...SEAMS, W_IN]) { g.moveTo(X(s), ry - 14); g.lineTo(X(s), ry + 14); }
  g.stroke();
  g.fillStyle = '#bbb09d'; g.font = '30px "Alegreya Sans"'; g.textAlign = 'center';
  let at = 0;
  PANELS.forEach((w, i) => { g.fillText(`Panel ${i + 1} · ${w} in`, X(at + w / 2), ry + 52); at += w; });
  g.textAlign = 'left';

  const hfov = 2 * Math.atan(Math.tan(state.fov * DEG / 2) * ASPECT) / DEG;
  g.fillStyle = '#978b75'; g.font = '26px "Alegreya Sans"';
  const lines = [
    `Camera ${state.x.toFixed(2)}, ${state.y.toFixed(2)}, ${state.z.toFixed(2)} m · turn ${state.yaw.toFixed(1)}° · tilt ${state.pitch.toFixed(1)}° · lens ${state.fov.toFixed(1)}° × ${hfov.toFixed(1)}° · rise ${state.shift.toFixed(2)} · entry ${state.p.toFixed(2)}`,
    `Viewer: eye ${state.eye} in, ${state.dist} in from the wall · panel bottom ${state.bot} in above the floor (estimate until confirmed)`,
    'Proof rendered from the website scene, for choosing the framing. The print master is rendered separately at full resolution.'
  ];
  lines.forEach((t, i) => g.fillText(t, M, ry + 130 + i * 40));
  download(await toBlob(c), `hw-panels-${slug(state.name)}-proof-${stamp()}.png`);
}));

$('#x-json').addEventListener('click', (e) => busy(e.currentTarget, 'Writing setup…', async () => {
  applyState();
  const cam = T.camera, k = T.key;
  const v3 = (v) => [+v.x.toFixed(5), +v.y.toFixed(5), +v.z.toFixed(5)];
  const setup = {
    what: 'Hermitage World wall panels: framing chosen in print/wall-panels, for the print render',
    name: state.name, saved: new Date().toISOString(), link: location.href,
    coordinates: 'three.js: Y up, camera looks down -Z, meters. Blender (Z up): (x, y, z) -> (x, -z, y)',
    wall: { width_in: W_IN, height_in: H_IN, panels_in: PANELS, seams_in: SEAMS, furring_in: 1 },
    viewer: { eye_in: state.eye, bottom_edge_in: state.bot, distance_in: state.dist, bottom_edge_is_estimate: true },
    camera: {
      position: v3(cam.position), yaw_deg: state.yaw, pitch_deg: state.pitch, euler_order: 'YXZ',
      quaternion: cam.quaternion.toArray().map(n => +n.toFixed(6)),
      vfov_deg: state.fov, aspect: ASPECT, lens_rise_half_heights: state.shift,
      blender: { sensor_fit: 'VERTICAL', shift_y: +(state.shift * 0.5 / ASPECT).toFixed(5), note: 'shift_y is in units of the image width' },
      matrixWorld: cam.matrixWorld.toArray(), projectionMatrix: cam.projectionMatrix.toArray()
    },
    scene: {
      entry: state.p, time_s: state.t,
      key: { position: v3(k.position), target: v3(k.target.position), angle_rad: k.angle, penumbra: k.penumbra, intensity: k.intensity, color: '#' + k.color.getHexString() },
      shaft_intensity: T.shaft.material.uniforms.uInt.value,
      ripple: { amp: state.rip, wave: T.stoneUniforms.uWave.value, speed: T.stoneUniforms.uSpeed.value, decay: T.stoneUniforms.uDecay.value },
      motes: !!state.motes
    },
    finish: { exposure: T.renderer.toneMappingExposure, bloom: state.bloom, vignette: state.vig, grain: state.grain }
  };
  download(new Blob([JSON.stringify(setup, null, 2)], { type: 'application/json' }), `hw-panels-${slug(state.name)}-setup.json`);
}));

$('#x-link').addEventListener('click', async (e) => {
  clearTimeout(hashTimer);
  const btn = e.currentTarget;
  writeHashSoon(); await new Promise(r => setTimeout(r, 300));
  try { await navigator.clipboard.writeText(location.href); $('#status').textContent = 'Link copied'; }
  catch { $('#status').textContent = 'Copy failed: use the address bar'; }
  btn.blur();
});

/* ------------------------------------------------------------------ boot -- */
window.__panels = { get state() { return { ...state }; }, set, renderTo };   // tuning from the console
syncControls();
new ResizeObserver(invalidate).observe(frame);
(function boot() {
  const t = window.__temple;
  if (!t || !$('#hero').classList.contains('is-ready')) return requestAnimationFrame(boot);
  T = t;
  T.freeze(true);
  baseDPR = Math.min(devicePixelRatio || 1, 2);
  T.setDPR(baseDPR);
  T.key.shadow.mapSize.set(4096, 4096);                // sharper shadows than the website needs
  if (T.key.shadow.map) { T.key.shadow.map.dispose(); T.key.shadow.map = null; }
  $('#status').textContent = 'Ready';
  invalidate();
})();
