import { escapeHTML as e, icon } from './store.js';
import { responsiveImage, errorState, emptyState } from './components.js';

const content = document.querySelector('#gallery-content');
const filters = document.querySelector('#gallery-filters');
const count = document.querySelector('#gallery-count');
let items = [];
let visibleItems = [];
let category = 'All flowers';
let lightbox;
let activeIndex = 0;
let lastTrigger;

function renderGallery() {
  visibleItems = category === 'All flowers' ? items : items.filter(item => item.category === category);
  count.textContent = `${visibleItems.length} ${visibleItems.length === 1 ? 'moment' : 'moments'} in bloom`;
  content.setAttribute('aria-busy', 'false');
  content.innerHTML = visibleItems.length ? `<div class="gallery-grid">${visibleItems.map((item, index) => `<figure class="gallery-card"><button type="button" class="gallery-image" data-gallery-index="${index}" aria-label="View ${e(item.title)}">${responsiveImage(item.image, item.imageAlt, { sizes: '(max-width: 600px) 100vw, (max-width: 1000px) 45vw, 380px' })}<span class="gallery-expand" aria-hidden="true">${icon('plus')}</span></button><figcaption class="gallery-caption"><span>${e(item.title)}</span><span class="muted">${e(item.category)}</span></figcaption></figure>`).join('')}</div>` : emptyState('A little room to bloom', 'There are no flowers in this collection yet.', '<button class="button button-secondary" type="button" data-gallery-filter="All flowers">See all flowers</button>');
}

function renderFilters(categories) {
  filters.innerHTML = ['All flowers', ...categories].map(name => `<button class="filter-chip${name === category ? ' is-active' : ''}" type="button" data-gallery-filter="${e(name)}" aria-pressed="${name === category}">${e(name)}</button>`).join('');
}

function createLightbox() {
  // Create after app.js has bound its own dialogs; this dialog manages its own focus.
  lightbox = document.createElement('dialog');
  lightbox.className = 'lightbox-dialog';
  lightbox.id = 'gallery-lightbox';
  lightbox.setAttribute('aria-labelledby', 'lightbox-title');
  lightbox.innerHTML = `<div class="lightbox-heading"><p class="eyebrow">THE FLOWER EDIT</p><button type="button" class="icon-button" id="lightbox-close" aria-label="Close photo" autofocus>${icon('close')}</button></div><div class="lightbox-stage"><button type="button" class="icon-button lightbox-prev" id="lightbox-prev" aria-label="Previous photo">${icon('chevron')}</button><img id="lightbox-image" alt="" width="960" height="1200"><button type="button" class="icon-button lightbox-next" id="lightbox-next" aria-label="Next photo">${icon('chevron')}</button></div><div class="lightbox-caption"><div><h2 id="lightbox-title"></h2><p id="lightbox-category" class="muted"></p></div><p id="lightbox-counter" class="lightbox-counter" aria-live="polite" aria-atomic="true"></p></div>`;
  document.body.append(lightbox);
  lightbox.querySelector('#lightbox-close').addEventListener('click', () => lightbox.close());
  lightbox.querySelector('#lightbox-prev').addEventListener('click', () => moveLightbox(-1));
  lightbox.querySelector('#lightbox-next').addEventListener('click', () => moveLightbox(1));
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      moveLightbox(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  lightbox.addEventListener('click', event => {
    if (event.target !== lightbox) return;
    const bounds = lightbox.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) lightbox.close();
  });
  lightbox.addEventListener('close', () => { if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true }); });
}

function showLightbox(index, trigger) {
  if (!visibleItems[index]) return;
  if (!lightbox) createLightbox();
  activeIndex = index;
  lastTrigger = trigger;
  updateLightbox();
  lightbox.showModal();
}

function moveLightbox(direction) {
  activeIndex = (activeIndex + direction + visibleItems.length) % visibleItems.length;
  updateLightbox();
}

function updateLightbox() {
  const item = visibleItems[activeIndex];
  const image = lightbox.querySelector('#lightbox-image');
  image.src = item.image;
  image.alt = item.imageAlt;
  lightbox.querySelector('#lightbox-title').textContent = item.title;
  lightbox.querySelector('#lightbox-category').textContent = item.category;
  lightbox.querySelector('#lightbox-counter').textContent = `${activeIndex + 1} of ${visibleItems.length}`;
  lightbox.querySelector('#lightbox-prev').disabled = visibleItems.length < 2;
  lightbox.querySelector('#lightbox-next').disabled = visibleItems.length < 2;
}

async function loadGallery() {
  content.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch(new URL('../../data/gallery.json', import.meta.url));
    if (!response.ok) throw new Error('Gallery unavailable');
    const data = await response.json();
    if (!Array.isArray(data.items) || !Array.isArray(data.categories)) throw new Error('Gallery unavailable');
    items = data.items;
    renderFilters(data.categories);
    renderGallery();
  } catch {
    count.textContent = '';
    content.setAttribute('aria-busy', 'false');
    content.innerHTML = errorState('Our gallery couldn’t be loaded. Please try again.', 'gallery');
  }
}

document.querySelector('#main-content').addEventListener('click', event => {
  const filter = event.target.closest('[data-gallery-filter]');
  if (filter) {
    category = filter.dataset.galleryFilter;
    filters.querySelectorAll('[data-gallery-filter]').forEach(button => {
      const selected = button.dataset.galleryFilter === category;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    renderGallery();
  }
  const image = event.target.closest('[data-gallery-index]');
  if (image) showLightbox(Number(image.dataset.galleryIndex), image);
  if (event.target.closest('[data-retry="gallery"]')) loadGallery();
});

loadGallery();
