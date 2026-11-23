(function () {
  'use strict';
  var dataReady = window.PORTFOLIO_DATA_READY || Promise.resolve(window.PORTFOLIO_DATA);
  dataReady.then(function (data) {
  if (!data) return;
  var params = new URLSearchParams(window.location.search);
  var projectId = params.get('id');
  var project = data && data.projects.find(function (item) { return item.id === projectId || (item.aliases || []).indexOf(projectId) !== -1; });
  var content = document.getElementById('project-content');
  var error = document.getElementById('project-error');
  var galleryRoot = document.getElementById('project-gallery');
  var mainView = document.getElementById('gallery-view');
  var thumbnails = document.getElementById('gallery-thumbnails');
  var dialog = document.getElementById('media-dialog');
  var dialogMedia = document.getElementById('dialog-media');
  var activeIndex = 0;
  var gallery = [];
  var expandButton = document.getElementById('gallery-expand');
  var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!project) {
    // An old link to a project that became a folder opens that folder instead.
    var movedFolder = projectId && (data.archiveFolders || []).find(function (folder) { return (folder.aliases || []).indexOf(projectId) !== -1; });
    if (movedFolder) { window.location.replace('index.html?folder=' + encodeURIComponent(movedFolder.id) + '#work'); return; }
    error.hidden = false;
    document.title = 'Project unavailable | Adel Ghasempour';
    return;
  }

  if (project.group) {
    var archiveFolder = (data.archiveFolders || []).find(function (folder) { return folder.group === project.group; });
    var archiveId = archiveFolder ? archiveFolder.id : project.group;
    var archiveUrl = 'index.html?folder=' + encodeURIComponent(archiveId) + '#work';
    var backLink = document.querySelector('.detail-back');
    var workLink = document.querySelector('.project-nav nav a[href="index.html#work"]');
    var footerWorkLink = document.querySelector('.detail-foot a[href="index.html#work"]');
    if (backLink) {
      backLink.href = archiveUrl;
      var backLabel = backLink.querySelector('.detail-back-label');
      if (backLabel && archiveFolder) backLabel.textContent = 'Back to ' + archiveFolder.title;
    }
    if (workLink) workLink.href = archiveUrl;
    if (footerWorkLink) footerWorkLink.href = archiveUrl;
  }

  content.hidden = false;
  var isVideoSource = function (source) { return /\.(?:webm|mp4)(?:$|[?#])/i.test(source || ''); };
  gallery = project.gallery && project.gallery.length ? project.gallery : [{ src: project.image, type: isVideoSource(project.image) ? 'video' : 'image', alt: project.imageAlt }];
  document.title = project.title + ' | Adel Ghasempour';
  document.getElementById('project-category').textContent = project.category;
  document.getElementById('project-title').textContent = project.title;
  document.getElementById('project-description').textContent = project.description;
  document.getElementById('project-role').textContent = 'Role: ' + project.role;

  // Quick facts: role and type from the data, where it can be played from its
  // links, plus any extra "facts" (Year, Team, Engine...) added in portfolio.json.
  var facts = [];
  if (project.role) facts.push(['Role', project.role]);
  if (project.category) facts.push(['Type', project.category]);
  var platforms = [];
  if (project.playableUrl) platforms.push('Web browser');
  (project.links || []).forEach(function (item) {
    var url = item.url || '';
    if (/apkpure|play\.google/i.test(url)) platforms.push('Android');
    else if (/itch\.io/i.test(url)) platforms.push('itch.io');
    else if (/assetstore\.unity/i.test(url)) platforms.push('Unity Asset Store');
  });
  if (platforms.length) facts.push(['Available on', platforms.filter(function (p, i) { return platforms.indexOf(p) === i; }).join(' · ')]);
  (project.facts || []).forEach(function (fact) { if (fact && fact.label && fact.value) facts.push([fact.label, fact.value]); });
  var factList = document.getElementById('project-facts');
  facts.forEach(function (fact) {
    var term = document.createElement('dt'); term.textContent = fact[0];
    var value = document.createElement('dd'); value.textContent = fact[1];
    factList.append(term, value);
  });

  if (project.featuredNote) {
    var feature = document.getElementById('project-feature');
    feature.textContent = project.featuredNote;
    feature.hidden = false;
  }

  (project.links || []).forEach(function (item) {
    var link = document.createElement('a');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = item.label;
    document.getElementById('project-links').appendChild(link);
  });

  if (project.playableUrl) {
    var playLink = document.getElementById('play-link');
    playLink.href = 'play.html?id=' + encodeURIComponent(project.id);
    playLink.hidden = false;
  }

  function posterFor(item) {
    if (item.poster) return item.poster;
    if (window.videoPoster && window.videoPoster(item.src)) return window.videoPoster(item.src);
    if (project.image && !isVideoSource(project.image)) return project.image;
    var still = gallery.find(function (media) { return media.type === 'image' && media.src; });
    return still ? still.src : '';
  }

  function makeMedia(item, expanded) {
    var media;
    if (item.type === 'video') {
      media = document.createElement('video');
      media.controls = true;
      media.playsInline = true;
      // Only the autoplaying clip downloads up front; others wait for a click.
      media.preload = item.src === project.image ? 'auto' : 'metadata';
      media.poster = posterFor(item);
      if (item.src === project.image) {
        media.autoplay = !prefersReducedMotion;
        media.muted = true;
        media.loop = true;
      }
    } else {
      media = document.createElement('img');
      media.alt = item.alt || project.title;
      media.loading = expanded ? 'eager' : 'lazy';
    }
    media.src = item.src;
    media.className = 'gallery-media';
    if (item.type === 'video') media.setAttribute('aria-label', item.alt || project.title);
    return media;
  }

  /* ---------- shape-aware frames ----------
     Each image or video gets a frame shaped like itself (portrait, square or
     landscape) instead of one fixed 16:9 box. Ratios come from the thumbnail
     stills as they load, and from the media itself as a fallback. */
  var ratios = [];
  // Transparent art (pixel GIFs) sits on the project's own backdrop instead of black.
  if (project.mediaBackground) { mainView.style.setProperty('--media-bg', project.mediaBackground); thumbnails.style.setProperty('--media-bg', project.mediaBackground); mainView.classList.add('has-media-bg'); }
  function shapeFor(ratio) { return ratio < 0.9 ? 'portrait' : ratio > 1.15 ? 'landscape' : 'square'; }
  function stillFor(item) { return item.type === 'video' ? posterFor(item) : item.src; }
  function applyShape() {
    var ratio = ratios[activeIndex];
    if (!ratio) return;
    mainView.style.setProperty('--ar', ratio.toFixed(4));
    mainView.dataset.shape = shapeFor(ratio);
  }
  function learnRatio(index, w, h) {
    if (!w || !h || ratios[index]) return;
    ratios[index] = w / h;
    var thumb = thumbnails.children[index];
    if (thumb) { thumb.style.setProperty('--ar', ratios[index].toFixed(4)); thumb.dataset.shape = shapeFor(ratios[index]); }
    if (index === activeIndex) applyShape();
  }

  function renderMedia() {
    var item = gallery[activeIndex];
    var media = makeMedia(item, false);
    var index = activeIndex;
    if (item.type === 'video') media.addEventListener('loadedmetadata', function () { learnRatio(index, media.videoWidth, media.videoHeight); });
    else media.addEventListener('load', function () { learnRatio(index, media.naturalWidth, media.naturalHeight); });
    var still = stillFor(item);
    // Absolute URL: a relative url() in a custom property resolves against the stylesheet (css/), not the page.
    mainView.style.setProperty('--ambient', still ? 'url("' + new URL(still, window.location.href).href.replace(/"/g, '%22') + '")' : 'none');
    applyShape();
    mainView.replaceChildren(media);
    document.getElementById('gallery-counter').textContent = String(activeIndex + 1).padStart(2, '0') + ' / ' + String(gallery.length).padStart(2, '0');
    document.getElementById('gallery-alt').textContent = item.alt || project.title;
    Array.prototype.forEach.call(thumbnails.children, function (button, index) {
      var active = index === activeIndex;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (dialog.open) renderDialogMedia();
  }

  function renderDialogMedia() {
    var item = gallery[activeIndex];
    dialogMedia.replaceChildren(makeMedia(item, true));
    document.getElementById('dialog-caption').textContent = item.alt || project.title;
    document.getElementById('dialog-previous').disabled = gallery.length < 2;
    document.getElementById('dialog-next').disabled = gallery.length < 2;
  }

  function selectMedia(index) {
    activeIndex = (index + gallery.length) % gallery.length;
    renderMedia();
  }

  gallery.forEach(function (item, index) {
    var button = document.createElement('button');
    button.className = 'gallery-thumb';
    button.type = 'button';
    button.setAttribute('aria-label', 'Show ' + (item.type === 'video' ? 'video: ' : 'image: ') + (item.alt || project.title));
    button.setAttribute('aria-pressed', 'false');
    if (item.type === 'video') {
      var poster = posterFor(item);
      if (poster) {
        var preview = document.createElement('img');
        preview.src = poster;
        preview.alt = '';
        preview.loading = 'lazy';
        button.appendChild(preview);
      }
      var play = document.createElement('span');
      play.className = 'thumb-video-mark';
      play.setAttribute('aria-hidden', 'true');
      play.textContent = '▶';
      var label = document.createElement('span');
      label.className = 'thumb-video-label';
      label.textContent = 'Video';
      button.append(play, label);
    } else {
      var image = document.createElement('img');
      image.src = item.src;
      image.alt = '';
      image.loading = 'lazy';
      button.appendChild(image);
    }
    var still = button.querySelector('img');
    if (still) {
      still.loading = 'eager'; // small, and needed to size every frame up front
      var measure = function () { learnRatio(index, still.naturalWidth, still.naturalHeight); };
      if (still.complete) measure(); else still.addEventListener('load', measure);
    }
    button.addEventListener('click', function () { selectMedia(index); });
    thumbnails.appendChild(button);
  });

  renderMedia();
  function openMediaDialog() {
    var inlineVideo = mainView.querySelector('video');
    if (inlineVideo) inlineVideo.pause();
    renderDialogMedia();
    try {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } catch (error) {
      dialog.setAttribute('open', '');
    }
    document.getElementById('dialog-close').focus();
  }
  function closeMediaDialog() {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else {
      dialog.removeAttribute('open');
      restoreGalleryFocus();
    }
  }

  function restoreGalleryFocus() {
    expandButton.focus();
    var inlineVideo = mainView.querySelector('video');
    if (inlineVideo && inlineVideo.autoplay) {
      var playRequest = inlineVideo.play();
      if (playRequest && playRequest.catch) playRequest.catch(function () {});
    }
  }

  expandButton.addEventListener('click', openMediaDialog);
  document.getElementById('dialog-close').addEventListener('click', closeMediaDialog);
  document.getElementById('dialog-previous').addEventListener('click', function () { selectMedia(activeIndex - 1); });
  document.getElementById('dialog-next').addEventListener('click', function () { selectMedia(activeIndex + 1); });
  dialog.addEventListener('click', function (event) { if (event.target === dialog) closeMediaDialog(); });
  dialog.addEventListener('close', restoreGalleryFocus);

  function handleGalleryKeys(event) {
    if (gallery.length < 2) return;
    if (event.key === 'ArrowRight') { event.preventDefault(); selectMedia(activeIndex + 1); }
    else if (event.key === 'ArrowLeft') { event.preventDefault(); selectMedia(activeIndex - 1); }
    else if (event.key === 'Home') { event.preventDefault(); selectMedia(0); }
    else if (event.key === 'End') { event.preventDefault(); selectMedia(gallery.length - 1); }
  }
  galleryRoot.addEventListener('keydown', handleGalleryKeys);
  dialog.addEventListener('keydown', handleGalleryKeys);
  });
})();
