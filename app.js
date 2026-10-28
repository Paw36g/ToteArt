/**
 * ToteArt - Lógica Central de E-Commerce y Accesibilidad (WCAG)
 */

/* --------------------------------------------------------------------------
   1. BASE DE DATOS DE PRODUCTOS
   Con descripciones alternativas detalladas para accesibilidad
   -------------------------------------------------------------------------- */
const PRODUCTS = [
  {
    id: "girasol",
    title: "Tote de girasol",
    category: "flores",
    categoryLabel: "Colección Flores",
    price: 22.00,
    rating: 4.7,
    reviews: 82,
    specs: "Bordado floral en punto francés",
    desc: "Tote bag de diseño Girasol en color beige natural, bordado artesanal en punto relieve y nudo francés. Capacidad para cargar hasta 10 kg.",
    imgFile: "Tote de girasol.jpg",
    altText: "Bolso de tela beige bordado a mano con un girasol amarillo grande en relieve",
    isFeatured: true
  },
  {
    id: "totoro",
    title: "Tote de Mi vecino Totoro",
    category: "personajes",
    categoryLabel: "Colección Personajes",
    price: 24.00,
    rating: 4.9,
    reviews: 52,
    specs: "Bordado en relieve sobre algodón crudo",
    desc: "Tote bag de diseño Mi vecino Totoro en color beige natural, bordado artesanal en relieve sobre algodón crudo con capacidad para cargar hasta 10 kg.",
    imgFile: "Tote de Mi vecino Totoro.jpeg",
    altText: "Bolso de tela beige con bordado en punto de cruz del personaje Totoro sonriente",
    isFeatured: true
  },
  {
    id: "snoopy",
    title: "Tote de perrito al estilo Snoopy",
    category: "animales",
    categoryLabel: "Colección Animales",
    price: 26.00,
    rating: 4.9,
    reviews: 118,
    specs: "Bordado artesanal contorneado en rojo y negro",
    desc: "Tote bag de diseño Perrito al estilo Snoopy en color beige natural, bordado artesanal contorneado en rojo y negro con capacidad para cargar hasta 10 kg.",
    imgFile: "Tote de perrito al estilo Snoopy.jpeg",
    altText: "Bolso de lienzo beige bordado con la silueta de un perro blanco acostado sobre su casita roja",
    isFeatured: true
  },
  {
    id: "arreglo-floral",
    title: "Tote con arreglo floral",
    category: "flores",
    categoryLabel: "Colección Flores",
    price: 23.50,
    rating: 4.8,
    reviews: 64,
    specs: "Bordado botánico multicolor en relieve",
    desc: "Tote bag de diseño Arreglo floral en color beige natural, bordado botánico multicolor en relieve con capacidad para cargar hasta 10 kg.",
    imgFile: "Tote con arreglo floral.jpeg",
    altText: "Bolso artesanal beige con bordado botánico multicolor de margaritas y hojas verdes",
    isFeatured: false
  },
  {
    id: "colibri",
    title: "Tote de colibrí",
    category: "animales",
    categoryLabel: "Colección Animales",
    price: 23.00,
    rating: 4.7,
    reviews: 54,
    specs: "Bordado satín en degradado de verdes y turquesas",
    desc: "Tote bag de diseño Colibrí en color beige natural, bordado artesanal botánico en degradado de verdes y turquesas. Capacidad para cargar hasta 10 kg.",
    imgFile: "Tote de colibrí.jpeg",
    altText: "Bolso de lienzo con bordado de un colibrí en vuelo con plumas verdes y turquesas",
    isFeatured: false
  },
  {
    id: "cerezo",
    title: "Tote de flores de cerezo",
    category: "flores",
    categoryLabel: "Colección Flores",
    price: 25.00,
    rating: 4.8,
    reviews: 45,
    specs: "Bordado sutil en tonalidades rosa empolvado",
    desc: "Tote bag de diseño Flores de cerezo en color beige natural, bordado artesanal sutil en tonalidades rosa empolvado. Capacidad para cargar hasta 10 kg.",
    imgFile: "Tote de flores de cerezo.jpeg",
    altText: "Bolso beige decorado con una rama de cerezo con flores rosadas bordadas a mano",
    isFeatured: false
  },
  {
    id: "lavandas",
    title: "Tote con lavandas",
    category: "flores",
    categoryLabel: "Colección Flores",
    price: 22.00,
    rating: 4.6,
    reviews: 38,
    specs: "Puntadas violetas con espigas aromáticas estilizadas",
    desc: "Tote bag de diseño Ramas de lavanda en color beige natural, bordado artesanal con espigas aromáticas estilizadas. Capacidad para cargar hasta 10 kg.",
    imgFile: "Tote con lavandas.jpeg",
    altText: "Bolso de tela natural con tres ramilletes de lavanda bordados en hilo violeta y verde",
    isFeatured: false
  },
  {
    id: "chihiro",
    title: "Tote de Carboncillos del viaje de chihiro",
    category: "personajes",
    categoryLabel: "Colección Personajes",
    price: 24.00,
    rating: 4.8,
    reviews: 72,
    specs: "Bordado de duendecillos Susuwatari con caramelos",
    desc: "Tote bag de diseño Carboncillos del viaje de Chihiro en color beige natural, bordado artesanal con detalles de caramelos de azúcar. Capacidad para cargar hasta 10 kg.",
    imgFile: "Tote de Carboncillos del viaje de chihiro.jpeg",
    altText: "Bolso beige con bordado de pequeños duendes negros de hollín sosteniendo estrellas de caramelo",
    isFeatured: false
  },
  {
    id: "zorro",
    title: "Tote de zorro otoñal",
    category: "animales",
    categoryLabel: "Colección Animales",
    price: 25.00,
    rating: 4.8,
    reviews: 91,
    specs: "Bordado con corona de hojas de roble otoñales",
    desc: "Tote bag de diseño Zorro otoñal en color beige natural, bordado artesanal rodeado de hojas de roble y capacidad para cargar hasta 10 kg.",
    imgFile: "Tote de zorro otoñal.jpeg",
    altText: "Bolso de tela con bordado de la cara de un zorro naranja rodeado de hojas de otoño",
    isFeatured: false
  },
  {
    id: "gato",
    title: "Tote de gato naranja",
    category: "animales",
    categoryLabel: "Colección Animales",
    price: 24.50,
    rating: 5.0,
    reviews: 36,
    specs: "Gatito enroscado con pelo texturizado en hilo",
    desc: "Tote bag de diseño Gato naranja en color beige natural, bordado artesanal enroscado con pelo texturizado en hilo. Capacidad para cargar hasta 10 kg.",
    imgFile: "Tote de gato naranja.jpg",
    altText: "Bolso de lienzo beige con bordado en relieve de un gato atigrado naranja durmiendo",
    isFeatured: false
  }
];

/* --------------------------------------------------------------------------
   2. GESTIÓN DE ESTADO Y PERSISTENCIA (LOCALSTORAGE)
   -------------------------------------------------------------------------- */
const STORAGE_KEYS = {
  CART: 'toteart_cart',
  WISHLIST: 'toteart_wishlist',
  USER: 'toteart_user',
  ORDERS: 'toteart_orders'
};

function getStoredCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CART);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
  } catch (e) {}
}

function getStoredWishlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WISHLIST);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveWishlist(wishlist) {
  try {
    localStorage.setItem(STORAGE_KEYS.WISHLIST, JSON.stringify(wishlist));
  } catch (e) {}
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  } catch (e) {}
}

function getStoredOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
  } catch (e) {}
}

/* --------------------------------------------------------------------------
   3. MANEJO DE IMÁGENES Y FALLBACKS
   -------------------------------------------------------------------------- */
function handleImgFallback(imgElement) {
  if (!imgElement) return;
  const currentSrc = imgElement.getAttribute('src') || '';

  if (imgElement.getAttribute('data-img-type') === 'logo') {
    if (!currentSrc.includes('Logo ToteArt.jpeg')) {
      imgElement.src = 'img/Logo ToteArt.jpeg';
      return;
    }
    imgElement.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><rect width="40" height="40" rx="8" fill="%232D5A43"/><text x="50%" y="60%" font-size="20" font-family="sans-serif" font-weight="bold" fill="white" text-anchor="middle">T</text></svg>';
    return;
  }

  if (currentSrc.includes('header home')) {
    imgElement.src = currentSrc.endsWith('.jpeg') ? 'img/header home.jpg' : 'img/header home.jpeg';
    return;
  }
  if (currentSrc.includes('footer home')) {
    imgElement.src = currentSrc.endsWith('.jpeg') ? 'img/footer home.jpg' : 'img/footer home.jpeg';
    return;
  }

  if (currentSrc.endsWith('.jpeg')) {
    imgElement.src = currentSrc.replace('.jpeg', '.jpg');
    return;
  } else if (currentSrc.endsWith('.jpg')) {
    imgElement.src = currentSrc.replace('.jpg', '.jpeg');
    return;
  }

  const title = imgElement.alt || "Tote Bag";
  imgElement.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%23F6F3EE"/><rect x="85" y="90" width="130" height="150" rx="10" fill="%23EBE4D8" stroke="%23D5CEC3" stroke-width="3"/><path d="M115,90 C115,40 185,40 185,90" fill="none" stroke="%23C4B8A6" stroke-width="4"/><circle cx="150" cy="165" r="30" fill="%232D5A43" opacity="0.15"/><text x="50%" y="82%" font-family="sans-serif" font-size="12" font-weight="600" fill="%237A7067" text-anchor="middle">${encodeURIComponent(title)}</text></svg>`;
}

function handleImageFallback(imgElement) {
  handleImgFallback(imgElement);
}

/* --------------------------------------------------------------------------
   4. NOTIFICACIÓN FLOTANTE CONTEXTUAL (TOOLTIP)
   -------------------------------------------------------------------------- */
function showButtonNotification(buttonElement, message, type = 'cart') {
  if (!buttonElement) return;

  document.querySelectorAll('.btn-floating-tooltip').forEach(el => el.remove());

  const rect = buttonElement.getBoundingClientRect();
  const tooltip = document.createElement('div');
  tooltip.className = `btn-floating-tooltip ${type === 'wishlist' ? 'tooltip-wishlist' : ''}`;
  tooltip.textContent = message;

  tooltip.style.left = `${rect.left + (rect.width / 2)}px`;
  tooltip.style.top = `${rect.top}px`;

  document.body.appendChild(tooltip);

  requestAnimationFrame(() => {
    tooltip.classList.add('show');
  });

  setTimeout(() => {
    tooltip.classList.remove('show');
    setTimeout(() => tooltip.remove(), 200);
  }, 1800);
}

/* --------------------------------------------------------------------------
   5. LÓGICA DE CARRITO Y LISTA DE DESEOS
   -------------------------------------------------------------------------- */
function getCartItemCount() {
  const cart = getStoredCart();
  return cart.reduce((acc, item) => acc + (item.quantity || 0), 0);
}

function updateBadges() {
  const cartCount = getCartItemCount();
  const cartBadge = document.getElementById('cartBadgeCount');
  if (cartBadge) {
    cartBadge.textContent = cartCount;
  }

  const wishlist = getStoredWishlist();
  const wishBadge = document.getElementById('wishlistCountNav');
  if (wishBadge) {
    wishBadge.textContent = wishlist.length;
  }

  // Actualizar botón de sesión / perfil en el header
  const user = getCurrentUser();
  const loginBtn = document.getElementById('loginHeaderBtn');
  if (loginBtn) {
    if (user && user.nombre) {
      const primerNombre = user.nombre.split(' ')[0];
      loginBtn.textContent = `Hola, ${primerNombre}`;
      loginBtn.setAttribute('title', 'Ir a mi perfil');
      loginBtn.onclick = () => { window.location.href = 'perfil.html'; };
    } else {
      loginBtn.textContent = 'Iniciar sesión';
      loginBtn.setAttribute('title', 'Iniciar sesión');
      loginBtn.onclick = () => { window.location.href = 'login.html'; };
    }
  }
}

function quickAddToCart(productId, event) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  let cart = getStoredCart();
  const existing = cart.find(item => item.product && item.product.id === product.id);

  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    cart.push({ product, quantity: 1 });
  }

  // Filtrar objetos vacíos o corruptos
  cart = cart.filter(item => item && item.product && item.quantity > 0);
  saveCart(cart);
  updateBadges();

  // Si estaba en la lista de deseos, retirarlo
  let wishlist = getStoredWishlist();
  const prevLen = wishlist.length;
  wishlist = wishlist.filter(p => p.id !== productId);
  if (wishlist.length !== prevLen) {
    saveWishlist(wishlist);
    updateBadges();
  }

  const btn = event ? event.currentTarget : null;
  if (btn) {
    showButtonNotification(btn, "✓ Añadido al carrito", 'cart');
  }
}

function changeCartItemQty(productId, delta) {
  let cart = getStoredCart();
  const itemIndex = cart.findIndex(i => i.product && i.product.id === productId);

  if (itemIndex === -1) return;

  cart[itemIndex].quantity += delta;

  // Si la cantidad llega a 0 o menor, se elimina completamente del array
  if (cart[itemIndex].quantity <= 0) {
    cart.splice(itemIndex, 1);
  }

  // Garantizar que no queden elementos nulos o en 0
  cart = cart.filter(item => item && item.product && item.quantity > 0);
  saveCart(cart);
  updateBadges();

  if (typeof renderCartView === 'function') {
    renderCartView();
  }
}

function removeCartItem(productId) {
  let cart = getStoredCart();
  cart = cart.filter(item => item && item.product && item.product.id !== productId);
  saveCart(cart);
  updateBadges();

  if (typeof renderCartView === 'function') {
    renderCartView();
  }
}

/* --------------------------------------------------------------------------
   6. RENDERIZADO DE TARJETA DE PRODUCTO ACCESIBLE (WCAG)
   Agrupa imagen y título dentro de un único <a> hacia producto.html?id=...
   -------------------------------------------------------------------------- */
function createAccessibleProductCardHtml(product) {
  return `
    <div class="product-card">
      <a href="producto.html?id=${encodeURIComponent(product.id)}" class="product-card-link" aria-label="${product.title}, precio $${product.price.toFixed(2)} USD">
        <div class="product-img-box">
          <img src="img/${product.imgFile}" alt="${product.altText || product.title}" onerror="handleImgFallback(this)">
        </div>
        <h4 class="product-info-title">${product.title}</h4>
      </a>
      <div class="product-rating">
        <span class="star" aria-hidden="true">★</span>
        <span>${product.rating} (${product.reviews} reseñas)</span>
      </div>
      <div class="product-price">$${product.price.toFixed(2)} USD</div>
      <div class="product-card-actions">
        <button class="btn-add-cart" onclick="quickAddToCart('${product.id}', event)">Añadir al carrito</button>
      </div>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   7. INICIALIZADOR GLOBAL
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  updateBadges();

  // Escuchar búsqueda en el header si existe el campo
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        window.location.href = `catalogo.html?q=${encodeURIComponent(query)}`;
      }
    });
  }
});

