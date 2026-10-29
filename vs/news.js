/* Сторінка «Усі новини»: картки з vs/content.js, фільтр за роком і кнопка «Показати ще».
   Самі новини редагуються тільки у vs/content.js. */
(function () {
  var grid = document.getElementById('news-grid');
  if (!grid) return;
  var all = (window.SITE && window.SITE.news) || [];
  var STEP = 12;
  var more = document.getElementById('news-more');
  var yearsBox = document.getElementById('years');
  var countEl = document.getElementById('news-count');

  function yearOf(n) { var m = String(n.date).match(/(\d{4})\s*$/); return m ? m[1] : ''; }
  function plural(k) {
    var a = k % 10, b = k % 100;
    if (a === 1 && b !== 11) return k + ' новина';
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return k + ' новини';
    return k + ' новин';
  }

  var year = 'all', list = all, shown = 0;

  function card(n) {
    var a = document.createElement(n.link ? 'a' : 'div');
    a.className = 'slide' + (n.link ? '' : ' nolink');
    if (n.link) { a.href = n.link; a.target = '_blank'; a.rel = 'noopener'; }
    var ph = document.createElement('div'); ph.className = 'ph';
    if (n.img) {
      var i = document.createElement('img');
      i.src = n.img; i.alt = n.title; i.loading = 'lazy'; i.decoding = 'async';
      i.onerror = function () { this.remove(); };
      ph.appendChild(i);
    }
    var t = document.createElement('div'); t.className = 't';
    var b = document.createElement('b'); b.textContent = n.title;
    var tm = document.createElement('time'); tm.textContent = n.date;
    t.appendChild(b); t.appendChild(tm); a.appendChild(ph); a.appendChild(t);
    return a;
  }

  function showMore() {
    var frag = document.createDocumentFragment();
    list.slice(shown, shown + STEP).forEach(function (n, k) {
      var c = card(n); c.style.animationDelay = (k % STEP) * 40 + 'ms'; frag.appendChild(c);
    });
    grid.appendChild(frag);
    shown = Math.min(shown + STEP, list.length);
    more.parentNode.hidden = shown >= list.length;
  }

  function apply(y) {
    year = y;
    list = y === 'all' ? all : all.filter(function (n) { return yearOf(n) === y; });
    grid.innerHTML = ''; shown = 0;
    countEl.textContent = plural(list.length);
    Array.prototype.forEach.call(yearsBox.children, function (b) { b.setAttribute('aria-pressed', String(b.dataset.y === y)); });
    showMore();
  }

  // Кнопки років (від новішого до старішого) + «Усі»
  var counts = {};
  all.forEach(function (n) { var y = yearOf(n); if (y) counts[y] = (counts[y] || 0) + 1; });
  [['all', 'Усі', all.length]].concat(Object.keys(counts).sort().reverse().map(function (y) { return [y, y, counts[y]]; }))
    .forEach(function (r) {
      var b = document.createElement('button');
      b.type = 'button'; b.dataset.y = r[0];
      b.innerHTML = r[1] + '<sup>' + r[2] + '</sup>';
      b.addEventListener('click', function () { if (year !== r[0]) apply(r[0]); });
      yearsBox.appendChild(b);
    });

  more.addEventListener('click', showMore);
  apply('all');
})();
