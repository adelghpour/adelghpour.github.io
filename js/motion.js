/* Shared motion helpers for every page (pairs with css/motion.css).
   - Cursor-following glow on cards (mouse and pen only).
   - Fixed nav slides away while scrolling down and returns on scroll up.
   - Fade-out on internal links for browsers without cross-document view transitions.
   Respects prefers-reduced-motion and never blocks navigation. */
(function () {
  'use strict';

  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var mqFine = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
  function reduced() { return !!(mqReduce && mqReduce.matches); }

  /* ---------- card glow ---------- */
  var litCard = null;
  function unlight() { if (litCard) { litCard.classList.remove('is-lit'); litCard = null; } }
  document.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch' || (mqFine && !mqFine.matches)) return;
    var card = e.target && e.target.closest ? e.target.closest('.card') : null;
    if (card !== litCard) { unlight(); if (card) { litCard = card; card.classList.add('is-lit'); } }
    if (!card) return;
    var r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  }, { passive: true });
  document.addEventListener('pointerleave', unlight);
  window.addEventListener('blur', unlight);

  /* ---------- nav hide on scroll ---------- */
  var nav = document.querySelector('.nav');
  if (nav && getComputedStyle(nav).position === 'fixed') {
    var lastY = window.scrollY, ticking = false, hidden = false;
    var setHidden = function (h) { if (h !== hidden) { hidden = h; nav.classList.toggle('m-nav-hidden', h); } };
    var update = function () {
      ticking = false;
      var y = window.scrollY, dy = y - lastY;
      if (Math.abs(dy) < 6) return;
      // Keep it visible near the top, while it has focus, and whenever motion is reduced.
      setHidden(dy > 0 && y > 120 && !reduced() && !nav.contains(document.activeElement));
      lastY = y;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    nav.addEventListener('focusin', function () { setHidden(false); });
    // Pointer near the top edge brings it back too.
    document.addEventListener('pointermove', function (e) { if (hidden && e.clientY < 64) setHidden(false); }, { passive: true });
  }

  /* ---------- fallback page-leave fade ---------- */
  var hasCrossDocVT = 'CSSViewTransitionRule' in window;
  if (!hasCrossDocVT) {
    document.addEventListener('click', function (e) {
      if (reduced() || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a || a.target && a.target !== '_self' || a.hasAttribute('download')) return;
      var url;
      try { url = new URL(a.href, location.href); } catch (err) { return; }
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same-page hash
      e.preventDefault();
      document.documentElement.classList.add('m-leaving');
      setTimeout(function () { location.href = url.href; }, 180);
    });
    // Coming back through the back/forward cache must not leave the page faded out.
    window.addEventListener('pageshow', function () { document.documentElement.classList.remove('m-leaving'); });
  }
})();
