/*
 * Sinjal — language switching (Shqip / English / Srpski), shared engine.
 *
 * Same approach as the citizen site (sinjali_citizen/i18n.js): the screens stay authored in
 * Albanian, and this script watches the rendered page and swaps each Albanian string for its
 * translation — text nodes plus the alt / placeholder / aria-label / title attributes, the page
 * title and native confirm/alert/prompt dialogs. It works under any renderer (the .dc.html
 * runtime, React, Preact): when the renderer rewrites a node back to Albanian, the
 * MutationObserver translates it again before the browser paints. The original Albanian is
 * remembered per node, so switching language is always done from the source text.
 *
 * The dictionary lives in each interface's i18n-dict.js, loaded BEFORE this file:
 *
 *   window.SINJAL_I18N_DICT = {
 *     entries: [
 *       // [Albanian source, English, Serbian (Latin)]
 *       ['Përmbledhje', 'Overview', 'Pregled'],
 *       // Patterns: {n…} captures a number, any other {name} captures text (translated too
 *       // when it is itself in the dictionary). In the targets, {name} re-inserts the value and
 *       // {n|one|other} (en) / {n|one|few|many} (sr) picks the plural form for that number.
 *       ['{n} raste', '{n} {n|case|cases}', '{n} {n|slučaj|slučaja|slučajeva}'],
 *       ['Caktuar te {who}', 'Assigned to {who}', 'Dodeljeno: {who}'],
 *     ],
 *     // Optional: extra rules for strings the entries can't express. Return a string or null.
 *     rules: function (key, lang, api) { return null; },
 *   };
 *
 * Strings are matched on their trimmed, whitespace-collapsed form with soft hyphens removed.
 * Anything not in the dictionary (names, codes, user input) is left as is, and so is anything
 * inside [translate="no"], <textarea> or [contenteditable].
 *
 * The toggle is plain markup: <div class="sj-lang"><button data-lang="sq|en|sr">…</div>
 * (add .sj-lang--light on a light background). Clicks are handled here, aria-pressed is kept in
 * sync, and the choice is saved in localStorage ('sinjal_lang') for every page and tab.
 * ?lang=en|sr|sq in the URL also sets it (handy for links and for testing).
 *
 * window.SinjalI18n = { lang, setLang(l), t(str) } for code that needs a translated string
 * outside the DOM (e.g. canvas labels).
 */
(function () {
  'use strict';

  if (window.SinjalI18n) return;

  var LANGS = ['sq', 'en', 'sr'];
  var HTML_LANG = { sq: 'sq', en: 'en', sr: 'sr-Latn' };
  var STORAGE_KEY = 'sinjal_lang';
  var ATTRS = ['alt', 'placeholder', 'aria-label', 'title'];

  var CONF = window.SINJAL_I18N_DICT || {};
  var ENTRIES = CONF.entries || [];
  var RULES = typeof CONF.rules === 'function' ? CONF.rules : null;

  var MONTHS = {
    sq: ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    sr: ['januar', 'februar', 'mart', 'april', 'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar'],
  };
  var MONTHS_SHORT = {
    sq: ['jan', 'shk', 'mar', 'pri', 'maj', 'qer', 'kor', 'gus', 'sht', 'tet', 'nën', 'dhj'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    sr: ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'avg', 'sep', 'okt', 'nov', 'dec'],
  };
  var DAYS = {
    sq: ['e hënë', 'e martë', 'e mërkurë', 'e enjte', 'e premte', 'e shtunë', 'e diel'],
    en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    sr: ['ponedeljak', 'utorak', 'sreda', 'četvrtak', 'petak', 'subota', 'nedelja'],
  };

  function norm(s) { return s.replace(/­/g, '').replace(/\s+/g, ' ').trim(); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

  // ---------- Dictionary ----------------------------------------------------------------
  var DICT = { en: {}, sr: {} };
  var PATTERNS = [];
  var HOLE = /\{([A-Za-z][A-Za-z0-9_]*)\}/g;

  ENTRIES.forEach(function (e) {
    if (!e || e.length < 3) return;
    var src = norm(e[0]);
    if (!/\{[A-Za-z][A-Za-z0-9_]*\}/.test(src)) { DICT.en[src] = e[1]; DICT.sr[src] = e[2]; return; }
    var names = [], re = '', last = 0, m;
    HOLE.lastIndex = 0;
    while ((m = HOLE.exec(src))) {
      re += esc(src.slice(last, m.index));
      re += /^n/.test(m[1]) ? '(-?\\d[\\d.,\\u00A0 ]*?)' : '(.+?)';
      names.push(m[1]);
      last = m.index + m[0].length;
    }
    re += esc(src.slice(last));
    PATTERNS.push({ re: new RegExp('^' + re + '$'), names: names, en: e[1], sr: e[2] });
  });

  function num(s) { return parseFloat(String(s).replace(/[\s .]/g, '').replace(',', '.')); }

  function plural(n, lang, forms) {
    if (lang === 'en') return Math.abs(n) === 1 ? forms[0] : (forms[1] || forms[0]);
    var i = Math.abs(Math.trunc(n)), m10 = i % 10, m100 = i % 100;
    if (n !== Math.trunc(n)) return forms[1] || forms[0];
    if (m10 === 1 && m100 !== 11) return forms[0];
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return forms[1] || forms[0];
    return forms[2] || forms[1] || forms[0];
  }

  function fill(tpl, vals, lang) {
    return tpl.replace(/\{([A-Za-z][A-Za-z0-9_]*)((?:\|[^|}]*)*)\}/g, function (all, name, forms) {
      if (!has(vals, name)) return all;
      if (forms) return plural(num(vals[name]), lang, forms.slice(1).split('|'));
      var v = vals[name];
      if (/^n/.test(name)) return v;
      var t = translateKey(norm(v), lang);
      return t == null ? v : t;
    });
  }

  var MON_RE = MONTHS.sq.join('|');
  var DATE_RE = new RegExp('^(\\d{1,2})\\.? (' + MON_RE + ')( \\d{4})?$', 'i');
  var DATE_SHORT_RE = new RegExp('^(\\d{1,2}) (' + MONTHS_SHORT.sq.join('|') + ')\\.?( \\d{4})?$', 'i');
  var DAY_DATE_RE = new RegExp('^(' + DAYS.sq.join('|') + '), (\\d{1,2}) (' + MON_RE + ')( \\d{4})?$', 'i');

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function fmtDate(d, mon, y, lang) {
    if (lang === 'sr') return d + '. ' + mon + (y ? ' ' + y.trim() + '.' : '');
    return d + ' ' + mon + (y || '');
  }

  var cache = { en: new Map(), sr: new Map() };

  function translateKey(key, lang) {
    var c = cache[lang];
    if (c.has(key)) return c.get(key);
    var t = lookup(key, lang);
    if (c.size > 20000) c.clear();
    c.set(key, t);
    return t;
  }

  function lookup(key, lang) {
    var d = DICT[lang];
    if (has(d, key)) return d[key];
    // Case-insensitive fallback for labels rendered in different case (e.g. uppercased headings).
    var lower = key.toLowerCase();
    if (lower !== key && has(d, lower)) return d[lower];
    var capd = cap(lower);
    if (capd !== key && has(d, capd)) return key === key.toUpperCase() ? d[capd].toUpperCase() : d[capd];

    var i, m;
    if (RULES) { var r = RULES(key, lang, api); if (r != null) return r; }
    for (i = 0; i < PATTERNS.length; i++) {
      var p = PATTERNS[i];
      if ((m = key.match(p.re))) {
        var vals = {};
        for (var j = 0; j < p.names.length; j++) vals[p.names[j]] = m[j + 1];
        return fill(p[lang], vals, lang);
      }
    }
    if ((m = key.match(DATE_RE))) {
      var mon = MONTHS[lang][MONTHS.sq.indexOf(m[2].toLowerCase())];
      return fmtDate(m[1], /^[A-ZË]/.test(m[2]) ? cap(mon) : mon, m[3], lang);
    }
    if ((m = key.match(DATE_SHORT_RE))) {
      return fmtDate(m[1], MONTHS_SHORT[lang][MONTHS_SHORT.sq.indexOf(m[2].toLowerCase())], m[3], lang);
    }
    if ((m = key.match(DAY_DATE_RE))) {
      var day = DAYS[lang][DAYS.sq.indexOf(m[1].toLowerCase())];
      var mo = MONTHS[lang][MONTHS.sq.indexOf(m[3].toLowerCase())];
      if (/^E /.test(m[1]) || lang === 'en') day = cap(day);
      return day + ', ' + fmtDate(m[2], mo, m[4], lang);
    }
    // Composite labels: "Kategoria · Trafik", "Sinjal — Harta", "Statusi: Hapur".
    var seps = [' · ', ' — ', ' – ', ' / ', ': ', ' | ', ', '];
    for (i = 0; i < seps.length; i++) {
      if (key.indexOf(seps[i]) === -1) continue;
      var changed = false;
      var parts = key.split(seps[i]).map(function (part) {
        var t = part && translateKey(part, lang);
        if (t != null) { changed = true; return t; }
        return part;
      });
      if (changed) return parts.join(seps[i]);
    }
    // Trailing punctuation / counters: "Ruaj…", "Hapur (12)", "Aktive:".
    if ((m = key.match(/^(.+?)(\s*\(\d+\)|[.:…!?]+|\s*›|\s*→)$/))) {
      var base = translateKey(m[1], lang);
      if (base != null) return base + m[2];
    }
    // Fragments next to a template hole: " · Admin / IT …", "Caktuar te ", "(… ".
    if ((m = key.match(/^([·—–,:|/(]\s*)(.+)$/))) {
      var tail = translateKey(m[2], lang);
      if (tail != null) return m[1] + tail;
    }
    if ((m = key.match(/^(.+?)(\s*[·—–,:|/(])$/))) {
      var head = translateKey(m[1], lang);
      if (head != null) return head + m[2];
    }
    if ((m = key.match(/^(←|‹|\+|↑|↓|✓|×)\s*(.+)$/))) {
      var rest = translateKey(m[2], lang);
      if (rest != null) return m[1] + (key.charAt(m[1].length) === ' ' ? ' ' : '') + rest;
    }
    return null;
  }

  // Translate a raw string, keeping its surrounding whitespace. null = leave unchanged.
  function translate(raw, lang) {
    if (lang === 'sq' || !raw) return null;
    var key = norm(raw);
    if (!key || !/[A-Za-zÇçËë]/.test(key)) return null;
    var t = translateKey(key, lang);
    if (t == null) return null;
    var lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
    return lead + t + trail;
  }

  var api = {
    t: function (s, l) { return translateKey(norm(s), l); },
    plural: plural,
    months: MONTHS,
    monthsShort: MONTHS_SHORT,
    days: DAYS,
  };

  // ---------- DOM -----------------------------------------------------------------------
  var lang = readLang();
  var textRec = new WeakMap(); // Text node -> { src, out }
  var attrRec = new WeakMap(); // Element   -> { [attr]: { src, out } }
  var titleSrc = null, titleOut = null;

  function readLang() {
    var l = null;
    try {
      var q = new URLSearchParams(location.search).get('lang');
      if (q && LANGS.indexOf(q) !== -1) { localStorage.setItem(STORAGE_KEY, q); return q; }
    } catch (e) {}
    return readStored();
  }

  function readStored() {
    var l = null;
    try { l = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    return LANGS.indexOf(l) === -1 ? 'sq' : l;
  }

  var SKIP_SEL = 'script,style,template,textarea,[translate="no"],[contenteditable=""],[contenteditable="true"]';

  function skipped(node) {
    var el = node.nodeType === 1 ? node : node.parentElement;
    return !el || !!el.closest(SKIP_SEL);
  }

  function doText(node, force) {
    var cur = node.nodeValue, rec = textRec.get(node);
    if (!cur || !/\S/.test(cur)) return;
    if (rec && cur === rec.out && !force) return;
    var src = (rec && cur === rec.out) ? rec.src : cur;
    var t = translate(src, lang);
    var out = t == null ? src : t;
    textRec.set(node, { src: src, out: out });
    if (out !== cur) node.nodeValue = out;
  }

  function doAttr(el, name, force) {
    var cur = el.getAttribute(name);
    if (cur == null) return;
    var recs = attrRec.get(el) || {};
    var rec = recs[name];
    if (rec && cur === rec.out && !force) return;
    var src = (rec && cur === rec.out) ? rec.src : cur;
    var t = translate(src, lang);
    var out = t == null ? src : t;
    recs[name] = { src: src, out: out };
    attrRec.set(el, recs);
    if (out !== cur) el.setAttribute(name, out);
  }

  function walk(root, force) {
    if (root.nodeType === 3) { if (!skipped(root)) doText(root, force); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1 && skipped(root)) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeType === 1 && (/^(SCRIPT|STYLE|TEMPLATE|TEXTAREA)$/.test(n.tagName) ||
            n.getAttribute('translate') === 'no' || n.isContentEditable)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var n = root;
    do {
      if (n.nodeType === 3) doText(n, force);
      else if (n.nodeType === 1) for (var i = 0; i < ATTRS.length; i++) if (n.hasAttribute(ATTRS[i])) doAttr(n, ATTRS[i], force);
    } while ((n = tw.nextNode()));
  }

  function syncChrome() {
    var html = document.documentElement;
    if (html.lang !== HTML_LANG[lang]) html.lang = HTML_LANG[lang];
    if (document.title !== titleOut) titleSrc = document.title;
    var t = titleSrc && translate(titleSrc, lang);
    titleOut = t == null ? titleSrc : t;
    if (titleOut != null && document.title !== titleOut) document.title = titleOut;
    var btns = document.querySelectorAll('[data-lang]');
    for (var i = 0; i < btns.length; i++) {
      var on = String(btns[i].getAttribute('data-lang') === lang);
      if (btns[i].getAttribute('aria-pressed') !== on) btns[i].setAttribute('aria-pressed', on);
    }
  }

  function setLang(next, persist) {
    if (LANGS.indexOf(next) === -1 || next === lang) return;
    lang = next;
    if (persist) { try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {} }
    walk(document.body, true);
    syncChrome();
    try { window.dispatchEvent(new CustomEvent('sinjal:lang', { detail: { lang: lang } })); } catch (e) {}
  }

  var STYLE = [
    '.sj-lang{--sj-fg:#F5F2ED;--sj-on:#1B1917;--sj-line:rgba(245,242,237,.35);--sj-sep:rgba(245,242,237,.18);--sj-hover:rgba(245,242,237,.12);',
    'display:inline-flex;flex:0 0 auto;height:28px;box-sizing:border-box;border:1px solid var(--sj-line);border-radius:8px;overflow:hidden;}',
    '.sj-lang--light{--sj-fg:#1B1917;--sj-on:#F5F2ED;--sj-line:rgba(27,25,23,.3);--sj-sep:rgba(27,25,23,.15);--sj-hover:rgba(27,25,23,.07);}',
    '.sj-lang button{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;justify-content:center;flex:1 1 0;min-width:34px;height:100%;padding:0 6px;',
    "font-family:'Barlow',sans-serif;font-weight:600;font-size:12px;letter-spacing:.06em;line-height:1;color:var(--sj-fg);cursor:pointer;transition:background .15s,color .15s;}",
    '.sj-lang button+button{border-left:1px solid var(--sj-sep);}',
    '.sj-lang button[aria-pressed="true"]{background:var(--sj-fg);color:var(--sj-on);cursor:default;}',
    '.sj-lang button:focus-visible{outline:2px solid #C23B31;outline-offset:-2px;}',
    '@media (hover:hover){.sj-lang button:not([aria-pressed="true"]):hover{background:var(--sj-hover);}}',
  ].join('');

  function start() {
    var st = document.createElement('style');
    st.setAttribute('data-sinjal-i18n', '');
    st.textContent = STYLE;
    (document.head || document.documentElement).appendChild(st);

    var observer = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        if (r.type === 'characterData') { if (!skipped(r.target)) doText(r.target); }
        else if (r.type === 'attributes') { if (!skipped(r.target)) doAttr(r.target, r.attributeName); }
        else for (var j = 0; j < r.addedNodes.length; j++) walk(r.addedNodes[j]);
      }
      syncChrome();
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    // Title changes happen in <head>, outside the body observer.
    var titleObs = new MutationObserver(syncChrome);
    titleObs.observe(document.head || document.documentElement, { subtree: true, childList: true, characterData: true });
    walk(document.body);
    syncChrome();
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);

  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-lang]');
    if (b) { e.preventDefault(); setLang(b.getAttribute('data-lang'), true); }
  }, true);

  // Keep every open tab (and every same-origin frame) on the same language.
  window.addEventListener('storage', function (e) { if (e.key === STORAGE_KEY) setLang(readStored(), false); });

  // Native dialogs are the one piece of copy that never reaches the DOM.
  ['confirm', 'alert', 'prompt'].forEach(function (fn) {
    var orig = window[fn];
    if (typeof orig !== 'function') return;
    window[fn] = function (msg) {
      var t = typeof msg === 'string' ? translate(msg, lang) : null;
      var args = Array.prototype.slice.call(arguments);
      args[0] = t == null ? msg : t;
      return orig.apply(window, args);
    };
  });

  window.SinjalI18n = {
    get lang() { return lang; },
    setLang: function (l) { setLang(l, true); },
    t: function (s) { var t = translate(s, lang); return t == null ? s : t; },
  };
})();
