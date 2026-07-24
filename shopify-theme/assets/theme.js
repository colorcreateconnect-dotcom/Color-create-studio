/* Color Create Studio theme — minimal interactions */
(function () {
  var toggle = document.getElementById('menuToggle');
  var drawer = document.getElementById('menuDrawer');
  if (toggle && drawer) {
    toggle.addEventListener('click', function () {
      var open = drawer.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
})();
