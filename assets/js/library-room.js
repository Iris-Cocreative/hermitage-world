/* ==========================================================================
   The Library (prototype) — renders /library/ from assets/data/catalog.js.
   --------------------------------------------------------------------------
   One catalog, four ways in: shelves of objects, a rose window, paths, and
   the plain list. Search and filters apply to all four. The "Viewing as"
   switch changes what each object says about access; saved items and the
   chosen persona are kept in this browser only (it is a prototype).
   ========================================================================== */
(function () {
  'use strict';

  var C = window.HWCatalog, H = window.HW;
  if (!C || !H) return;

  var ITEMS = C.items, PEOPLE = C.people, OCC = C.occasions;
  var BY = {}; ITEMS.forEach(function (r) { BY[r.id] = r; r.rel = r.rel || {}; r.inbound = {}; });
  ITEMS.forEach(function (r) {
    Object.keys(r.rel).forEach(function (k) {
      r.rel[k].forEach(function (t) { if (BY[t]) (BY[t].inbound[k] = BY[t].inbound[k] || []).push(r.id); });
    });
  });
  var TRACKS = {}; ITEMS.forEach(function (r) { if (r.album) (TRACKS[r.album] = TRACKS[r.album] || []).push(r); });

  var KINDS = {
    meditation: { label: 'Meditations', kinds: ['track'] },
    album: { label: 'Albums', kinds: ['album'] },
    book: { label: 'Books', kinds: ['book', 'set'] },
    video: { label: 'Video', kinds: ['video', 'series'] },
    program: { label: 'Programs', kinds: ['program'] },
    circle: { label: 'Reading circles', kinds: ['circle'] }
  };
  var KIND_OF = {}; Object.keys(KINDS).forEach(function (g) { KINDS[g].kinds.forEach(function (k) { KIND_OF[k] = g; }); });
  var LABEL = { track: 'Meditation', album: 'Album', book: 'Book', set: 'Set of books', video: 'Video', series: 'Video series', program: 'Program', circle: 'Reading circle' };
  var VOICES = { justin: 'Friar Justin & the Series', community: 'Other Hermitage voices', together: 'Read together' };
  var ACCESS = { free: 'Free', price: 'Small cost', soon: 'Being prepared', elsewhere: 'At booksellers' };
  var GLASS_OF = { morning: 'amber', beginning: 'amber', music: 'amber', evening: 'blue', young: 'blue', healing: 'verdigris', life: 'verdigris', text: 'madder', together: 'madder' };

  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  var esc = H.esc, icon = H.icon;
  function glass(r) { return 'var(--glass-' + (GLASS_OF[r.occasion[0]] || 'amber') + ')'; }
  function roman(n) {
    var v = [10, 9, 5, 4, 1], s = ['X', 'IX', 'V', 'IV', 'I'], out = '';
    for (var i = 0; i < v.length; i++) while (n >= v[i]) { out += s[i]; n -= v[i]; }
    return out;
  }
  function money(n) { return '$' + (n % 1 ? n.toFixed(2) : n); }
  function person(id) { return PEOPLE[id] || { name: id, short: id }; }
  function byLine(r) { return r.by.map(function (id) { return person(id).short; }).join(', '); }
  function byLong(r) { return r.by.map(function (id) { return person(id).name; }).join(', '); }
  function where(r) {
    if (r.kind !== 'track') return r.sub || '';
    var a = BY[r.album];
    return (a.title.indexOf('Opus') === 0 ? a.title + ', ' : '') + 'Vol. ' + r.vol + ', track ' + r.track;
  }

  /* -------------------------------------------------------------- state */
  var state = { q: '', kind: [], occasion: [], voice: [], access: [], view: 'shelves', persona: 'friend', saved: [] };
  try {
    var kept = JSON.parse(localStorage.getItem('hw-library-proto') || '{}');
    if (kept.persona) state.persona = kept.persona;
    if (Array.isArray(kept.saved)) state.saved = kept.saved.filter(function (id) { return BY[id]; });
  } catch (e) {}
  function keep() { try { localStorage.setItem('hw-library-proto', JSON.stringify({ persona: state.persona, saved: state.saved })); } catch (e) {} }

  function accessOf(r) {
    var family = state.persona === 'family';
    if (r.kind === 'circle') return { state: 'past', tag: 'Spring ' + r.year, long: 'Met in spring ' + r.year, hint: 'This circle has finished. The next one will be announced in the weekly letter.', act: 'Hear about the next circle' };
    if (r.access === 'free') return { state: 'free', tag: 'Free', long: 'Free to everyone', hint: 'No account needed.', draft: r.freeDraft, act: r.kind === 'track' ? 'Listen' : 'Open' };
    if (r.access === 'price') {
      if (family) return { state: 'yours', tag: 'Included', long: 'Included with your Family membership', hint: 'Normally ' + money(r.price) + '. Membership is a phase-two proposal.', draft: true, act: r.kind === 'book' || r.kind === 'set' ? 'Order your copy' : 'Listen' };
      var hint = 'A one-time purchase, yours to keep.';
      if (r.kind === 'track') hint += ' Or the whole of ' + BY[r.album].title + ' for ' + money(BY[r.album].price) + '.';
      if (r.kind === 'book') hint += ' Or all three books for $40.';
      return { state: 'price', tag: money(r.price), long: money(r.price), hint: hint, act: 'Buy for ' + money(r.price) };
    }
    if (r.access === 'soon') {
      if (r.kind === 'program') return { state: 'soon', tag: 'Dates to come', long: 'Dates to come', hint: 'Registration opens with the next dates.', act: r.href ? 'See the program' : 'Hear when it opens', href: r.href };
      return { state: 'soon', tag: 'Being prepared', long: 'Being prepared', hint: 'Being cleaned, titled and chaptered. Free to watch when it arrives.', act: 'Tell me when it’s ready' };
    }
    return { state: 'elsewhere', tag: 'At booksellers', long: 'Find it at a bookseller', hint: 'Not the Hermitage’s own book; find it wherever you buy books.', act: 'Find the book' };
  }

  /* ------------------------------------------------------------ matching */
  ITEMS.forEach(function (r) {
    r.hay = [r.title, r.sub, r.blurb, LABEL[r.kind], KINDS[KIND_OF[r.kind]].label, VOICES[r.voice], byLong(r),
      r.album ? BY[r.album].title + ' ' + BY[r.album].sub : '', r.vol ? 'vol ' + r.vol + ' volume ' + r.vol : '',
      r.occasion.map(function (o) { return OCC[o]; }).join(' '), r.kind === 'track' && /child/i.test(r.title) ? 'children' : ''
    ].join(' ').toLowerCase().replace(/[’']/g, '');
  });
  function matchQ(r) {
    if (!state.q) return true;
    return state.q.toLowerCase().replace(/[’']/g, '').split(/\s+/).filter(Boolean).every(function (t) { return r.hay.indexOf(t) > -1; });
  }
  function matches(r, skip) {
    if (!matchQ(r)) return false;
    if (skip !== 'kind' && state.kind.length && state.kind.indexOf(KIND_OF[r.kind]) < 0) return false;
    if (skip !== 'occasion' && state.occasion.length && !r.occasion.some(function (o) { return state.occasion.indexOf(o) > -1; })) return false;
    if (skip !== 'voice' && state.voice.length && state.voice.indexOf(r.voice) < 0) return false;
    if (skip !== 'access' && state.access.length && state.access.indexOf(r.access) < 0) return false;
    return true;
  }
  function active() { return !!(state.q || state.kind.length || state.occasion.length || state.voice.length || state.access.length); }

  /* ------------------------------------------------------------- objects */
  function obj(r, opts) {
    opts = opts || {};
    var a = accessOf(r), cls = 'obj obj--' + r.kind + (a.state === 'soon' ? ' is-soon' : ''), body = '', cap = '';
    var tag = '<span class="obj__tag is-' + a.state + '">' + esc(a.tag) + '</span>';
    var saved = state.persona !== 'guest' && state.saved.indexOf(r.id) > -1 ? '<span class="obj__save" title="On your shelf">' + icon('heart') + '</span>' : '';
    var capT = '<span class="obj__cap"><span class="obj__t">' + esc(r.title) + '</span><span class="obj__by">' + esc(r.kind === 'album' ? r.sub : byLine(r)) + '</span></span>';
    switch (r.kind) {
      case 'track':
        body = tag + '<span class="obj__vol">Vol. ' + roman(r.vol) + ' · ' + r.track + '</span><span class="obj__title">' + esc(r.title) + '</span><span class="obj__foot">' + (r.minutes ? r.minutes + ' min' : 'length to come') + '</span>';
        cap = '<span class="obj__cap"><span class="obj__by">' + esc(byLine(r)) + '</span></span>';
        break;
      case 'album':
        if (r.discs) cls += ' is-set';
        var name = r.title.indexOf('Opus') === 0 ? r.title : r.vol ? 'Vol. ' + roman(r.vol) : r.id === 'vol-22' ? 'Vol. XXII' : 'Full Living';
        body = '<span class="disc__label"><span class="disc__name">' + esc(name) + '</span></span>' + tag;
        cap = capT;
        break;
      case 'book':
        if (opts.face) {
          cls += ' is-face';
          body = '<span class="cover__t">' + esc(r.title) + '</span><span class="cover__s">' + esc(r.kind === 'book' && r.voice === 'together' ? '' : r.sub) + '</span><span class="cover__a">' + esc(person(r.by[0]).short) + '</span>' + tag;
        } else {
          body = '<span class="spine__t">' + esc(r.title) + '</span><span class="spine__a">' + esc(person(r.by[0]).short.split(' ').pop()) + '</span>';
        }
        cap = '<span class="obj__cap"><span class="obj__t">' + esc(r.title) + '</span><span class="obj__by">' + esc(a.tag) + '</span></span>';
        break;
      case 'set':
        body = tag + '<span class="stack__n">' + r.count + '</span><span class="stack__k">books</span><span class="stack__t">' + esc(r.title) + '</span>';
        cap = '<span class="obj__cap"><span class="obj__by">' + esc(byLine(r)) + '</span></span>';
        break;
      case 'video':
        body = tag + '<span class="frame__play">' + icon('play') + '</span><span class="frame__src">' + esc(person(r.by[0]).short) + '</span>';
        cap = capT;
        break;
      case 'series':
        body = tag + '<span class="frame__play">' + icon('video') + '</span><span class="frame__src">' + esc(person(r.by[0]).short) + '</span><span class="frame__hours">' + (r.hours % 1 ? '7–8' : r.hours) + ' h</span>';
        cap = capT;
        break;
      case 'program':
        var steps = '';
        for (var i = 1; i <= r.lessons; i++) steps += '<i>' + roman(i) + '</i>';
        if (r.lessons === 1) steps = '<i>One day</i>';
        body = tag + '<span class="prog__k">' + esc(r.sub) + '</span><span class="prog__t">' + esc(r.title) + '</span><span class="prog__s">' + esc(byLine(r)) + '</span><span class="prog__steps">' + steps + '</span>';
        cap = '';
        break;
      case 'circle':
        var seats = '';
        for (var s = 0; s < r.sessions; s++) seats += '<span class="seat is-lit" style="--i:' + s + '"></span>';
        body = seats + '<span class="circle__c">' + esc(BY[r.rel.reads[0]].title) + '</span>' + tag;
        cap = '<span class="obj__cap"><span class="obj__t">Read together</span><span class="obj__by">' + esc(r.sub) + '</span></span>';
        break;
    }
    var label = LABEL[r.kind] + ': ' + r.title + (r.kind === 'album' ? ', ' + r.sub : '') + '. ' + a.long + '.';
    var tagName = opts.static ? 'span' : 'button';
    return '<' + tagName + ' class="' + cls + '"' + (opts.static ? '' : ' type="button" data-open="' + r.id + '" aria-label="' + esc(label) + '"') +
      ' style="--glass:' + glass(r) + (r.thick ? ';--thick:' + r.thick : '') + '"><span class="obj__body">' + body + saved + '</span>' + (opts.static ? '' : cap) + '</' + tagName + '>';
  }

  /* ------------------------------------------------------------- shelves */
  function fill(name, html, empty) {
    var el = $('[data-shelf="' + name + '"] .shelf');
    if (el) el.innerHTML = html || '<p class="shelf__empty">' + (empty || 'Nothing here yet.') + '</p>';
  }
  function pairLabel(a, b) {
    var t = a.title + ' ' + b.title;
    if (/Morning/.test(a.title) && /Evening/.test(b.title)) return 'and at evening';
    if (/private|one person/i.test(a.title) && /group/i.test(b.title)) return 'and together';
    if (a.id === 't-healing-self') return 'and for those who love you';
    if (/Explanation|How Self Image|Selected Poems|White Light|Students|St\. Francis/.test(a.title)) return 'and then';
    return /Psalm|Canticle/.test(t) ? 'and then' : 'with';
  }
  function companions() {
    var seen = {}, out = [];
    ITEMS.forEach(function (r) {
      if (r.kind !== 'track') return;
      (r.rel.companion || []).forEach(function (id) {
        var o = BY[id]; if (!o || o.kind !== 'track') return;
        var a = r, b = o;
        if (a.vol > b.vol || (a.vol === b.vol && a.track > b.track)) { a = o; b = r; }
        var key = a.id + '|' + b.id;
        if (seen[key]) return; seen[key] = true;
        out.push([a, b]);
      });
    });
    return out.sort(function (x, y) { return x[0].vol - y[0].vol || x[0].track - y[0].track; });
  }
  function renderShelves() {
    var signed = state.persona !== 'guest';
    var mine = $('[data-shelf="mine"]');
    mine.hidden = !signed;
    if (signed) fill('mine', state.saved.map(function (id) { return obj(BY[id]); }).join(''), 'Nothing saved yet. Open anything and choose Save, and it waits for you here.');
    fill('free', ITEMS.filter(function (r) { return r.access === 'free' && r.kind !== 'circle'; }).map(function (r) { return obj(r); }).join(''));
    fill('companions', companions().map(function (p) {
      return '<div class="pair">' + obj(p[0]) + '<span class="pair__and">' + esc(pairLabel(p[0], p[1])) + '</span>' + obj(p[1]) + '</div>';
    }).join(''));
    fill('albums', ITEMS.filter(function (r) { return r.kind === 'album'; }).map(function (r) { return obj(r); }).join(''));
    fill('books', ITEMS.filter(function (r) { return (r.kind === 'book' || r.kind === 'set') && r.voice === 'justin'; }).map(function (r) { return obj(r); }).join(''));
    fill('text', ITEMS.filter(function (r) { return r.kind === 'track' && r.occasion.indexOf('text') > -1; }).map(function (r) { return obj(r); }).join(''));
    fill('video', ITEMS.filter(function (r) { return r.kind === 'video' || r.kind === 'series'; }).map(function (r) { return obj(r); }).join(''));
    fill('community', ITEMS.filter(function (r) { return r.voice === 'community' && r.kind !== 'program'; }).map(function (r) { return obj(r); }).join(''));
    var circle = BY['universal-christ-circle'];
    fill('together', '<div class="pair">' + obj(BY[circle.rel.reads[0]], { face: true }) + '<span class="pair__and">read together by</span>' + obj(circle) + '</div>');
    fill('programs', ITEMS.filter(function (r) { return r.kind === 'program'; }).map(function (r) { return obj(r); }).join(''));

    $$('[data-feature]').forEach(function (f) {
      var r = BY[f.dataset.feature]; if (!r) return;
      f.style.setProperty('--glass', glass(r));
      $('.lectern__obj', f).innerHTML = obj(r, { static: true, face: true });
      $('.lectern__title', f).textContent = r.title;
      var by = $('.lectern__by', f); if (by) by.textContent = LABEL[r.kind] + ' · ' + where(r) + ' · ' + accessOf(r).long;
      f.dataset.open = r.id;
    });
  }

  function renderResults(set) {
    var out = $('#lib-results');
    if (!active()) { out.innerHTML = ''; return; }
    if (!set.length) { out.innerHTML = zero(); return; }
    out.innerHTML = Object.keys(KINDS).map(function (g) {
      var list = set.filter(function (r) { return KIND_OF[r.kind] === g; });
      if (!list.length) return '';
      return '<section class="lib-sec"><div class="lib-sec__head"><div><h2>' + KINDS[g].label + '</h2><p class="lib-sec__sub">' + list.length + (list.length === 1 ? ' match' : ' matches') + '</p></div></div><div class="shelf">' + list.map(function (r) { return obj(r); }).join('') + '</div></section>';
    }).join('');
  }
  function zero() {
    var tries = [];
    if (state.q) tries.push(['q', 'Clear “' + state.q + '”']);
    ['kind', 'occasion', 'voice', 'access'].forEach(function (k) { if (state[k].length) tries.push([k, 'Any ' + ({ kind: 'kind', occasion: 'time', voice: 'voice', access: 'access' })[k], ITEMS.filter(function (r) { return matches(r, k); }).length]); });
    return '<div class="lib-zero"><h3>Nothing on these shelves matches.</h3><p>Loosen one thing and try again:</p><div class="chips">' +
      tries.map(function (t) { return '<button class="chip" type="button" data-loosen="' + t[0] + '"><span>' + esc(t[1]) + (t[2] != null ? ' <small class="n">' + t[2] + '</small>' : '') + '</span></button>'; }).join('') + '</div></div>';
  }

  /* -------------------------------------------------------------- facets */
  function buildFacets() {
    var groups = {
      kind: Object.keys(KINDS).map(function (k) { return [k, KINDS[k].label]; }),
      occasion: Object.keys(OCC).map(function (k) { return [k, OCC[k]]; }),
      voice: Object.keys(VOICES).map(function (k) { return [k, VOICES[k]]; }),
      access: Object.keys(ACCESS).map(function (k) { return [k, ACCESS[k]]; })
    };
    Object.keys(groups).forEach(function (f) {
      $('[data-facet="' + f + '"]').innerHTML = groups[f].map(function (o) {
        return '<label class="chip"><input type="checkbox" name="' + f + '" value="' + o[0] + '"><span>' + esc(o[1]) + ' <small class="n"></small></span></label>';
      }).join('');
    });
  }
  function counts() {
    $$('.lib-facets input').forEach(function (inp) {
      var f = inp.name, v = inp.value;
      var n = ITEMS.filter(function (r) {
        if (!matches(r, f)) return false;
        if (f === 'kind') return KIND_OF[r.kind] === v;
        if (f === 'occasion') return r.occasion.indexOf(v) > -1;
        return r[f] === v;
      }).length;
      inp.checked = state[f].indexOf(v) > -1;
      $('.n', inp.parentNode).textContent = n;
      inp.parentNode.classList.toggle('is-empty', !n && !inp.checked);
    });
  }

  /* ---------------------------------------------------------- the window */
  var rose = null;
  function arc(r1, r2, a1, a2) {
    function p(r, a) { return (r * Math.cos(a)).toFixed(2) + ' ' + (r * Math.sin(a)).toFixed(2); }
    var large = a2 - a1 > Math.PI ? 1 : 0;
    return 'M' + p(r1, a1) + 'L' + p(r2, a1) + 'A' + r2 + ' ' + r2 + ' 0 ' + large + ' 1 ' + p(r2, a2) + 'L' + p(r1, a2) + 'A' + r1 + ' ' + r1 + ' 0 ' + large + ' 0 ' + p(r1, a1) + 'Z';
  }
  function pane(r, d, extra) {
    return '<path class="rose__pane' + (extra || '') + '" d="' + d + '" style="--glass:' + glass(r) + '" data-open="' + r.id + '" tabindex="0" role="button" aria-label="' + esc(LABEL[r.kind] + ': ' + r.title + '. ' + accessOf(r).long) + '"/>';
  }
  function buildRose() {
    var svg = $('#rose'); if (!svg) return;
    var albums = ITEMS.filter(function (r) { return r.kind === 'album'; });
    var border = ITEMS.filter(function (r) { return !r.album && r.kind !== 'album'; });
    var sfl = BY['sfl-album'], sflForms = (sfl.rel.form || []).map(function (id) { return BY[id]; });
    border = border.filter(function (r) { return sflForms.indexOf(r) < 0; });
    var n = albums.length, step = Math.PI * 2 / n, start = -Math.PI / 2 - step / 2, gap = 0.014;
    var s = '<circle class="rose__frame" r="482"/><circle class="rose__frame--thin rose__frame" r="472"/><circle class="rose__frame" r="404"/><circle class="rose__frame--thin rose__frame" r="196"/><circle class="rose__frame--thin rose__frame" r="82"/>';
    var nums = '';
    albums.forEach(function (al, i) {
      var a1 = start + i * step, a2 = a1 + step, mid = (a1 + a2) / 2;
      s += pane(al, arc(88, 190, a1 + gap, a2 - gap), ' is-album');
      var lab = al.title.indexOf('Opus') === 0 ? al.title.replace('Opus ', '') : al.id === 'vol-22' ? 'XXII' : 'SFL';
      nums += '<text class="rose__num" data-for="' + al.id + '" x="' + (139 * Math.cos(mid)).toFixed(1) + '" y="' + (139 * Math.sin(mid)).toFixed(1) + '">' + lab + '</text>';
      var kids = TRACKS[al.id] || sflForms;
      var k = kids.length, sub = (step - gap * 2) / k;
      kids.forEach(function (t, j) {
        var b1 = a1 + gap + j * sub, b2 = b1 + sub;
        s += pane(t, arc(202, 396, b1 + 0.006, b2 - 0.006));
      });
      var b = border[i];
      if (b) {
        var cx = (440 * Math.cos(mid)).toFixed(1), cy = (440 * Math.sin(mid)).toFixed(1);
        s += '<circle class="rose__pane" cx="' + cx + '" cy="' + cy + '" r="26" style="--glass:' + glass(b) + '" data-open="' + b.id + '" tabindex="0" role="button" aria-label="' + esc(LABEL[b.kind] + ': ' + b.title + '. ' + accessOf(b).long) + '"/>';
      }
      s += '<line class="rose__lead" x1="' + (82 * Math.cos(a1)).toFixed(1) + '" y1="' + (82 * Math.sin(a1)).toFixed(1) + '" x2="' + (404 * Math.cos(a1)).toFixed(1) + '" y2="' + (404 * Math.sin(a1)).toFixed(1) + '"/>';
    });
    // the sun at the center: one disc, eight satellites
    var sun = '<circle class="rose__core" r="42"/>';
    for (var q = 0; q < 8; q++) { var ang = -Math.PI / 2 + q * Math.PI / 4; sun += '<circle class="rose__core" r="' + (7 + (q % 3) * 0.6) + '" cx="' + (64 * Math.cos(ang)).toFixed(1) + '" cy="' + (64 * Math.sin(ang)).toFixed(1) + '"/>'; }
    svg.innerHTML = s + nums + '<g aria-hidden="true">' + sun + '</g>';
    rose = { svg: svg };

    var tip = $('#rose-tip'), wrap = $('.rose');
    function show(el) {
      var r = BY[el.getAttribute('data-open')]; if (!r) return;
      tip.innerHTML = '<span class="t-caps">' + esc(LABEL[r.kind]) + ' · ' + esc(accessOf(r).tag) + '</span><b>' + esc(r.title) + '</b>' + esc(r.kind === 'album' ? r.sub : where(r) || byLine(r));
      tip.hidden = false;
      var box = wrap.getBoundingClientRect(), pt = el.getBoundingClientRect();
      var x = pt.left - box.left + pt.width / 2, y = pt.top - box.top;
      tip.style.left = Math.max(0, Math.min(x - 120, box.width - 272)) + 'px';
      tip.style.top = Math.max(0, y - tip.offsetHeight - 10) + 'px';
    }
    svg.addEventListener('mouseover', function (e) { var p = e.target.closest('.rose__pane'); if (p) show(p); });
    svg.addEventListener('focusin', function (e) { var p = e.target.closest('.rose__pane'); if (p) show(p); });
    svg.addEventListener('mouseleave', function () { tip.hidden = true; });
    svg.addEventListener('focusout', function () { tip.hidden = true; });
    svg.addEventListener('keydown', function (e) {
      var p = e.target.closest('.rose__pane');
      if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDrawer(p.getAttribute('data-open')); }
    });
  }
  function dimRose() {
    if (!rose) return;
    var on = active();
    $$('.rose__pane', rose.svg).forEach(function (p) { p.classList.toggle('is-dim', on && !matches(BY[p.getAttribute('data-open')])); });
    $$('.rose__num', rose.svg).forEach(function (t) {
      var al = BY[t.getAttribute('data-for')];
      var lit = !on || matches(al) || (TRACKS[al.id] || []).some(function (x) { return matches(x); });
      t.classList.toggle('is-dim', !lit);
    });
  }

  /* -------------------------------------------------------------- paths */
  function buildPaths() {
    $('#lib-paths').innerHTML = C.paths.map(function (p) {
      return '<article class="path" id="path-' + p.id + '"><header><h3>' + esc(p.title) + '</h3><p class="path__by">' + esc(p.by) + '</p><p class="path__desc">' + esc(p.desc) + '</p><p class="path__time">' + esc(p.time) + '</p></header>' +
        '<ol class="pathway pathway--list" role="list">' + p.stops.map(function (st) {
          var r = BY[st[0]];
          return '<li class="pathway__step" data-stop="' + r.id + '"><button class="path__stop" type="button" data-open="' + r.id + '"><span class="t">' + esc(r.title) + '</span><span class="k">' + esc(LABEL[r.kind] + ' · ' + accessOf(r).tag) + '</span></button><p class="path__note">' + esc(st[1]) + '</p></li>';
        }).join('') + '</ol></article>';
    }).join('');
  }
  function dimPaths() {
    var on = active();
    $$('#lib-paths .pathway__step').forEach(function (li) { li.classList.toggle('is-dim', on && !matches(BY[li.dataset.stop])); });
    $$('#lib-paths .path__stop .k').forEach(function (k) { var r = BY[k.parentNode.dataset.open]; k.textContent = LABEL[r.kind] + ' · ' + accessOf(r).tag; });
  }

  /* ------------------------------------------------------------ catalog */
  var ORDER = [];
  ITEMS.forEach(function (r) { if (r.kind === 'album') { ORDER.push(r); (TRACKS[r.id] || []).forEach(function (t) { ORDER.push(t); }); } });
  ITEMS.forEach(function (r) { if (r.kind !== 'album' && r.kind !== 'track') ORDER.push(r); });
  function buildCatalog() {
    $('#lib-catalog').innerHTML = ORDER.map(function (r) {
      var lab = r.kind === 'track' ? 'Vol. ' + r.vol + ' · ' + r.track : LABEL[r.kind];
      var small = r.kind === 'track' ? 'Meditation' : r.kind === 'album' ? r.sub : byLine(r);
      return '<li class="board__row' + (r.kind === 'track' ? ' is-child' : '') + '" data-row="' + r.id + '">' +
        '<span class="board__label">' + esc(lab) + '<small>' + esc(small) + '</small></span>' +
        '<div><p class="board__title"><button type="button" data-open="' + r.id + '">' + esc(r.title) + '</button></p><p class="board__text">' + esc(r.blurb) + '</p></div>' +
        '<span class="board__action"><span class="tag" data-row-tag></span></span></li>';
    }).join('');
  }
  function filterCatalog() {
    $$('#lib-catalog [data-row]').forEach(function (li) {
      var r = BY[li.dataset.row], a = accessOf(r);
      li.hidden = !matches(r);
      var t = $('[data-row-tag]', li);
      t.textContent = a.tag;
      t.className = 'tag' + (a.state === 'free' || a.state === 'yours' ? ' tag--accent' : a.state === 'soon' ? ' tag--soon' : '');
    });
  }

  /* ------------------------------------------------------------- drawer */
  var drawer = $('#lib-drawer'), scrim = $('#lib-scrim'), lastFocus = null;
  function relItem(r, k) {
    return '<button class="lib-rel__item" type="button" data-open="' + r.id + '" style="--glass:' + glass(r) + '"><span class="lib-rel__sw"></span><span><span class="lib-rel__k">' + esc(k || LABEL[r.kind]) + '</span><span class="lib-rel__t">' + esc(r.title) + '</span></span></button>';
  }
  function relGroup(label, list) {
    list = list.filter(Boolean);
    if (!list.length) return '';
    return '<p class="lib-rel__label">' + esc(label) + '</p>' + list.map(function (x) { return relItem(x[0], x[1]); }).join('');
  }
  function openDrawer(id) {
    var r = BY[id]; if (!r) return;
    var a = accessOf(r), signed = state.persona !== 'guest', saved = state.saved.indexOf(r.id) > -1;
    var tags = '<span class="tag">' + esc(LABEL[r.kind]) + '</span><span class="tag">' + esc(VOICES[r.voice]) + '</span>' +
      r.occasion.map(function (o) { return '<span class="tag">' + esc(OCC[o]) + '</span>'; }).join('');
    var by = 'By <b>' + esc(byLong(r)) + '</b>' + (r.by.indexOf('series') > -1 ? ' <span class="draft-mark">voice to confirm</span>' : '');
    var meta = [where(r), r.year, r.kind === 'track' ? (r.minutes ? r.minutes + ' min' : 'length to come') : ''].filter(Boolean).join(' · ');
    var act = a.href
      ? '<a class="btn btn--solid" href="' + H.url(a.href) + '">' + esc(a.act) + '</a>'
      : '<button class="btn btn--solid" type="button" data-toast="' + esc(toastFor(r, a)) + '">' + esc(a.act) + '</button>';
    var save = '<button class="btn" type="button" data-save="' + r.id + '">' + (signed ? (saved ? 'On your shelf' : 'Save') : 'Sign in to save') + '</button>';

    var html = '<button class="icon-btn lib-drawer__close" type="button" data-close>' + icon('close') + '<span class="sr-only">Close</span></button>' +
      '<div class="lib-drawer__hero" style="--glass:' + glass(r) + '">' + obj(r, { static: true, face: true }) + '</div>' +
      '<div class="cluster cluster--tight">' + tags + '</div>' +
      '<h2 class="mt-sm">' + esc(r.title) + '</h2>' +
      '<p class="lib-drawer__by">' + by + (meta ? ' · ' + esc(meta) : '') + '</p>' +
      '<div class="note lib-drawer__access"><div><strong>' + esc(a.long) + '</strong>' + (a.draft ? ' <span class="draft-mark">draft</span>' : '') + '<br>' + esc(a.hint) + '</div></div>' +
      '<div class="cluster lib-drawer__actions">' + act + save + '</div>' +
      '<p class="lib-drawer__blurb">' + esc(r.blurb) + '</p>';

    var rel = '';
    if (r.album) rel += relGroup('On the album', [[BY[r.album], 'Album · ' + BY[r.album].sub]]);
    if (TRACKS[r.id]) rel += relGroup('Tracks', TRACKS[r.id].map(function (t) { return [t, 'Vol. ' + t.vol + ' · track ' + t.track]; }));
    rel += relGroup('Its companions', (r.rel.companion || []).map(function (c) { return BY[c] && [BY[c], 'Companion']; }));
    rel += relGroup('Other forms of this teaching', (r.rel.form || []).concat(r.inbound.form || []).filter(function (x, i, arr) { return arr.indexOf(x) === i; }).map(function (c) { return BY[c] && [BY[c]]; }));
    rel += relGroup('Part of', (r.rel.partOf || []).map(function (c) { return BY[c] && [BY[c]]; }));
    rel += relGroup('Contains', (r.inbound.partOf || []).map(function (c) { return [BY[c]]; }));
    rel += relGroup('The book it read', (r.rel.reads || []).map(function (c) { return [BY[c], 'Book · ' + person(BY[c].by[0]).name]; }));
    rel += relGroup('Read together by', (r.inbound.reads || []).map(function (c) { return [BY[c], 'Reading circle · ' + BY[c].sub]; }));
    var paths = C.paths.filter(function (p) { return p.stops.some(function (st) { return st[0] === r.id; }); });
    if (paths.length) rel += '<p class="lib-rel__label">On these paths</p>' + paths.map(function (p) {
      var i = p.stops.map(function (st) { return st[0]; }).indexOf(r.id);
      return '<button class="lib-rel__item" type="button" data-path="' + p.id + '" style="--glass:var(--accent)"><span class="lib-rel__sw"></span><span><span class="lib-rel__k">Path · step ' + roman(i + 1) + ' of ' + roman(p.stops.length) + '</span><span class="lib-rel__t">' + esc(p.title) + '</span></span></button>';
    }).join('');
    if (rel) html += '<div class="lib-drawer__sec"><h3>Connections</h3><div class="lib-rel">' + rel + '</div></div>';

    html += '<div class="lib-drawer__sec"><h3>Who made it</h3><div class="lib-who">' + r.by.map(function (id) {
      var p = person(id); return '<span class="lib-who__chip">' + esc(p.name) + (p.role ? '<small>' + esc(p.role) + '</small>' : '') + '</span>';
    }).join('') + '</div></div>';

    drawer.innerHTML = html;
    if (!drawer.classList.contains('is-open')) lastFocus = document.activeElement;
    scrim.hidden = false;
    requestAnimationFrame(function () { scrim.classList.add('is-open'); drawer.classList.add('is-open'); });
    drawer.setAttribute('aria-hidden', 'false');
    drawer.scrollTop = 0;
    document.documentElement.classList.add('drawer-open');
    setTimeout(function () { var c = $('[data-close]', drawer); if (c) c.focus({ preventScroll: true }); }, 60);
  }
  function closeDrawer() {
    if (!drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open'); scrim.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('drawer-open');
    setTimeout(function () { scrim.hidden = true; }, 360);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  function toastFor(r, a) {
    if (a.state === 'price') return 'Checkout opens with the store decision';
    if (a.state === 'free' || a.state === 'yours') return 'Listening opens when the cleaned audio arrives';
    if (a.state === 'soon') return 'We’ll write once, when it’s ready';
    if (a.state === 'past') return 'You’ll hear about the next circle in the weekly letter';
    return 'Any bookseller carries it';
  }

  var toastT;
  function toast(msg) {
    var t = $('#lib-toast'); t.textContent = msg + ' (prototype)';
    t.classList.add('is-on'); clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('is-on'); }, 2600);
  }

  /* ------------------------------------------------------- views, update */
  var VIEWS = ['shelves', 'window', 'paths', 'catalog'];
  function setView(v, push) {
    if (VIEWS.indexOf(v) < 0) v = 'shelves';
    state.view = v;
    $$('.lib-tab').forEach(function (t) { t.setAttribute('aria-selected', t.dataset.view === v ? 'true' : 'false'); });
    VIEWS.forEach(function (x) { $('#view-' + x).hidden = x !== v; });
    if (push !== false) { try { history.replaceState(null, '', '#' + v); } catch (e) {} }
  }
  function update() {
    var set = ITEMS.filter(function (r) { return matches(r); });
    $('#lib-editorial').hidden = active();
    renderResults(set);
    counts();
    filterCatalog();
    dimRose();
    dimPaths();
    $('#lib-count').textContent = (active() ? set.length + ' of ' + ITEMS.length : ITEMS.length) + ' in the library';
  }
  function rerenderAll() { renderShelves(); update(); if (rose) { rose = null; buildRose(); dimRose(); } }

  /* -------------------------------------------------------------- events */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-open],[data-close],[data-toast],[data-save],[data-path],[data-try],[data-loosen],[data-goto],[data-only],[data-lib],.lib-tab,#lib-scrim');
    if (!t) return;
    if (t.classList.contains('lib-tab')) return setView(t.dataset.view);
    if (t.id === 'lib-scrim' || t.hasAttribute('data-close')) return closeDrawer();
    if (t.hasAttribute('data-open')) { e.preventDefault(); return openDrawer(t.getAttribute('data-open')); }
    if (t.hasAttribute('data-toast')) return toast(t.getAttribute('data-toast'));
    if (t.hasAttribute('data-save')) {
      if (state.persona === 'guest') return toast('A free Friend account keeps your shelf');
      var id = t.getAttribute('data-save'), i = state.saved.indexOf(id);
      if (i > -1) state.saved.splice(i, 1); else state.saved.unshift(id);
      keep(); renderShelves(); update(); openDrawer(id);
      return toast(i > -1 ? 'Taken off your shelf' : 'Saved to your shelf');
    }
    if (t.hasAttribute('data-path')) {
      closeDrawer(); setView('paths');
      var el = document.getElementById('path-' + t.getAttribute('data-path'));
      if (el) setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 200);
      return;
    }
    if (t.hasAttribute('data-try')) { $('#lib-q').value = t.dataset.try; state.q = t.dataset.try; return update(); }
    if (t.hasAttribute('data-loosen')) {
      var k = t.dataset.loosen;
      if (k === 'q') { state.q = ''; $('#lib-q').value = ''; } else state[k] = [];
      return update();
    }
    if (t.hasAttribute('data-goto')) { setView(t.dataset.goto); return $('.lib-tabs').scrollIntoView({ behavior: 'smooth' }); }
    if (t.hasAttribute('data-only')) {
      var p = t.dataset.only.split(':'); state[p[0]] = [p[1]]; update();
      return $('.lib-desk').scrollIntoView({ behavior: 'smooth' });
    }
    if (t.dataset.lib === 'wander') {
      var pool = ITEMS.filter(function (r) { return matches(r) && (r.kind === 'track'); });
      if (!pool.length) pool = ITEMS.filter(function (r) { return r.kind === 'track'; });
      return openDrawer(pool[Math.floor(Math.random() * pool.length)].id);
    }
  });
  $('#lib-facets').addEventListener('change', function (e) {
    var inp = e.target; if (!inp.name) return;
    var arr = state[inp.name], i = arr.indexOf(inp.value);
    if (inp.checked && i < 0) arr.push(inp.value); else if (!inp.checked && i > -1) arr.splice(i, 1);
    update();
  });
  $('#lib-facets').addEventListener('submit', function (e) { e.preventDefault(); });
  var qT;
  $('#lib-q').addEventListener('input', function (e) { clearTimeout(qT); qT = setTimeout(function () { state.q = e.target.value.trim(); update(); }, 120); });
  $('#lib-catalog').addEventListener('click', function (e) {
    var li = e.target.closest('[data-row]'); if (li && !e.target.closest('[data-open]')) openDrawer(li.dataset.row);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') return closeDrawer();
    var typing = /input|textarea|select/i.test(e.target.tagName || '');
    if (!typing && e.key === '/') { e.preventDefault(); $('#lib-q').focus(); }
  });
  var persona = $('#lib-persona');
  persona.value = state.persona;
  persona.addEventListener('change', function () { state.persona = persona.value; keep(); rerenderAll(); });

  /* ---------------------------------------------------------------- boot */
  buildFacets();
  buildPaths();
  buildCatalog();
  renderShelves();
  buildRose();
  var initial = (location.hash || '').replace('#', '');
  setView(VIEWS.indexOf(initial) > -1 ? initial : 'shelves', false);
  update();
})();
