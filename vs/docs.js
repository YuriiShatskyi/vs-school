(function () {
  var box = document.querySelector('.docs-filters');
  if (!box) return;
  var hdr = document.getElementById('hdr');
  function hdrH() { if (hdr) document.documentElement.style.setProperty('--hdr-h', hdr.offsetHeight + 'px'); }
  hdrH(); window.addEventListener('resize', hdrH);

  var items = Array.prototype.slice.call(document.querySelectorAll('#docs-list > li'));
  var note = document.querySelector('.doc-note');
  var btns = Array.prototype.slice.call(box.querySelectorAll('button'));
  function apply(s) {
    btns.forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.s === s)); });
    items.forEach(function (li) { li.hidden = s !== 'all' && li.dataset.s !== s; });
    if (note) note.hidden = s !== 'all';
    if (window.VS_LENIS) window.VS_LENIS.resize();
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { apply(b.dataset.s); }); });

  apply('all');
})();
