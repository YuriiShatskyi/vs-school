(function () {
  if (!window.fetch || !window.DOMParser || !history.pushState) return;

  var KEEP = ['player', 'mcta', 'toTop', 'progress'];
  var PAGE_JS = /vs\/(effects|interactive|news|docs|viewer|app)\.js/;

  /* ---------- Облік обробників подій, які додають скрипти сторінки ---------- */
  var tracked = [], tracking = true;
  [window, document].forEach(function (target) {
    var add = target.addEventListener, rem = target.removeEventListener;
    target.addEventListener = function (type, fn, opt) {
      if (tracking) tracked.push([target, type, fn, opt]);
      return add.call(this, type, fn, opt);
    };
    target.__vsRemove = rem;
  });
  document.addEventListener('DOMContentLoaded', function () { tracking = false; });
  function dropListeners() {
    tracked.forEach(function (l) { l[0].__vsRemove.call(l[0], l[1], l[2], l[3]); });
    tracked = [];
  }

  /* ---------- Плавна прокрутка ---------- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.Lenis && !reduce && !window.VS_LENIS) {
    tracking = false;
    var lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    window.VS_LENIS = lenis;
    tracking = true;
  }

  function sameSite(a) {
    if (!a || !a.href || a.target === '_blank' || a.hasAttribute('download')) return false;
    var u = new URL(a.href, location.href);
    if (u.origin !== location.origin) return false;
    if (!/(\/|\.html)$/.test(u.pathname)) return false;
    if (u.pathname === location.pathname && u.hash) return false;
    return true;
  }

  function dropHash() {
    if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  }

  function settle(el) {
    dropHash();
    var tries = 0, lenis = window.VS_LENIS;
    (function fix() {
      var top = el.getBoundingClientRect().top - 76;
      if (Math.abs(top) > 4) {
        if (lenis) { lenis.resize(); lenis.scrollTo(window.scrollY + top, { immediate: true, force: true }); }
        else window.scrollTo(0, window.scrollY + top);
      }
      if (++tries < 12) setTimeout(fix, tries < 4 ? 120 : 300);
    })();
    var stop = function () { tries = 99; };
    ['wheel', 'touchstart', 'keydown'].forEach(function (t) { window.addEventListener(t, stop, { once: true, passive: true }); });
  }

  var busy = false, shown = location.pathname;
  function go(url, push) {
    if (busy) return; busy = true;
    fetch(url, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw r; return r.text(); })
      .then(function (html) { swap(new DOMParser().parseFromString(html, 'text/html'), url, push); })
      .catch(function () { location.href = url; })
      .then(function () { busy = false; });
  }

  function swap(doc, url, push) {
    var lenis = window.VS_LENIS;
    document.title = doc.title;
    var desc = doc.querySelector('meta[name="description"]'), cur = document.querySelector('meta[name="description"]');
    if (desc && cur) cur.content = desc.content;

    doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (l) {
      var href = l.getAttribute('href').split('?')[0];
      var has = Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (x) { return x.getAttribute('href').split('?')[0] === href; });
      if (!has) document.head.appendChild(l.cloneNode());
    });

    dropListeners();
    var body = document.body;
    Array.prototype.slice.call(body.children).forEach(function (n) {
      if (KEEP.indexOf(n.id) === -1 && n.tagName !== 'SCRIPT') n.remove();
    });
    var first = body.firstChild, scripts = [];
    Array.prototype.slice.call(doc.body.children).forEach(function (n) {
      if (n.tagName === 'SCRIPT') { scripts.push(n); return; }
      if (KEEP.indexOf(n.id) !== -1 || n.id === 'intro') return;
      body.insertBefore(document.importNode(n, true), first);
    });
    body.className = doc.body.className.replace('is-loading', '').trim();

    if (push) history.pushState({ vs: 1 }, '', url);
    shown = new URL(url, location.href).pathname;
    var hash = new URL(url, location.href).hash;
    if (lenis) lenis.scrollTo(0, { immediate: true }); else window.scrollTo(0, 0);

    tracking = true;
    var queue = scripts.filter(function (s) {
      var src = s.getAttribute('src') || '';
      if (PAGE_JS.test(src)) return true;
      if (/vs\/(player|nav)\.js/.test(src)) return false;
      return !document.querySelector('script[src="' + src + '"]');
    });
    (function next() {
      var s = queue.shift();
      if (!s) {
        tracking = false;
        if (window.AOS && AOS.refreshHard) AOS.refreshHard();
        if (lenis) lenis.resize();
        if (hash) {
          var el = document.querySelector(hash);
          if (el) settle(el);
        }
        return;
      }
      var n = document.createElement('script');
      n.src = s.getAttribute('src');
      n.onload = n.onerror = function () { n.remove(); next(); };
      document.body.appendChild(n);
    })();
  }

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!sameSite(a)) return;
    e.preventDefault();
    var menu = document.querySelector('details.menu[open]'); if (menu) menu.open = false;
    go(a.href, true);
  });
  tracked.pop();

  window.addEventListener('popstate', function () {
    if (location.pathname === shown) return;
    go(location.href, false);
  });
  tracked.pop();
  window.addEventListener('hashchange', function () { setTimeout(dropHash, 0); });
  tracked.pop();
  history.replaceState({ vs: 1 }, '', location.href);
  if (location.hash) window.addEventListener('load', function () {
    var el = document.querySelector(location.hash); if (el) settle(el);
  });
})();
