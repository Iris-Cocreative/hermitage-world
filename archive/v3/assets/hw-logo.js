/* Hermitage World — animated mark.
 *
 * Eight satellites around one centre, each breathing on its own slightly
 * detuned sine. The geometry and the pulse are lifted verbatim from the Weft
 * patch that designed it (assets/logo/mark.weft.json) — same constants, same
 * expression, same seeded phases — so the page and the patch stay in step.
 *
 * The mark itself is inline SVG in the markup and is correct without this
 * file: at rest every satellite sits at the midpoint of its pulse. All this
 * script does is animate `r`.
 *
 * One rAF drives every instance on the page. It idles whenever nothing is on
 * screen and whenever the tab is hidden, and never starts at all under
 * prefers-reduced-motion.
 */
(function () {
  'use strict';

  /* ---- the patch, as parameters ------------------------------------- */
  var P = {
    count: 8,       // params/slider "count"
    dist: 211,      // params/slider "distance"
    rSmall: 39.3,   // params/slider "circle R"
    pulseMin: 0.79, // params/slider "pulse min"
    pulseMax: 1.01, // params/slider "pulse max"
    seed: 262.8,    // sets/random S
    spreadA: 0,     // sets/random A
    spreadB: 0.01   // sets/random B
  };

  /* Weft's LM.rng — mulberry32 seeded off the slider. Reproduced rather than
     hardcoded so that retuning the patch's seed only means retyping one
     number here. */
  function rng(seed) {
    var a = (Math.floor(seed) | 0) + 0x6D2B79F5;
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // sets/random -> the per-satellite detune Z
  var Z = (function () {
    var r = rng(P.seed), out = [];
    for (var i = 0; i < P.count; i++) out.push(P.spreadA + (P.spreadB - P.spreadA) * r());
    return out;
  })();

  /* math/expr "pulse":
       X + (Y - X) * (0.5 + 0.5 * sin(T * (0.8 + 2.4 * Z) + Z * 39.7))
     then math/mul against the base radius. */
  function radius(t, i) {
    var z = Z[i];
    var k = P.pulseMin + (P.pulseMax - P.pulseMin) *
            (0.5 + 0.5 * Math.sin(t * (0.8 + 2.4 * z) + z * 39.7));
    return k * P.rSmall;
  }

  /* ---- instances ----------------------------------------------------- */
  var marks = [];
  var raf = 0;
  var t0 = 0;

  function collect() {
    marks = [];
    var nodes = document.querySelectorAll('[data-hw-mark]');
    for (var i = 0; i < nodes.length; i++) {
      var sats = nodes[i].querySelectorAll('[data-sat]');
      if (sats.length) marks.push({ el: nodes[i], sats: sats, visible: true });
    }
    return marks.length > 0;
  }

  function frame(now) {
    raf = 0;
    var t = (now - t0) / 1000;
    var live = false;
    for (var m = 0; m < marks.length; m++) {
      if (!marks[m].visible) continue;
      live = true;
      var sats = marks[m].sats;
      for (var i = 0; i < sats.length; i++) {
        sats[i].setAttribute('r', radius(t, i % P.count).toFixed(2));
      }
    }
    // nothing on screen and nothing to draw: stop until something wakes us
    if (live && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function start() {
    if (raf || document.hidden) return;
    if (!t0) t0 = performance.now();
    raf = requestAnimationFrame(frame);
  }

  function init() {
    if (!collect()) return;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return; // the static markup is already the resting mark
    }

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        for (var e = 0; e < entries.length; e++) {
          for (var m = 0; m < marks.length; m++) {
            if (marks[m].el === entries[e].target) marks[m].visible = entries[e].isIntersecting;
          }
        }
        start();
      }, { rootMargin: '120px' });
      for (var m = 0; m < marks.length; m++) io.observe(marks[m].el);
    }

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) start();
    });

    start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
