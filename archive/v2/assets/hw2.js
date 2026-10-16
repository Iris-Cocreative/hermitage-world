/* Hermitage World prototype v2 — motion & nav
   One authored moment: the passage from daylight into the lit interior.
   Everything is visible without JS; JS only adds choreography, the walk line,
   and the visitor's time zone. */

(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Nav: plaster surface once the visitor leaves the first viewport */
  var nav = document.querySelector('.nav');
  function onScroll() {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* The week: name the visitor's own time zone honestly */
  var tz = document.querySelector('[data-tz]');
  if (tz) {
    try {
      var zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (zone) tz.textContent = 'Shown in your time (' + zone.replace(/_/g, ' ') + ')';
    } catch (err) { /* keep the static line */ }
  }

  /* Prototype forms: name the problem and the recovery; never fake success */
  document.querySelectorAll('form').forEach(function (form) {
    var input = form.querySelector('input:not([disabled])');
    if (!input) return;
    form.setAttribute('novalidate', '');
    var msg = document.createElement('p');
    msg.className = 'form-msg';
    msg.setAttribute('role', 'status');
    form.insertAdjacentElement('afterend', msg);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!input.value || !input.checkValidity()) {
        input.classList.add('invalid');
        msg.className = 'form-msg error';
        msg.textContent = 'Enter your email address so the letter can reach you.';
        input.focus();
      } else {
        input.classList.remove('invalid');
        msg.className = 'form-msg';
        msg.textContent = 'This is a design prototype — the live site will complete your signup here.';
      }
    });
    input.addEventListener('input', function () { input.classList.remove('invalid'); });
  });

  /* The walk: an orthogonal path from "you are here" through the three
     hallways, drawn from the portals' real positions. Hovering a hallway
     lights the turn that leads to it. */
  var walk = document.querySelector('.walk');
  var svg = walk && walk.querySelector('.walk-line');
  var portals = walk ? Array.prototype.slice.call(walk.querySelectorAll('.portal')) : [];
  var start = walk && walk.querySelector('.walk-start .ap');
  var NS = 'http://www.w3.org/2000/svg';

  function drawWalk() {
    if (!svg || portals.length < 3 || !start) return;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var box = walk.getBoundingClientRect();
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);
    var stacked = window.innerWidth <= 900;
    var s = start.getBoundingClientRect();
    var sx = s.left - box.left + s.width / 2;
    var sy = s.top - box.top + s.height;
    var pts = portals.map(function (p) {
      var r = p.getBoundingClientRect();
      return stacked
        ? { x: r.left - box.left + 28, y: r.top - box.top }
        : { x: r.left - box.left + r.width / 2, y: r.top - box.top };
    });
    var prev = { x: sx, y: sy };
    pts.forEach(function (pt, i) {
      var d, midY;
      if (stacked) {
        d = 'M' + prev.x + ' ' + prev.y + ' V' + pt.y;
      } else {
        midY = i === 0 ? pt.y - 34 : Math.min(prev.y, pt.y) - 34;
        d = 'M' + prev.x + ' ' + prev.y + ' V' + midY + ' H' + pt.x + ' V' + pt.y;
      }
      var path = document.createElementNS(NS, 'path');
      path.setAttribute('d', d);
      path.setAttribute('class', 'seg');
      path.setAttribute('data-seg', i);
      svg.appendChild(path);
      if (!stacked) {
        var t = document.createElementNS(NS, 'rect');
        t.setAttribute('x', pt.x - 4); t.setAttribute('y', midY - 4);
        t.setAttribute('width', 8); t.setAttribute('height', 8);
        t.setAttribute('class', 'turn');
        t.setAttribute('data-seg', i);
        svg.appendChild(t);
      }
      prev = { x: pt.x, y: pt.y + (stacked ? portals[i].getBoundingClientRect().height : 0) };
      if (!stacked) prev = { x: pt.x, y: pt.y };
    });
  }

  function lightSeg(i, on) {
    if (!svg) return;
    svg.querySelectorAll('[data-seg="' + i + '"]').forEach(function (el) {
      el.classList.toggle('lit', on);
    });
  }

  if (walk) {
    portals.forEach(function (p, i) {
      p.addEventListener('mouseenter', function () { lightSeg(i, true); });
      p.addEventListener('mouseleave', function () { lightSeg(i, false); });
      p.addEventListener('focus', function () { lightSeg(i, true); });
      p.addEventListener('blur', function () { lightSeg(i, false); });
    });
    var raf = null;
    window.addEventListener('resize', function () {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(drawWalk);
    });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(drawWalk);
    }
    drawWalk();
  }

  if (reduced) {
    /* Light every aperture immediately; no choreography */
    document.querySelectorAll('.ap[data-ignite]').forEach(function (ap) {
      ap.classList.add('lit');
    });
    return;
  }

  document.documentElement.classList.add('r-init');

  /* Dawn: the hero's light patches arrive once, staggered by their order */
  document.querySelectorAll('.dawn').forEach(function (el, i) {
    setTimeout(function () { el.classList.add('in'); }, 120 + i * 140);
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      io.unobserve(el);

      if (el.classList.contains('reveal')) el.classList.add('in');

      /* Apertures ignite in staggered order inside their group */
      if (el.hasAttribute('data-ignite-group')) {
        var aps = el.querySelectorAll('.ap[data-ignite]');
        aps.forEach(function (ap, i) {
          setTimeout(function () { ap.classList.add('lit'); }, 220 * i + 200);
        });
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -5% 0px' });

  document.querySelectorAll('.reveal, [data-ignite-group]').forEach(function (el) {
    io.observe(el);
  });
})();
