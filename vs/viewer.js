/* Перегляд документів без завантаження (viewer.js).
   Документи показуються як зображення сторінок (documents/pages/<назва>/<N>.webp) у вікні поверх сайту.
   Кнопки «Завантажити» немає, правий клік і перетягування сторінок вимкнені.
   Посилання: <a href="documents.html?doc=license" data-doc="license" data-pages="1" data-title="Ліцензія">.
   Щоб додати документ: покласти сторінки в documents/pages/<назва>/1.webp, 2.webp… і додати посилання як вище. */
(function () {
  var old = document.getElementById('dv'); if (old) old.remove();
  var box, list, ttl, last, io, kbd = false;
  /* DOCS_V — міняти, коли оновлюються сторінки документів, щоб браузер не показував старі з кешу */
  var DOCS_V = '202611050654';
  function src(doc, i) { return 'documents/pages/' + doc + '/' + i + '.webp?v=' + DOCS_V; }
  function load(img, first) {
    if (!img || !img.dataset.src) return;
    if (first) img.fetchPriority = 'high';
    img.src = img.dataset.src; delete img.dataset.src;
  }
  /* Наведення/дотик на кнопку «Відкрити» — заздалегідь вантажимо першу сторінку */
  var warmed = {};
  function warm(e) {
    var a = e.target.closest && e.target.closest('a[data-doc]');
    if (!a || warmed[a.dataset.doc]) return;
    warmed[a.dataset.doc] = 1; (new Image()).src = src(a.dataset.doc, 1);
  }
  document.addEventListener('pointerover', warm, { passive: true });
  document.addEventListener('touchstart', warm, { passive: true });
  document.addEventListener('focusin', warm);

  function build() {
    box = document.createElement('div');
    box.id = 'dv'; box.className = 'dv'; box.hidden = true;
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML = '<div class="dv-bar"><b class="dv-t"></b><button type="button" class="dv-x" aria-label="Закрити">Закрити <span>✕</span></button></div>' +
      '<div class="dv-list" data-lenis-prevent></div>';
    document.body.appendChild(box);
    list = box.querySelector('.dv-list'); ttl = box.querySelector('.dv-t');
    box.querySelector('.dv-x').addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === list) close(); });
    box.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    box.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  function open(doc, pages, title, from, kb) {
    kbd = !!kb;
    if (!box) build();
    last = from || null;
    ttl.textContent = title || 'Документ';
    list.innerHTML = '';
    if (io) io.disconnect();
    var imgs = [];
    for (var i = 1; i <= pages; i++) {
      var p = document.createElement('div'); p.className = 'dv-page';
      var img = document.createElement('img');
      img.dataset.src = src(doc, i);
      img.alt = (title || 'Документ') + ' — сторінка ' + i;
      img.decoding = 'async'; img.draggable = false;
      img.style.aspectRatio = '210/297';                       // місце під сторінку, поки вона вантажиться
      img.onload = function () { this.style.aspectRatio = ''; this.classList.add('ok'); };
      p.appendChild(img); imgs.push(img);
      if (pages > 1) { var n = document.createElement('small'); n.textContent = i + ' / ' + pages; p.appendChild(n); }
      list.appendChild(p);
    }
    /* Спершу — перша сторінка (найшвидше), далі — лише ті, до яких людина догортає */
    load(imgs[0], true);
    if (imgs[1]) imgs[0].addEventListener('load', function () { load(imgs[1]); }, { once: true });
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } });
      }, { root: list, rootMargin: '0px 0px 120% 0px' });
      imgs.slice(1).forEach(function (im) { io.observe(im); });
    } else imgs.forEach(function (im) { load(im); });
    box.hidden = false; list.scrollTop = 0;
    document.documentElement.classList.add('dv-on');
    if (window.VS_LENIS) window.VS_LENIS.stop();
    if (kbd) box.querySelector('.dv-x').focus();   // фокус переносимо лише для клавіатури — без синьої рамки після кліку
  }

  function close() {
    if (!box || box.hidden) return;
    box.hidden = true; list.innerHTML = ''; if (io) io.disconnect();
    document.documentElement.classList.remove('dv-on');
    if (window.VS_LENIS) window.VS_LENIS.start();
    if (last && kbd) last.focus(); else if (document.activeElement) document.activeElement.blur();
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-doc]');
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    open(a.dataset.doc, +a.dataset.pages || 1, a.dataset.title, a, e.detail === 0);
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  /* documents.html?doc=license — одразу відкрити потрібний документ (так ведуть картки з головної) */
  var q = location.search.match(/[?&]doc=([\w-]+)/);
  if (q) {
    var a = document.querySelector('a[data-doc="' + q[1] + '"]');
    if (a) open(a.dataset.doc, +a.dataset.pages || 1, a.dataset.title, a);
  }
})();
