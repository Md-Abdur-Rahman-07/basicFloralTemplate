// Shared catalog and browser-local shopping state. No customer data leaves this site.
export const FREE_DELIVERY_AT = 350;
export const DELIVERY_FEE = 25;
let catalogPromise;
let priceFormatter;
const memory = {};

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch { return memory[key] ?? fallback; }
}
function write(key, value) {
  memory[key] = value;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage can be disabled in private browsing. */ }
}
export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}
export function getCart() {
  const value = read('aspect-cart', []);
  if (!Array.isArray(value)) return [];
  const merged = new Map();
  for (const item of value) {
    if (item && typeof item.id === 'string' && Number.isFinite(item.quantity) && item.quantity >= 1) {
      merged.set(item.id, Math.min(99, (merged.get(item.id) || 0) + Math.floor(item.quantity)));
    }
  }
  return [...merged].map(([id, quantity]) => ({ id, quantity }));
}
export function setCart(items) {
  write('aspect-cart', items);
  document.dispatchEvent(new CustomEvent('cart:updated'));
}
export async function getCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch(new URL('../../data/products.json', import.meta.url))
      .then(response => {
        if (!response.ok) throw new Error('The flower collection could not be loaded.');
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data.products) || !data.currency || !Array.isArray(data.categories)) throw new Error('The collection is unavailable.');
        priceFormatter = new Intl.NumberFormat('en-AE', { style: 'currency', currency: data.currency, maximumFractionDigits: 0 });
        const cart = getCart();
        const clean = cart.flatMap(item => {
          const product = data.products.find(product => product.id === item.id);
          return product?.stock > 0 ? [{ id: item.id, quantity: Math.min(item.quantity, product.stock) }] : [];
        });
        if (JSON.stringify(cart) !== JSON.stringify(clean)) setCart(clean);
        return data;
      }).catch(error => { catalogPromise = undefined; throw error; });
  }
  return catalogPromise;
}
export function formatPrice(value) { return priceFormatter ? priceFormatter.format(value) : String(value); }
export function calculateTotals(products, cart = getCart()) {
  const subtotal = cart.reduce((sum, item) => sum + (products.find(product => product.id === item.id)?.price || 0) * item.quantity, 0);
  const delivery = subtotal && subtotal < FREE_DELIVERY_AT ? DELIVERY_FEE : 0;
  return { subtotal, delivery, total: subtotal + delivery, freeDeliveryAt: FREE_DELIVERY_AT, remaining: Math.max(0, FREE_DELIVERY_AT - subtotal) };
}
export async function addToCart(id, quantity = 1) {
  const { products } = await getCatalog();
  const product = products.find(product => product.id === id);
  if (!product || product.stock < 1) return toast('This arrangement is currently sold out.');
  const cart = getCart();
  const item = cart.find(item => item.id === id);
  const current = item?.quantity || 0;
  if (current >= product.stock) return toast(`All ${product.stock} available arrangements are already in your bag.`);
  const next = Math.min(product.stock, current + Math.max(1, Math.floor(Number(quantity) || 1)));
  if (item) item.quantity = next;
  else cart.push({ id, quantity: next });
  setCart(cart);
  toast(`${product.name} added to your bag.${next - current < quantity ? ' Quantity adjusted to available stock.' : ''}`);
}
export async function changeQuantity(id, quantity) {
  const { products } = await getCatalog();
  const stock = products.find(product => product.id === id)?.stock || 0;
  setCart(getCart().flatMap(item => item.id !== id ? [item] : quantity > 0 && stock > 0 ? [{ id, quantity: Math.min(Math.floor(quantity), stock) }] : []));
}
export function getWishlist() {
  const value = read('aspect-wishlist', []);
  return Array.isArray(value) ? [...new Set(value.filter(id => typeof id === 'string'))] : [];
}
export function toggleWishlist(id) {
  const wishlist = getWishlist();
  const exists = wishlist.includes(id);
  write('aspect-wishlist', exists ? wishlist.filter(item => item !== id) : [...wishlist, id]);
  document.dispatchEvent(new CustomEvent('wishlist:updated'));
  toast(exists ? 'Removed from your favourites.' : 'Saved to your favourites.');
}
export function toast(message) {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const notification = document.createElement('div');
  notification.className = 'toast';
  notification.textContent = message;
  region.append(notification);
  setTimeout(() => notification.remove(), 4800);
}
window.addEventListener('storage', event => {
  if (event.key === 'aspect-cart' || event.key === null) document.dispatchEvent(new CustomEvent('cart:updated'));
  if (event.key === 'aspect-wishlist' || event.key === null) document.dispatchEvent(new CustomEvent('wishlist:updated'));
});

const icons = {
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  bag: '<path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  user: '<circle cx="12" cy="7.5" r="3.5"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  leaf: '<path d="M20 3C7 1 1 11 8 17s14-2 12-14Z"/><path d="M4 21 16 9M10 15v-5M10 15h5"/>',
  truck: '<path d="M1 4h13v13H1zM14 9h5l4 5v3h-9"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/>',
  shield: '<path d="m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5l8-3Z"/><path d="m8 11 3 3 5-5"/>',
  flower: '<path d="M12 12C-1 10 5-1 12 6c7-7 13 4 0 6Zm0 0C25 14 19 25 12 18c-7 7-13-4 0-6Z"/><path d="M12 12v11"/><circle cx="12" cy="12" r="2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>'
};
export function icon(name) { return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.flower}</svg>`; }
