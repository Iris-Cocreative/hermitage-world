/* ==========================================================================
   The Library — recordings, teachings and meditations.
   --------------------------------------------------------------------------
   Stands in for the catalog Garry is preparing (durations, free vs paid,
   cleaned audio and video). Until it arrives, entries are SAMPLES: they show
   the shape of the catalog, are marked as such on the page, and must not be
   read as real titles. Three real items are known by name (the videos shared
   on the Collab OS surface) and are marked `known: true`.

   Fields: id, title, kind (meditation|homily|teaching), collection,
   minutes (null = unknown), access (free|paid), media (audio|video), known
   ========================================================================== */
(function () {
  'use strict';

  var LIBRARY = [
    { id: 'intro', title: 'An introduction to the Hermitage', kind: 'teaching', collection: 'Teachings', minutes: null, access: 'free', media: 'video', known: true },
    { id: 'goals', title: 'Justin’s goals, for him and for us', kind: 'teaching', collection: 'Teachings', minutes: null, access: 'free', media: 'video', known: true },
    { id: 'prayer', title: 'A spiritual progression through prayer', kind: 'teaching', collection: 'Teachings', minutes: null, access: 'free', media: 'video', known: true },

    { id: 'heal-1', title: 'Healing meditation I', kind: 'meditation', collection: 'Healing meditations', minutes: 20, access: 'free', media: 'audio' },
    { id: 'heal-2', title: 'Healing meditation II', kind: 'meditation', collection: 'Healing meditations', minutes: 25, access: 'free', media: 'audio' },
    { id: 'heal-3', title: 'Healing meditation III', kind: 'meditation', collection: 'Healing meditations', minutes: 18, access: 'free', media: 'audio' },
    { id: 'heal-4', title: 'Healing meditation IV', kind: 'meditation', collection: 'Healing meditations', minutes: 22, access: 'free', media: 'audio' },

    { id: 'guided-1', title: 'Guided meditation I', kind: 'meditation', collection: 'Guided series', minutes: 30, access: 'paid', media: 'audio' },
    { id: 'guided-2', title: 'Guided meditation II', kind: 'meditation', collection: 'Guided series', minutes: 28, access: 'paid', media: 'audio' },
    { id: 'guided-3', title: 'Guided meditation III', kind: 'meditation', collection: 'Guided series', minutes: 35, access: 'paid', media: 'audio' },

    { id: 'hom-1', title: 'Sunday homily', kind: 'homily', collection: 'Sunday homilies', minutes: 22, access: 'free', media: 'video' },
    { id: 'hom-2', title: 'Sunday homily', kind: 'homily', collection: 'Sunday homilies', minutes: 19, access: 'free', media: 'video' },
    { id: 'hom-3', title: 'Sunday homily', kind: 'homily', collection: 'Sunday homilies', minutes: 24, access: 'free', media: 'video' },

    { id: 'sfl-1', title: 'Success: Full Living, the mechanism of a full life', kind: 'teaching', collection: 'Teaching series', minutes: 48, access: 'paid', media: 'video' },
    { id: 'sfl-2', title: 'Success: Full Living, meditation', kind: 'teaching', collection: 'Teaching series', minutes: 52, access: 'paid', media: 'video' },
    { id: 'sfl-3', title: 'Success: Full Living, spirituality', kind: 'teaching', collection: 'Teaching series', minutes: 45, access: 'paid', media: 'video' }
  ];

  var KIND = { meditation: 'Meditation', homily: 'Homily', teaching: 'Teaching' };
  var H = window.HW;

  function tile(r) {
    var meta = [r.collection, r.minutes ? r.minutes + ' min' : 'length to come', r.media === 'video' ? 'Video' : 'Audio'].join(' · ');
    return '<article class="media-tile">' +
      '<button class="icon-btn media-tile__play" type="button" aria-disabled="true" title="Recordings arrive with the catalog">' +
        H.icon(r.media === 'video' ? 'video' : 'play') + '<span class="sr-only">Play ' + H.esc(r.title) + ' (arrives with the catalog)</span></button>' +
      '<div><h3 class="media-tile__title">' + H.esc(r.title) + '</h3><p class="media-tile__meta">' + H.esc(meta) + '</p></div>' +
      '<div class="media-tile__side">' +
        (r.known ? '' : '<span class="draft-mark">sample</span>') +
        '<span class="tag' + (r.access === 'free' ? ' tag--accent' : '') + '">' + (r.access === 'free' ? 'Free' : 'Nominal cost') + '</span>' +
      '</div></article>';
  }

  function render(el) {
    var view = el.getAttribute('data-library');
    var limit = +el.getAttribute('data-limit') || 999;
    var q = (el.getAttribute('data-q') || '').toLowerCase();
    var kind = el.getAttribute('data-kind') || 'all';
    var access = el.getAttribute('data-access') || 'all';
    var list = LIBRARY.filter(function (r) {
      if (view === 'healing' && r.collection !== 'Healing meditations') return false;
      if (view === 'justin' && r.kind === 'meditation' && r.access === 'paid') return false;
      if (kind !== 'all' && r.kind !== kind) return false;
      if (access !== 'all' && r.access !== access) return false;
      if (q && (r.title + ' ' + r.collection).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).slice(0, limit);
    el.innerHTML = list.map(tile).join('') || '<p class="t-muted">Nothing matches yet.</p>';
    var count = document.querySelector('[data-library-count]');
    if (count) count.textContent = list.length + (list.length === 1 ? ' recording' : ' recordings');
  }

  function boot() {
    var lists = document.querySelectorAll('[data-library]');
    lists.forEach(render);
    // filters: [data-library-filter="#target"] holding radios named kind / access and a search input
    document.querySelectorAll('[data-library-filter]').forEach(function (form) {
      var target = document.querySelector(form.getAttribute('data-library-filter'));
      if (!target) return;
      var sync = function () {
        var fd = new FormData(form);
        target.setAttribute('data-kind', fd.get('kind') || 'all');
        target.setAttribute('data-access', fd.get('access') || 'all');
        target.setAttribute('data-q', fd.get('q') || '');
        render(target);
      };
      form.addEventListener('input', sync);
      form.addEventListener('submit', function (e) { e.preventDefault(); sync(); });
    });
  }

  window.HWLibrary = { list: LIBRARY, kinds: KIND };
  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
