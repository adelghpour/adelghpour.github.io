(function () {
  'use strict';

  var dataReady = window.PORTFOLIO_DATA_READY || Promise.resolve(window.PORTFOLIO_DATA);
  dataReady.then(function (data) {
  if (!data) return;

  var person = data.person;
  var byId = function (id) { return document.getElementById(id); };
  var setText = function (id, value) {
    var element = byId(id);
    if (element && value != null) element.textContent = value;
  };

  document.title = person.name + ' | Game Designer';
  var description = document.querySelector('meta[name="description"]');
  if (description) description.content = person.bio;

  setText('person-logo', person.name);
  setText('person-role', person.role);
  setText('intro-prompt', data.intro.prompt);
  setText('archive-description', data.intro.archiveDescription);
  setText('email', person.email);
  setText('copyright-name', person.name);
  setText('copyright-year', new Date().getFullYear());

  var name = byId('person-name');
  if (name) {
    name.replaceChildren(document.createTextNode(person.firstName), document.createElement('br'), document.createTextNode(person.familyName));
    name.setAttribute('aria-label', person.name);
  }

  var aboutTitle = byId('about-title');
  if (aboutTitle) aboutTitle.innerHTML = data.intro.aboutTitle;
  var showcaseTitle = byId('showcase-title');
  if (showcaseTitle && data.intro.showcaseTitle) showcaseTitle.innerHTML = data.intro.showcaseTitle;

  var aboutBody = byId('about-body');
  if (aboutBody) {
    var aboutCopy = data.intro.homeBio || person.bio;
    // Kept short so the stage text never covers the render behind it.
    aboutBody.textContent = aboutCopy;
  }

  data.intro.stages.forEach(function (stage, index) {
    setText('stage-name-' + index, stage);
    if (index === 0) setText('hudName', stage);
  });

  var skills = byId('hero-skills');
  if (skills) {
    data.skills.forEach(function (skill) {
      var label = document.createElement('dt');
      label.textContent = skill.label;
      var value = document.createElement('dd');
      value.textContent = skill.value;
      skills.append(label, value);
    });
  }

  var featured = data.projects.find(function (project) { return project.id === data.intro.featuredId; });
  if (featured) {
    setText('featured-title', featured.title);
    setText('featured-meta', featured.featuredNote || featured.category);
    var featuredLink = byId('featured-link');
    if (featuredLink) featuredLink.href = 'project.html?id=' + encodeURIComponent(featured.id);
  }

  function makeLink(label, href, external) {
    var link = document.createElement('a');
    link.href = href;
    link.textContent = label;
    if (external) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    return link;
  }

  var grid = byId('project-grid');
  var archiveFolders = data.archiveFolders || [];
  var archivePrefix = byId('archive-prefix');
  var archiveTitle = byId('archive-title');
  var archiveBack = byId('archive-back');
  var archiveDescription = byId('archive-description');
  var archiveSection = byId('work');
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var archiveTransitionTimer = 0;
  var archivePixelTimer = 0;
  var archiveRenderToken = 0;
  var previewVideos = [];
  var previewVideoObserver = !reducedMotion && 'IntersectionObserver' in window
    ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var playRequest = entry.target.play();
          if (playRequest && playRequest.catch) playRequest.catch(function () {});
        } else entry.target.pause();
      });
    }, { rootMargin: '80px', threshold: 0.01 })
    : null;

  function watchPreviewVideo(video) {
    video.autoplay = false;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'metadata';
    if (previewVideoObserver) {
      previewVideos.push(video);
      previewVideoObserver.observe(video);
    }
  }

  function clearPreviewVideos() {
    if (previewVideoObserver) previewVideos.forEach(function (video) { previewVideoObserver.unobserve(video); });
    previewVideos = [];
  }

  function folderUrl(folderId) {
    return folderId ? window.location.pathname + '?folder=' + encodeURIComponent(folderId) + '#work' : window.location.pathname + '#work';
  }

  // Folders can hold sub-folders ("parent": "<folder id>" in portfolio.json).
  function childFolders(folder) {
    return archiveFolders.filter(function (item) { return folder ? item.parent === folder.id : !item.parent; });
  }
  function findFolder(id) {
    return archiveFolders.find(function (item) { return item.id === id || (item.aliases || []).indexOf(id) !== -1; });
  }
  function ownProjects(folder) {
    return data.projects.filter(function (project) { return project.group === folder.group; }).sort(function (a, b) {
      return Number(b.id === data.intro.featuredId) - Number(a.id === data.intro.featuredId);
    });
  }
  // Every project inside a folder, sub-folders included (used for covers and counts).
  function folderProjects(folder) {
    return childFolders(folder).reduce(function (list, child) { return list.concat(folderProjects(child)); }, []).concat(ownProjects(folder));
  }

  // Cover tiles: take turns across each sub-folder and the folder's own projects,
  // so every section shows up (one each first, then fill the remaining tiles).
  function previewProjects(folder, count) {
    // A folder can name its cover tiles exactly: "cover": ["project-id", ...] in portfolio.json.
    if (folder.cover && folder.cover.length) {
      return folder.cover.map(function (id) { return data.projects.find(function (p) { return p.id === id; }); }).filter(Boolean).slice(0, count);
    }
    var visible = function (list) { return list.filter(function (p) { return !p.hideFromCover; }); }; // "hideFromCover": true keeps a project off folder covers
    var lists = childFolders(folder).map(function (child) { return visible(folderProjects(child)); })
      .concat(visible(ownProjects(folder)).map(function (p) { return [p]; }))
      .filter(function (list) { return list.length; });
    var picked = [];
    for (var round = 0; picked.length < count && lists.some(function (list) { return list.length > round; }); round++) {
      lists.forEach(function (list) { if (picked.length < count && list[round]) picked.push(list[round]); });
    }
    return picked;
  }

  function folderItems(folder) {
    if (folder.group === 'teaching') return folderProjects(folder).concat(data.teaching.events || []);
    return folderProjects(folder);
  }

  function makeCoverMedia(item, tile) {
    var source = item.image || item.src || '';
    if (item.mediaBackground) { tile.style.background = item.mediaBackground; tile.classList.add('shot--contain'); }
    var isVideo = /\.(?:webm|mp4)(?:$|\?)/i.test(source);
    if (!source) {
      tile.classList.add('folder-tile--label');
      var label = document.createElement('span');
      label.textContent = item.title;
      tile.appendChild(label);
      return;
    }
    var media = document.createElement(isVideo ? 'video' : 'img');
    media.src = source;
    if (isVideo) {
      media.poster = window.videoPoster(source);
      watchPreviewVideo(media);
      media.setAttribute('aria-hidden', 'true');
    } else {
      media.alt = 'Preview of ' + item.title;
      media.loading = 'lazy';
      media.decoding = 'async';
    }
    tile.appendChild(media);
  }

  function makeFolderPreview(folder) {
    var items = folder.group === 'teaching'
      ? folderItems(folder).slice(0, 4)
      : previewProjects(folder, 4);
    if (!items.length) items = [{ title: folder.title }];
    var shot = document.createElement('div');
    var labelsOnly = items.every(function (item) { return !item.image && !item.src; });
    shot.className = 'shot' + (labelsOnly ? ' folder-shot--labels' : '');
    var preview = document.createElement('div');
    preview.className = 'folder-preview folder-preview--' + Math.min(items.length, 4);
    items.forEach(function (item) {
      var tile = document.createElement('div');
      tile.className = 'folder-tile';
      makeCoverMedia(item, tile);
      preview.appendChild(tile);
    });
    shot.appendChild(preview);
    return shot;
  }

  function makeFolderCard(folder, index) {
    var items = folderItems(folder);
    var card = document.createElement('a');
    card.className = 'card folder-card rv' + (index === 0 ? ' big' : '');
    // Keep the fallback navigation in-page if this script cannot run.
    card.href = '#work';
    card.dataset.folderId = folder.id;
    card.setAttribute('aria-label', 'Open ' + folder.title + ' folder, ' + items.length + (folder.group === 'teaching' ? ' events' : ' projects'));
    var info = document.createElement('div');
    info.className = 'info';
    var meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = folder.group === 'teaching'
      ? 'Teaching · ' + items.length + (items.length === 1 ? ' event' : ' events')
      : folder.title + ' · ' + items.length + (items.length === 1 ? ' project' : ' projects');
    var title = document.createElement('h3');
    title.textContent = folder.title;
    var summary = document.createElement('p');
    summary.className = 'd';
    summary.textContent = folder.description;
    var count = document.createElement('p');
    count.className = 'r';
    count.textContent = items.length + (folder.group === 'teaching' ? (items.length === 1 ? ' event' : ' events') : (items.length === 1 ? ' project' : ' projects')) + ' inside';
    var action = document.createElement('span');
    action.className = 'folder-action';
    action.textContent = 'Open folder';
    info.append(meta, title, summary, count, action);
    card.append(makeFolderPreview(folder), info);
    return card;
  }

  function makeProjectCard(project) {
    var detailUrl = 'project.html?id=' + encodeURIComponent(project.id);
    var card = document.createElement('article');
    card.className = 'card rv' + (project.id === data.intro.featuredId ? ' big' : '');
    card.addEventListener('click', function (event) {
      if (event.target.closest && event.target.closest('a')) return;
      window.location.href = detailUrl;
    });

    var shot = document.createElement('div');
    shot.className = 'shot';
    if (project.mediaBackground) { shot.style.background = project.mediaBackground; shot.classList.add('shot--contain'); } // pixel art: show it whole on its own backdrop
    var source = project.image || (project.gallery && project.gallery[0] && project.gallery[0].src) || '';
    var isVideo = /\.(?:webm|mp4)(?:$|\?)/i.test(source);
    var media = document.createElement(isVideo ? 'video' : 'img');
    media.src = source;
    if (isVideo) {
      media.poster = window.videoPoster(source);
      watchPreviewVideo(media);
      media.setAttribute('aria-hidden', 'true');
      media.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .8s cubic-bezier(.2,.7,.2,1),filter .4s;filter:saturate(1.1)';
      card.addEventListener('mouseenter', function () { media.style.transform = 'scale(1.05)'; });
      card.addEventListener('mouseleave', function () { media.style.transform = ''; });
    } else {
      media.alt = project.imageAlt || project.title;
      media.loading = 'lazy';
      media.decoding = 'async';
    }
    shot.appendChild(media);

    var info = document.createElement('div');
    info.className = 'info';
    var meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = project.category;
    var title = document.createElement('h3');
    title.textContent = project.title;
    var summary = document.createElement('p');
    summary.className = 'd';
    summary.textContent = project.description;
    var role = document.createElement('p');
    role.className = 'r';
    role.textContent = 'Role: ' + project.role;
    var links = document.createElement('div');
    links.className = 'links';
    links.appendChild(makeLink('View project', detailUrl, false));
    if (project.playableUrl) links.appendChild(makeLink('Play in browser', 'play.html?id=' + encodeURIComponent(project.id), false));
    (project.links || []).forEach(function (item) { links.appendChild(makeLink(item.label, item.url, true)); });
    info.append(meta, title, summary, role, links);
    card.append(shot, info);
    return card;
  }

  function makeTeachingCard(event) {
    var card = document.createElement('article');
    card.className = 'card teaching-event-card rv';
    var shot = document.createElement('div');
    shot.className = 'shot';
    var label = document.createElement('span');
    label.textContent = event.title;
    shot.appendChild(label);
    var info = document.createElement('div');
    info.className = 'info';
    var meta = document.createElement('p');
    meta.className = 'meta';
    meta.textContent = data.teaching.organization + ' · Teaching';
    var title = document.createElement('h3');
    title.textContent = event.title;
    var summary = document.createElement('p');
    summary.className = 'd';
    summary.textContent = event.description;
    var formats = document.createElement('p');
    formats.className = 'r';
    formats.textContent = 'Formats: ' + data.teaching.formats.join(' · ');
    info.append(meta, title, summary, formats);
    card.append(shot, info);
    return card;
  }

  function renderFolder(folder, focusAfter, animate) {
    var token = ++archiveRenderToken;
    if (!grid) return;
    clearPreviewVideos();
    window.clearTimeout(archivePixelTimer);
    grid.classList.remove('archive-pixelating');
    grid.classList.remove('archive-is-exiting', 'archive-is-entering');
    grid.replaceChildren();
    if (!folder) {
      childFolders(null).forEach(function (item, index) { grid.appendChild(makeFolderCard(item, index)); });
    } else if (folder.group === 'teaching') {
      // Teaching events with their own page (photos, videos) lead as full project cards.
      folderProjects(folder).forEach(function (project, index) {
        var card = makeProjectCard(project);
        if (index === 0) card.classList.add('big');
        grid.appendChild(card);
      });
      (data.teaching.events || []).forEach(function (event) { grid.appendChild(makeTeachingCard(event)); });
    } else {
      childFolders(folder).forEach(function (item) { grid.appendChild(makeFolderCard(item, 1)); });
      ownProjects(folder).forEach(function (project) { grid.appendChild(makeProjectCard(project)); });
    }
    // Layout: one big card, then two per row. If that leaves a card alone on the last row,
    // it becomes a full-width card too, so no row has an empty gap.
    var cards = Array.prototype.filter.call(grid.children, function (entry) { return entry.classList.contains('card'); });
    var pairs = cards.filter(function (entry) { return !entry.classList.contains('big'); });
    if (pairs.length % 2 === 1) pairs[pairs.length - 1].classList.add('big');
    Array.prototype.forEach.call(grid.children, function (entry, index) {
      entry.classList.add('archive-entry');
      entry.dataset.motion = folder ? folder.group : 'folders';
      entry.style.setProperty('--entry-delay', Math.min(index, 5) * 20 + 'ms');
    });
    if (animate && !reducedMotion) {
      grid.classList.add('archive-is-entering');
      if (folder && folder.group === 'games') {
        grid.classList.add('archive-pixelating');
        archivePixelTimer = window.setTimeout(function () {
          if (token === archiveRenderToken) grid.classList.remove('archive-pixelating');
        }, 300);
      }
      window.requestAnimationFrame(function () {
        if (token === archiveRenderToken) grid.classList.remove('archive-is-entering');
      });
    }
    if (focusAfter) {
      var focusTarget = folder ? archiveBack : grid.querySelector('.folder-card');
      if (focusTarget) focusTarget.focus();
    }
  }

  function showFolder(folderId, pushHistory, animate, focusAfter) {
    if (!archiveFolders.length) return;
    var folder = folderId ? findFolder(folderId) : null;
    if (folderId && !folder) folderId = null;
    var parentFolder = folder && folder.parent ? findFolder(folder.parent) : null;
    if (archivePrefix) archivePrefix.textContent = folder ? '' : 'The ';
    if (archiveTitle) archiveTitle.textContent = folder ? folder.title : 'archive';
    if (archiveDescription) archiveDescription.textContent = folder ? folder.description : data.intro.archiveDescription;
    if (archiveBack) {
      archiveBack.hidden = !folder;
      archiveBack.dataset.target = parentFolder ? parentFolder.id : '';
      archiveBack.href = folderUrl(parentFolder ? parentFolder.id : null);
      var backLabel = archiveBack.querySelector('.archive-back-label');
      if (backLabel) backLabel.textContent = parentFolder ? 'Back to ' + parentFolder.title : 'All folders';
    }
    document.title = person.name + ' | ' + (folder ? folder.title : 'Game Designer');
    if (pushHistory) {
      try {
        window.history.pushState({ folder: folder ? folder.id : null }, '', folderUrl(folder ? folder.id : null));
      } catch (error) {
        // Keep the in-page folder view working when file previews reject history URLs.
      }
    }
    if (pushHistory && archiveSection) archiveSection.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    window.clearTimeout(archiveTransitionTimer);
    if (animate && !reducedMotion && grid && grid.children.length) {
      grid.classList.remove('archive-is-entering');
      grid.classList.add('archive-is-exiting');
      archiveTransitionTimer = window.setTimeout(function () {
        renderFolder(folder, focusAfter, true);
      }, 120);
    } else {
      renderFolder(folder, focusAfter, false);
    }
  }

  if (archiveBack) archiveBack.addEventListener('click', function (event) {
    event.preventDefault();
    showFolder(archiveBack.dataset.target || null, true, true, event.detail === 0);
  });
  if (grid) grid.addEventListener('click', function (event) {
    var card = event.target.closest && event.target.closest('[data-folder-id]');
    if (!card || !grid.contains(card) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    showFolder(card.dataset.folderId, true, true, event.detail === 0);
  });
  window.addEventListener('popstate', function () {
    showFolder(new URLSearchParams(window.location.search).get('folder'), false, true, false);
  });
  showFolder(new URLSearchParams(window.location.search).get('folder'), false, false, false);

  var email = byId('email');
  if (email) email.textContent = person.email;
  var phone = byId('phone-link');
  if (phone) {
    phone.href = 'tel:' + person.phoneLink;
    phone.textContent = person.phone;
  }
  var linkedin = byId('linkedin-link');
  if (linkedin) linkedin.href = person.linkedin;
  [['github-link', person.github], ['itch-link', person.itch]].forEach(function (pair) {
    var link = byId(pair[0]);
    if (!link) return;
    if (pair[1]) link.href = pair[1]; else link.parentNode.remove();
  });
  var resume = byId('resume-link');
  if (resume) resume.href = person.resume;
  });
})();
