# Aspect Floral Studio

A buildless floral e-commerce showcase made with semantic HTML, CSS, and vanilla JavaScript. Designed for Dubai, with prices in AED.

[Live website](https://md-abdur-rahman-07.github.io/basicFloralTemplate/)

Features include catalog search, category filters, sorting, product photo galleries, favourites, a persistent cart with stock limits and delivery estimates, validated demo accounts/newsletter, demo checkout, and a keyboard-accessible inspiration gallery. Shared header/footer, responsive WebP images, accessible dialogs, metadata, and product structured data are included. Checkout, contacts, reviews, accounts, and subscriptions are illustrative; there is no backend, payment processing, or real order submission. Personal form details are not stored.

Cormorant Garamond and DM Sans are self-hosted Google Fonts with `font-display: swap`; their licenses are included with the font assets. No third-party requests are needed to load the site.

## Run locally

Serve the repository over HTTP so JSON and ES modules load:

```sh
python -m http.server 8000
```

Open `http://localhost:8000`. No installation or build is required. Publish the repository root through GitHub Pages; all site paths support the `/basicFloralTemplate/` prefix.

## Catalog

`data/products.json` is the single source for every home/shop/product/cart/checkout arrangement. Its root holds `currency`, `categories`, and `products`. Each product includes `id`, `slug`, `name`, `category`, `price`, optional `compareAtPrice`, `rating`, `reviewCount`, `stock`, `badge`, `tags`, `description`, `details`, `images`, `imagesAlt`, `featured`, and `isNew`. Keep IDs and slugs unique; image paths are relative to the repository root. Every `.webp` image has a `-480.webp` responsive variant. Hero images also have a `-960.webp` variant.

`data/gallery.json` supplies the separate inspiration gallery. `assets/js/store.js` contains cart/storage helpers and delivery settings (free from 350; otherwise 25). Currency comes only from the catalog. Browser storage uses `aspect-cart` and `aspect-wishlist`, with in-memory fallback when storage is unavailable. Social URLs remain empty in the configuration in `assets/js/app.js`.

Existing `index.html`, `about.html`, `gallery.html`, and `buy.html` URLs are preserved. Product links use `product.html?slug=mix-flower-bouquet`; `checkout.html` is the demo checkout. The footer credits [OrbitWick](https://orbitwick.com).
