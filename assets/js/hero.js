/* Home hero choreography — three beats on one scroll.
   Writes 0..1 values as CSS variables on .hero; temple.css does the rest.
   Independent of temple.js, so the words work over the still when WebGL can't. */
(function () {
  'use strict';
  var hero = document.getElementById('hero');
  if (!hero) return;
  var beatB = hero.querySelector('.hero__beat--b');
  var beatBLink = beatB && beatB.querySelector('a');

  // smoothstep between a and b
  function ss(a, b, x) { var t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); }

  var ticking = false;
  function update() {
    ticking = false;
    var range = hero.offsetHeight - window.innerHeight;
    var p = range > 0 ? Math.min(Math.max(-hero.getBoundingClientRect().top / range, 0), 1) : 0;

    var lede = ss(0.05, 0.17, p);          // beat two: the welcome arrives
    var a = 1 - ss(0.36, 0.48, p);         // beats one and two leave together
    var b = ss(0.52, 0.66, p);             // beat three: the name

    hero.style.setProperty('--beat-lede', lede.toFixed(3));
    hero.style.setProperty('--beat-a', a.toFixed(3));
    hero.style.setProperty('--beat-b', b.toFixed(3));
    hero.style.setProperty('--beat-cue', (1 - ss(0.02, 0.1, p)).toFixed(3));

    var named = b > 0.5;
    if (named !== hero.classList.contains('is-named')) {
      hero.classList.toggle('is-named', named);
      beatB.setAttribute('aria-hidden', named ? 'false' : 'true');
      if (beatBLink) beatBLink.tabIndex = named ? 0 : -1;
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();
