/* Hermitage World prototype — motion & nav
   One authored moment: the passage from daylight into the lit interior.
   Everything is visible without JS; JS only adds the reveal choreography. */

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

  if (reduced) {
    /* Light every aperture immediately; no choreography */
    document.querySelectorAll('.ap[data-ignite]').forEach(function (ap) {
      ap.classList.add('lit');
    });
    return;
  }

  document.documentElement.classList.add('r-init');

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
