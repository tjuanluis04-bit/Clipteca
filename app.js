/* =========================================================
   Clipteca — app.js
   Estado en localStorage, sin backend.
   ========================================================= */

const STORAGE_KEY = 'clipteca_data_v1';

const PALETTE = ['#FF4D6D', '#5EEAD4', '#FFC24B', '#8B7CFF', '#4FB0FF', '#FF8A65', '#7FE08A'];

const PLATFORMS = {
  youtube:  { label: 'YouTube',   match: /youtu\.?be/i },
  tiktok:   { label: 'TikTok',    match: /tiktok\.com/i },
  instagram:{ label: 'Instagram', match: /instagram\.com/i },
  twitter:  { label: 'X / Twitter', match: /twitter\.com|x\.com/i },
  facebook: { label: 'Facebook',  match: /facebook\.com|fb\.watch/i },
  otro:     { label: 'Enlace',    match: null }
};

const PLATFORM_ICONS = {
  youtube: '<svg width="12" height="12" viewBox="0 0 24 24" fill="#FF4D6D"><path d="M21.5 7.2s-.2-1.5-.8-2.1c-.8-.8-1.7-.8-2.1-.9C15.9 4 12 4 12 4h0s-3.9 0-6.6.2c-.4 0-1.3.1-2.1.9-.6.6-.8 2.1-.8 2.1S2.3 9 2.3 10.7v1.5c0 1.8.2 3.5.2 3.5s.2 1.5.8 2.1c.8.8 1.8.8 2.3.9C7.4 19 12 19 12 19s3.9 0 6.6-.2c.4 0 1.3-.1 2.1-.9.6-.6.8-2.1.8-2.1s.2-1.8.2-3.5v-1.5c0-1.8-.2-3.5-.2-3.5zM9.9 14.6V8.9l5.4 2.9-5.4 2.8z"/></svg>',
  tiktok: '<svg width="12" height="12" viewBox="0 0 24 24" fill="#F5F3F7"><path d="M16.6 5.8a4.6 4.6 0 0 1-3.8-4.4h-3v14.4a2.7 2.7 0 1 1-1.9-2.6V9.9a6 6 0 1 0 5 5.9V9.5a7.6 7.6 0 0 0 4.4 1.4V7.6a4.6 4.6 0 0 1-.7-1.8z"/></svg>',
  instagram: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FF4D6D" stroke-width="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.7"/><circle cx="17" cy="7" r="0.6" fill="#FF4D6D"/></svg>',
  twitter: '<svg width="12" height="12" viewBox="0 0 24 24" fill="#F5F3F7"><path d="M18.9 3H22l-7.6 8.7L23 21h-6.9l-5.4-6.6L4.6 21H1.4l8.1-9.3L1 3h7l4.9 6L18.9 3z"/></svg>',
  facebook: '<svg width="12" height="12" viewBox="0 0 24 24" fill="#4FB0FF"><path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12z"/></svg>',
  otro: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9C97AA" stroke-width="1.8"><path d="M10 14a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7L11 7"/><path d="M14 10a4 4 0 0 0-5.7 0L5.7 12.6a4 4 0 1 0 5.7 5.7L13 17"/></svg>'
};

/* ---------------- state ---------------- */

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){ /* ignore corrupt state */ }
  return {
    categories: [
      { id: uid(), name: 'General', color: PALETTE[0] }
    ],
    links: []
  };
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid(){
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

let state = loadState();
let activeCategory = 'all';
let searchTerm = '';
let editingLinkId = null;
let pendingPreview = null; // { title, image, platform, url }

/* ---------------- platform detection ---------------- */

function detectPlatform(url){
  try{
    const host = new URL(url).hostname;
    for(const key in PLATFORMS){
      const p = PLATFORMS[key];
      if(p.match && p.match.test(host)) return key;
    }
  }catch(e){ /* invalid URL */ }
  return 'otro';
}

/* ---------------- rendering: category rail ---------------- */

function renderCatRail(){
  const rail = document.getElementById('catRail');
  rail.innerHTML = '';

  const allChip = makeChip({ id: 'all', name: 'Todos', color: null }, activeCategory === 'all');
  rail.appendChild(allChip);

  state.categories.forEach(cat => {
    rail.appendChild(makeChip(cat, activeCategory === cat.id));
  });
}

function makeChip(cat, isActive){
  const btn = document.createElement('button');
  btn.className = 'chip' + (isActive ? ' is-active' : '');
  btn.type = 'button';
  if(cat.color){
    btn.innerHTML = `<span class="chip__dot" style="background:${cat.color}"></span>${escapeHtml(cat.name)}`;
  } else {
    btn.textContent = cat.name;
  }
  btn.addEventListener('click', () => {
    activeCategory = cat.id;
    renderCatRail();
    renderGrid();
  });
  return btn;
}

/* ---------------- rendering: grid ---------------- */

function renderGrid(){
  const grid = document.getElementById('grid');
  const empty = document.getElementById('emptyState');
  grid.innerHTML = '';

  let links = state.links.slice().sort((a,b) => b.addedAt - a.addedAt);

  if(activeCategory !== 'all'){
    links = links.filter(l => l.category === activeCategory);
  }
  if(searchTerm.trim()){
    const q = searchTerm.trim().toLowerCase();
    links = links.filter(l => l.title.toLowerCase().includes(q));
  }

  if(links.length === 0){
    grid.hidden = true;
    empty.hidden = false;
    const emptyTitle = document.getElementById('emptyTitle');
    const emptyBody = document.getElementById('emptyBody');
    if(state.links.length === 0){
      emptyTitle.textContent = 'Todavía no hay nada guardado';
      emptyBody.textContent = 'Pega el enlace de un video y arma tu propia videoteca por categorías.';
    } else if(searchTerm.trim()){
      emptyTitle.textContent = 'Sin resultados';
      emptyBody.textContent = `No encontramos videos que coincidan con "${searchTerm.trim()}".`;
    } else {
      emptyTitle.textContent = 'Nada por aquí todavía';
      emptyBody.textContent = 'Esta categoría no tiene enlaces guardados.';
    }
    return;
  }

  grid.hidden = false;
  empty.hidden = true;

  links.forEach(link => grid.appendChild(renderCard(link)));
}

function renderCard(link){
  const cat = state.categories.find(c => c.id === link.category);
  const card = document.createElement('article');
  card.className = 'card';

  const mediaWrap = document.createElement('div');
  if(link.image){
    mediaWrap.className = 'card__media';
    const img = document.createElement('img');
    img.src = link.image;
    img.alt = '';
    img.loading = 'lazy';
    img.addEventListener('error', () => { mediaWrap.classList.add('no-image'); mediaWrap.innerHTML = noImageIconHtml(); mediaWrap.appendChild(platformBadgeEl(link.platform)); mediaWrap.appendChild(menuBtnEl(link)); });
    mediaWrap.appendChild(img);
  } else {
    mediaWrap.className = 'card__media no-image';
    mediaWrap.innerHTML = noImageIconHtml();
  }
  mediaWrap.appendChild(platformBadgeEl(link.platform));
  mediaWrap.appendChild(menuBtnEl(link));
  card.appendChild(mediaWrap);

  const perf = document.createElement('div');
  perf.className = 'card__perf';
  card.appendChild(perf);

  const body = document.createElement('div');
  body.className = 'card__body';

  const title = document.createElement('h3');
  title.className = 'card__title';
  title.textContent = link.title || 'Sin título';
  body.appendChild(title);

  const meta = document.createElement('div');
  meta.className = 'card__meta';
  meta.innerHTML = `
    <span class="card__cat">
      <span class="card__cat-dot" style="background:${cat ? cat.color : '#524C5E'}"></span>
      ${escapeHtml(cat ? cat.name : 'Sin categoría')}
    </span>
    <span class="card__date">${formatDate(link.addedAt)}</span>
  `;
  body.appendChild(meta);
  card.appendChild(body);

  const open = document.createElement('a');
  open.className = 'card__open';
  open.href = link.url;
  open.target = '_blank';
  open.rel = 'noopener noreferrer';
  open.textContent = 'Ver video ↗';
  card.appendChild(open);

  return card;
}

function noImageIconHtml(){
  return '<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#524C5E" stroke-width="1.4"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M9 9l6 3-6 3V9z" fill="#524C5E" stroke="none"/></svg>';
}

function platformBadgeEl(platform){
  const el = document.createElement('span');
  el.className = 'card__platform';
  el.innerHTML = `${PLATFORM_ICONS[platform] || PLATFORM_ICONS.otro} ${PLATFORMS[platform]?.label || 'Enlace'}`;
  return el;
}

function menuBtnEl(link){
  const btn = document.createElement('button');
  btn.className = 'card__menu';
  btn.setAttribute('aria-label', 'Opciones');
  btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    openCardMenu(link, btn);
  });
  return btn;
}

function openCardMenu(link, anchorEl){
  // Simple inline menu via confirm-style choices: edit or delete
  const choice = document.createElement('div');
  // Reuse confirm dialog pattern but with two custom actions — simplest: small native-feeling popover
  removeExistingPopover();
  const pop = document.createElement('div');
  pop.className = 'card-popover';
  pop.id = 'cardPopover';
  pop.style.cssText = `
    position:fixed; z-index:150; background:var(--surface-hi); border:1px solid var(--border);
    border-radius:12px; overflow:hidden; box-shadow:var(--shadow-modal); min-width:150px;
  `;
  const rect = anchorEl.getBoundingClientRect();
  pop.style.top = (rect.bottom + 6) + 'px';
  pop.style.right = (window.innerWidth - rect.right) + 'px';

  const editBtn = document.createElement('button');
  editBtn.textContent = 'Editar';
  editBtn.style.cssText = popBtnStyle();
  editBtn.addEventListener('click', () => { removeExistingPopover(); openEditModal(link); });

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Eliminar';
  delBtn.style.cssText = popBtnStyle('var(--coral)');
  delBtn.addEventListener('click', () => { removeExistingPopover(); confirmDeleteLink(link); });

  pop.appendChild(editBtn);
  pop.appendChild(delBtn);
  document.body.appendChild(pop);

  setTimeout(() => {
    document.addEventListener('click', removeExistingPopover, { once: true });
  }, 0);
}
function popBtnStyle(color){
  return `display:block;width:100%;text-align:left;background:transparent;border:none;color:${color||'var(--text)'};padding:11px 16px;font-size:14px;font-weight:600;cursor:pointer;`;
}
function removeExistingPopover(){
  const existing = document.getElementById('cardPopover');
  if(existing) existing.remove();
}

/* ---------------- date formatting ---------------- */

function formatDate(ts){
  const d = new Date(ts);
  const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

/* ---------------- escape ---------------- */

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ---------------- toasts ---------------- */

function toast(msg){
  const stack = document.getElementById('toastStack');
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 200);
  }, 2400);
}

/* ---------------- category select (in link modal) ---------------- */

function populateCategorySelect(selectedId){
  const sel = document.getElementById('categorySelect');
  sel.innerHTML = '';
  state.categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = cat.name;
    if(cat.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}

/* ---------------- Add/Edit link modal ---------------- */

const linkModalOverlay = document.getElementById('linkModalOverlay');
const urlInput = document.getElementById('urlInput');
const fetchPreviewBtn = document.getElementById('fetchPreviewBtn');
const previewArea = document.getElementById('previewArea');
const previewImage = document.getElementById('previewImage');
const platformBadge = document.getElementById('platformBadge');
const manualImageRow = document.getElementById('manualImageRow');
const manualImageInput = document.getElementById('manualImageInput');
const titleInput = document.getElementById('titleInput');
const previewStatus = document.getElementById('previewStatus');
const linkSaveBtn = document.getElementById('linkSaveBtn');
const linkModalTitle = document.getElementById('linkModalTitle');

function openAddModal(){
  editingLinkId = null;
  pendingPreview = null;
  linkModalTitle.textContent = 'Añadir enlace';
  urlInput.value = '';
  urlInput.disabled = false;
  titleInput.value = '';
  previewArea.hidden = true;
  manualImageRow.hidden = true;
  manualImageInput.value = '';
  previewStatus.hidden = true;
  linkSaveBtn.disabled = true;
  populateCategorySelect(state.categories[0]?.id);
  linkModalOverlay.hidden = false;
  setTimeout(() => urlInput.focus(), 50);
}

function openEditModal(link){
  editingLinkId = link.id;
  pendingPreview = { title: link.title, image: link.image, platform: link.platform, url: link.url };
  linkModalTitle.textContent = 'Editar enlace';
  urlInput.value = link.url;
  urlInput.disabled = true;
  titleInput.value = link.title;
  previewArea.hidden = false;
  if(link.image){
    previewImage.src = link.image;
    manualImageRow.hidden = true;
  } else {
    previewImage.src = '';
    manualImageRow.hidden = false;
    manualImageInput.value = '';
  }
  platformBadge.innerHTML = `${PLATFORM_ICONS[link.platform] || ''} ${PLATFORMS[link.platform]?.label || 'Enlace'}`;
  previewStatus.hidden = true;
  linkSaveBtn.disabled = false;
  populateCategorySelect(link.category);
  linkModalOverlay.hidden = false;
}

function closeLinkModal(){
  linkModalOverlay.hidden = true;
}

async function fetchPreview(){
  const url = urlInput.value.trim();
  if(!url){ toast('Pega un enlace primero'); return; }
  let normalized = url;
  if(!/^https?:\/\//i.test(normalized)) normalized = 'https://' + normalized;

  const platform = detectPlatform(normalized);

  previewStatus.hidden = false;
  previewStatus.classList.remove('is-error');
  previewStatus.textContent = 'Buscando vista previa…';
  previewArea.hidden = true;
  fetchPreviewBtn.disabled = true;
  linkSaveBtn.disabled = true;

  try{
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(normalized)}`);
    if(!res.ok) throw new Error('bad response');
    const json = await res.json();
    if(json.status !== 'success') throw new Error('no data');

    const title = json.data.title || json.data.publisher || 'Video sin título';
    const image = (json.data.image && json.data.image.url) || (json.data.screenshot && json.data.screenshot.url) || null;

    pendingPreview = { title, image, platform, url: normalized };

    titleInput.value = title;
    platformBadge.innerHTML = `${PLATFORM_ICONS[platform] || ''} ${PLATFORMS[platform]?.label || 'Enlace'}`;

    if(image){
      previewImage.src = image;
      manualImageRow.hidden = true;
    } else {
      previewImage.removeAttribute('src');
      manualImageRow.hidden = false;
    }

    previewArea.hidden = false;
    previewStatus.hidden = true;
    linkSaveBtn.disabled = false;
  }catch(err){
    pendingPreview = { title: '', image: null, platform, url: normalized };
    titleInput.value = '';
    platformBadge.innerHTML = `${PLATFORM_ICONS[platform] || ''} ${PLATFORMS[platform]?.label || 'Enlace'}`;
    previewImage.removeAttribute('src');
    manualImageRow.hidden = false;
    previewArea.hidden = false;
    previewStatus.hidden = false;
    previewStatus.classList.add('is-error');
    previewStatus.textContent = 'No pudimos generar una vista previa automática. Escribe el título y, si quieres, pega una imagen a mano.';
    linkSaveBtn.disabled = false;
  } finally {
    fetchPreviewBtn.disabled = false;
  }
}

function saveLink(){
  const url = (pendingPreview && pendingPreview.url) || normalizeUrl(urlInput.value.trim());
  if(!url){ toast('Falta el enlace'); return; }

  const title = titleInput.value.trim() || 'Sin título';
  const category = document.getElementById('categorySelect').value;
  const manualImage = manualImageInput.value.trim();
  const image = manualImage || (pendingPreview && pendingPreview.image) || null;
  const platform = (pendingPreview && pendingPreview.platform) || detectPlatform(url);

  if(editingLinkId){
    const link = state.links.find(l => l.id === editingLinkId);
    if(link){
      link.title = title;
      link.category = category;
      link.image = image;
    }
    toast('Enlace actualizado');
  } else {
    state.links.push({
      id: uid(),
      url, title, category, image, platform,
      addedAt: Date.now()
    });
    toast('Enlace guardado');
  }

  saveState();
  closeLinkModal();
  renderGrid();
}

function normalizeUrl(url){
  if(!url) return '';
  if(!/^https?:\/\//i.test(url)) return 'https://' + url;
  return url;
}

function confirmDeleteLink(link){
  openConfirm({
    title: 'Eliminar enlace',
    body: `Se eliminará "${link.title || 'este video'}" de tu videoteca. Esta acción no se puede deshacer.`,
    onConfirm: () => {
      state.links = state.links.filter(l => l.id !== link.id);
      saveState();
      renderGrid();
      toast('Enlace eliminado');
    }
  });
}

/* ---------------- New category modal ---------------- */

const catModalOverlay = document.getElementById('catModalOverlay');
const newCatInput = document.getElementById('newCatInput');
const swatchRow = document.getElementById('swatchRow');
let selectedSwatch = PALETTE[0];
let catModalReturnsToLinkModal = false;

function renderSwatches(){
  swatchRow.innerHTML = '';
  PALETTE.forEach(color => {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'swatch' + (color === selectedSwatch ? ' is-selected' : '');
    sw.style.background = color;
    sw.addEventListener('click', () => {
      selectedSwatch = color;
      renderSwatches();
    });
    swatchRow.appendChild(sw);
  });
}

function openNewCatModal(fromLinkModal){
  catModalReturnsToLinkModal = !!fromLinkModal;
  newCatInput.value = '';
  selectedSwatch = PALETTE[state.categories.length % PALETTE.length];
  renderSwatches();
  catModalOverlay.hidden = false;
  setTimeout(() => newCatInput.focus(), 50);
}

function closeCatModal(){
  catModalOverlay.hidden = true;
}

function saveNewCategory(){
  const name = newCatInput.value.trim();
  if(!name){ toast('Ponle un nombre a la categoría'); return; }
  const newCat = { id: uid(), name, color: selectedSwatch };
  state.categories.push(newCat);
  saveState();
  renderCatRail();
  closeCatModal();

  if(catModalReturnsToLinkModal){
    populateCategorySelect(newCat.id);
  }
  toast('Categoría creada');
}

/* ---------------- Manage categories modal ---------------- */

const manageModalOverlay = document.getElementById('manageModalOverlay');
const manageList = document.getElementById('manageList');

function openManageModal(){
  renderManageList();
  manageModalOverlay.hidden = false;
}
function closeManageModal(){
  manageModalOverlay.hidden = true;
  renderCatRail();
  renderGrid();
}

function renderManageList(){
  manageList.innerHTML = '';
  state.categories.forEach(cat => {
    const count = state.links.filter(l => l.category === cat.id).length;
    const li = document.createElement('li');
    li.className = 'manage-row';
    li.innerHTML = `
      <span class="manage-row__dot" style="background:${cat.color}"></span>
      <input class="manage-row__name" value="${escapeHtml(cat.name)}" data-id="${cat.id}">
      <span class="manage-row__count">${count}</span>
    `;
    const delBtn = document.createElement('button');
    delBtn.className = 'manage-row__del';
    delBtn.setAttribute('aria-label', 'Eliminar categoría');
    delBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>';
    delBtn.addEventListener('click', () => confirmDeleteCategory(cat));
    li.appendChild(delBtn);

    const nameInput = li.querySelector('.manage-row__name');
    nameInput.addEventListener('change', () => {
      const val = nameInput.value.trim();
      if(val){ cat.name = val; saveState(); }
      else nameInput.value = cat.name;
    });

    manageList.appendChild(li);
  });
}

function confirmDeleteCategory(cat){
  const count = state.links.filter(l => l.category === cat.id).length;
  const body = count > 0
    ? `Esta categoría tiene ${count} video${count === 1 ? '' : 's'} guardado${count === 1 ? '' : 's'}. Se eliminarán junto con la categoría. Esta acción no se puede deshacer.`
    : 'Esta acción no se puede deshacer.';

  openConfirm({
    title: `Eliminar "${cat.name}"`,
    body,
    onConfirm: () => {
      state.categories = state.categories.filter(c => c.id !== cat.id);
      state.links = state.links.filter(l => l.category !== cat.id);
      if(activeCategory === cat.id) activeCategory = 'all';
      saveState();
      renderManageList();
      toast('Categoría eliminada');
    }
  });
}

/* ---------------- Confirm dialog (generic) ---------------- */

const confirmOverlay = document.getElementById('confirmOverlay');
const confirmTitleEl = document.getElementById('confirmTitle');
const confirmBodyEl = document.getElementById('confirmBody');
const confirmOkBtn = document.getElementById('confirmOkBtn');
let confirmCallback = null;

function openConfirm({ title, body, onConfirm }){
  confirmTitleEl.textContent = title;
  confirmBodyEl.textContent = body;
  confirmCallback = onConfirm;
  confirmOverlay.hidden = false;
}
function closeConfirm(){
  confirmOverlay.hidden = true;
  confirmCallback = null;
}

/* ---------------- wiring ---------------- */

document.getElementById('fabAdd').addEventListener('click', openAddModal);
document.getElementById('emptyAddBtn').addEventListener('click', openAddModal);

document.getElementById('linkModalClose').addEventListener('click', closeLinkModal);
document.getElementById('linkCancelBtn').addEventListener('click', closeLinkModal);
linkModalOverlay.addEventListener('click', (e) => { if(e.target === linkModalOverlay) closeLinkModal(); });

fetchPreviewBtn.addEventListener('click', fetchPreview);
urlInput.addEventListener('keydown', (e) => { if(e.key === 'Enter'){ e.preventDefault(); fetchPreview(); } });
linkSaveBtn.addEventListener('click', saveLink);

document.getElementById('newCatFromModalBtn').addEventListener('click', () => openNewCatModal(true));
document.getElementById('catModalClose').addEventListener('click', closeCatModal);
document.getElementById('catCancelBtn').addEventListener('click', closeCatModal);
document.getElementById('catSaveBtn').addEventListener('click', saveNewCategory);
catModalOverlay.addEventListener('click', (e) => { if(e.target === catModalOverlay) closeCatModal(); });

document.getElementById('manageCatsBtn').addEventListener('click', openManageModal);
document.getElementById('manageModalClose').addEventListener('click', closeManageModal);
document.getElementById('manageDoneBtn').addEventListener('click', closeManageModal);
document.getElementById('manageAddCatBtn').addEventListener('click', () => openNewCatModal(false));
manageModalOverlay.addEventListener('click', (e) => { if(e.target === manageModalOverlay) closeManageModal(); });

document.getElementById('confirmCancelBtn').addEventListener('click', closeConfirm);
document.getElementById('confirmOkBtn').addEventListener('click', () => {
  if(confirmCallback) confirmCallback();
  closeConfirm();
});
confirmOverlay.addEventListener('click', (e) => { if(e.target === confirmOverlay) closeConfirm(); });

const searchToggle = document.getElementById('searchToggle');
const searchBar = document.getElementById('searchBar');
const searchInput = document.getElementById('searchInput');
searchToggle.addEventListener('click', () => {
  const willShow = searchBar.hidden;
  searchBar.hidden = !willShow;
  searchToggle.setAttribute('aria-expanded', String(willShow));
  if(willShow) setTimeout(() => searchInput.focus(), 50);
  else { searchTerm = ''; searchInput.value = ''; renderGrid(); }
});
searchInput.addEventListener('input', () => {
  searchTerm = searchInput.value;
  renderGrid();
});

document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape'){
    if(!linkModalOverlay.hidden) closeLinkModal();
    else if(!catModalOverlay.hidden) closeCatModal();
    else if(!manageModalOverlay.hidden) closeManageModal();
    else if(!confirmOverlay.hidden) closeConfirm();
  }
});

/* ---------------- init ---------------- */

renderCatRail();
renderGrid();

if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline install optional */ });
  });
}
