/* ==========================================================================
   Hermitage World — site runtime
   --------------------------------------------------------------------------
   Loaded in <head> on every page (not deferred), so the custom elements
   below are defined before the parser reaches them and render in place —
   no flash of a missing header.

   What lives here:
     SITE           the sitemap. Header, drawer, footer and "current page"
                    all read from it, so a page is added or renamed in ONE place.
     <hw-mark>      the sun mark as inline SVG (breathes gently when visible)
     <hw-header>    sticky header; variant="overlay" floats over the home hero
     <hw-signup>    the weekly-letter strip above the footer
     <hw-footer>    footer with the site's link columns
     behaviors      reveal-on-scroll, accordions, carousels, demo forms, drawer
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------ the sitemap
     `status` marks pages that exist only as a plan (phase two, candidate). */
  var SITE = {
    name: 'Hermitage World',
    tagline: 'An interfaith center for meditation and spirituality. In Indianapolis and everywhere.',
    primary: [
      { label: 'Meditation', href: 'meditation/' },
      { label: 'Gatherings', href: 'gatherings/' },
      { label: 'Programs', href: 'programs/' },
      { label: 'Friar Justin', href: 'friar-justin/' },
      { label: 'Community', href: 'community/' }
    ],
    map: [
      { label: 'Meditation', href: 'meditation/', children: [
        { label: 'Meditation Library', href: 'meditation/library/' }
      ]},
      { label: 'Gatherings', href: 'gatherings/', children: [
        { label: 'Calendar', href: 'calendar/' },
        { label: 'In Person · Indianapolis', href: 'in-person/' },
        { label: 'A gathering', href: 'gatherings/event/?id=energy-circle' }
      ]},
      { label: 'Programs', href: 'programs/', children: [
        { label: 'Train Your Mind', href: 'programs/train-your-mind/' },
        { label: 'Success: Full Living', href: 'programs/success-full-living/' },
        { label: 'Success: Full Relating', href: 'programs/success-full-relating/' },
        { label: 'Living the Prayer of Quiet', href: 'programs/prayer-of-quiet/' },
        { label: 'The Silva Method', href: 'programs/silva-method/' }
      ]},
      { label: 'Friar Justin', href: 'friar-justin/', children: [
        { label: 'The Library', href: 'friar-justin/library/' },
        { label: 'Books & Media', href: 'friar-justin/books-and-media/' },
        { label: 'Soul Guide', href: 'friar-justin/soul-guide/', status: 'Candidate' }
      ]},
      { label: 'Community', href: 'community/', children: [
        { label: 'Teachers & Guides', href: 'community/teachers/' },
        { label: 'Stories', href: 'community/stories/' },
        { label: 'Membership', href: 'community/membership/', status: 'Phase two' }
      ]},
      { label: 'About', href: 'about/', children: [
        { label: 'FAQs', href: 'about/faq/' },
        { label: 'Give', href: 'give/' },
        { label: 'Contact', href: 'contact/' },
        { label: 'Newsletter', href: 'newsletter/' }
      ]}
    ],
    footer: [
      { title: 'Practice', links: [
        { label: 'Meditation', href: 'meditation/' },
        { label: 'Gatherings', href: 'gatherings/' },
        { label: 'Programs', href: 'programs/' },
        { label: 'Calendar', href: 'calendar/' }
      ]},
      { title: 'Lineage', links: [
        { label: 'Friar Justin', href: 'friar-justin/' },
        { label: 'The Library', href: 'friar-justin/library/' },
        { label: 'Books & Media', href: 'friar-justin/books-and-media/' },
        { label: 'About', href: 'about/' }
      ]},
      { title: 'Belong', links: [
        { label: 'Community', href: 'community/' },
        { label: 'Ways to Give', href: 'give/' },
        { label: 'Newsletter', href: 'newsletter/' },
        { label: 'Contact', href: 'contact/' },
        { label: 'Formerly hermitageindy.org', href: 'https://hermitageindy.org', external: true }
      ]}
    ]
  };

  /* -------------------------------------------------------------- paths
     The site may live at a sub-path (GitHub Pages) or be opened from disk,
     so every link is resolved from this script's own location. */
  var script = document.currentScript;
  var ROOT = new URL('../../', script ? script.src : location.href);
  var FILE = location.protocol === 'file:';

  function url(path) {
    if (/^https?:/.test(path)) return path;
    var u = new URL(path, ROOT);
    if (FILE && /\/$/.test(u.pathname)) u.pathname += 'index.html';
    return u.href;
  }
  function asset(path) { return new URL('assets/' + path, ROOT).href; }
  function here() {
    var p = location.pathname.replace(/index\.html$/, '');
    var r = ROOT.pathname;
    return p.indexOf(r) === 0 ? p.slice(r.length) : p.replace(/^\//, '');
  }
  function icon(name, extra) {
    return '<svg class="icon' + (extra ? ' ' + extra : '') + '" aria-hidden="true"><use href="' + asset('img/icons.svg') + '#' + name + '"/></svg>';
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var CURRENT = here();
  function isCurrent(href) { return href.split('?')[0] === CURRENT; }
  function inSection(href) { return CURRENT.indexOf(href) === 0 && href !== ''; }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------------- mark
     Geometry from Munia's mark (Figma 282:1342): one disc, eight satellites,
     each a touch different in size for an organic, hand-set feel. */
  var MARK = {
    vb: '0 0 74 72.063',
    core: [37.39, 35.84, 18.79],
    sats: [
      [37.0, 5.23, 5.23], [58.89, 14.14, 5.91], [67.99, 36.03, 5.91], [58.5, 57.73, 5.81],
      [37.0, 66.44, 5.62], [15.5, 57.34, 5.42], [6.39, 35.84, 6.39], [15.3, 14.14, 5.23]
    ]
  };
  function markSVG(label) {
    var c = MARK.core;
    var s = '<svg class="mark" viewBox="' + MARK.vb + '" ' +
      (label ? 'role="img" aria-label="' + esc(label) + '"' : 'aria-hidden="true"') + '>' +
      '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '"/>';
    MARK.sats.forEach(function (p) { s += '<circle data-sat cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '"/>'; });
    return s + '</svg>';
  }

  /* One rAF for every mark on the page; idles when none is visible. */
  var breathing = new Set();
  var rafId = 0;
  function breathe(t) {
    rafId = 0;
    if (!breathing.size || document.hidden) return;
    var s = t / 1000;
    breathing.forEach(function (svg) {
      svg.__sats.forEach(function (el, i) {
        var base = MARK.sats[i][2];
        var k = 0.93 + 0.07 * (0.5 + 0.5 * Math.sin(s * (0.8 + 0.11 * i) + i * 2.4));
        el.setAttribute('r', (base * k).toFixed(3));
      });
    });
    rafId = requestAnimationFrame(breathe);
  }
  var markIO = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) breathing.add(e.target); else breathing.delete(e.target);
    });
    if (breathing.size && !rafId) rafId = requestAnimationFrame(breathe);
  }) : null;
  document.addEventListener('visibilitychange', function () { if (!document.hidden && breathing.size && !rafId) rafId = requestAnimationFrame(breathe); });

  function animateMark(svg) {
    if (reduced || !markIO) return;
    svg.__sats = Array.prototype.slice.call(svg.querySelectorAll('[data-sat]'));
    markIO.observe(svg);
  }

  /* ------------------------------------------------------- custom elements */
  function define(name, render) {
    if (customElements.get(name)) return;
    customElements.define(name, class extends HTMLElement {
      connectedCallback() {
        if (this.__done) return;
        this.__done = true;
        render(this);
      }
    });
  }

  // <hw-mark label="Hermitage World" still> — inline mark
  define('hw-mark', function (el) {
    el.innerHTML = markSVG(el.getAttribute('label'));
    if (!el.hasAttribute('still')) animateMark(el.firstChild);
  });

  function lockup(tag) {
    return '<' + tag + ' class="lockup" href="' + url('') + '" aria-label="Hermitage World, home">' +
      markSVG() + '<span class="lockup__name">Hermitage<br>World</span></' + tag + '>';
  }

  define('hw-header', function (el) {
    var overlay = el.getAttribute('variant') === 'overlay';
    var nav = SITE.primary.map(function (l) {
      var cur = isCurrent(l.href) ? ' aria-current="page"' : (inSection(l.href) ? ' class="is-section"' : '');
      return '<a href="' + url(l.href) + '"' + cur + '>' + esc(l.label) + '</a>';
    }).join('');

    var map = SITE.map.map(function (g) {
      return '<div class="drawer__group"><h2><a href="' + url(g.href) + '">' + esc(g.label) + '</a></h2><ul role="list">' +
        g.children.map(function (c) {
          return '<li><a href="' + url(c.href) + '"' + (isCurrent(c.href) ? ' aria-current="page"' : '') + '>' + esc(c.label) + '</a>' +
            (c.status ? '<span class="tag tag--soon">' + esc(c.status) + '</span>' : '') + '</li>';
        }).join('') + '</ul></div>';
    }).join('');

    el.innerHTML =
      '<a class="skip-link" href="#main">Skip to content</a>' +
      '<header class="site-header' + (overlay ? ' site-header--overlay' : '') + '">' +
        '<div class="container container--wide site-header__inner">' +
          lockup('a') +
          '<nav class="site-nav" aria-label="Primary">' + nav + '</nav>' +
          '<div class="site-header__actions">' +
            '<a class="btn" href="' + url('contact/') + '">Contact</a>' +
            '<button class="icon-btn icon-btn--solid" type="button" aria-expanded="false" aria-controls="site-drawer" data-drawer-open>' +
              icon('sun') + '<span class="sr-only">Open the map of the site</span></button>' +
          '</div>' +
        '</div>' +
      '</header>' +
      '<div class="drawer" id="site-drawer" role="dialog" aria-modal="true" aria-label="Site map">' +
        '<div class="container container--wide drawer__top">' + lockup('a') +
          '<button class="icon-btn" type="button" data-drawer-close>' + icon('close') + '<span class="sr-only">Close</span></button>' +
        '</div>' +
        '<nav class="container container--wide drawer__map" aria-label="Site map">' +
          '<div class="drawer__group"><h2><a href="' + url('') + '">Home</a></h2><ul role="list"><li><a href="' + url('design-system/') + '">Design system</a></li></ul></div>' +
          map + '</nav>' +
      '</div>';

    el.querySelectorAll('.lockup').forEach(function (a) { animateMark(a.querySelector('svg')); });
  });

  define('hw-signup', function (el) {
    var id = 'su-' + Math.random().toString(36).slice(2, 7);
    el.innerHTML =
      '<section class="signup-strip" data-room="deep" aria-labelledby="' + id + '">' +
        '<form class="container container--wide" action="#" method="post" data-demo-form data-done="Welcome. Check your inbox.">' +
          '<h2 id="' + id + '">Receive the weekly letter</h2>' +
          '<label class="sr-only" for="' + id + '-n">Name</label>' +
          '<input class="input" id="' + id + '-n" name="name" type="text" placeholder="Name" autocomplete="given-name">' +
          '<label class="sr-only" for="' + id + '-e">Email</label>' +
          '<input class="input" id="' + id + '-e" name="email" type="email" placeholder="Email" autocomplete="email" required>' +
          '<button class="btn btn--solid" type="submit">Join 3,300+ seekers</button>' +
        '</form>' +
      '</section>';
  });

  define('hw-footer', function (el) {
    var cols = SITE.footer.map(function (c) {
      return '<div><h3>' + esc(c.title) + '</h3><ul role="list">' + c.links.map(function (l) {
        return '<li><a href="' + url(l.href) + '"' + (l.external ? ' rel="noopener"' : '') + '>' + esc(l.label) + '</a></li>';
      }).join('') + '</ul></div>';
    }).join('');
    el.innerHTML =
      '<footer class="site-footer">' +
        '<div class="container container--wide site-footer__main">' +
          lockup('a') +
          '<div class="site-footer__cols">' +
            '<p class="site-footer__about">' + esc(SITE.tagline) + '</p>' +
            '<nav class="site-footer__nav" aria-label="Footer">' + cols + '</nav>' +
          '</div>' +
        '</div>' +
        '<div class="container container--wide site-footer__bar">' +
          '<span>© ' + new Date().getFullYear() + ' Hermitage World. All rights reserved.</span>' +
          '<span><a href="' + url('design-system/') + '">Design system</a> · Created by Iris Cocreative</span>' +
        '</div>' +
      '</footer>';
    el.querySelectorAll('.lockup').forEach(function (a) { animateMark(a.querySelector('svg')); });
  });

  /* ------------------------------------------------------------ behaviors */
  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  ready(function () {
    var html = document.documentElement;

    /* Reveal on scroll */
    var revealEls = document.querySelectorAll('[data-reveal]');
    if (reduced || !('IntersectionObserver' in window)) {
      html.classList.add('no-reveal');
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
      revealEls.forEach(function (el) { io.observe(el); });
    }

    /* Accordions. Inside [data-accordion-group] only one stays open. */
    document.querySelectorAll('.accordion__toggle').forEach(function (btn) {
      var acc = btn.closest('.accordion');
      btn.setAttribute('aria-expanded', acc.classList.contains('is-open') ? 'true' : 'false');
      btn.addEventListener('click', function () {
        var open = !acc.classList.contains('is-open');
        var group = acc.closest('[data-accordion-group]');
        if (open && group) group.querySelectorAll('.accordion.is-open').forEach(function (o) {
          o.classList.remove('is-open');
          o.querySelector('.accordion__toggle').setAttribute('aria-expanded', 'false');
        });
        acc.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });

    /* Carousels: [data-carousel] > [data-carousel-track] + prev/next buttons */
    document.querySelectorAll('[data-carousel]').forEach(function (root) {
      var track = root.querySelector('[data-carousel-track]');
      if (!track) return;
      var items = Array.prototype.slice.call(track.children);
      function offsets() { return items.map(function (el) { return el.offsetLeft - track.offsetLeft; }); }
      function nearest() {
        var o = offsets(), x = track.scrollLeft, best = 0;
        o.forEach(function (v, i) { if (Math.abs(v - x) < Math.abs(o[best] - x)) best = i; });
        return best;
      }
      function go(dir) {
        var i = Math.max(0, Math.min(items.length - 1, nearest() + dir));
        track.scrollTo({ left: offsets()[i], behavior: reduced ? 'auto' : 'smooth' });
      }
      var prev = root.querySelector('[data-carousel-prev]');
      var next = root.querySelector('[data-carousel-next]');
      if (prev) prev.addEventListener('click', function () { go(-1); });
      if (next) next.addEventListener('click', function () { go(1); });
    });

    /* Demo forms: nothing is sent anywhere yet, and the button says so. */
    document.querySelectorAll('[data-demo-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = form.querySelector('[type="submit"]');
        if (!btn) return;
        btn.textContent = form.getAttribute('data-done') || 'Thank you.';
        btn.classList.add('is-done');
        btn.disabled = true;
      });
    });

    /* Drawer (the site map behind the sun button) */
    var drawer = document.getElementById('site-drawer');
    var opener = document.querySelector('[data-drawer-open]');
    if (drawer && opener) {
      var closer = drawer.querySelector('[data-drawer-close]');
      var setOpen = function (open) {
        drawer.classList.toggle('is-open', open);
        html.classList.toggle('drawer-open', open);
        opener.setAttribute('aria-expanded', open ? 'true' : 'false');
        (open ? closer : opener).focus();
      };
      opener.addEventListener('click', function () { setOpen(true); });
      closer.addEventListener('click', function () { setOpen(false); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('is-open')) setOpen(false); });
    }

    /* Overlay header turns solid once the page is scrolled past [data-header-until] */
    var header = document.querySelector('.site-header--overlay');
    if (header) {
      var until = document.querySelector('[data-header-until]');
      var onScroll = function () {
        var limit = until ? until.offsetTop + until.offsetHeight - header.offsetHeight - 2 : 40;
        header.classList.toggle('is-solid', window.scrollY > limit);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      onScroll();
    }
  });

  window.HW = { SITE: SITE, url: url, asset: asset, icon: icon, esc: esc, markSVG: markSVG };
})();
