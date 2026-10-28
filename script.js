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

  /* Certificate viewer: opens certificates in an in-page dialog with zoom
     (buttons, click, scroll wheel, keys), drag-to-pan, previous/next, and
     download. It opens from certificate cards and from "View certificate"
     buttons on any page. Without JavaScript the links still work normally. */
  const certLinks = Array.from(document.querySelectorAll('.cert__image, .cert-link[data-cert-src]'));
  if (!certLinks.length || typeof HTMLDialogElement !== 'function') return;

  /* What to show for an opener: image URL, title, and a slug for the download name. */
  function certInfo(link) {
    if (link.dataset.certSrc) {
      const src = link.dataset.certSrc;
      return { src: src, name: link.dataset.certTitle, slug: src.split('/').pop().replace(/\.[a-z]+$/, '') };
    }
    const card = link.closest('.cert');
    return { src: link.getAttribute('href'), name: card.querySelector('.cert__title').textContent.trim(), slug: card.id };
  }

  const MAX_ZOOM = 5;
  const CLICK_ZOOM = 2.5;
  const ICON = (sign) =>
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M8 11h6' +
    (sign === '+' ? 'M11 8v6' : '') + '"/></svg>';

  const dialog = document.createElement('dialog');
  dialog.className = 'viewer';
  dialog.setAttribute('aria-label', 'Certificate viewer');
  dialog.innerHTML =
    '<div class="viewer__bar">' +
      '<p class="viewer__title"></p>' +
      '<div class="viewer__actions">' +
        '<button type="button" data-act="out" aria-label="Zoom out" title="Zoom out">' + ICON('-') + '</button>' +
        '<button type="button" data-act="in" aria-label="Zoom in" title="Zoom in">' + ICON('+') + '</button>' +
        '<a class="viewer__download" download>Download</a>' +
        '<button type="button" data-act="close" aria-label="Close" title="Close">&times;</button>' +
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
  const zoomOutBtn = dialog.querySelector('[data-act="out"]');
  let index = 0;
  let zoom = 1;
  let baseWidth = 0;
  let dragged = false;

  /* Zoom to `next` (1 = fit), keeping the point under (focusX, focusY) still. */
  function setZoom(next, focusX, focusY) {
    const target = Math.min(MAX_ZOOM, Math.max(1, next));
    if (Math.abs(target - zoom) < 0.001) return;
    if (zoom === 1) baseWidth = img.getBoundingClientRect().width;
    const rect = stage.getBoundingClientRect();
    const fx = focusX === undefined ? rect.width / 2 : focusX - rect.left;
    const fy = focusY === undefined ? rect.height / 2 : focusY - rect.top;
    const ratio = target / zoom;
    const anchorX = (stage.scrollLeft + fx) * ratio - fx;
    const anchorY = (stage.scrollTop + fy) * ratio - fy;
    zoom = target < 1.02 ? 1 : target;
    stage.classList.toggle('is-zoomed', zoom > 1);
    zoomOutBtn.disabled = zoom === 1;
    img.style.width = zoom > 1 ? Math.round(baseWidth * zoom) + 'px' : '';
    stage.scrollLeft = zoom > 1 ? anchorX : 0;
    stage.scrollTop = zoom > 1 ? anchorY : 0;
  }

  /* Show certificate number i (wraps around) at fit-to-screen size. */
  function show(i) {
    index = (i + certLinks.length) % certLinks.length;
    const info = certInfo(certLinks[index]);
    zoom = 1;
    img.style.width = '';
    stage.classList.remove('is-zoomed');
    zoomOutBtn.disabled = true;
    img.src = info.src;
    img.alt = info.name + ' certificate';
    title.textContent = info.name;
    download.href = info.src;
    download.setAttribute('download', 'Ahmed-Kheder-' + info.slug + '.jpg');
  }

  // with a single certificate on the page there is nothing to flip to
  dialog.classList.toggle('viewer--single', certLinks.length === 1);

  certLinks.forEach((link, i) => {
    link.addEventListener('click', (e) => {
      if (link.classList.contains('is-missing')) return;
      e.preventDefault();
      show(i);
      dialog.showModal();
    });
  });

  // focus goes back to the opener on close; blur it so mouse users don't see a focus ring
  dialog.addEventListener('close', () => {
    const active = document.activeElement;
    if (active && certLinks.includes(active) && !active.matches(':focus-visible')) active.blur();
  });

  dialog.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'close') dialog.close();
    else if (act === 'in') setZoom(zoom * 1.5);
    else if (act === 'out') setZoom(zoom / 1.5);
    else if (act === 'prev') show(index - 1);
    else if (act === 'next') show(index + 1);
    // a click on the dark area closes the viewer, but never at the end of a drag or while zoomed
    else if ((e.target === dialog || e.target === stage) && zoom === 1 && !dragged) dialog.close();
  });

  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === '+' || e.key === '=') setZoom(zoom * 1.5);
    else if (e.key === '-') setZoom(zoom / 1.5);
    else if (e.key === '0') setZoom(1);
  });

  // scroll wheel (and trackpad pinch) zooms toward the cursor
  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const step = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    setZoom(zoom * Math.exp(-step * 0.0015), e.clientX, e.clientY);
  }, { passive: false });

  // click the image to zoom in on that spot; click again to zoom back out to fit
  img.addEventListener('click', (e) => {
    if (dragged) return;
    setZoom(zoom > 1 ? 1 : CLICK_ZOOM, e.clientX, e.clientY);
  });

  // drag to pan while zoomed
  let drag = null;
  stage.addEventListener('pointerdown', (e) => {
    if (zoom === 1 || e.button !== 0) return;
    drag = { x: e.clientX, y: e.clientY, left: stage.scrollLeft, top: stage.scrollTop };
    dragged = false;
  });
  stage.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (!dragged && Math.abs(dx) + Math.abs(dy) > 4) {
      dragged = true;
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('is-dragging');
    }
    if (dragged) {
      stage.scrollLeft = drag.left - dx;
      stage.scrollTop = drag.top - dy;
    }
  });
  ['pointerup', 'pointercancel'].forEach((type) => stage.addEventListener(type, () => {
    drag = null;
    stage.classList.remove('is-dragging');
    setTimeout(() => { dragged = false; }, 0);
  }));
})();
