import { getCatalog, getCart, getWishlist, formatPrice, calculateTotals, addToCart, changeQuantity, toggleWishlist, icon, escapeHTML as e, toast } from './store.js';
import { productCard, emptyState, errorState } from './components.js';

// Leave social URLs empty until the studio has real public accounts.
const socials = { instagram: '', facebook: '', x: '', linkedin: '' };
const page = location.pathname.split('/').pop() || 'index.html';
const nav = [['index.html', 'Home'], ['buy.html', 'Shop'], ['about.html', 'Our story'], ['gallery.html', 'Gallery']];
document.getElementById('site-header').innerHTML = `
  <div class="announcement">A little more to love. Free Dubai delivery on orders from <span data-free-delivery>${calculateTotals([]).freeDeliveryAt}</span>.</div>
  <div class="header-inner container"><a class="brand" href="index.html" aria-label="Aspect Floral Studio home"><span class="brand-flower">${icon('flower')}</span><span><span class="brand-name">aspect<span class="brand-dot">.</span></span><span class="brand-caption">FLORAL STUDIO</span></span></a>
  <nav class="desktop-nav" aria-label="Main navigation">${nav.map(([href, label]) => `<a href="${href}" ${page === href ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
  <div class="header-actions"><button class="icon-button" type="button" data-open="search-dialog" aria-label="Search flowers">${icon('search')}</button><button class="icon-button account-action" type="button" data-open="account-dialog" aria-label="Your account">${icon('user')}</button><button class="icon-button" type="button" data-open="wishlist-dialog" aria-label="Your favourites">${icon('heart')}<span class="wishlist-dot" hidden></span></button><button class="icon-button cart-button" type="button" data-open="cart-dialog" aria-label="Open shopping bag">${icon('bag')}<span id="cart-count" class="count-badge" aria-live="polite" aria-atomic="true">0</span></button><button class="icon-button menu-toggle" type="button" data-open="menu-dialog" aria-label="Open navigation menu">${icon('menu')}</button></div></div>`;
document.getElementById('site-footer').innerHTML = `<div class="footer-inner container"><p class="credit">Design &amp; developed by <a href="https://orbitwick.com" target="_blank" rel="noopener noreferrer">OrbitWick</a></p><ul class="social" aria-label="Social links">${Object.entries(socials).filter(([, url]) => url).map(([name, url]) => `<li><a href="${e(url)}" target="_blank" rel="noopener noreferrer">${e(name)}</a></li>`).join('')}</ul><p class="showcase">Website Showcase &copy; 2026</p></div>`;
const overlays = document.createElement('div');
overlays.innerHTML = `
  <dialog id="cart-dialog" class="drawer" aria-labelledby="cart-title"><div class="dialog-heading"><div><p class="eyebrow">GOOD THINGS, HAND-PICKED</p><h2 id="cart-title">Your flower bag</h2></div><button type="button" class="icon-button" data-close aria-label="Close shopping bag">${icon('close')}</button></div><div id="cart-content" class="drawer-content"></div></dialog>
  <dialog id="wishlist-dialog" class="wide-dialog" aria-labelledby="wishlist-title"><div class="dialog-heading"><div><p class="eyebrow">KEEP A LITTLE INSPIRATION</p><h2 id="wishlist-title">Your favourites</h2></div><button type="button" class="icon-button" data-close aria-label="Close favourites">${icon('close')}</button></div><div id="wishlist-content"></div></dialog>
  <dialog id="search-dialog" class="small-dialog" aria-labelledby="search-title"><div class="dialog-heading"><h2 id="search-title">Find your flowers</h2><button type="button" class="icon-button" data-close aria-label="Close search">${icon('close')}</button></div><form action="buy.html" class="search-form"><label class="sr-only" for="header-search">Search the collection</label><div class="search-input">${icon('search')}<input id="header-search" name="q" type="search" placeholder="Try roses, peonies, a little thank you…" maxlength="100" autofocus></div><button class="button button-primary" type="submit">Search flowers</button></form><p class="muted">A grand gesture or a just-because bouquet. Find something that feels right.</p></dialog>
  <dialog id="account-dialog" class="small-dialog" aria-labelledby="account-title"><div class="dialog-heading"><h2 id="account-title">Hello, flower lover.</h2><button type="button" class="icon-button" data-close aria-label="Close account">${icon('close')}</button></div><p class="muted">A little space for your favourite blooms.</p><form id="account-form"><div class="field"><label for="account-name">Your name</label><input id="account-name" name="name" autocomplete="given-name" required minlength="2" maxlength="60" placeholder="First name"></div><div class="field"><label for="account-email">Email address</label><input id="account-email" name="email" autocomplete="email" type="email" required maxlength="254" placeholder="you@example.com"></div><button class="button button-primary full-width" type="submit">Continue</button><p class="form-note">Demo account experience. No account is created and no details are sent or saved.</p></form><div id="account-success" hidden role="status"></div></dialog>
  <dialog id="menu-dialog" class="drawer menu-drawer" aria-labelledby="menu-title"><div class="dialog-heading"><h2 id="menu-title">Make room for flowers.</h2><button type="button" class="icon-button" data-close aria-label="Close navigation">${icon('close')}</button></div><nav class="mobile-nav" aria-label="Mobile navigation">${nav.map(([href, label]) => `<a href="${href}" ${page === href ? 'aria-current="page"' : ''}>${label}${icon('chevron')}</a>`).join('')}<button class="text-link" type="button" data-open="account-dialog">Your account ${icon('user')}</button></nav><p class="muted">Thoughtfully arranged. Beautifully given.</p></dialog>
  <div id="toast-region" class="toast-region" role="status" aria-live="polite" aria-atomic="false"></div>`;
document.body.append(overlays);

// Native modal dialogs trap focus, make the background inert and support Escape.
let lastFocus;
export function openDialog(id) {
  const dialog = document.getElementById(id);
  if (!dialog) return;
  lastFocus = document.activeElement;
  document.querySelectorAll('dialog[open]').forEach(item => item.close());
  dialog.showModal();
  if (id === 'cart-dialog') renderCart();
  if (id === 'wishlist-dialog') renderWishlist();
}
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true }); });
});
function updateCounts() {
  const count = getCart().reduce((total, item) => total + item.quantity, 0);
  document.getElementById('cart-count').textContent = count;
  document.querySelector('.cart-button').setAttribute('aria-label', `Open shopping bag, ${count} ${count === 1 ? 'item' : 'items'}`);
  document.querySelector('.wishlist-dot').hidden = !getWishlist().length;
  document.querySelectorAll('[data-wish]').forEach(button => {
    const saved = getWishlist().includes(button.dataset.wish);
    button.classList.toggle('is-saved', saved);
    button.setAttribute('aria-pressed', String(saved));
    if (!button.classList.contains('detail-wish')) button.setAttribute('aria-label', button.getAttribute('aria-label').replace(/^(Save|Remove) /, saved ? 'Remove ' : 'Save ').replace(/ (to|from) favourites$/, saved ? ' from favourites' : ' to favourites'));
  });
}
async function renderCart() {
  const target = document.getElementById('cart-content');
  try {
    const { products } = await getCatalog();
    const cart = getCart();
    if (!cart.length) { target.innerHTML = emptyState('A little room for something lovely', 'Your bag is waiting for its first blooms.'); return; }
    const totals = calculateTotals(products, cart);
    target.innerHTML = `<div class="delivery-progress"><p>${totals.remaining ? `You’re ${formatPrice(totals.remaining)} away from free delivery.` : 'A little extra joy: your delivery is on us.'}</p><progress max="${totals.freeDeliveryAt}" value="${Math.min(totals.subtotal, totals.freeDeliveryAt)}" aria-label="Progress towards free delivery"></progress></div><ul class="cart-items">${cart.map(item => {
      const product = products.find(product => product.id === item.id);
      if (!product) return '';
      return `<li class="cart-item"><a href="product.html?slug=${encodeURIComponent(product.slug)}"><img src="${e(product.images[0].replace('.webp', '-480.webp'))}" alt="${e(product.imagesAlt?.[0] || product.imageAlt || product.name)}" width="100" height="120"></a><div class="cart-item-body"><a class="cart-product-name" href="product.html?slug=${encodeURIComponent(product.slug)}">${e(product.name)}</a><p class="muted">${e(product.category)}</p><div class="cart-item-controls"><div class="stepper"><button class="icon-button" type="button" data-cart-quantity="${item.quantity - 1}" data-id="${e(item.id)}" aria-label="Decrease ${e(product.name)} quantity">${icon('minus')}</button><span aria-label="Quantity">${item.quantity}</span><button class="icon-button" type="button" data-cart-quantity="${item.quantity + 1}" data-id="${e(item.id)}" ${item.quantity >= product.stock ? 'disabled' : ''} aria-label="Increase ${e(product.name)} quantity">${icon('plus')}</button></div><button type="button" class="remove-button" data-remove="${e(item.id)}">Remove<span class="sr-only"> ${e(product.name)}</span></button></div></div><strong>${formatPrice(product.price * item.quantity)}</strong></li>`;
    }).join('')}</ul><div class="cart-totals"><div><span>Subtotal</span><strong>${formatPrice(totals.subtotal)}</strong></div><div><span>Delivery in Dubai</span><span>${totals.delivery ? formatPrice(totals.delivery) : 'Complimentary'}</span></div><div class="cart-grand-total"><span>Total</span><strong>${formatPrice(totals.total)}</strong></div><a class="button button-primary full-width" href="checkout.html">Continue to checkout</a><p class="form-note">A showcase checkout. No real payments or orders.</p><p class="delivery-note">${icon('truck')} Same-day delivery when ordered before 2pm.</p></div>`;
  } catch { target.innerHTML = errorState('We couldn’t load your bag. Please try again.', 'cart'); }
}
async function renderWishlist() {
  const target = document.getElementById('wishlist-content');
  try {
    const { products } = await getCatalog();
    const selected = products.filter(product => getWishlist().includes(product.id));
    target.innerHTML = selected.length ? `<div class="product-grid wishlist-grid">${selected.map(productCard).join('')}</div>` : emptyState('Keep the ones you love', 'Tap the heart on any arrangement to save it here.');
  } catch { target.innerHTML = errorState('Your favourites couldn’t be loaded.', 'wishlist'); }
}
document.addEventListener('click', async event => {
  const open = event.target.closest('[data-open]');
  if (open) openDialog(open.dataset.open);
  const close = event.target.closest('[data-close]');
  if (close) close.closest('dialog')?.close();
  const add = event.target.closest('[data-add]');
  if (add && !add.disabled) {
    add.disabled = true;
    try { await addToCart(add.dataset.add, Number(add.dataset.quantity) || 1); }
    catch { toast('Your flowers couldn’t be added. Please try again.'); }
    finally { add.disabled = false; }
  }
  const wish = event.target.closest('[data-wish]');
  if (wish) toggleWishlist(wish.dataset.wish);
  const quantity = event.target.closest('[data-cart-quantity]');
  const remove = event.target.closest('[data-remove]');
  if (quantity || remove) {
    try {
      const id = quantity?.dataset.id || remove.dataset.remove;
      const operation = remove ? 'remove' : Number(quantity.dataset.cartQuantity) > getCart().find(item => item.id === id)?.quantity ? 'increase' : 'decrease';
      await changeQuantity(id, remove ? 0 : Number(quantity.dataset.cartQuantity));
      await renderCart();
      const next = [...document.querySelectorAll('#cart-content [data-id]')].find(button => button.dataset.id === id && (operation === 'increase' ? button.getAttribute('aria-label').startsWith('Increase') : button.getAttribute('aria-label').startsWith('Decrease')));
      (next || document.querySelector('#cart-dialog [data-close]'))?.focus();
      if (remove) toast('Arrangement removed from your bag.');
    } catch { toast('Your bag couldn’t be updated. Please try again.'); }
  }
  const retry = event.target.closest('[data-retry]');
  if (retry?.dataset.retry === 'cart') renderCart();
  if (retry?.dataset.retry === 'wishlist') renderWishlist();
});
document.addEventListener('cart:updated', () => { updateCounts(); if (document.getElementById('cart-dialog').open) renderCart(); });
document.addEventListener('wishlist:updated', () => { updateCounts(); if (document.getElementById('wishlist-dialog').open) renderWishlist(); });
document.getElementById('account-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  const name = form.elements.name.value.trim();
  const email = form.elements.email;
  form.elements.name.setCustomValidity(name.length < 2 ? 'Please enter at least two letters for your name.' : '');
  email.setCustomValidity(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) ? '' : 'Please enter a valid email address.');
  if (!form.reportValidity()) return;
  form.hidden = true;
  const success = document.getElementById('account-success');
  success.hidden = false;
  success.innerHTML = `<div class="account-welcome">${icon('flower')}<h3>Lovely to meet you, ${e(name)}.</h3><p>This is a demo welcome. Your bag and favourites are ready to explore on this browser.</p><a href="buy.html" class="button button-primary">Find your flowers</a></div>`;
  toast('Welcome to Aspect. Make yourself at home.');
});
document.getElementById('account-form').addEventListener('input', event => event.target.setCustomValidity(''));
updateCounts();
getCatalog().then(() => { document.querySelector('[data-free-delivery]').textContent = formatPrice(calculateTotals([]).freeDeliveryAt); }).catch(() => {});
