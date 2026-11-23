(function () {
  'use strict';

  // Every video uses its own first frame as its still image:
  // img/<project>/Name.webm (or .mp4) -> img/<project>/posters/Name.jpg
  window.videoPoster = function (src) {
    var match = /^(.*\/)?([^\/?#]+)\.(?:webm|mp4)(?:[?#].*)?$/i.exec(src || '');
    return match ? (match[1] || '') + 'posters/' + match[2] + '.jpg' : '';
  };

  var source = document.currentScript && document.currentScript.src
    ? new URL('../portfolio.json', document.currentScript.src)
    : 'portfolio.json';

  window.PORTFOLIO_DATA_READY = fetch(source, { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('Could not load portfolio.json (' + response.status + ').');
      return response.json();
    })
    .then(function (data) {
      window.PORTFOLIO_DATA = data;
      return data;
    })
    .catch(function (error) {
      console.error('Portfolio data could not be loaded.', error);
      var message = window.location.protocol === 'file:'
        ? 'Portfolio data is in portfolio.json. Start the included server with “python serve.py”, then open http://127.0.0.1:8000/.'
        : 'Portfolio data could not be loaded. Check that portfolio.json is next to index.html.';

      var archiveDescription = document.getElementById('archive-description');
      if (archiveDescription) archiveDescription.textContent = message;

      var projectError = document.getElementById('project-error');
      if (projectError) projectError.hidden = false;

      var gameMessage = document.getElementById('game-message');
      if (gameMessage) {
        gameMessage.hidden = false;
        var title = document.getElementById('game-message-title');
        var copy = document.getElementById('game-message-copy');
        if (title) title.textContent = 'Portfolio data could not be loaded.';
        if (copy) copy.textContent = message;
      }
      return null;
    });
})();
