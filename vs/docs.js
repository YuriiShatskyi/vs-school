/* Сторінка «Документи»: підсвітка поточного розділу в навігації та відкриття пункту за посиланням з #. */
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.docs-nav a'));
  if (!links.length) return;
  /* Рядок розділів на телефоні липне точно під шапку (її висота різна: на iPhone є ще й «чубчик») */
  var hdr = document.getElementById('hdr');
  function hdrH() { if (hdr) document.documentElement.style.setProperty('--hdr-h', hdr.offsetHeight + 'px'); }
  hdrH(); window.addEventListener('resize', hdrH);
  var secs = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  function spy() {
    var y = window.scrollY + 160, cur = 0;
    secs.forEach(function (s, i) { if (s && s.offsetTop <= y) cur = i; });
    links.forEach(function (a, i) {
      var on = i === cur;
      a.classList.toggle('on', on);
      if (on && window.innerWidth <= 900 && a.parentNode.scrollWidth > a.parentNode.clientWidth) {
        a.parentNode.scrollTo({ left: a.offsetLeft - 16, behavior: 'smooth' });
      }
    });
  }
  var t; window.addEventListener('scroll', function () { clearTimeout(t); t = setTimeout(spy, 60); }, { passive: true });
  spy();
})();
