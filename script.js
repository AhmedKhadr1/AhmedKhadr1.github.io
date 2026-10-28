/* Ahmed Kheder — minimal interactivity: theme toggle, footer year, certificate viewer */

(function () {
  'use strict';

  const root = document.documentElement;

  function setTheme(theme) {
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f0f10' : '#fbfaf5');
  }

  document.getElementById('themeToggle')?.addEventListener('click', () => {
    const current = root.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) setTheme(e.matches ? 'dark' : 'light');
  });

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* Certificate viewer: opens certificate images in an in-page dialog with
     zoom, drag-to-pan, previous/next, and download. Without JavaScript the
     links still open the image directly. */
  const certLinks = Array.from(document.querySelectorAll('.cert__image'));
  if (!certLinks.length || typeof HTMLDialogElement !== 'function') return;

  const MAX_ZOOM = 4;
  const dialog = document.createElement('dialog');
  dialog.className = 'viewer';
  dialog.setAttribute('aria-label', 'Certificate viewer');
  dialog.innerHTML =
    '<div class="viewer__bar">' +
      '<p class="viewer__title"></p>' +
      '<div class="viewer__actions">' +
        '<button type="button" data-act="out" aria-label="Zoom out">&minus;</button>' +
        '<button type="button" data-act="in" aria-label="Zoom in">+</button>' +
        '<a class="viewer__download" download>Download</a>' +
        '<button type="button" data-act="close" aria-label="Close">&times;</button>' +
      '</div>' +
    '</div>' +
    '<div class="viewer__stage"><img class="viewer__img" alt="" draggable="false" /></div>' +
    '<button type="button" class="viewer__nav viewer__nav--prev" data-act="prev" aria-label="Previous certificate">&lsaquo;</button>' +
    '<button type="button" class="viewer__nav viewer__nav--next" data-act="next" aria-label="Next certificate">&rsaquo;</button>';
  document.body.appendChild(dialog);

  const stage = dialog.querySelector('.viewer__stage');
  const img = dialog.querySelector('.viewer__img');
  const title = dialog.querySelector('.viewer__title');
  const download = dialog.querySelector('.viewer__download');
  let index = 0;
  let zoom = 1;
  let baseWidth = 0;

  function setZoom(next, focusX, focusY) {
    const target = Math.min(MAX_ZOOM, Math.max(1, next));
    if (target === zoom) return;
    if (zoom === 1) baseWidth = img.getBoundingClientRect().width;
    // keep the point under the cursor (or the centre) in place while zooming
    const rect = stage.getBoundingClientRect();
    const fx = focusX === undefined ? rect.width / 2 : focusX - rect.left;
    const fy = focusY === undefined ? rect.height / 2 : focusY - rect.top;
    const ratio = target / zoom;
    const anchorX = (stage.scrollLeft + fx) * ratio - fx;
    const anchorY = (stage.scrollTop + fy) * ratio - fy;
    zoom = target;
    stage.classList.toggle('is-zoomed', zoom > 1);
    img.style.width = zoom > 1 ? Math.round(baseWidth * zoom) + 'px' : '';
    stage.scrollLeft = zoom > 1 ? anchorX : 0;
    stage.scrollTop = zoom > 1 ? anchorY : 0;
  }

  function show(i) {
    index = (i + certLinks.length) % certLinks.length;
    const link = certLinks[index];
    const card = link.closest('.cert');
    const name = card.querySelector('.cert__title').textContent.trim();
    zoom = 1;
    img.style.width = '';
    stage.classList.remove('is-zoomed');
    img.src = link.getAttribute('href');
    img.alt = name + ' certificate';
    title.textContent = name;
    download.href = link.getAttribute('href');
    download.setAttribute('download', 'Ahmed-Kheder-' + card.id + '.jpg');
  }

  certLinks.forEach((link, i) => {
    link.addEventListener('click', (e) => {
      if (link.classList.contains('is-missing')) return;
      e.preventDefault();
      show(i);
      dialog.showModal();
    });
  });

  dialog.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'close') dialog.close();
    else if (act === 'in') setZoom(zoom * 1.5);
    else if (act === 'out') setZoom(zoom / 1.5);
    else if (act === 'prev') show(index - 1);
    else if (act === 'next') show(index + 1);
    else if (e.target === dialog || e.target === stage) dialog.close();
  });

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === '+' || e.key === '=') setZoom(zoom * 1.5);
    else if (e.key === '-') setZoom(zoom / 1.5);
  });

  // click the image to zoom in on that spot, click again to fit
  let dragged = false;
  img.addEventListener('click', (e) => {
    if (dragged) return;
    setZoom(zoom > 1 ? 1 : 2.5, e.clientX, e.clientY);
  });

  // drag to pan while zoomed
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    if (zoom === 1 || e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, left: stage.scrollLeft, top: stage.scrollTop };
    dragged = false;
    stage.setPointerCapture(e.pointerId);
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragged = true;
    stage.scrollLeft = drag.left - dx;
    stage.scrollTop = drag.top - dy;
  });
  ['pointerup', 'pointercancel'].forEach((type) => stage.addEventListener(type, () => {
    drag = null;
    stage.classList.remove('is-dragging');
    setTimeout(() => { dragged = false; }, 0);
  }));
})();
