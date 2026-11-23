(function () {
  'use strict';
  var dataReady = window.PORTFOLIO_DATA_READY || Promise.resolve(window.PORTFOLIO_DATA);
  dataReady.then(function (data) {
  if (!data) return;
  function renderPortfolio() {
    if (!data) return;
    var person = data.person;
    document.querySelectorAll('[data-person-logo]').forEach(function (el) { el.textContent = person.name; });
    document.querySelectorAll('[data-person-name]').forEach(function (el) {
      el.replaceChildren(document.createTextNode(person.firstName), document.createElement('br'), document.createTextNode(person.familyName));
      el.setAttribute('aria-label', person.name);
    });
    document.querySelectorAll('[data-person-role]').forEach(function (el) { el.textContent = person.role; });
    document.querySelectorAll('[data-intro-prompt]').forEach(function (el) { el.textContent = data.intro.prompt; });
    document.querySelectorAll('[data-about-title]').forEach(function (el) { el.innerHTML = data.intro.aboutTitle; });
    document.querySelectorAll('[data-home-bio]').forEach(function (el) {
      var bio = data.intro.homeBio || person.bio;
      if (data.teaching) bio += ' ' + data.teaching.organization + ': ' + data.teaching.summary;
      el.textContent = bio;
    });
    document.querySelectorAll('[data-stage-name]').forEach(function (el) { el.textContent = data.intro.stages[Number(el.dataset.stageName)]; });
    document.title = person.name + ' | Game Designer';
    var description = document.querySelector('meta[name="description"]');
    if (description) description.content = person.bio;

    data.skills.forEach(function (skill) {
      var label = document.createElement('dt'); label.textContent = skill.label;
      var value = document.createElement('dd'); value.textContent = skill.value;
      $('hero-skills').append(label, value);
    });
    $('archive-description').textContent = data.intro.archiveDescription;

    var featured = data.projects.find(function (project) { return project.id === data.intro.featuredId; });
    if (featured) {
      $('featured-title').textContent = featured.title;
      $('featured-meta').textContent = featured.featuredNote || featured.category;
    }

    function createProjectCard(project) {
      var isFeatured = project.id === data.intro.featuredId;
      var card = document.createElement('a');
      card.className = 'card rv' + (isFeatured ? ' big' : '');
      card.href = 'project.html?id=' + encodeURIComponent(project.id);
      card.setAttribute('aria-label', 'View ' + project.title + ' project details');
      var shot = document.createElement('div'); shot.className = 'shot';
      var isVideo = /\.(?:webm|mp4)(?:$|\?)/i.test(project.image);
      var media = document.createElement(isVideo ? 'video' : 'img');
      media.src = project.image; media.alt = isVideo ? '' : project.imageAlt;
      if (isVideo) { media.autoplay = true; media.loop = true; media.muted = true; media.playsInline = true; media.preload = 'none'; media.poster = window.videoPoster ? window.videoPoster(project.image) : ''; media.setAttribute('aria-hidden', 'true'); }
      else { media.loading = 'lazy'; media.decoding = 'async'; }
      shot.appendChild(media);
      var info = document.createElement('div'); info.className = 'info';
      var meta = document.createElement('p'); meta.className = 'meta'; meta.textContent = project.category;
      var title = document.createElement('h3'); title.textContent = project.title;
      var description = document.createElement('p'); description.className = 'd'; description.textContent = project.description;
      var role = document.createElement('p'); role.className = 'r'; role.textContent = 'Role: ' + project.role;
      info.append(meta, title, description, role);
      card.append(shot, info);
      return card;
    }

    var orderedProjects = data.projects.slice().sort(function (a, b) {
      return Number(b.id === data.intro.featuredId) - Number(a.id === data.intro.featuredId);
    });
    orderedProjects.forEach(function (project) { $('project-grid').appendChild(createProjectCard(project)); });

    $('email').textContent = person.email;
    $('email-link').href = 'mailto:' + person.email;
    $('email-link').textContent = person.email;
    $('phone-link').href = 'tel:' + person.phoneLink;
    $('phone-link').textContent = person.phone;
    $('linkedin-link').href = person.linkedin;
    $('resume-link').href = person.resume;
    $('copyright-year').textContent = new Date().getFullYear();
  }
  var $ = function (id) { return document.getElementById(id); };
  renderPortfolio();
  var FRAMES = 142;
  var FRAME_PATH = function (i) { return 'frames/f_' + String(i + 1).padStart(3, '0') + '.webp'; };
  // The final quarter holds frame 142 for the featured stage before the archive begins.
  var KEYS = [[0, 0], [0.4, 69], [0.75, 141], [1, 141]];
  var STAGE_START = [0, 69, 141];
  var SNAP_POINTS = [0, 0.4, 0.75];
  var ACCENTS = ['#cfd3da', '#3ab4ff', '#ff2d20'];
  var NAMES = data ? data.intro.stages : ['Blockout', 'The World', 'The Eye'];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  var cv = $('cv'), ctx = cv.getContext('2d');
  var scene = $('scene'), stages = [].slice.call(document.querySelectorAll('.stage'));
  var imgs = new Array(FRAMES), ready = new Array(FRAMES), loaded = 0, started = false;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function frameAt(p) {
    for (var i = 1; i < KEYS.length; i++) {
      if (p <= KEYS[i][0]) {
        var a = KEYS[i - 1], b = KEYS[i], t = (p - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * t;
      }
    }
    return FRAMES - 1;
  }
  function progressAt(f) {
    for (var i = 1; i < KEYS.length; i++) {
      var a = KEYS[i - 1], b = KEYS[i];
      if (f <= b[1] && b[1] > a[1]) return a[0] + (b[0] - a[0]) * (f - a[1]) / (b[1] - a[1]);
    }
    return 1;
  }
  function focusAt(f) { // horizontal crop focus for portrait screens
    if (f <= 95) return 0.5;
    return 0.5 + 0.36 * clamp((f - 95) / 40, 0, 1);
  }

  /* ---------- canvas ---------- */
  var cw = 0, ch = 0;
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cw = Math.round(cv.clientWidth * dpr); ch = Math.round(cv.clientHeight * dpr);
    cv.width = cw; cv.height = ch;
    ctx.imageSmoothingQuality = 'high';
    needsDraw = true;
  }
  function drawImg(im, fx) {
    if (!im || !im.naturalWidth) return;
    var s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    var w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.drawImage(im, (cw - w) * fx, (ch - h) * 0.5, w, h);
  }
  function draw(f) {
    var a = Math.floor(f), b = Math.min(a + 1, FRAMES - 1), t = f - a, fx = focusAt(f);
    ctx.fillStyle = '#050506'; ctx.fillRect(0, 0, cw, ch);
    if (!ready[a]) {
      var distance = 1;
      while (distance < FRAMES && !ready[a - distance] && !ready[a + distance]) distance++;
      if (ready[a - distance]) a -= distance;
      else if (ready[a + distance]) a += distance;
    }
    ctx.globalAlpha = 1;
    drawImg(imgs[a], fx);
    if (t > 0.02 && b !== a && ready[b]) { ctx.globalAlpha = t; drawImg(imgs[b], fx); ctx.globalAlpha = 1; }
  }

  /* ---------- stages ---------- */
  var current = -1;
  function stageFor(f) { return f < STAGE_START[1] ? 0 : (f < STAGE_START[2] ? 1 : 2); }
  function setStage(n) {
    if (n === current) return;
    var first = current === -1;
    current = n;
    stages.forEach(function (el, i) {
      var items = el.querySelectorAll('.in');
      if (i === n) {
        el.classList.add('is-active');
        if (hasGsap && !reduce) gsap.fromTo(items, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.75, stagger: 0.07, ease: 'power3.out', overwrite: true, delay: first ? 0 : 0.12 });
        else if (hasGsap) gsap.set(items, { autoAlpha: 1, y: 0, overwrite: true });
      } else if (el.classList.contains('is-active')) {
        if (hasGsap && !reduce) gsap.to(items, { autoAlpha: 0, y: -16, duration: 0.28, overwrite: true, onComplete: function () { if (current !== i) el.classList.remove('is-active'); } });
        else el.classList.remove('is-active');
      }
    });
    if (!hasGsap) document.documentElement.style.setProperty('--accent', ACCENTS[n]);
    else gsap.to(document.documentElement, { '--accent': ACCENTS[n], duration: reduce ? 0 : 0.7, ease: 'power2.out' });
    $('hudStage').textContent = '0' + (n + 1) + ' / 03';
    $('hudName').textContent = NAMES[n];
    for (var k = 0; k < 3; k++) $('t' + k).classList.toggle('on', k <= n);
    if (!first && hasGsap && !reduce) {
      var flash = $('flash');
      gsap.timeline().set(flash, { background: 'radial-gradient(ellipse at 50% 50%,' + ACCENTS[n] + ' 0%, transparent 70%)' })
        .fromTo(flash, { opacity: 0 }, { opacity: 0.3, duration: 0.08 }).to(flash, { opacity: 0, duration: 0.6, ease: 'power2.out' });
    }
  }

  /* ---------- scroll + loop ---------- */
  var target = 0, disp = 0, lastDrawn = -1, needsDraw = true;
  var pf = $('fill'), ph = $('head'), rafId = 0, lastTick = performance.now();
  function pad(n, l) { return String(n).padStart(l, '0'); }
  function hud(f, p) {
    var n = Math.round(f);
    $('hudFrame').textContent = pad(n + 1, 3);
    $('hudTc').textContent = '00:' + pad(Math.floor(n / 25), 2) + ':' + pad(n % 25, 2);
    pf.style.width = (p * 100) + '%';
    ph.style.left = (p * 100) + '%';
  }
  function sceneProgress() {
    var r = scene.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - window.innerHeight), 0, 1);
  }
  function wake() {
    if (!rafId) rafId = requestAnimationFrame(tick);
  }
  function tick(now) {
    rafId = 0;
    var dt = Math.min(0.05, Math.max(0, (now - lastTick) / 1000)); lastTick = now;
    var tf = frameAt(target);
    var k = reduce ? 1 : 1 - Math.pow(0.0005, dt);
    disp += (tf - disp) * k;
    if (Math.abs(tf - disp) < 0.003) disp = tf;
    if (disp !== lastDrawn || needsDraw) {
      draw(disp); lastDrawn = disp; needsDraw = false;
      hud(disp, progressAt(disp));
      setStage(stageFor(Math.round(disp)));
    }
    if (Math.abs(tf - disp) >= 0.003) wake();
  }
  function placeTicks() {
    $('t1').style.left = (SNAP_POINTS[1] * 100) + '%';
    $('t2').style.left = (SNAP_POINTS[2] * 100) + '%';
  }
  function scrollToProgress(p) {
    var top = scene.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + p * (scene.offsetHeight - window.innerHeight), behavior: reduce ? 'auto' : 'smooth' });
  }
  function go(where) {
    if (where === 'top') window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else if (where === 'about') scrollToProgress(SNAP_POINTS[1]);
    else if (where === 'worlds') scrollToProgress(SNAP_POINTS[2]);
    else {
      var el = $(where);
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  [].forEach.call(document.querySelectorAll('[data-go]'), function (a) {
    a.addEventListener('click', function (e) { e.preventDefault(); go(a.getAttribute('data-go')); });
  });

  /* ---------- reveals ---------- */
  function setupReveals() {
    if (!hasGsap || reduce) return;
    var items = document.querySelectorAll('.rv');
    gsap.set(items, { opacity: 0, y: 28 });
    ScrollTrigger.batch(items, {
      start: 'top 90%', once: true,
      onEnter: function (b) { gsap.to(b, { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', overwrite: true }); }
    });
  }

  /* ---------- copy ---------- */
  var cb = $('copy');
  cb.addEventListener('click', function () {
    var txt = $('email').textContent, done = function (m) { cb.textContent = m; setTimeout(function () { cb.textContent = 'Copy'; }, 1600); };
    var fallback = function () {
      try { var r = document.createRange(); r.selectNodeContents($('email')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); done('Selected'); } catch (e) { done('Select it'); }
    };
    try { navigator.clipboard.writeText(txt).then(function () { done('Copied'); }, fallback); } catch (e) { fallback(); }
  });

  /* ---------- boot and native scroll ---------- */
  var snapTimer = 0, isSnapping = false, snapReleaseTimer = 0;
  function onScroll() {
    target = sceneProgress(); wake();
    if (isSnapping || reduce) return;
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(function () {
      // The last quarter holds frame 142, then gives the visitor a free exit into the archive.
      if (target >= 0.88) return;
      var nearest = SNAP_POINTS.reduce(function (best, point) {
        return Math.abs(point - target) < Math.abs(best - target) ? point : best;
      }, SNAP_POINTS[0]);
      if (Math.abs(nearest - target) < 0.16 && Math.abs(nearest - target) > 0.012) {
        isSnapping = true;
        scrollToProgress(nearest);
        window.clearTimeout(snapReleaseTimer);
        snapReleaseTimer = window.setTimeout(function () { isSnapping = false; target = sceneProgress(); wake(); }, 850);
      }
    }, 190);
  }
  function start() {
    if (started) return; started = true;
    $('loader').hidden = true;
    resize(); placeTicks();
    target = sceneProgress(); disp = frameAt(target);
    window.addEventListener('scroll', onScroll, { passive: true });
    setupReveals();
    wake();
  }
  var frameQueue = [0, 69, 141], queueStarted = false, activeLoads = 0, completed = 0;
  function pumpFrames() {
    while (activeLoads < 4 && frameQueue.length) {
      var index = frameQueue.shift();
      if (imgs[index]) continue;
      var image = new Image();
      image.decoding = 'async'; imgs[index] = image; activeLoads++;
      image.onload = function (frameIndex, frameImage) { return function () { settleFrame(frameIndex, frameImage, true); }; }(index, image);
      image.onerror = function (frameIndex, frameImage) { return function () { settleFrame(frameIndex, frameImage, false); }; }(index, image);
      image.src = FRAME_PATH(index);
    }
  }
  function settleFrame(index, image, succeeded) {
    activeLoads--; completed++;
    ready[index] = !!(succeeded && image.naturalWidth);
    $('loadbar').style.transform = 'scaleX(' + completed / FRAMES + ')';
    $('loadprogress').setAttribute('aria-valuenow', completed);
    $('loadtxt').textContent = pad(completed, 3) + ' / ' + FRAMES;
    if (index === 0 && !started) start();
    if (ready[index]) { needsDraw = true; wake(); }
    if (!queueStarted && (ready[0] || index === 0)) {
      queueStarted = true;
      for (var i = 0; i < FRAMES; i++) if (i !== 0 && i !== 69 && i !== 141) frameQueue.push(i);
    }
    pumpFrames();
  }
  $('loader').hidden = false;
  pumpFrames();
  window.setTimeout(start, 5000); // failed or stalled frame requests never hide the content
  window.addEventListener('resize', function () { resize(); placeTicks(); wake(); });
  });
})();
