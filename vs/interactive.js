/* VS School — інтерактив (interactive.js): плавна прокрутка, заголовки по словах, галерея, покрокова форма.
   Підключається після effects.js і перед app.js. */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  /* ---------- Плавна прокрутка (сама прокрутка створюється один раз у nav.js) ---------- */
  var lenis = window.VS_LENIS || null;
  if (lenis) {
    if (document.body.classList.contains('is-loading')) {
      lenis.stop();
      setTimeout(function () { lenis.start(); }, (window.VS_INTRO_MS || 0) + 50);
    }
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      var el = id === '#top' ? 0 : document.querySelector(id);
      if (el === null) return;
      e.preventDefault();
      lenis.scrollTo(el, { offset: id === '#top' ? 0 : -76, duration: 1.4 });
    });
  }

  /* ---------- Заголовки розкриваються по словах ---------- */
  window.VS_SPLIT = !reduce;
  if (window.VS_SPLIT) {
    var heads = document.querySelectorAll('main h2');
    heads.forEach(function (h) {
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
              var w = document.createElement('span'); w.className = 'sw';
              var i = document.createElement('i'); i.textContent = part; w.appendChild(i);
              frag.appendChild(w);
            });
            node.replaceChild(frag, n);
          } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
        });
      })(h);
      h.querySelectorAll('.sw > i').forEach(function (i, k) { i.style.transitionDelay = (k * 60) + 'ms'; });
    });
    if ('IntersectionObserver' in window) {
      var hio = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('split-in'); hio.unobserve(e.target); } });
      }, { threshold: 0.3, rootMargin: '0px 0px -8% 0px' });
      heads.forEach(function (h) { hio.observe(h); });
    } else heads.forEach(function (h) { h.classList.add('split-in'); });
  }

  /* ---------- Рівні навчання: горизонтальна прокрутка ---------- */
  var hs = document.querySelector('.hscroll');
  var track = hs && hs.querySelector('.hs-track');
  var vp = hs && hs.querySelector('.hs-viewport');
  var dist = 0;
  window.VS_PIN = false;
  function hdrH() { var h = document.getElementById('hdr'); return h ? h.offsetHeight : 0; }
  /* Заголовок блоку: якщо разом з картками не влазить під шапку — він прокручується звичайно,
     а «завмирають» лише картки */
  var sticky = hs && hs.querySelector('.hs-sticky');
  var head = sticky && sticky.querySelector('.wrap');
  function headOut(out) {
    if (!head) return;
    if (out && head.parentNode === sticky) { hs.insertBefore(head, sticky); hs.classList.add('pin-compact'); }
    if (!out && head.parentNode !== sticky) { sticky.insertBefore(head, sticky.firstChild); hs.classList.remove('pin-compact'); }
  }
  function headH() { return head && head.parentNode !== sticky ? head.offsetHeight : 0; }
  function setupPin() {
    if (!hs) return;
    var on = !reduce;
    hs.classList.toggle('pinned', on);
    headOut(false);
    if (on && sticky.scrollHeight > sticky.clientHeight + 2) headOut(true);
    window.VS_PIN = on;
    if (!on) { hs.style.height = ''; track.style.transform = ''; return; }
    /* якщо картки однаково вищі за вільне місце (маленький телефон) — трохи зменшуємо їх цілком */
    track.style.zoom = '';
    var sp = getComputedStyle(sticky), free = sticky.clientHeight - parseFloat(sp.paddingTop) - parseFloat(sp.paddingBottom) - (head && head.parentNode === sticky ? head.offsetHeight : 0);
    if (track.offsetHeight > free && free > 200) track.style.zoom = Math.max(0.7, free / track.offsetHeight).toFixed(3);
    var cs = getComputedStyle(vp);
    var pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    var z = parseFloat(track.style.zoom) || 1;
    dist = Math.max(0, track.scrollWidth * z + pad - vp.clientWidth);
    hs.style.height = (headH() + window.innerHeight - hdrH() + dist) + 'px';
    movePin();
    if (window.VS_LENIS) window.VS_LENIS.resize();
  }
  function movePin() {
    if (!window.VS_PIN) return;
    var top = hs.getBoundingClientRect().top + headH() - hdrH();
    var p = Math.min(1, Math.max(0, -top / (dist || 1)));
    track.style.transform = 'translate3d(' + (-p * dist / (parseFloat(track.style.zoom) || 1)).toFixed(1) + 'px,0,0)';
  }
  setupPin();
  window.addEventListener('resize', setupPin);
  window.addEventListener('scroll', movePin, { passive: true });
  window.addEventListener('load', setupPin);

  /* ---------- Кроки вступу: номери для стопки ---------- */
  document.querySelectorAll('.step').forEach(function (s, i) { s.style.setProperty('--i', i); });

  /* ---------- Фотогалерея з переглядом ---------- */
  var items = Array.prototype.slice.call(document.querySelectorAll('.m-item'));
  var lb = document.getElementById('lightbox');
  var lbImg = lb && lb.querySelector('img');
  var cur = 0;
  items.forEach(function (b) {
    var img = b.querySelector('img');
    img.addEventListener('error', function () { b.remove(); items = items.filter(function (x) { return x !== b; }); });
  });
  function show(i) {
    if (!items.length) return;
    cur = (i + items.length) % items.length;
    lbImg.src = items[cur].dataset.src;
    lbImg.alt = items[cur].querySelector('img').alt;
  }
  function openLb(i) { show(i); lb.hidden = false; if (lenis) lenis.stop(); lb.querySelector('.lb-close').focus(); }
  function closeLb() { lb.hidden = true; if (lenis) lenis.start(); }
  if (lb) {
    document.getElementById('mosaic').addEventListener('click', function (e) {
      var b = e.target.closest('.m-item'); if (b) openLb(items.indexOf(b));
    });
    lb.querySelector('.lb-close').addEventListener('click', closeLb);
    lb.querySelector('.lb-prev').addEventListener('click', function () { show(cur - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { show(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) closeLb(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') closeLb();
      if (e.key === 'ArrowLeft') show(cur - 1);
      if (e.key === 'ArrowRight') show(cur + 1);
    });
  }

  /* ---------- Покрокова форма ---------- */
  var sel = document.getElementById('f-grade');
  var choices = document.getElementById('f-choices');
  var s1 = document.getElementById('f-step1'), s2 = document.getElementById('f-step2');
  var marks = document.querySelectorAll('.f-steps span');
  function pick(val) {
    sel.value = val;
    choices.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.v === val)); });
  }
  function go(step) {
    s1.hidden = step !== 1; s2.hidden = step !== 2;
    marks[0].classList.toggle('on', step === 1); marks[1].classList.toggle('on', step === 2);
    if (step === 2) document.getElementById('f-name').focus();
  }
  if (sel && choices) {
    Array.prototype.forEach.call(sel.options, function (o) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = o.text; b.dataset.v = o.value || o.text;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { pick(b.dataset.v); });
      choices.appendChild(b);
    });
    pick(sel.value);
    document.getElementById('f-next').addEventListener('click', function () { go(2); });
    document.getElementById('f-back').addEventListener('click', function () { go(1); });
    document.querySelectorAll('[data-grade]').forEach(function (a) {
      a.addEventListener('click', function () { pick(a.dataset.grade); go(1); });
    });
  }

  /* ---------- «Магнітні» кнопки (лише миша) ---------- */
  if (fine && !reduce) {
    document.querySelectorAll('.pill').forEach(function (p) {
      p.addEventListener('mousemove', function (e) {
        var r = p.getBoundingClientRect();
        var dx = (e.clientX - r.left - r.width / 2) * 0.18, dy = (e.clientY - r.top - r.height / 2) * 0.3;
        p.style.translate = dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px';
      });
      p.addEventListener('mouseleave', function () { p.style.translate = ''; });
    });
  }
})();
