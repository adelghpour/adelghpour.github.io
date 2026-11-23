(function () {
  'use strict';
  var dataReady = window.PORTFOLIO_DATA_READY || Promise.resolve(window.PORTFOLIO_DATA);
  dataReady.then(function (data) {
  if (!data) return;
  var projectId = new URLSearchParams(window.location.search).get('id');
  var project = data && data.projects.find(function (item) { return item.id === projectId || (item.aliases || []).indexOf(projectId) !== -1; });
  var shell = document.getElementById('game-shell');
  var message = document.getElementById('game-message');
  var frame = document.getElementById('game-frame');
  var status = document.getElementById('game-status');
  var full = document.getElementById('fullscreen-button');
  var validLocalPath = project && typeof project.playableUrl === 'string' && /^(games|Games)\//.test(project.playableUrl) && !project.playableUrl.includes('..') && !project.playableUrl.includes('://');

  function showMessage(title, copy, projectKnown) {
    message.hidden = false;
    shell.hidden = true;
    document.getElementById('game-message-title').textContent = title;
    document.getElementById('game-message-copy').textContent = copy;
    if (projectKnown) {
      document.getElementById('play-title').textContent = project.title;
      document.getElementById('game-message-back').href = 'project.html?id=' + encodeURIComponent(project.id);
      document.getElementById('play-back').href = 'project.html?id=' + encodeURIComponent(project.id);
      project.links.forEach(function (item) {
        var link = document.createElement('a');
        link.href = item.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = item.label;
        document.getElementById('game-message-links').appendChild(link);
      });
      document.title = 'Play ' + project.title + ' | Adel Ghasempour';
    } else {
      document.getElementById('game-message-kicker').textContent = 'Project unavailable';
      document.getElementById('play-title').textContent = 'Project not found';
      document.getElementById('game-message-copy').textContent = 'Return to the portfolio and choose a project from the archive.';
      document.getElementById('game-message-back').href = 'index.html#work';
      document.getElementById('play-back').href = 'index.html#work';
      document.title = 'Project unavailable | Adel Ghasempour';
    }
  }

  if (!project) {
    showMessage('This project could not be found.', '', false);
    return;
  }

  document.getElementById('play-title').textContent = project.title;
  document.getElementById('play-back').href = 'project.html?id=' + encodeURIComponent(project.id);
  document.getElementById('game-message-back').href = 'project.html?id=' + encodeURIComponent(project.id);
  document.title = 'Play ' + project.title + ' | Adel Ghasempour';
  if (!validLocalPath) {
    showMessage('This project has no browser build yet.', 'You can still read the project details or open one of its external game links.', true);
    return;
  }

  if (window.location.protocol === 'file:') {
    showMessage('Open this portfolio through a web server to play.', 'Unity WebGL builds need a web server to load their data and WebAssembly files. Return to the project page for details.', true);
    return;
  }

  fetch(project.playableUrl, { method: 'HEAD' }).then(function (response) {
    if (!response.ok) throw new Error('Missing build');
    shell.hidden = false;
    frame.title = project.title + ' playable build';
    if (typeof project.playableAspect === 'string' && /^\d+(\.\d+)?\s*\/\s*\d+(\.\d+)?$/.test(project.playableAspect)) {
      // Portrait builds (phone games) get a frame shaped like the game instead of a wide 16:9 box.
      var parts = project.playableAspect.split('/');
      if (Number(parts[0]) < Number(parts[1])) shell.classList.add('game-shell--portrait');
      frame.style.aspectRatio = project.playableAspect;
    }
    frame.src = project.playableUrl;
    full.disabled = false;
  }).catch(function () {
    showMessage('The browser build could not be loaded.', 'Check that the Unity WebGL export exists in its configured games folder, then try again.', true);
  });

  frame.addEventListener('load', function () { status.textContent = 'Game page loaded. Click inside the game to play.'; });
  frame.addEventListener('error', function () { status.textContent = 'The game failed to load. Return to the project page for other links.'; });
  /* ---------- full screen ----------
     The whole shell goes full screen (not just the iframe), so our Back and
     Exit buttons stay on top of the game. Phones without the Fullscreen API
     (iPhone Safari) get a fixed, edge-to-edge fallback with the same buttons. */
  var fsBar = document.getElementById('fs-bar');
  var fsBack = document.getElementById('fs-back');
  var fsExit = document.getElementById('fs-exit');
  var idleTimer = null;
  function isFull() { return document.fullscreenElement === shell || document.webkitFullscreenElement === shell || shell.classList.contains('is-pseudo-fullscreen'); }
  function wake() {
    fsBar.classList.remove('is-idle');
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(function () { if (isFull()) fsBar.classList.add('is-idle'); }, 2500);
  }
  function syncFullState() {
    var on = isFull();
    shell.classList.toggle('is-full', on);
    document.documentElement.classList.toggle('game-is-full', on);
    full.textContent = on ? 'Exit full screen' : 'Fullscreen';
    if (on) wake();
  }
  function enterFull() {
    var request = shell.requestFullscreen || shell.webkitRequestFullscreen;
    if (request) {
      var result = request.call(shell);
      if (result && result.catch) result.catch(function () { shell.classList.add('is-pseudo-fullscreen'); syncFullState(); });
    } else {
      shell.classList.add('is-pseudo-fullscreen');
      syncFullState();
    }
  }
  function exitFull() {
    if (shell.classList.contains('is-pseudo-fullscreen')) { shell.classList.remove('is-pseudo-fullscreen'); syncFullState(); return; }
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit && (document.fullscreenElement || document.webkitFullscreenElement)) exit.call(document);
  }
  full.addEventListener('click', function () { if (isFull()) exitFull(); else enterFull(); });
  fsExit.addEventListener('click', exitFull);
  fsBack.href = 'project.html?id=' + encodeURIComponent(project.id);
  fsBack.addEventListener('click', function () { exitFull(); });
  document.addEventListener('fullscreenchange', syncFullState);
  document.addEventListener('webkitfullscreenchange', syncFullState);
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && shell.classList.contains('is-pseudo-fullscreen')) exitFull(); });
  ['pointermove', 'pointerdown', 'touchstart'].forEach(function (type) {
    shell.addEventListener(type, function () { if (isFull()) wake(); }, { passive: true });
  });
  });
})();
