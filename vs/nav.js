/* VS School — переходи між сторінками без перезавантаження (nav.js).
   Навіщо: щоб музика в плеєрі грала безперервно, коли переходиш на «Новини», «Документи» і назад.
   Як: посилання на сторінки сайту перехоплюються, нова сторінка підвантажується у фоні,
   і замінюється все, крім плеєра (та плаваючих кнопок). Скрипти сторінки запускаються знову.
   Якщо щось піде не так — звичайний перехід за посиланням (сайт працює як раніше).
   Підключається одразу після player.js і перед effects.js. */
(function () {
  if (!window.fetch || !window.DOMParser || !history.pushState) return;

  /* Елементи, які лишаються на місці між сторінками */
  var KEEP = ['player', 'mcta', 'toTop', 'progress'];
  /* Скрипти сторінки — запускаються наново після кожного переходу (решта — бібліотеки, один раз) */
  var PAGE_JS = /vs\/(effects|interactive|news|docs|app)\.js/;

  /* ---------- Облік обробників подій, які додають скрипти сторінки ----------
     Перед переходом їх знімаємо, щоб не накопичувались. */
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

  /* ---------- Плавна прокрутка: одна на весь сеанс ---------- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.Lenis && !reduce && !window.VS_LENIS) {
    tracking = false;                       // обробники самої прокрутки не чіпаємо
    var lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
    window.VS_LENIS = lenis;
    tracking = true;
  }

  function sameSite(a) {
    if (!a || !a.href || a.target === '_blank' || a.hasAttribute('download')) return false;
    var u = new URL(a.href, location.href);
    if (u.origin !== location.origin) return false;
    if (!/(\/|\.html)$/.test(u.pathname)) return false;     // лише сторінки, не PDF/фото
    if (u.pathname === location.pathname && u.hash) return false; // якір на цій же сторінці
    return true;
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

    /* Стилі, яких ще немає */
    doc.querySelectorAll('link[rel="stylesheet"]').forEach(function (l) {
      var href = l.getAttribute('href').split('?')[0];
      var has = Array.prototype.some.call(document.querySelectorAll('link[rel="stylesheet"]'), function (x) { return x.getAttribute('href').split('?')[0] === href; });
      if (!has) document.head.appendChild(l.cloneNode());
    });

    /* Вміст сторінки: усе, крім плеєра і плаваючих кнопок */
    dropListeners();
    var body = document.body;
    Array.prototype.slice.call(body.children).forEach(function (n) {
      if (KEEP.indexOf(n.id) === -1 && n.tagName !== 'SCRIPT') n.remove();
    });
    var first = body.firstChild, scripts = [];
    Array.prototype.slice.call(doc.body.children).forEach(function (n) {
      if (n.tagName === 'SCRIPT') { scripts.push(n); return; }
      if (KEEP.indexOf(n.id) !== -1 || n.id === 'intro') return;  // заставку при переходах не показуємо
      body.insertBefore(document.importNode(n, true), first);
    });
    body.className = doc.body.className.replace('is-loading', '').trim();

    if (push) history.pushState({ vs: 1 }, '', url);
    shown = new URL(url, location.href).pathname;
    var hash = new URL(url, location.href).hash;
    if (lenis) lenis.scrollTo(0, { immediate: true }); else window.scrollTo(0, 0);

    /* Скрипти: бібліотеки — якщо ще не завантажені, скрипти сторінки — наново, по черзі */
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
        if (hash) {
          var el = document.querySelector(hash);
          if (el) setTimeout(function () { lenis ? lenis.scrollTo(el, { offset: -76, duration: 1.2 }) : el.scrollIntoView(); }, 150);
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
  tracked.pop();   // обробник кліків навігації — постійний

  window.addEventListener('popstate', function () {
    if (location.pathname === shown) return;   // лише якір на тій самій сторінці
    go(location.href, false);
  });
  tracked.pop();   // і повернення «назад» — теж постійне
  history.replaceState({ vs: 1 }, '', location.href);
})();
