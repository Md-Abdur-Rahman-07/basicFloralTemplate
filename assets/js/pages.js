import { getCatalog, formatPrice, getWishlist, icon, escapeHTML as e, toast } from './store.js';
import { productCard, responsiveImage, skeletons, errorState, emptyState } from './components.js';

const page = location.pathname.split('/').pop() || 'index.html';
const params = new URLSearchParams(location.search);
let catalog;

async function loadHome() {
  const best = document.getElementById('best-sellers');
  const arrivals = document.getElementById('new-arrivals');
  const categories = document.getElementById('home-categories');
  best.innerHTML = arrivals.innerHTML = skeletons();
  try {
    catalog = await getCatalog();
    const selections = ['Bouquets', 'Roses', 'Peonies', 'Dried Flowers'];
    categories.innerHTML = selections.map(category => {
      const product = catalog.products.find(product => product.category === category);
      return product ? `<a class="category-tile" href="buy.html?category=${encodeURIComponent(category)}"><div class="category-image">${responsiveImage(product.images[0], product.imageAlt, { sizes: '(max-width: 600px) 45vw, 280px' })}</div><h3>${e(category)} ${icon('chevron')}</h3></a>` : '';
    }).join('');
    const featured = catalog.products.filter(product => product.featured).slice(0, 4);
    const newest = catalog.products.filter(product => product.isNew).slice(0, 4);
    best.innerHTML = featured.length ? featured.map(productCard).join('') : emptyState('Fresh inspiration is on its way', 'Explore the collection to find your flowers.');
    arrivals.innerHTML = newest.length ? newest.map(productCard).join('') : emptyState('A new season is growing', 'There are more lovely things in the collection.');
  } catch {
    best.innerHTML = errorState('We couldn’t load the collection. Please try again.', 'home');
    arrivals.innerHTML = '';
    categories.innerHTML = '<p class="muted">The collection will be here in a moment.</p>';
  } finally {
    [best, arrivals, categories].forEach(target => target.setAttribute('aria-busy', 'false'));
  }
}

const shopState = { query: (params.get('q') || '').slice(0, 100), category: params.get('category') || 'All flowers', sort: params.get('sort') || 'featured' };
async function loadShop() {
  const grid = document.getElementById('shop-products');
  grid.innerHTML = skeletons(8);
  grid.setAttribute('aria-busy', 'true');
  try {
    catalog = await getCatalog();
    if (!catalog.categories.includes(shopState.category)) shopState.category = 'All flowers';
    if (!['featured', 'price-asc', 'price-desc', 'rating'].includes(shopState.sort)) shopState.sort = 'featured';
    document.getElementById('shop-search').value = shopState.query;
    document.getElementById('shop-sort').value = shopState.sort;
    renderShop();
  } catch {
    grid.innerHTML = errorState('Our flower collection couldn’t be loaded. Please try again.', 'shop');
    document.getElementById('result-count').textContent = 'Collection unavailable';
  } finally { grid.setAttribute('aria-busy', 'false'); }
}
function renderShop() {
  if (!catalog) return;
  const filters = document.getElementById('category-filters');
  const focusedCategory = document.activeElement?.dataset.category;
  filters.innerHTML = ['All flowers', ...catalog.categories].map(category => `<button type="button" class="filter-chip ${shopState.category === category ? 'is-active' : ''}" data-category="${e(category)}" aria-pressed="${shopState.category === category}">${e(category)}</button>`).join('');
  if (focusedCategory) [...filters.querySelectorAll('button')].find(button => button.dataset.category === focusedCategory)?.focus();
  const query = shopState.query.trim().toLocaleLowerCase();
  const products = catalog.products.filter(product => (shopState.category === 'All flowers' || product.category === shopState.category) && `${product.name} ${product.category} ${product.description} ${product.tags.join(' ')}`.toLocaleLowerCase().includes(query));
  if (shopState.sort === 'price-asc') products.sort((a, b) => a.price - b.price);
  if (shopState.sort === 'price-desc') products.sort((a, b) => b.price - a.price);
  if (shopState.sort === 'rating') products.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  if (shopState.sort === 'featured') products.sort((a, b) => Number(b.featured) - Number(a.featured));
  document.getElementById('shop-products').innerHTML = products.length ? products.map(productCard).join('') : emptyState('Nothing in bloom here just yet', 'Try a different search or clear your filters to see the whole collection.', '<button class="button button-secondary" type="button" data-clear-filters>Clear filters</button>');
  document.getElementById('result-count').textContent = `${products.length} ${products.length === 1 ? 'arrangement' : 'arrangements'}${shopState.category === 'All flowers' ? '' : ` in ${shopState.category.toLowerCase()}`}`;
  document.getElementById('clear-filters').hidden = !shopState.query && shopState.category === 'All flowers' && shopState.sort === 'featured';
  const next = new URLSearchParams();
  if (shopState.query) next.set('q', shopState.query);
  if (shopState.category !== 'All flowers') next.set('category', shopState.category);
  if (shopState.sort !== 'featured') next.set('sort', shopState.sort);
  history.replaceState(null, '', `${location.pathname}${next.size ? `?${next}` : ''}`);
}
function clearFilters() {
  shopState.query = '';
  shopState.category = 'All flowers';
  shopState.sort = 'featured';
  document.getElementById('shop-search').value = '';
  document.getElementById('shop-sort').value = 'featured';
  renderShop();
}

async function loadProduct() {
  const target = document.getElementById('product-content');
  target.innerHTML = `<div class="product-detail"><div class="skeleton" style="aspect-ratio:1"></div><div>${skeletons(1)}</div></div>`;
  try {
    catalog = await getCatalog();
    const product = catalog.products.find(product => product.slug === params.get('slug'));
    if (!product) {
      document.title = 'Flower not found | Aspect Floral Studio';
      target.innerHTML = `<div class="not-found"><span class="eyebrow">FLOWER NOT FOUND</span><h1>This bloom has<br>taken another path.</h1><p>We couldn’t find that arrangement. There’s still something lovely waiting in our collection.</p><a class="button button-primary" href="buy.html">Find your flowers</a></div>`;
      return;
    }
    document.title = `${product.name} | Aspect Floral Studio`;
    document.querySelector('meta[name="description"]').content = product.description;
    for (const prefix of ['og', 'twitter']) {
      document.querySelector(`meta[${prefix === 'og' ? 'property' : 'name'}="${prefix}:title"]`).content = document.title;
      document.querySelector(`meta[${prefix === 'og' ? 'property' : 'name'}="${prefix}:description"]`).content = product.description;
    }
    document.querySelector('meta[property="og:image"]').content = product.images[0];
    document.querySelector('meta[name="twitter:image"]').content = product.images[0];
    const saved = getWishlist().includes(product.id);
    const related = catalog.products.filter(item => item.id !== product.id).sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category)).slice(0, 4);
    target.innerHTML = `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span aria-hidden="true">/</span><a href="buy.html">Shop</a><span aria-hidden="true">/</span><a href="buy.html?category=${encodeURIComponent(product.category)}">${e(product.category)}</a><span aria-hidden="true">/</span><span aria-current="page">${e(product.name)}</span></nav>
      <div class="product-detail"><div class="product-gallery"><div class="product-main-image" id="product-main-image">${responsiveImage(product.images[0], product.imagesAlt?.[0] || product.imageAlt, { sizes: '(max-width: 600px) 92vw, 45vw', eager: true, medium: true })}</div><div class="product-thumbnails" role="group" aria-label="Product photos">${product.images.map((image, index) => `<button type="button" class="product-thumbnail" data-product-image="${index}" aria-pressed="${index === 0}" aria-label="Show ${index === 0 ? 'full arrangement' : `detail photo ${index}`}"><img src="${e(image.replace('.webp', '-160.webp'))}" alt="" width="78" height="83" loading="lazy" fetchpriority="low"></button>`).join('')}</div></div>
      <div class="product-details-copy"><p class="eyebrow">${e(product.category)} · ARRANGED WITH FEELING</p><h1>${e(product.name)}</h1><span class="rating" aria-label="Sample rating ${product.rating} out of 5 from ${product.reviewCount} reviews">${icon('star')} ${product.rating.toFixed(1)} <span>(${product.reviewCount} sample reviews)</span></span><p class="detail-price">${formatPrice(product.price)}${product.compareAtPrice > product.price ? `<s>${formatPrice(product.compareAtPrice)}</s>` : ''}</p><p class="product-description">${e(product.description)}</p><ul class="product-detail-list">${product.details.map(detail => `<li>${icon('check')}<span>${e(detail)}</span></li>`).join('')}</ul><p class="product-stock">${product.stock > 0 ? `${product.stock} arrangements available. Made fresh for you.` : 'Currently sold out. Explore our other flowers below.'}</p><div class="product-purchase"><div class="stepper" role="group" aria-label="Choose quantity"><button type="button" class="icon-button" id="quantity-minus" aria-label="Decrease quantity" disabled>${icon('minus')}</button><output id="product-quantity" aria-live="polite">1</output><button type="button" class="icon-button" id="quantity-plus" aria-label="Increase quantity" ${product.stock <= 1 ? 'disabled' : ''}>${icon('plus')}</button></div><button type="button" class="button button-primary" id="product-add" data-add="${e(product.id)}" data-quantity="1" ${product.stock < 1 ? 'disabled' : ''}>${icon('bag')} ${product.stock ? 'Add to bag' : 'Sold out'}</button></div><button type="button" class="text-link detail-wish ${saved ? 'is-saved' : ''}" data-wish="${e(product.id)}" aria-pressed="${saved}" aria-label="Save a little inspiration: ${e(product.name)}">${icon('heart')} Save a little inspiration</button><details class="detail-care"><summary>A little care goes a long way</summary><p>Trim stems at an angle, use a clean vase and refresh the water every two days. Keep fresh flowers out of direct sun and away from heat. Dried flowers need no water; simply keep them dry and dust gently.</p></details><p class="form-note">Flowers are seasonal. Stem varieties may vary while keeping the colour and character of your arrangement. This is a demo storefront.</p></div></div>
      <section class="related-section" aria-labelledby="related-heading"><div class="section-heading"><div><p class="eyebrow">A FEW MORE TO FALL FOR</p><h2 id="related-heading">Lovely company.</h2></div><a class="text-link" href="buy.html">Explore all flowers</a></div><div class="product-grid">${related.map(productCard).join('')}</div></section>`;
    const quantity = document.getElementById('product-quantity');
    const minus = document.getElementById('quantity-minus');
    const plus = document.getElementById('quantity-plus');
    const updateQuantity = change => {
      const value = Math.max(1, Math.min(product.stock, Number(quantity.value) + change));
      quantity.value = value;
      minus.disabled = value <= 1;
      plus.disabled = value >= product.stock;
      document.getElementById('product-add').dataset.quantity = value;
    };
    minus.addEventListener('click', () => updateQuantity(-1));
    plus.addEventListener('click', () => updateQuantity(1));
    target.querySelectorAll('[data-product-image]').forEach(button => button.addEventListener('click', () => {
      const index = Number(button.dataset.productImage);
      document.getElementById('product-main-image').innerHTML = responsiveImage(product.images[index], product.imagesAlt?.[index] || product.imageAlt, { sizes: '(max-width: 600px) 92vw, 45vw', eager: true, medium: true });
      target.querySelectorAll('[data-product-image]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    }));
    const schema = document.createElement('script');
    schema.type = 'application/ld+json';
    schema.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description, image: product.images.map(image => new URL(image, location.href).href), sku: product.id, brand: { '@type': 'Brand', name: 'Aspect Floral Studio' }, offers: { '@type': 'Offer', price: product.price, priceCurrency: catalog.currency, availability: product.stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: location.href } }).replace(/</g, '\u003c');
    document.querySelector('script[data-product-schema]')?.remove();
    schema.dataset.productSchema = '';
    document.head.append(schema);
  } catch { target.innerHTML = errorState('This arrangement couldn’t be loaded. Please try again.', 'product'); }
  finally { target.setAttribute('aria-busy', 'false'); }
}

document.addEventListener('click', event => {
  const retry = event.target.closest('[data-retry]');
  if (retry?.dataset.retry === 'home') loadHome();
  if (retry?.dataset.retry === 'shop') loadShop();
  if (retry?.dataset.retry === 'product') loadProduct();
  const filter = event.target.closest('[data-category]');
  if (filter) { shopState.category = filter.dataset.category; renderShop(); }
  if (event.target.closest('#clear-filters, [data-clear-filters]')) clearFilters();
});
if (page === 'buy.html') {
  loadShop();
  document.getElementById('shop-search').addEventListener('input', event => { shopState.query = event.target.value; renderShop(); });
  document.getElementById('shop-sort').addEventListener('change', event => { shopState.sort = event.target.value; renderShop(); });
}
if (page === 'product.html') loadProduct();
if (page === 'index.html') {
  loadHome();
  const form = document.getElementById('newsletter-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    const input = document.getElementById('newsletter-email');
    input.setCustomValidity(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim()) ? '' : 'Please enter a valid email address.');
    if (!form.reportValidity()) return;
    const feedback = document.getElementById('newsletter-feedback');
    feedback.hidden = false;
    feedback.textContent = 'You’re on the list, in spirit! This demo doesn’t send or save your email.';
    form.reset();
    toast('A little floral inspiration, coming to life. Thanks for trying our demo.');
  });
  document.getElementById('newsletter-email').addEventListener('input', event => event.target.setCustomValidity(''));
}
