import { TYPE_META } from '../filters.js';

function getTypeMeta(type) {
  return TYPE_META[type] || { slug: 'unknown', shortLabel: type };
}

function toTelHref(phone) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

function isIOS() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isAndroid() {
  return /Android/.test(navigator.userAgent || '');
}

function buildNavigationUrl(lat, lng, label) {
  if (isIOS()) {
    return `https://maps.apple.com/?daddr=${lat},${lng}`;
  }
  if (isAndroid()) {
    return `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(label)})`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

function buildPhotoPlaceholder(message) {
  const wrap = document.createElement('div');
  wrap.className = 'detail-photo__placeholder';
  wrap.innerHTML =
    '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">' +
    '<path fill="currentColor" d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2ZM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5Z"/>' +
    '</svg>';
  const label = document.createElement('span');
  label.textContent = message;
  wrap.appendChild(label);
  return wrap;
}

function setValue(el, text) {
  el.textContent = text;
  el.classList.remove('detail-field__value--muted');
}

function setMuted(el, text) {
  el.textContent = text;
  el.classList.add('detail-field__value--muted');
}

function renderPhone(el, phone) {
  el.classList.remove('detail-field__value--muted');
  el.replaceChildren();
  if (phone) {
    const link = document.createElement('a');
    link.href = toTelHref(phone);
    link.textContent = phone;
    link.className = 'detail-field__value--link';
    el.appendChild(link);
  } else {
    el.textContent = '未提供';
    el.classList.add('detail-field__value--muted');
  }
}

function renderPhoto(container, photoUrl, altText) {
  container.replaceChildren();
  if (!photoUrl) {
    container.appendChild(buildPhotoPlaceholder('無照片'));
    return;
  }
  const img = document.createElement('img');
  img.src = photoUrl;
  img.alt = altText;
  img.loading = 'lazy';
  img.addEventListener(
    'error',
    () => {
      container.replaceChildren(buildPhotoPlaceholder('照片無法載入'));
    },
    { once: true }
  );
  container.appendChild(img);
}

let elements = null;
let lastFocusedElement = null;

function getElements() {
  if (!elements) {
    elements = {
      backdrop: document.getElementById('detail-backdrop'),
      sheet: document.getElementById('detail-sheet'),
      close: document.getElementById('detail-close'),
      name: document.getElementById('detail-name'),
      district: document.getElementById('detail-district'),
      typeBadge: document.getElementById('detail-type-badge'),
      address: document.getElementById('detail-address'),
      relativePosition: document.getElementById('detail-relative-position'),
      hours: document.getElementById('detail-hours'),
      type: document.getElementById('detail-type'),
      managedBy: document.getElementById('detail-managed-by'),
      phone: document.getElementById('detail-phone'),
      photo: document.getElementById('detail-photo'),
      note: document.getElementById('detail-note'),
      navigate: document.getElementById('detail-navigate'),
    };
  }
  return elements;
}

export function initDetailView() {
  const els = getElements();

  els.close.addEventListener('click', closeDetailView);
  els.backdrop.addEventListener('click', closeDetailView);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.sheet.hidden) {
      closeDetailView();
    }
  });
}

export function openDetailView(area) {
  const els = getElements();
  const meta = getTypeMeta(area.type);

  els.name.textContent = area.name;
  els.district.textContent = area.district;
  els.typeBadge.textContent = meta.shortLabel;
  els.typeBadge.dataset.type = meta.slug;

  setValue(els.address, area.address);

  if (area.relativePosition) {
    setValue(els.relativePosition, area.relativePosition);
  } else {
    setMuted(els.relativePosition, '未提供');
  }

  setValue(els.hours, area.hours);
  setValue(els.type, area.type);
  setValue(els.managedBy, area.managedBy);
  renderPhone(els.phone, area.managedByPhone);
  renderPhoto(els.photo, area.photoUrl, area.name);

  // Disclaimer always renders — it's a fixed section like every other
  // field, just styled as a callout rather than a plain label/value pair.
  els.note.textContent = area.note || '本位置無提供備註資訊。';

  els.navigate.onclick = () => {
    const url = buildNavigationUrl(area.lat, area.lng, area.name);
    window.open(url, '_blank', 'noopener');
  };

  show(els);
}

function show(els) {
  lastFocusedElement = document.activeElement;
  els.backdrop.hidden = false;
  els.sheet.hidden = false;
  // Force a reflow so the [hidden]->visible transform transition runs.
  void els.sheet.offsetHeight;
  els.backdrop.classList.add('is-open');
  els.sheet.classList.add('is-open');
  els.close.focus();
  document.body.style.overflow = 'hidden';
}

export function closeDetailView() {
  const els = getElements();
  if (els.sheet.hidden) {
    return;
  }

  els.backdrop.classList.remove('is-open');
  els.sheet.classList.remove('is-open');
  document.body.style.overflow = '';

  els.sheet.addEventListener(
    'transitionend',
    () => {
      els.backdrop.hidden = true;
      els.sheet.hidden = true;
    },
    { once: true }
  );

  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}
