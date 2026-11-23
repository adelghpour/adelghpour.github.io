/* Lets gzip-compressed Unity WebGL builds run on static hosts such as GitHub Pages.

   Unity's loader expects the server to send "Content-Encoding: gzip" for *.gz
   files. GitHub Pages can't do that, so this helper downloads each .gz file
   itself, unzips it in the browser (DecompressionStream), and hands Unity a
   local blob URL instead. If the server already unzipped the file (the local
   serve.py does), the bytes are used as they are.

   Usage in a build's index.html:
     prepareUnityGz(config).then(function (ready) { createUnityInstance(canvas, ready, ...); });
*/
(function () {
  'use strict';

  var TYPES = {
    dataUrl: 'application/octet-stream',
    frameworkUrl: 'application/javascript',
    codeUrl: 'application/wasm'
  };

  function overlay() {
    var box = document.createElement('div');
    box.setAttribute('role', 'status');
    box.style.cssText = 'position:fixed;inset:0;z-index:10;display:grid;place-items:center;background:#05070a;color:#e9e4dc;font:500 12px/1.4 ui-monospace,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase';
    box.innerHTML = '<div style="display:grid;gap:12px;justify-items:center;width:min(240px,70vw)"><span>Loading game</span><div style="width:100%;height:2px;background:rgba(233,228,220,.15)"><div style="height:100%;width:0;background:#ff2d20;transition:width .2s"></div></div><span style="color:#8d8a90">0%</span></div>';
    document.body.appendChild(box);
    return {
      set: function (fraction) {
        box.querySelector('div > div > div').style.width = Math.round(fraction * 100) + '%';
        box.querySelector('span:last-child').textContent = Math.round(fraction * 100) + '%';
      },
      done: function () { box.remove(); }
    };
  }

  function download(url, onBytes, onSize) {
    return fetch(url).then(function (response) {
      if (!response.ok) throw new Error('Could not load ' + url + ' (' + response.status + ')');
      onSize(Number(response.headers.get('Content-Length')) || 0);
      if (!response.body || !response.body.getReader) return response.arrayBuffer().then(function (b) { onBytes(b.byteLength); return new Uint8Array(b); });
      var reader = response.body.getReader(), chunks = [], size = 0;
      function pump() {
        return reader.read().then(function (step) {
          if (step.done) {
            var all = new Uint8Array(size), at = 0;
            chunks.forEach(function (c) { all.set(c, at); at += c.length; });
            return all;
          }
          chunks.push(step.value); size += step.value.length; onBytes(step.value.length);
          return pump();
        });
      }
      return pump();
    });
  }

  function gunzip(bytes) {
    var isGzip = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    if (!isGzip || typeof DecompressionStream === 'undefined') return Promise.resolve(new Blob([bytes]));
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).blob();
  }

  window.prepareUnityGz = function (config) {
    var keys = Object.keys(TYPES).filter(function (key) { return /\.gz$/i.test(config[key] || ''); });
    if (!keys.length) return Promise.resolve(config);
    var progress = overlay(), loaded = 0, expected = 0;
    var ready = Object.assign({}, config);
    return Promise.all(keys.map(function (key) {
      return download(config[key],
        function (n) { loaded += n; if (expected) progress.set(Math.min(loaded / expected, 0.98)); },
        function (size) { expected += size; })
        .then(gunzip)
        .then(function (blob) {
          ready[key] = URL.createObjectURL(new Blob([blob], { type: TYPES[key] }));
        });
    })).then(function () {
      progress.set(1);
      progress.done();
      return ready;
    }, function (error) {
      progress.done();
      throw error;
    });
  };
})();
