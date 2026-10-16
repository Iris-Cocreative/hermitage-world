/* Hermitage World v3 — page behavior (no dependencies; never touches .hero*) */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Reveal on scroll */
  var revealEls = document.querySelectorAll('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) {
    document.documentElement.classList.add('no-reveal');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* Five lights: prev/next scroll the row by one item.
     Targets are exact item offsets (snap-safe); animation is a short
     timer-driven tween so it also works where smooth scrolling is throttled. */
  var row = document.querySelector('[data-lights-row]');
  if (row) {
    var items = Array.prototype.slice.call(row.querySelectorAll('.light'));
    var offsets = function () { return items.map(function (el) { return el.offsetLeft - row.offsetLeft; }); };
    var nearest = function () {
      var o = offsets(), x = row.scrollLeft, best = 0;
      o.forEach(function (v, i) { if (Math.abs(v - x) < Math.abs(o[best] - x)) best = i; });
      return best;
    };
    var tween = null;
    var scrollTo = function (target) {
      target = Math.max(0, Math.min(target, row.scrollWidth - row.clientWidth));
      if (reduced) { row.scrollLeft = target; return; }
      var from = row.scrollLeft, dist = target - from, t0 = Date.now(), dur = 520;
      clearInterval(tween);
      tween = setInterval(function () {
        var p = Math.min(1, (Date.now() - t0) / dur);
        var e = 1 - Math.pow(1 - p, 3);
        row.scrollLeft = from + dist * e;
        if (p >= 1) clearInterval(tween);
      }, 16);
    };
    var go = function (dir) {
      var i = Math.max(0, Math.min(items.length - 1, nearest() + dir));
      scrollTo(offsets()[i]);
    };
    var prev = document.querySelector('[data-lights-prev]');
    var next = document.querySelector('[data-lights-next]');
    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });
  }

  /* Hallway accordion — one open at a time.
     The panel is height-animated from its measured content height and then
     released to auto, so a reflow (wrap, font swap) can't strand it. */
  var hallsRoot = document.querySelector('[data-halls]');
  if (hallsRoot) {
    var cards = Array.prototype.slice.call(hallsRoot.querySelectorAll('.hall__card'));

    var panelOf = function (card) { return card.querySelector('.hall__body'); };
    var buttonOf = function (card) { return card.querySelector('.hall__toggle'); };

    var open = function (card, instant) {
      var panel = panelOf(card), btn = buttonOf(card);
      card.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      if (reduced || instant) { panel.style.height = 'auto'; return; }
      panel.style.height = panel.scrollHeight + 'px';
    };

    var close = function (card) {
      var panel = panelOf(card), btn = buttonOf(card);
      if (!card.classList.contains('is-open')) return;
      btn.setAttribute('aria-expanded', 'false');
      if (reduced) {
        card.classList.remove('is-open');
        panel.style.height = '';
        return;
      }
      // pin the current height, flush it, then fall to zero. Reading
      // offsetHeight forces that flush — rAF would be cleaner but it is
      // throttled in background tabs and the panel would stick open.
      panel.style.height = panel.scrollHeight + 'px';
      void panel.offsetHeight;
      card.classList.remove('is-open');
      panel.style.height = '';
    };

    cards.forEach(function (card) {
      var panel = panelOf(card);
      var btn = buttonOf(card);

      panel.addEventListener('transitionend', function (e) {
        if (e.propertyName !== 'height') return;
        if (card.classList.contains('is-open')) panel.style.height = 'auto';
      });

      btn.addEventListener('click', function () {
        var wasOpen = card.classList.contains('is-open');
        cards.forEach(close);
        if (!wasOpen) open(card);
      });
    });

    // a reflow while open would leave a stale pixel height behind
    window.addEventListener('resize', function () {
      cards.forEach(function (card) {
        if (card.classList.contains('is-open')) panelOf(card).style.height = 'auto';
      });
    });

    // the frame ships with Deepen open
    if (cards.length) open(cards[1] || cards[0], true);
  }

  /* Newsletter demo submit (main card and the strip above the footer) */
  Array.prototype.forEach.call(document.querySelectorAll('[data-newsletter]'), function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.textContent = 'Welcome. Check your inbox.';
        btn.classList.add('is-done');
        btn.disabled = true;
      }
    });
  });
})();
