import { getCatalog, getCart, calculateTotals, setCart, formatPrice, escapeHTML, toast } from './store.js';

const content = document.querySelector('#checkout-content');
let catalog;
let orderPlaced = false;

// Delivery dates follow the studio's Dubai clock, including the same-day cutoff.
function deliveryWindow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const part = type => parts.find(item => item.type === type).value;
  const today = `${part('year')}-${part('month')}-${part('day')}`;
  const date = new Date(`${today}T12:00:00Z`);
  const pastCutoff = Number(part('hour')) >= 14;
  if (pastCutoff) date.setUTCDate(date.getUTCDate() + 1);
  const minimum = date.toISOString().slice(0, 10);
  date.setUTCDate(date.getUTCDate() + 30);
  return { minimum, maximum: date.toISOString().slice(0, 10), pastCutoff };
}

function readableDate(value) {
  return new Intl.DateTimeFormat('en-AE', { dateStyle: 'long', timeZone: 'Asia/Dubai' })
    .format(new Date(`${value}T12:00:00Z`));
}

function cartItems() {
  return getCart().map(item => {
    const product = catalog.products.find(product => product.id === item.id);
    return product && product.stock > 0 ? { ...item, quantity: Math.min(item.quantity, product.stock), product } : null;
  }).filter(Boolean);
}

function renderSummary(items) {
  const totals = calculateTotals(catalog.products, items.map(({ id, quantity }) => ({ id, quantity })));
  return `<aside class="order-summary panel" aria-labelledby="summary-heading">
    <p class="eyebrow">GOOD THINGS INSIDE</p>
    <h2 id="summary-heading">Your order</h2>
    <ul class="summary-items">${items.map(({ product, quantity }) => `<li class="summary-item">
      <a href="product.html?slug=${encodeURIComponent(product.slug)}" tabindex="-1" aria-hidden="true"><img src="${escapeHTML(product.images[0])}" alt="" width="80" height="96" loading="lazy"></a>
      <div class="summary-item-info"><a href="product.html?slug=${encodeURIComponent(product.slug)}">${escapeHTML(product.name)}</a><p class="summary-item-meta">${escapeHTML(product.category)} · Qty ${quantity}</p></div>
      <span>${formatPrice(product.price * quantity)}</span>
    </li>`).join('')}</ul>
    <div class="summary-line"><span>Subtotal</span><span>${formatPrice(totals.subtotal)}</span></div>
    <div class="summary-line"><span>Dubai delivery</span><span>${totals.delivery === 0 ? 'Complimentary' : formatPrice(totals.delivery)}</span></div>
    <div class="summary-line"><span>Seed packet</span><span>Our gift to you</span></div>
    <div class="summary-line summary-total"><span>Total</span><span>${formatPrice(totals.total)}</span></div>
    <p class="summary-delivery-note muted">${totals.remaining > 0 ? `Add ${formatPrice(totals.remaining)} more for complimentary delivery.` : 'Your order qualifies for complimentary delivery.'}</p>
    <a class="text-link" href="buy.html">Continue shopping</a>
  </aside>`;
}

function field(id, label, input, hint = '', full = false) {
  return `<div class="field${full ? ' field-full' : ''}"><label for="${id}">${label}</label>${input}<p id="${id}-error" class="field-error" hidden></p>${hint ? `<p id="${id}-hint" class="field-hint">${hint}</p>` : ''}</div>`;
}

function renderCheckout() {
  if (orderPlaced || !catalog) return;
  const items = cartItems();
  content.setAttribute('aria-busy', 'false');
  if (!items.length) {
    content.innerHTML = `<div class="checkout-empty panel"><p class="eyebrow">ROOM FOR SOMETHING LOVELY</p><h2>Your bag is waiting to bloom.</h2><p class="muted">Find a little something for someone special. Yourself included.</p><a class="button button-primary" href="buy.html">Explore the collection</a></div>`;
    return;
  }
  // Preserve a customer's draft when they edit the bag in the shared drawer.
  const previousForm = content.querySelector('form');
  const draft = previousForm ? Object.fromEntries(new FormData(previousForm)) : {};
  const window = deliveryWindow();
  const dateHint = window.pastCutoff ? 'Our 2pm cutoff has passed. Choose tomorrow or a later date.' : 'Order before 2pm Dubai time for same-day delivery.';
  content.innerHTML = `<div class="checkout-layout">
    <form class="checkout-form panel" id="checkout-form" novalidate>
      <p class="eyebrow">WHERE THE JOY GOES</p><h2>Delivery details</h2>
      <p class="muted">Delivering across Dubai. Fields marked * are required.</p>
      <div id="checkout-form-error" class="form-error" role="alert" hidden></div>
      <div class="form-grid">
        ${field('full-name', 'Recipient name *', '<input id="full-name" name="name" autocomplete="name" required minlength="2" maxlength="80" placeholder="Full name" aria-describedby="full-name-error">')}
        ${field('phone', 'UAE mobile number *', '<input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="24" placeholder="+971 50 123 4567" aria-describedby="phone-error phone-hint">', 'We’ll use this only to coordinate your delivery.')}
        ${field('email', 'Email address (optional)', '<input id="email" name="email" type="email" autocomplete="email" maxlength="120" placeholder="you@example.com" aria-describedby="email-error">', '', true)}
        ${field('address', 'Delivery address in Dubai *', '<textarea id="address" name="address" autocomplete="street-address" required minlength="12" maxlength="400" rows="3" placeholder="Apartment or villa, building, street and neighbourhood" aria-describedby="address-error address-hint"></textarea>', 'Include the building name and apartment number.', true)}
        ${field('delivery-date', 'Delivery date *', `<input id="delivery-date" name="deliveryDate" type="date" required min="${window.minimum}" max="${window.maximum}" value="${window.minimum}" aria-describedby="delivery-date-error delivery-date-hint">`, dateHint, true)}
        ${field('gift-message', 'A note from the heart (optional)', '<textarea id="gift-message" name="giftMessage" maxlength="300" rows="3" placeholder="A few words can mean so much…" aria-describedby="gift-message-error gift-message-hint"></textarea>', 'Up to 300 characters. We’ll include it with your flowers.', true)}
      </div>
      <p class="checkout-note">Demo checkout · No payment is taken and no delivery is arranged. Please use sample details.</p>
      <button class="button button-primary checkout-submit" type="submit">Place demo order</button>
    </form>${renderSummary(items)}
  </div>`;
  const form = content.querySelector('#checkout-form');
  Object.entries(draft).forEach(([name, value]) => { if (form.elements.namedItem(name)) form.elements.namedItem(name).value = value; });
  form.addEventListener('submit', submitOrder);
  form.addEventListener('input', event => {
    if (event.target.hasAttribute('aria-invalid')) validateField(event.target, false);
  });
}

function validateField(input, show = true) {
  let error = '';
  const value = input.value.trim();
  if (input.required && !value) error = 'Please complete this field.';
  else if (input.id === 'full-name' && value.length < 2) error = 'Please enter a name with at least 2 characters.';
  else if (input.id === 'phone' && !/^(?:\+971|00971|0)5\d{8}$/.test(value.replace(/[\s()-]/g, ''))) error = 'Enter a UAE mobile number, such as +971 50 123 4567.';
  else if (input.id === 'email' && value && !input.validity.valid) error = 'Please enter a valid email address.';
  else if (input.id === 'address' && value.length < 12) error = 'Please include a building, street and Dubai neighbourhood.';
  else if (input.id === 'delivery-date') {
    const window = deliveryWindow();
    if (value < window.minimum) error = `The earliest delivery date is ${readableDate(window.minimum)}.`;
    else if (value > window.maximum) error = 'Please choose a date within the next 30 days.';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) error = 'Please choose a valid delivery date.';
  }
  const element = document.getElementById(`${input.id}-error`);
  if (error && show) {
    input.setAttribute('aria-invalid', 'true');
    element.textContent = error;
    element.hidden = false;
  } else if (!error) {
    input.removeAttribute('aria-invalid');
    element.textContent = '';
    element.hidden = true;
  }
  return !error;
}

function submitOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const inputs = [...form.querySelectorAll('input, textarea')];
  const valid = inputs.map(input => validateField(input));
  const formError = form.querySelector('#checkout-form-error');
  if (valid.includes(false)) {
    formError.textContent = 'A few details need your attention. Please check the highlighted fields.';
    formError.hidden = false;
    inputs[valid.indexOf(false)].focus();
    return;
  }
  if (!cartItems().length) { renderCheckout(); return; }
  const details = new FormData(form);
  const date = details.get('deliveryDate');
  const total = calculateTotals(catalog.products, cartItems().map(({ id, quantity }) => ({ id, quantity }))).total;
  const random = globalThis.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 6).toUpperCase() || Math.random().toString(36).slice(2, 8).toUpperCase();
  const orderNumber = `AS-${new Date().getFullYear()}-${random}`;
  orderPlaced = true;
  setCart([]);
  document.title = 'Order received | Aspect Floral Studio';
  document.querySelector('.checkout-intro').hidden = true;
  content.innerHTML = `<section class="checkout-success panel" aria-labelledby="order-success-heading">
    <div class="success-mark" aria-hidden="true">✓</div><p class="eyebrow">A LITTLE JOY IS ON ITS WAY</p>
    <h1 id="order-success-heading" tabindex="-1">Beautiful choice.</h1>
    <p>Thank you, ${escapeHTML(details.get('name').trim())}. Your demo order is confirmed.</p>
    <p class="success-order-number">Order ${orderNumber}</p>
    <dl class="success-details"><div><dt>Selected delivery date</dt><dd>${readableDate(date)}</dd></div><div><dt>Order total</dt><dd>${formatPrice(total)}</dd></div></dl>
    <p class="checkout-note">This was a demo order. No payment was taken, no order was sent, and your delivery details have not been saved.</p>
    <div class="success-actions"><a class="button button-primary" href="buy.html">Keep exploring</a><a class="text-link" href="index.html">Back to home</a></div>
  </section>`;
  document.querySelector('#order-success-heading').focus();
  toast('Your demo order is confirmed. Thank you!');
}

async function initialize() {
  try {
    catalog = await getCatalog();
    renderCheckout();
  } catch {
    content.setAttribute('aria-busy', 'false');
    content.innerHTML = '<div class="checkout-empty panel" role="alert"><h2>Your bag needs a moment.</h2><p class="muted">We couldn’t load your order. Please try again.</p><button class="button button-primary" id="checkout-retry" type="button">Retry</button></div>';
    content.querySelector('#checkout-retry').addEventListener('click', initialize);
  }
}

document.addEventListener('cart:updated', renderCheckout);
initialize();
