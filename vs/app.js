/* VS School — логіка сторінки. Вміст редагується у vs/content.js, тут нічого міняти не треба. */
(function () {
  var S = window.SITE || { news: [], circles: [], team: [] };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function photo(src, alt, wrapCls) {
    var w = el('div', wrapCls);
    if (src) {
      var i = document.createElement('img');
      i.src = src; i.alt = alt || ''; i.loading = 'lazy';
      i.onerror = function () { i.remove(); };
      w.appendChild(i);
    }
    return w;
  }

  /* Новини: перші 6 */
  var newsBox = document.getElementById('news-list');
  if (newsBox) {
    S.news.slice(0, 6).forEach(function (n) {
      var a = el('a');
      a.href = n.link || 'news.html';
      if (n.link) { a.target = '_blank'; a.rel = 'noopener'; }
      a.appendChild(photo(n.img, n.title, 'ph'));
      var t = el('div', 't');
      t.appendChild(el('b', null, n.title));
      t.appendChild(el('time', null, n.date));
      a.appendChild(t);
      newsBox.appendChild(a);
    });
  }

  /* Команда */
  var teamBox = document.getElementById('team-list');
  if (teamBox) {
    S.team.forEach(function (p) {
      var d = el('div', 'person');
      var initials = p.name.split(' ').slice(0, 2).map(function (w) { return w.charAt(0); }).join('');
      var ava = photo(p.photo, p.name, 'ava');
      ava.insertBefore(document.createTextNode(initials), ava.firstChild);
      d.appendChild(ava);
      var t = el('div');
      t.appendChild(el('b', null, p.name));
      t.appendChild(el('span', null, p.role));
      d.appendChild(t);
      teamBox.appendChild(d);
    });
  }

  /* Уся команда: розгортається під керівництвом, з фільтром за кафедрами */
  var allBox = document.getElementById('team-all'), tgl = document.getElementById('team-toggle');
  if (allBox && tgl && S.staff) {
    var grid = document.getElementById('staff-grid'), fbox = document.getElementById('staff-filters');
    var card = function (p) {
      var d = el('div', 'person' + (p.name ? '' : ' no-text'));
      var ava = photo(p.photo, p.name || 'Працівник ліцею', 'ava');
      d.appendChild(ava);
      if (p.name) {
        var t = el('div');
        t.appendChild(el('b', null, p.name));
        if (p.role) t.appendChild(el('span', null, p.role));
        d.appendChild(t);
      }
      return d;
    };
    var showDept = function (i) {
      grid.innerHTML = '';
      var list;
      if (i < 0) {   // «Усі» — кожна людина один раз
        var seen = {}; list = [];
        S.staff.forEach(function (g) { g.people.forEach(function (p) { var k = p.photo || p.name; if (!(k in seen)) { seen[k] = list.length; list.push(p); } else if (!list[seen[k]].role && p.role) list[seen[k]] = p; }); });
      } else list = S.staff[i].people;
      list.forEach(function (p) { grid.appendChild(card(p)); });
      Array.prototype.forEach.call(fbox.children, function (b) { b.setAttribute('aria-pressed', String(+b.dataset.i === i)); });
    };
    [{ dept: 'Усі' }].concat(S.staff).forEach(function (g, k) {
      var b = el('button', null, g.dept); b.type = 'button'; b.dataset.i = k - 1;
      b.addEventListener('click', function () { showDept(k - 1); });
      fbox.appendChild(b);
    });
    var setOpen = function (open) {
      allBox.hidden = !open;
      var top4 = document.getElementById('team-list'); if (top4) top4.hidden = open;   // керівництво вже є у повному списку
      tgl.setAttribute('aria-expanded', String(open));
      tgl.querySelector('span').textContent = open ? 'Згорнути' : 'Уся команда';
      tgl.querySelector('svg').style.transform = open ? 'rotate(-45deg)' : 'rotate(135deg)';
      if (open && !grid.children.length) showDept(-1);
      if (window.VS_LENIS) window.VS_LENIS.resize();
      if (!open) {
        var sec = document.getElementById('team');
        if (sec.getBoundingClientRect().top < 0) (window.VS_LENIS ? window.VS_LENIS.scrollTo(sec, { offset: -76, immediate: true }) : sec.scrollIntoView());
      }
    };
    tgl.addEventListener('click', function () { setOpen(allBox.hidden); });
    document.getElementById('team-close').addEventListener('click', function () { setOpen(false); });
  }

  /* Гуртки з фільтром */
  var chips = document.getElementById('chips');
  function renderCircles(f) {
    if (!chips) return;
    chips.innerHTML = '';
    S.circles.filter(function (c) { return f === 'all' || (c.groups || [c.group]).indexOf(f) > -1; }).forEach(function (c) {
      var s = el('span', 'chip', c.name); chips.appendChild(s);
    });
    packChips();
  }

  /* Порядок гуртків підбирається під ширину екрана так, щоб у рядках лишалось якнайменше порожнього місця
     (найдовші назви розставляються першими, коротші заповнюють залишки рядків). Перераховується при зміні ширини. */
  var packedW = 0;
  function packChips() {
    if (!chips) return;
    var items = Array.prototype.slice.call(chips.children);
    var W = chips.clientWidth; if (!W || !items.length) return;
    var gap = parseFloat(getComputedStyle(chips).columnGap) || 10;
    var list = items.map(function (e, i) { return { e: e, w: e.getBoundingClientRect().width, i: i }; })
      .sort(function (a, b) { return b.w - a.w; });
    var rows = [];
    list.forEach(function (it) {
      var best = null;
      rows.forEach(function (r) {
        var free = W - r.used - (r.items.length ? gap : 0) - it.w;
        if (free >= -0.5 && (!best || free < best.free)) best = { r: r, free: free };
      });
      if (best) { best.r.used += gap + it.w; best.r.items.push(it); }
      else rows.push({ used: it.w, items: [it] });
    });
    // найменш заповнений рядок — в кінець
    var last = rows.reduce(function (m, r, k) { return r.used < rows[m].used ? k : m; }, 0);
    rows.push(rows.splice(last, 1)[0]);
    var frag = document.createDocumentFragment();
    rows.forEach(function (r) {
      r.items.sort(function (a, b) { return a.i - b.i; }).forEach(function (it) { frag.appendChild(it.e); });
    });
    chips.appendChild(frag);
    packedW = W;
  }
  var packT;
  window.addEventListener('resize', function () {
    clearTimeout(packT);
    packT = setTimeout(function () { if (chips && chips.clientWidth !== packedW) packChips(); }, 150);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(packChips);
  renderCircles('all');
  var btns = document.querySelectorAll('#circles .filters button');
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      renderCircles(b.dataset.f);
    });
  });

  /* Мобільне меню закривається після кліку */
  document.querySelectorAll('.drop a').forEach(function (a) {
    a.addEventListener('click', function () { a.closest('details').open = false; });
  });

  /* Мобільне меню закривається від дотику будь-де поза ним */
  document.addEventListener('click', function (e) {
    var m = document.querySelector('details.menu[open]');
    if (m && !m.contains(e.target)) m.open = false;
  });

  /* Кнопка «Записати дитину» підставляє клас у форму */
  document.querySelectorAll('[data-grade]').forEach(function (a) {
    a.addEventListener('click', function () {
      var s = document.getElementById('f-grade'); if (s) s.value = a.dataset.grade;
    });
  });

  /* Шапка: прозора над фото, біла після прокрутки або при відкритому меню */
  var hdr = document.getElementById('hdr');
  /* Висота шапки — для елементів, що липнуть під неї (рівні навчання, розділи документів) */
  function hdrVar() { if (hdr) document.documentElement.style.setProperty('--hdr-h', hdr.offsetHeight + 'px'); }
  hdrVar(); window.addEventListener('resize', hdrVar);
  var menu = document.querySelector('.menu');
  function paintHeader() {
    if (hdr) hdr.classList.toggle('solid', window.scrollY > 40 || (menu && menu.open));
  }
  window.addEventListener('scroll', paintHeader, { passive: true });
  if (menu) menu.addEventListener('toggle', paintHeader);
  paintHeader();

  /* Анімації появи під час прокрутки (бібліотека AOS, як на karpaty.school).
     Атрибути додаються лише якщо бібліотека завантажилась —
     інакше весь вміст просто видно без анімацій. */
  if (window.AOS) {
    // На телефонах бокові ефекти (fade-left/right) зсувають блоки за край екрана
    // і розпирають сторінку вшир, тому там усе з'являється лише знизу вгору.
    var narrow = window.matchMedia('(max-width: 900px)').matches;
    var set = function (sel, effect, step, base) {
      if (narrow && /^fade-(left|right)$/.test(effect)) effect = 'fade-up';
      document.querySelectorAll(sel).forEach(function (el, i) {
        el.setAttribute('data-aos', effect);
        var d = (base || 0) + (step ? (i % 4) * step : 0);
        if (d) el.setAttribute('data-aos-delay', String(d));
      });
    };
    // Герой — одразу після завантаження
    // Герой: спершу виступає логотип (CSS-анімація), потім текст
    var introMs = window.VS_INTRO_MS || 0; // текст героя чекає, поки зникне заставка
    // логотип Cambridge з'являється після логотипу школи — CSS-анімація (style.css, .cambridge-lockup)
    set('.hero h1', 'fade-up', 0, 850 + introMs);
    set('.hero-row', 'fade-up', 0, 1050 + introMs);
    set('.counters-in > div', 'fade-up', 100);
    set('.news-swiper, .slider-nav', 'fade-up', 0, 100);
    // Заголовки секцій
    // заголовки розкриваються по словах (interactive.js), тож AOS їх не чіпає
    if (!window.VS_SPLIT) set('.sec-head h2, .split-title h2, .head-row h2, .faq-grid > h2, .apply-box h2', 'fade-up');
    set('.sec-head > p, .sec-head > .link, .ring, .head-row > p', 'fade-left', 0, 200);
    set('.head-row > .pill, .pre-cta', 'fade-up', 0, 300);
    // Фото + текст поруч
    set('.pre-intro .ph, .about .t', 'fade-right');
    set('.pre-intro > div:last-child, .about .ph', 'fade-left', 0, 200);
    // Картки — по черзі
    set('.pre-grid > div', 'fade-up', 100);
    set('.shapes li', 'fade-up', 100);
    if (!window.VS_PIN) set('.fmt', 'fade-up', 200);
    set('.m-item', 'fade-up', 80);
    set('.mission article', 'fade-up', 200);
    set('.adv article', 'fade-up', 200);
    set('.step', 'fade-up', 100);
    set('.news > a', 'fade-up', 100);
    set('.person', 'fade-up', 100);
    set('.faq details', 'fade-up', 100);
    set('.filters, .chips', 'fade-up', 0, 100);
    set('.contacts, #form', 'fade-up', 0, 200);
    set('.f-top > div', 'fade-up', 100);

    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: true,
      offset: 60,
      disable: function () {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      }
    });
  }

  var y = document.getElementById('year'); if (y) y.textContent = new Date().getFullYear();

  /* Форма заявки → send.php */
  var form = document.getElementById('form');
  var msg = document.getElementById('f-msg');
  var btn = document.getElementById('f-btn');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = document.getElementById('f-name').value.trim();
      var phone = document.getElementById('f-phone').value.trim();
      msg.hidden = false;
      if (!name || phone.replace(/\D/g, '').length < 9) {
        msg.textContent = 'Вкажіть ім\'я та номер телефону, щоб менеджер міг з вами зв\'язатися.';
        return;
      }
      btn.disabled = true;
      msg.textContent = 'Надсилаємо…';
      fetch(form.action, { method: 'POST', body: new FormData(form) })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            msg.textContent = 'Дякуємо! Заявку отримано. Менеджер зателефонує протягом робочого дня.';
          } else {
            msg.textContent = 'Не вдалося надіслати заявку. Зателефонуйте нам: +380 63 502-33-24.';
          }
        })
        .catch(function () {
          msg.textContent = 'Немає зв\'язку з сервером. Зателефонуйте нам: +380 63 502-33-24.';
        })
        .then(function () { btn.disabled = false; });
    });
  }
})();
