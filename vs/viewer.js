/* Перегляд документів без завантаження (viewer.js).
   Документи показуються як зображення сторінок (documents/pages/<назва>/<N>.webp) у вікні поверх сайту.
   Кнопки «Завантажити» немає, правий клік і перетягування сторінок вимкнені.
   Посилання: <a href="documents.html?doc=license" data-doc="license" data-pages="1" data-title="Ліцензія">.
   Щоб додати документ: покласти сторінки в documents/pages/<назва>/1.webp, 2.webp… і додати посилання як вище. */
(function () {
  var old = document.getElementById('dv'); if (old) old.remove();
  var box, list, ttl, last;

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

  function open(doc, pages, title, from) {
    if (!box) build();
    last = from || null;
    ttl.textContent = title || 'Документ';
    list.innerHTML = '';
    for (var i = 1; i <= pages; i++) {
      var p = document.createElement('div'); p.className = 'dv-page';
      var img = document.createElement('img');
      img.src = 'documents/pages/' + doc + '/' + i + '.webp';
      img.alt = (title || 'Документ') + ' — сторінка ' + i;
      img.loading = i <= 2 ? 'eager' : 'lazy'; img.decoding = 'async'; img.draggable = false;
      img.style.aspectRatio = '210/297';                       // місце під сторінку, поки вона вантажиться
      img.onload = function () { this.style.aspectRatio = ''; };
      p.appendChild(img);
      if (pages > 1) { var n = document.createElement('small'); n.textContent = i + ' / ' + pages; p.appendChild(n); }
      list.appendChild(p);
    }
    box.hidden = false; list.scrollTop = 0;
    document.documentElement.classList.add('dv-on');
    if (window.VS_LENIS) window.VS_LENIS.stop();
    box.querySelector('.dv-x').focus();
  }

  function close() {
    if (!box || box.hidden) return;
    box.hidden = true; list.innerHTML = '';
    document.documentElement.classList.remove('dv-on');
    if (window.VS_LENIS) window.VS_LENIS.start();
    if (last) last.focus();
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-doc]');
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    open(a.dataset.doc, +a.dataset.pages || 1, a.dataset.title, a);
  }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  /* documents.html?doc=license — одразу відкрити потрібний документ (так ведуть картки з головної) */
  var q = location.search.match(/[?&]doc=([\w-]+)/);
  if (q) {
    var a = document.querySelector('a[data-doc="' + q[1] + '"]');
    if (a) open(a.dataset.doc, +a.dataset.pages || 1, a.dataset.title, a);
  }
})();
