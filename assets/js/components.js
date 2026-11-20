import { escapeHTML as e, formatPrice, getWishlist, icon } from './store.js';

export function responsiveImage(path, alt, options = {}) {
  const small = path.replace(/\.webp$/, '-480.webp');
  return `<img src="${e(path)}" srcset="${e(small)} 480w, ${e(path)} 960w" sizes="${e(options.sizes || '(max-width: 600px) 46vw, (max-width: 1000px) 30vw, 280px')}" alt="${e(alt)}" width="${options.width || 960}" height="${options.height || 1200}" loading="${options.eager ? 'eager' : 'lazy'}" decoding="async" ${options.eager ? 'fetchpriority="high"' : ''}>`;
}
export function productCard(product) {
  const saved = getWishlist().includes(product.id);
  return `<article class="product-card">
    <div class="product-image">
      <a class="product-image-link" href="product.html?slug=${encodeURIComponent(product.slug)}" tabindex="-1" aria-hidden="true">${responsiveImage(product.images[0], product.imagesAlt?.[0] || product.imageAlt || product.name)}</a>
      ${product.badge ? `<span class="badge ${product.badge === 'New' ? 'badge-new' : ''}">${e(product.badge)}</span>` : ''}
      <button class="icon-button wishlist-button ${saved ? 'is-saved' : ''}" type="button" data-wish="${e(product.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Remove' : 'Save'} ${e(product.name)} ${saved ? 'from' : 'to'} favourites">${icon('heart')}</button>
      <button class="quick-add" type="button" data-add="${e(product.id)}" ${product.stock < 1 ? 'disabled' : ''}>${icon('plus')} ${product.stock < 1 ? 'Sold out' : 'Quick add'}<span class="sr-only"> ${e(product.name)}</span></button>
    </div>
    <div class="product-info"><p class="product-category">${e(product.category)}</p><h3><a href="product.html?slug=${encodeURIComponent(product.slug)}">${e(product.name)}</a></h3>
    <div class="product-meta"><p class="price">${formatPrice(product.price)} ${product.compareAtPrice > product.price ? `<s>${formatPrice(product.compareAtPrice)}</s>` : ''}</p><span class="rating" aria-label="${product.rating} out of 5, ${product.reviewCount} reviews">${icon('star')} ${product.rating.toFixed(1)} <span>(${product.reviewCount})</span></span></div></div>
  </article>`;
}
export function skeletons(count = 4) { return Array.from({ length: count }, () => '<div class="skeleton-card" aria-hidden="true"><div class="skeleton skeleton-image"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line short"></div></div>').join(''); }
export function errorState(message = 'Our flowers are taking a moment to arrive.', retry = 'catalog') { return `<div class="empty-state"><span class="state-icon">${icon('flower')}</span><h2>A little pause in bloom</h2><p>${e(message)}</p><button type="button" class="button button-secondary" data-retry="${e(retry)}">Try again</button></div>`; }
export function emptyState(title, description, action = '<a class="button button-primary" href="buy.html">Explore the collection</a>') { return `<div class="empty-state"><span class="state-icon">${icon('flower')}</span><h2>${e(title)}</h2><p>${e(description)}</p>${action}</div>`; }
