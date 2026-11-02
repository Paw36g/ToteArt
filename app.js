/**
 * ToteArt - Lógica Central de E-Commerce y Accesibilidad (WCAG)
 */

/* --------------------------------------------------------------------------
   1. CONEXIÓN REAL DE PRODUCTOS CON SUPABASE (SIN DATOS LOCALES ESTÁTICOS)
   -------------------------------------------------------------------------- */
if (typeof emailjs !== 'undefined' && typeof emailjs.init === 'function') {
  emailjs.init('eP9eKHycZP0E1SD-G');
}

if (typeof window !== 'undefined' && !window.EMAIL_CONFIG) {
  window.EMAIL_CONFIG = {
    serviceID: 'service_z2x76bg',
    templateBienvenida: 'template_3ndh55m',
    templatePedidoYSeguimiento: 'template_x75943b'
  };
}

// Regla puntual de hover para botones secundarios "Ver detalle" sin tocar styles.css
if (typeof document !== 'undefined' && !document.getElementById('toteart-view-detail-hover-style')) {
  const hoverStyle = document.createElement('style');
  hoverStyle.id = 'toteart-view-detail-hover-style';
  hoverStyle.textContent = `
    .btn-detail:hover,
    .btn-secondary:hover,
    button.btn-view-detail:hover {
      background-color: #6F574E !important;
      border-color: #6F574E !important;
      color: #FFFFFF !important;
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }
  `;
  document.head.appendChild(hoverStyle);
}

const supabaseUrl = 'https://yaxvrznnqieaxmzvmwct.supabase.co';
const supabaseKey = 'sb_publishable_aTNqK1njckUxP7rbA07Tsg_oEHiic17';
const supabaseClient = (typeof window !== 'undefined' && window.supabaseClient)
  ? window.supabaseClient
  : ((typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function')
      ? window.supabase.createClient(supabaseUrl, supabaseKey)
      : null);

if (typeof window !== 'undefined' && supabaseClient) {
  window.supabaseClient = supabaseClient;
}

// Arreglo de productos vacío inicialmente; se llena desde Supabase en DOMContentLoaded
let PRODUCTS = [];
if (typeof window !== 'undefined') {
  window.PRODUCTS = PRODUCTS;
}

// Lista exacta de archivos existentes en img/ para garantizar coincidencia al 100%
const LOCAL_IMG_FILES = [
  "footer home.jpeg",
  "header home.jpeg",
  "Logo ToteArt.jpeg",
  "logo.png",
  "snoopy.jpg",
  "tote abeja robusta polinizando pequeñas flores.png",
  "Tote Appa de Avatar.jpeg",
  "Tote arreglo-floral.jpg",
  "tote búho posado en una rama de pino.jpeg",
  "Tote carboncillos.jpg",
  "tote ciervo rodeado de hojas otoñales.jpeg",
  "Tote Cinnamoroll.jpeg",
  "Tote colibrí.jpg",
  "Tote con arreglo floral.jpeg",
  "Tote con lavandas.jpeg",
  "Tote de BMO.jpeg",
  "Tote de Calcifer.jpeg",
  "Tote de Carboncillos del viaje de chihiro.jpeg",
  "Tote de colibrí.jpeg",
  "Tote de flores de cerezo.jpeg",
  "Tote de gato naranja.jpg",
  "Tote de girasol.jpg",
  "Tote de Kirby.jpeg",
  "Tote de Mi vecino Totoro.jpeg",
  "Tote de perrito al estilo Snoopy.jpeg",
  "Tote de Sin Cara.jpeg",
  "Tote de zorro otoñal.jpeg",
  "tote diente de león con semillas esparciéndose al viento.jpeg",
  "tote flor de loto en tonos acuarela.jpeg",
  "Tote flores de cerezo.jpg",
  "Tote gato naranja.jpg",
  "Tote gato negro.png",
  "Tote girasol.jpg",
  "Tote Jiji de kiki entregas a domicilio.jpeg",
  "Tote lavandas.jpg",
  "tote lobo aullando a la luna.jpeg",
  "Tote Luna.jpeg",
  "tote margaritas.jpeg",
  "tote mariposa monarca.jpeg",
  "tote orquídea morada.jpeg",
  "tote oso panda comiendo hojas de bambú.jpeg",
  "tote peonías abiertas.jpeg",
  "tote pequeña rana verde sobre un hongo silvestre.jpeg",
  "Tote Pikachu.jpeg",
  "Tote Pochita.jpeg",
  "tote racimo de hortensias azules y lilas.jpeg",
  "tote ramo de tulipanes rosados.jpeg",
  "tote rosa roja.jpeg",
  "totoro.jpg",
  "zorro.jpg"
];

function stripAccentsAndExt(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.(jpe?g|png|webp)$/i, '')
    .toLowerCase()
    .trim();
}

/**
 * Asegura que el nombre de imagen proveniente de Supabase (`imagen_url`)
 * coincida al 100% con el nombre y extensión real en la carpeta `img/`.
 */
const PRODUCT_KEYWORDS_TO_FILE = [
  { keys: ['girasol'], file: 'Tote de girasol.jpg' },
  { keys: ['arreglo floral', 'arreglo-floral'], file: 'Tote con arreglo floral.jpeg' },
  { keys: ['cerezo'], file: 'Tote de flores de cerezo.jpeg' },
  { keys: ['lavanda'], file: 'Tote con lavandas.jpeg' },
  { keys: ['margarita'], file: 'tote margaritas.jpeg' },
  { keys: ['tulipan'], file: 'tote ramo de tulipanes rosados.jpeg' },
  { keys: ['rosa roja', 'rosa-roja', 'tote rosa', 'tote de rosa', 'rosa'], file: 'tote rosa roja.jpeg' },
  { keys: ['loto'], file: 'tote flor de loto en tonos acuarela.jpeg' },
  { keys: ['diente de leon', 'diente-de-leon'], file: 'tote diente de león con semillas esparciéndose al viento.jpeg' },
  { keys: ['orquidea'], file: 'tote orquídea morada.jpeg' },
  { keys: ['peonia'], file: 'tote peonías abiertas.jpeg' },
  { keys: ['hortensia'], file: 'tote racimo de hortensias azules y lilas.jpeg' },
  { keys: ['snoopy', 'perrito'], file: 'Tote de perrito al estilo Snoopy.jpeg' },
  { keys: ['colibri'], file: 'Tote de colibrí.jpeg' },
  { keys: ['zorro'], file: 'Tote de zorro otoñal.jpeg' },
  { keys: ['gato naranja', 'gato-naranja'], file: 'Tote de gato naranja.jpg' },
  { keys: ['gato negro', 'gato-negro'], file: 'Tote gato negro.png' },
  { keys: ['abeja'], file: 'tote abeja robusta polinizando pequeñas flores.png' },
  { keys: ['buho'], file: 'tote búho posado en una rama de pino.jpeg' },
  { keys: ['ciervo'], file: 'tote ciervo rodeado de hojas otoñales.jpeg' },
  { keys: ['lobo'], file: 'tote lobo aullando a la luna.jpeg' },
  { keys: ['mariposa', 'monarca'], file: 'tote mariposa monarca.jpeg' },
  { keys: ['panda', 'bambu'], file: 'tote oso panda comiendo hojas de bambú.jpeg' },
  { keys: ['rana', 'ranita', 'hongo'], file: 'tote pequeña rana verde sobre un hongo silvestre.jpeg' },
  { keys: ['totoro'], file: 'Tote de Mi vecino Totoro.jpeg' },
  { keys: ['chihiro', 'carboncillo'], file: 'Tote de Carboncillos del viaje de chihiro.jpeg' },
  { keys: ['bmo'], file: 'Tote de BMO.jpeg' },
  { keys: ['calcifer'], file: 'Tote de Calcifer.jpeg' },
  { keys: ['kirby'], file: 'Tote de Kirby.jpeg' },
  { keys: ['sin cara', 'sincara', 'kaonashi'], file: 'Tote de Sin Cara.jpeg' },
  { keys: ['appa', 'avatar'], file: 'Tote Appa de Avatar.jpeg' },
  { keys: ['cinnamoroll'], file: 'Tote Cinnamoroll.jpeg' },
  { keys: ['jiji', 'kiki'], file: 'Tote Jiji de kiki entregas a domicilio.jpeg' },
  { keys: ['luna', 'sailor'], file: 'Tote Luna.jpeg' },
  { keys: ['pikachu', 'kero'], file: 'Tote Pikachu.jpeg' },
  { keys: ['pochita'], file: 'Tote Pochita.jpeg' }
];

function resolveExactImgFile(rawUrl, title, id) {
  const cleaned = String(rawUrl || '')
    .trim()
    .replace(/^\.?\/?img\//i, '');

  // 1. Coincidencia exacta con los archivos reales en img/
  if (cleaned && LOCAL_IMG_FILES.includes(cleaned)) return cleaned;

  // 2. Coincidencia ignorando mayúsculas/minúsculas
  if (cleaned) {
    const lowerMatch = LOCAL_IMG_FILES.find(f => f.toLowerCase() === cleaned.toLowerCase());
    if (lowerMatch) return lowerMatch;
  }

  // 3. Coincidencia ignorando tildes, ñ y extensión (.jpg vs .jpeg vs .png)
  if (cleaned) {
    const normTarget = stripAccentsAndExt(cleaned);
    const normMatch = LOCAL_IMG_FILES.find(f => stripAccentsAndExt(f) === normTarget);
    if (normMatch) return normMatch;
  }

  // 4. Coincidencia por palabra clave en imagen_url, título o id_producto
  const combined = `${stripAccentsAndExt(cleaned)} ${stripAccentsAndExt(title)} ${stripAccentsAndExt(id)}`;
  for (const entry of PRODUCT_KEYWORDS_TO_FILE) {
    if (entry.keys.some(k => combined.includes(k))) {
      return entry.file;
    }
  }

  return cleaned.replace(/\.jpg$/i, '.jpeg');
}

function normalizeCategoryFromRow(p) {
  const idCat = Number(p.id_categoria);
  if (idCat === 1) return { cat: 'flores', catLabel: 'Colección Flores' };
  if (idCat === 2) return { cat: 'animales', catLabel: 'Colección Animales' };
  if (idCat === 3) return { cat: 'personajes', catLabel: 'Colección Personajes' };

  const raw = String(p.categoria || p.id_categoria || '').toLowerCase();
  if (raw.includes('flor')) return { cat: 'flores', catLabel: 'Colección Flores' };
  if (raw.includes('animal')) return { cat: 'animales', catLabel: 'Colección Animales' };
  return { cat: 'personajes', catLabel: 'Colección Personajes' };
}

async function loadProductsFromSupabase() {
  if (!supabaseClient || typeof supabaseClient.from !== 'function') return [];
  try {
    let { data, error } = await supabaseClient
      .from('productos')
      .select('*')
      .order('id_categoria', { ascending: true });

    if (error) {
      const retry = await supabaseClient.from('productos').select('*');
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error('[Supabase] Error consultando tabla "productos":', error.message || error);
      return [];
    }

    if (Array.isArray(data)) {
      const stockMap = (typeof getLocalStockMap === 'function') ? getLocalStockMap() : {};
      // Mapear los campos de la BD a la estructura que usa la UI
      window.PRODUCTS = data.map((p, idx) => {
        const { cat, catLabel } = normalizeCategoryFromRow(p);
        const id = String(p.id_producto != null ? p.id_producto : (p.id != null ? p.id : idx + 1));
        let title = p.titulo || p.nombre || 'Tote Bag Bordado';
        let desc = p.descripcion || '';
        const rawImage = p.imagen_url || p.imagen || p.url_imagen || p.img || '';

        // Corrección automática si en la BD figura "Tote de Kero" / "Tote Kero" en lugar de "Tote de Pikachu"
        if (/kero/i.test(title) || /kero/i.test(rawImage) || /kero/i.test(id)) {
          title = 'Tote de Pikachu';
          if (!desc || /kero|sakura/i.test(desc)) {
            desc = 'Tote bag bordado a mano con el diseño de Pikachu en hilos vibrantes sobre lona 100% algodón.';
          }
          // Intentar corregir también el registro en Supabase de forma silenciosa
          try {
            const updatePayload = {};
            if ('nombre' in p) updatePayload.nombre = 'Tote de Pikachu';
            if ('titulo' in p) updatePayload.titulo = 'Tote de Pikachu';
            if ('imagen' in p) updatePayload.imagen = 'Tote Pikachu.jpeg';
            if ('imagen_url' in p) updatePayload.imagen_url = 'Tote Pikachu.jpeg';
            if (Object.keys(updatePayload).length > 0 && p.id_producto != null) {
              supabaseClient.from('productos').update(updatePayload).eq('id_producto', p.id_producto).then(() => {});
            }
          } catch (e) {}
        }

        const stockNum = typeof p.stock === 'number' ? p.stock : (parseInt(p.stock, 10) || 0);
        const ratingNum = parseFloat(p.rating_promedio || p.calificacion_promedio || p.rating) || 4.8;
        stockMap[id] = stockNum;
        return {
          id,
          title,
          category: cat,
          categoryLabel: catLabel,
          price: parseFloat(p.precio) || 0,
          stock: stockNum,
          rating: Number(ratingNum.toFixed(1)),
          desc,
          specs: p.especificaciones || '',
          imgFile: resolveExactImgFile(rawImage, title, id),
          isFeatured: Boolean(p.destacado || p.es_destacado || p.featured)
        };
      });
      PRODUCTS = window.PRODUCTS;
      if (typeof saveLocalStockMap === 'function') {
        saveLocalStockMap(stockMap);
      }
      renderCatalog();
    }
  } catch (err) {
    console.warn('[Supabase] Error al cargar productos:', err);
  }
  return window.PRODUCTS;
}

/** Desplaza lateralmente un carrusel (.carousel-track) con scrollBy suave. */
function scrollCarousel(trackId, delta) {
  const track = document.getElementById(trackId);
  if (track) {
    track.scrollBy({ left: delta || 300, behavior: 'smooth' });
  }
}

function renderCatalog() {
  const products = window.PRODUCTS || PRODUCTS || [];

  // 1. Portada Home: Carrusel "Más vendidos"
  const bestsellersGrid = document.getElementById('homeBestsellersGrid');
  if (bestsellersGrid) {
    if (products.length > 0) {
      let bestsellers = products.filter(p => p.isFeatured);
      if (bestsellers.length < 5) {
        const extra = products.filter(p => !bestsellers.includes(p));
        bestsellers = [...bestsellers, ...extra].slice(0, 6);
      }
      bestsellersGrid.innerHTML = bestsellers.map(p => createAccessibleProductCardHtml(p)).join('');
    }
  }

  // 1b. Portada Home: Carrusel "Descubre nuestra colección" (Tarjetas compactas)
  const collectionTrack = document.getElementById('homeCollectionGrid');
  if (collectionTrack && products.length > 0) {
    const collectionItems = products.slice(0, 8);
    collectionTrack.innerHTML = collectionItems.map(p => createCompactHomeCardHtml(p)).join('');
  }

  // 2. Vista de Catálogo Completo (catalogo.html)
  if (typeof renderProducts === 'function') {
    if (typeof catalogProducts !== 'undefined') {
      catalogProducts = products;
    }
    const elTodos = document.getElementById('catCountTodos');
    const elFlores = document.getElementById('catCountFlores');
    const elAnimales = document.getElementById('catCountAnimales');
    const elPersonajes = document.getElementById('catCountPersonajes');

    if (elTodos) elTodos.textContent = products.length;
    if (elFlores) elFlores.textContent = products.filter(p => p.category === 'flores').length;
    if (elAnimales) elAnimales.textContent = products.filter(p => p.category === 'animales').length;
    if (elPersonajes) elPersonajes.textContent = products.filter(p => p.category === 'personajes').length;

    renderProducts();
  }

  // 3. Vista de Ficha de Producto (#view-pdp / producto.html)
  if (typeof initPdpViewFromProducts === 'function') {
    initPdpViewFromProducts();
  }

  // 4. Actualizar calificaciones promedio dinámicas
  if (typeof refreshAllProductRatingsUI === 'function') {
    refreshAllProductRatingsUI();
  }
}

/* --------------------------------------------------------------------------
   2. GESTIÓN DE ESTADO Y PERSISTENCIA (LOCALSTORAGE)
   -------------------------------------------------------------------------- */
const STORAGE_KEYS = {
  CART: 'toteart_cart',
  WISHLIST: 'toteart_wishlist',
  USER: 'toteart_user',
  ORDERS: 'toteart_orders'
};

// Estado de pedidos nulo mientras no exista sesión iniciada
let orderHistory = null;

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

/* --------------------------------------------------------------------------
   FAVORITOS EN LA NUBE (tabla `favoritos` en Supabase)
   La caché local (toteart_wishlist) solo refleja lo que hay en la nube para
   mantener sincronizados los contadores del encabezado.
   -------------------------------------------------------------------------- */
function getSessionUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('toteart_user') || '{}') || {};
  } catch (e) {
    return {};
  }
}

async function syncWishlistFromCloud() {
  const user = getSessionUserFromStorage();
  const localList = (typeof getStoredWishlist === 'function') ? getStoredWishlist() : [];
  
  // 1. Modo Invitado: Preservar la lista local sin vaciar nada
  if (!user.id_cliente || !supabaseClient) {
    return localList;
  }

  // 2. Modo Autenticado: Intentar sincronizar con la nube
  try {
    const { data: favs, error } = await supabaseClient
      .from('favoritos')
      .select('id_favorito, id_producto')
      .eq('id_cliente', user.id_cliente);

    if (!error && Array.isArray(favs)) {
      if (!Array.isArray(window.PRODUCTS) || window.PRODUCTS.length === 0) {
        if (typeof loadProductsFromSupabase === 'function') {
          await loadProductsFromSupabase();
        }
      }
      const catalog = window.PRODUCTS || [];
      const cloudList = favs
        .map(f => catalog.find(p => String(p.id) === String(f.id_producto)))
        .filter(Boolean);

      // Fusión (Merge): Combinar locales y remotos evitando duplicados por ID
      const mergedMap = new Map();
      [...cloudList, ...localList].forEach(p => { 
        if (p && p.id) mergedMap.set(String(p.id), p); 
      });
      const merged = Array.from(mergedMap.values());
      
      saveWishlist(merged);
      if (typeof updateBadges === 'function') updateBadges();
      return merged;
    }
  } catch (err) {
    console.warn('[Favoritos] Fallback a almacenamiento local:', err);
  }
  return localList;
}

async function toggleFavorite(productId) {
  let wishlist = (typeof getStoredWishlist === 'function') ? getStoredWishlist() : [];
  const index = wishlist.findIndex(p => String(p.id) === String(productId));
  let inWish = false;

  if (index >= 0) {
    wishlist.splice(index, 1);
    inWish = false;
  } else {
    const catalog = window.PRODUCTS || [];
    const prod = catalog.find(p => String(p.id) === String(productId));
    if (prod) wishlist.push(prod);
    inWish = true;
  }

  saveWishlist(wishlist);
  if (typeof updateBadges === 'function') updateBadges();

  // Sincronización transparente en segundo plano si hay sesión iniciada
  const user = getSessionUserFromStorage();
  if (user.id_cliente && supabaseClient) {
    try {
      if (inWish) {
        await supabaseClient.from('favoritos').insert([
          { id_cliente: user.id_cliente, id_producto: productId }
        ]);
      } else {
        await supabaseClient.from('favoritos')
          .delete()
          .eq('id_cliente', user.id_cliente)
          .eq('id_producto', productId);
      }
    } catch (e) {
      console.warn('[Favoritos] No se pudo persistir en la nube (la lista local sigue segura):', e);
    }
  }
  return inWish;
}

/** Quita un producto de favoritos en localStorage y en Supabase si hay sesión. */
async function removeFavoriteFromCloud(productId) {
  let wishlist = (typeof getStoredWishlist === 'function') ? getStoredWishlist() : [];
  wishlist = wishlist.filter(p => String(p.id) !== String(productId));
  saveWishlist(wishlist);
  if (typeof updateBadges === 'function') updateBadges();

  const user = getSessionUserFromStorage();
  if (user.id_cliente && supabaseClient) {
    try {
      await supabaseClient.from('favoritos').delete()
        .eq('id_cliente', user.id_cliente)
        .eq('id_producto', productId);
    } catch (e) {}
  }
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER) || sessionStorage.getItem(STORAGE_KEYS.USER);
    const parsed = raw ? JSON.parse(raw) : null;
    if (typeof window !== 'undefined') {
      window.currentUser = parsed;
    }
    return parsed;
  } catch (e) {
    if (typeof window !== 'undefined') {
      window.currentUser = null;
    }
    return null;
  }
}

function setCurrentUser(user) {
  try {
    if (user) {
      const serialized = JSON.stringify(user);
      localStorage.setItem(STORAGE_KEYS.USER, serialized);
      sessionStorage.setItem(STORAGE_KEYS.USER, serialized);
      if (typeof window !== 'undefined') {
        window.currentUser = user;
      }
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
      sessionStorage.removeItem(STORAGE_KEYS.USER);
      if (typeof window !== 'undefined') {
        window.currentUser = null;
      }
    }
  } catch (e) {}
}

function getStoredOrders() {
  if (!getCurrentUser()) {
    orderHistory = null;
    return null;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ORDERS);
    orderHistory = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(orderHistory)) orderHistory = [];
    return orderHistory;
  } catch (e) {
    orderHistory = [];
    return [];
  }
}

function saveOrders(orders) {
  try {
    orderHistory = Array.isArray(orders) ? orders : [];
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orderHistory));
  } catch (e) {}
}

/* --------------------------------------------------------------------------
   3. MANEJO DE IMÁGENES Y FALLBACKS
   -------------------------------------------------------------------------- */
function handleImgFallback(imgElement) {
  if (!imgElement) return;
  const currentSrc = imgElement.getAttribute('src') || '';
  const step = Number(imgElement.getAttribute('data-fallback-step') || 0);
  if (step === 0 && /\.jpeg$/i.test(currentSrc)) {
    imgElement.setAttribute('data-fallback-step', '1');
    imgElement.src = currentSrc.replace(/\.jpeg$/i, '.jpg');
  } else if (step <= 1 && /\.(jpe?g)$/i.test(currentSrc)) {
    imgElement.setAttribute('data-fallback-step', '2');
    imgElement.src = currentSrc.replace(/\.(jpe?g)$/i, '.png');
  }
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

  let sessionUser = {};
  try { sessionUser = JSON.parse(localStorage.getItem('toteart_user') || '{}') || {}; } catch (e) {}
  const activeId = sessionUser.id_cliente || sessionUser.id_usuario || null;
  const activeEmail = sessionUser.email || null;
  const isAuthenticated = !!(activeId || activeEmail);

  const ordersBadge = document.getElementById('ordersCountNav');
  if (ordersBadge) {
    let ordersCount = 0;
    if (isAuthenticated) {
      try {
        const localOrders = JSON.parse(localStorage.getItem('toteart_orders') || '[]');
        if (Array.isArray(localOrders)) {
          ordersCount = localOrders.filter(o =>
            (activeId && (String(o.idCliente) === String(activeId) || String(o.id_cliente) === String(activeId) || (sessionUser.id_usuario && (String(o.idCliente) === String(sessionUser.id_usuario) || String(o.id_cliente) === String(sessionUser.id_usuario))))) ||
            (activeEmail && (o.customerEmail === activeEmail || o.email === activeEmail))
          ).length;
        }
      } catch (e) {}
    }
    ordersBadge.textContent = ordersCount;
  }

  const user = getCurrentUser();
  const loginBtn = document.getElementById('loginHeaderBtn');
  if (loginBtn) {
    const hasSession = isAuthenticated || !!(user && (user.id_cliente || user.id_usuario || user.email));
    if (hasSession) {
      const realName = (user && (user.nombres || user.nombre)) || sessionUser.nombres || sessionUser.nombre || '';
      const trimmedName = String(realName).trim();
      if (trimmedName) {
        const primerNombre = trimmedName.split(/\s+/)[0];
        loginBtn.textContent = `Hola, ${primerNombre}`;
      } else {
        loginBtn.textContent = 'Mi Cuenta';
      }
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
  const list = window.PRODUCTS || PRODUCTS || [];
  const product = list.find(p => String(p.id) === String(productId));
  if (!product) return;

  const stock = (typeof getAvailableStock === 'function')
    ? getAvailableStock(productId)
    : (typeof product.stock === 'number' ? product.stock : 10);
  if (stock <= 0) return;

  let cart = getStoredCart();
  const existing = cart.find(item => item.product && String(item.product.id) === String(product.id));
  const currentInCart = existing ? (existing.quantity || 0) : 0;
  if (currentInCart >= stock) return;

  if (existing) {
    existing.quantity = currentInCart + 1;
  } else {
    cart.push({ product, quantity: 1 });
  }

  cart = cart.filter(item => item && item.product && item.quantity > 0);
  saveCart(cart);
  updateBadges();

  let wishlist = getStoredWishlist();
  const prevLen = wishlist.length;
  wishlist = wishlist.filter(p => String(p.id) !== String(productId));
  if (wishlist.length !== prevLen) {
    saveWishlist(wishlist);
    updateBadges();
    removeFavoriteFromCloud(productId).catch(() => {});
  }

  const btn = event ? event.currentTarget : null;
  if (btn) {
    showButtonNotification(btn, "✓ Añadido al carrito", 'cart');
  }
}

function changeCartItemQty(productId, delta) {
  let cart = getStoredCart();
  const itemIndex = cart.findIndex(i => i.product && String(i.product.id) === String(productId));

  if (itemIndex === -1) return;

  cart[itemIndex].quantity += delta;

  if (cart[itemIndex].quantity <= 0) {
    cart.splice(itemIndex, 1);
  }

  cart = cart.filter(item => item && item.product && item.quantity > 0);
  saveCart(cart);
  updateBadges();

  if (typeof renderCartView === 'function') {
    renderCartView();
  }
}

function removeCartItem(productId) {
  let cart = getStoredCart();
  cart = cart.filter(item => item && item.product && String(item.product.id) !== String(productId));
  saveCart(cart);
  updateBadges();

  if (typeof renderCartView === 'function') {
    renderCartView();
  }
}

/* --------------------------------------------------------------------------
   6. RENDERIZADO DE TARJETA DE PRODUCTO ACCESIBLE (WCAG)
   -------------------------------------------------------------------------- */
function navigateToProduct(productId, event) {
  if (typeof window.selectPdpProductById === 'function' && document.getElementById('view-pdp')) {
    if (event) event.preventDefault();
    window.selectPdpProductById(productId);
    return false;
  }
  window.location.href = `producto.html?id=${encodeURIComponent(productId)}`;
  return true;
}

function createCompactHomeCardHtml(product) {
  const ratingVal = product && product.rating ? Number(product.rating).toFixed(1) : '4.8';
  const ratingSummary = (typeof getProductRatingSummary === 'function')
    ? getProductRatingSummary(product.id)
    : { text: ratingVal };
  const exactImg = resolveExactImgFile(product.imgFile, product.title, product.id);
  return `
    <div class="product-card" onclick="navigateToProduct('${product.id}', event)" style="cursor: pointer; flex: 0 0 185px; min-width: 185px; padding: 10px;">
      <a href="producto.html?id=${encodeURIComponent(product.id)}" onclick="return navigateToProduct('${product.id}', event)" class="product-card-link" aria-label="${product.title}, precio $${product.price.toFixed(2)} USD">
        <div class="product-img-box" style="margin-bottom: 8px;">
          <img src="img/${exactImg}" alt="${product.altText || product.title}" onerror="handleImgFallback(this)">
        </div>
        <h4 class="product-info-title" style="font-size: 13px; min-height: 32px; margin-bottom: 4px;">${product.title}</h4>
        <div class="product-rating" style="margin-bottom: 6px;">
          <span class="star" style="color:#D97706" aria-hidden="true">★</span>
          <span data-rating-text-for="${product.id}">${ratingSummary.text}</span>
        </div>
        <div class="product-price" style="color: #2D5A43; font-weight: 700; font-size: 14px; margin-bottom: 0;">$${product.price.toFixed(2)} USD</div>
      </a>
    </div>
  `;
}

function createAccessibleProductCardHtml(product) {
  const stock = (typeof getAvailableStock === 'function')
    ? getAvailableStock(product.id)
    : (typeof product.stock !== 'undefined' ? product.stock : 10);
  const soldOut = stock <= 0;
  const ratingVal = product && product.rating ? Number(product.rating).toFixed(1) : '4.8';
  const ratingSummary = (typeof getProductRatingSummary === 'function')
    ? getProductRatingSummary(product.id)
    : { text: ratingVal };
  const exactImg = resolveExactImgFile(product.imgFile, product.title, product.id);
  const stockHtml = stock > 0
    ? `<p class="stock-text" style="color: #5A3E2D; font-weight: 500; margin: 0;"><strong style="color: #5A3E2D;">Disponibles:</strong> <strong style="color: #2D5A43;">${stock}</strong></p>`
    : `<p class="stock-text" style="margin: 0;"><strong style="color: #DC2626;">No disponible</strong></p>`;
  return `
    <div class="product-card">
      <a href="producto.html?id=${encodeURIComponent(product.id)}" onclick="return navigateToProduct('${product.id}', event)" class="product-card-link" aria-label="${product.title}, precio $${product.price.toFixed(2)} USD">
        <div class="product-img-box">
          <img src="img/${exactImg}" alt="${product.altText || product.title}" onerror="handleImgFallback(this)">
        </div>
        <h4 class="product-info-title">${product.title}</h4>
      </a>
      <div class="product-rating">
        <span class="star" style="color:#D97706" aria-hidden="true">★</span>
        <span data-rating-text-for="${product.id}">${ratingSummary.text}</span>
      </div>
      <div class="product-price" style="color: #2D5A43; font-weight: 700;">$${product.price.toFixed(2)} USD</div>
      <div class="product-stock">
        ${stockHtml}
      </div>
      <div class="product-card-actions">
        <button class="btn-detail btn-view-detail btn-secondary" onclick="navigateToProduct('${product.id}', event)">Ver detalle</button>
        <button class="btn-add-cart" onclick="quickAddToCart('${product.id}', event)" ${soldOut ? 'disabled' : ''}>${soldOut ? 'Agotado' : 'Añadir al carrito'}</button>
      </div>
    </div>
  `;
}

/* --------------------------------------------------------------------------
   7. DESPLAZAMIENTO SUAVE A SECCIÓN DE RESEÑAS EN EL PDP (SIN MODAL FLOTANTE)
   -------------------------------------------------------------------------- */
function scrollToPdpReviews() {
  const container = document.getElementById('pdpReviewsContainer');
  if (container) {
    container.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// Alias por compatibilidad si algún botón llama openReviewsModal()
function openReviewsModal() {
  scrollToPdpReviews();
}

/* --------------------------------------------------------------------------
   8. BUSCADOR EN TIEMPO REAL CON SUGERENCIAS DROPDOWN E INICIALIZADOR GLOBAL
   -------------------------------------------------------------------------- */
function initRealtimeSearchDropdown(searchInput) {
  if (!searchInput) return;
  const searchWrap = searchInput.closest('.header-search') || searchInput.parentElement;
  if (!searchWrap) return;

  searchWrap.style.position = 'relative';

  let dropdown = document.getElementById('searchSuggestionsDropdown');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'searchSuggestionsDropdown';
    dropdown.setAttribute('role', 'listbox');
    dropdown.style.cssText = [
      'display: none;',
      'position: absolute;',
      'top: calc(100% + 6px);',
      'left: 0;',
      'right: 0;',
      'background: #FFFFFF;',
      'border: 1px solid #E6E1DA;',
      'border-radius: 10px;',
      'box-shadow: 0 8px 24px rgba(44, 38, 35, 0.14);',
      'max-height: 340px;',
      'overflow-y: auto;',
      'z-index: 9999;'
    ].join(' ');
    searchWrap.appendChild(dropdown);
  }

  let debounceTimer = null;

  function closeDropdown() {
    dropdown.style.display = 'none';
    dropdown.innerHTML = '';
  }

  function renderSuggestions(query) {
    const q = String(query || '').trim().toLowerCase();
    if (q.length < 2) {
      closeDropdown();
      return;
    }

    const list = window.PRODUCTS || PRODUCTS || [];
    const matches = list.filter(p =>
      String(p.title || '').toLowerCase().includes(q) ||
      String(p.categoryLabel || '').toLowerCase().includes(q)
    ).slice(0, 8);

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div style="padding: 12px 14px; font-size: 13px; color: #7A7067; text-align: center;">
          Sin coincidencias para "${query}"
        </div>
      `;
      dropdown.style.display = 'block';
      return;
    }

    dropdown.innerHTML = matches.map(p => {
      const exactImg = resolveExactImgFile(p.imgFile, p.title, p.id);
      return `
        <div role="option" data-prod-id="${p.id}" style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #F4F1EA; transition: background 0.15s;">
          <img src="img/${exactImg}" alt="${p.title}" onerror="handleImgFallback(this)" style="width: 38px; height: 38px; border-radius: 6px; object-fit: cover; flex-shrink: 0; background: #FAF7F2;">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 13px; font-weight: 600; color: #5A3E2D; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.title}</div>
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #2D5A43; flex-shrink: 0;">$${Number(p.price || 0).toFixed(2)} USD</div>
        </div>
      `;
    }).join('');

    dropdown.querySelectorAll('[data-prod-id]').forEach(itemEl => {
      itemEl.addEventListener('mouseenter', () => { itemEl.style.background = '#FAF7F2'; });
      itemEl.addEventListener('mouseleave', () => { itemEl.style.background = 'transparent'; });
      itemEl.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const prodId = itemEl.getAttribute('data-prod-id');
        closeDropdown();
        navigateToProduct(prodId, ev);
      });
    });

    dropdown.style.display = 'block';
  }

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const val = searchInput.value;
    if (val.trim().length < 2) {
      closeDropdown();
      return;
    }
    debounceTimer = setTimeout(() => {
      renderSuggestions(val);
    }, 200);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDropdown();
    } else if (e.key === 'Enter') {
      closeDropdown();
      const query = searchInput.value.trim();
      window.location.href = `catalogo.html?q=${encodeURIComponent(query)}`;
    }
  });

  document.addEventListener('click', (e) => {
    if (!searchWrap.contains(e.target)) {
      closeDropdown();
    }
  });
}

/* --------------------------------------------------------------------------
   9. VALIDACIÓN OFICIAL DE CÉDULA/RUC ECUADOR, EMAIL ESTRICTO, NOMBRES Y SELECTORES ANIDADOS
   -------------------------------------------------------------------------- */
function validarIdentificacionEcuador(id) {
  if (!id || (id.length !== 10 && id.length !== 13)) return false;
  const prov = parseInt(id.substring(0, 2), 10);
  if ((prov < 1 || prov > 24) && prov !== 30) return false;

  // Validación de Cédula (10 dígitos)
  function validarCedula(ced) {
    const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    const verificador = parseInt(ced.charAt(9), 10);
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let val = parseInt(ced.charAt(i), 10) * coef[i];
      suma += (val >= 10) ? val - 9 : val;
    }
    const residuo = suma % 10;
    const digito = (residuo === 0) ? 0 : 10 - residuo;
    return digito === verificador;
  }

  // Si tiene 10 dígitos -> debe ser cédula válida
  if (id.length === 10) {
    const tercerDigito = parseInt(id.charAt(2), 10);
    if (tercerDigito >= 6) return false;
    return validarCedula(id);
  }

  // Si tiene 13 dígitos -> RUC
  if (id.length === 13) {
    const tercerDigito = parseInt(id.charAt(2), 10);
    // RUC Persona Natural (termina en 001)
    if (tercerDigito < 6) {
      return validarCedula(id.substring(0, 10)) && id.endsWith('001');
    }
    // RUC Sociedad Privada (tercer dígito = 9, termina en 0001+)
    if (tercerDigito === 9) {
      const coef = [4, 3, 2, 7, 6, 5, 4, 3, 2];
      const verificador = parseInt(id.charAt(9), 10);
      let suma = 0;
      for (let i = 0; i < 9; i++) {
        suma += parseInt(id.charAt(i), 10) * coef[i];
      }
      const residuo = suma % 11;
      const digito = (residuo === 0) ? 0 : 11 - residuo;
      return digito === verificador && id.substring(10) !== '000';
    }
    // RUC Empresa Pública (tercer dígito = 6, termina en 0001+)
    if (tercerDigito === 6) {
      const coef = [3, 2, 7, 6, 5, 4, 3, 2];
      const verificador = parseInt(id.charAt(8), 10);
      let suma = 0;
      for (let i = 0; i < 8; i++) {
        suma += parseInt(id.charAt(i), 10) * coef[i];
      }
      const residuo = suma % 11;
      const digito = (residuo === 0) ? 0 : 11 - residuo;
      return digito === verificador && id.substring(9) !== '0000';
    }
  }
  return false;
}
if (typeof window !== 'undefined') {
  window.validarIdentificacionEcuador = validarIdentificacionEcuador;
}

const DIVISION_ECUADOR = {
  "Pichincha": ["Quito", "Rumiñahui (Sangolquí)", "Cayambe", "Mejía (Machachi)", "Tabacundo", "Puerto Quito"],
  "Guayas": ["Guayaquil", "Samborondón", "Daule", "Durán", "Milagro", "Playas (General Villamil)", "Balao", "El Empalme"],
  "Azuay": ["Cuenca", "Gualaceo", "Paute", "Santa Isabel", "Chordeleg", "Girón"],
  "Manabí": ["Portoviejo", "Manta", "Chone", "Montecristi", "Bahía de Caráquez", "Jipijapa", "El Carmen"],
  "Tungurahua": ["Ambato", "Baños de Agua Santa", "Pelileo", "Píllaro", "Cevallos"],
  "El Oro": ["Machala", "Pasaje", "Santa Rosa", "Huaquillas", "Arenillas", "Zaruma", "Piñas"],
  "Loja": ["Loja", "Catamayo", "Cariamanga", "Macará", "Vilcabamba", "Saraguro"],
  "Imbabura": ["Ibarra", "Otavalo", "Cotacachi", "Atuntaqui (Antonio Ante)", "Pimampiro"],
  "Chimborazo": ["Riobamba", "Guano", "Alausí", "Colta", "Chambo", "Cumandá"],
  "Cotopaxi": ["Latacunga", "Pujilí", "Salcedo", "Saquisilí", "La Maná"],
  "Santo Domingo de los Tsáchilas": ["Santo Domingo", "La Concordia"],
  "Santa Elena": ["Santa Elena", "Salinas", "La Libertad", "Montañita"],
  "Los Ríos": ["Babahoyo", "Quevedo", "Buena Fe", "Ventanas", "Vinces", "Montalvo"],
  "Esmeraldas": ["Esmeraldas", "Atacames", "Quinindé", "San Lorenzo", "Muisne", "Tonsupa"],
  "Carchi": ["Tulcán", "San Gabriel", "Mira", "Bolívar", "El Ángel"],
  "Cañar": ["Azogues", "La Troncal", "Cañar", "Biblián"],
  "Bolívar": ["Guaranda", "San Miguel", "Chimbo", "Caluma", "Echeandía"],
  "Pastaza": ["Puyo", "Mera", "Santa Clara", "Arajuno"],
  "Napo": ["Tena", "Archidona", "Baeza", "El Chaco"],
  "Morona Santiago": ["Macas", "Gualaquiza", "Sucúa", "Limón Indanza"],
  "Orellana": ["Puerto Francisco de Orellana (El Coca)", "La Joya de los Sachas", "Loreto"],
  "Sucumbíos": ["Nueva Loja (Lago Agrio)", "Shushufindi", "Cáscales", "Putumayo"],
  "Zamora Chinchipe": ["Zamora", "Yantzaza", "El Pangui", "Zumba"],
  "Galápagos": ["Puerto Ayora (Santa Cruz)", "Puerto Baquerizo Moreno (San Cristóbal)", "Puerto Villamil (Isabela)"]
};
if (typeof window !== 'undefined') {
  window.DIVISION_ECUADOR = DIVISION_ECUADOR;
}

function inicializarSelectoresUbicacion() {
  const provSelect = document.getElementById('selectProvincia');
  const citySelect = document.getElementById('selectCiudad');
  if (!provSelect) return;

  // Llenar combo de provincias
  provSelect.innerHTML = Object.keys(DIVISION_ECUADOR)
    .map(prov => `<option value="${prov}" ${prov === 'Pichincha' ? 'selected' : ''}>${prov}</option>`)
    .join('');

  if (!citySelect) return;

  // Función para poblar ciudades según la provincia activa
  function cargarCiudades(provincia) {
    const ciudades = DIVISION_ECUADOR[provincia] || [];
    citySelect.innerHTML = ciudades
      .map((city, idx) => `<option value="${city}" ${idx === 0 ? 'selected' : ''}>${city}</option>`)
      .join('');
  }

  // Carga inicial (Pichincha -> Quito por defecto)
  cargarCiudades(provSelect.value);

  // Evento de cambio reactivo
  provSelect.addEventListener('change', (e) => {
    cargarCiudades(e.target.value);
  });
}

const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function validarCorreoEstricto(email) {
  return STRICT_EMAIL_REGEX.test(String(email || '').trim());
}

function inicializarValidacionesGlobalesFormularios() {
  // 1. Inputs de correo electrónico
  document.querySelectorAll('input[type="email"], #regEmail, #loginEmail, #editEmail').forEach(emailInput => {
    if (emailInput.dataset.emailValidated) return;
    emailInput.dataset.emailValidated = 'true';

    let errorSmall = emailInput.parentElement.querySelector('.text-error-email');
    if (!errorSmall) {
      errorSmall = document.createElement('small');
      errorSmall.className = 'text-error text-error-email';
      errorSmall.style.cssText = 'color: #DC2626; display: none; font-size: 12px; margin-top: 4px;';
      errorSmall.textContent = 'Ingrese un correo electrónico válido (ej. usuario@gmail.com)';
      emailInput.parentElement.appendChild(errorSmall);
    }

    const checkEmail = () => {
      const val = emailInput.value.trim();
      const valid = val.length === 0 || validarCorreoEstricto(val);
      errorSmall.style.display = (!valid && val.length > 0) ? 'block' : 'none';
      emailInput.style.borderColor = (!valid && val.length > 0) ? '#DC2626' : '';
      return validarCorreoEstricto(val);
    };

    emailInput.addEventListener('input', checkEmail);
    emailInput.addEventListener('blur', checkEmail);
  });

  // 2. Inputs de Nombre y Apellido (solo letras y espacios, mínimo 2 caracteres alfabéticos)
  const nameSelectors = '#regFirstName, #regLastName, #editFirstName, #editLastName, #shippingName, #cardHolder';
  document.querySelectorAll(nameSelectors).forEach(nameInput => {
    if (nameInput.dataset.nameValidated) return;
    nameInput.dataset.nameValidated = 'true';

    let errorSmall = nameInput.parentElement.querySelector('.text-error-name');
    if (!errorSmall && nameInput.id !== 'cardHolder') {
      errorSmall = document.createElement('small');
      errorSmall.className = 'text-error text-error-name';
      errorSmall.style.cssText = 'color: #DC2626; display: none; font-size: 12px; margin-top: 4px;';
      errorSmall.textContent = 'Ingrese al menos 2 letras válidas.';
      nameInput.parentElement.appendChild(errorSmall);
    }

    nameInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
      const alphaCount = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '').length;
      if (errorSmall) {
        const invalid = e.target.value.trim().length > 0 && alphaCount < 2;
        errorSmall.style.display = invalid ? 'block' : 'none';
        e.target.style.borderColor = invalid ? '#DC2626' : '';
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof emailjs !== 'undefined' && typeof emailjs.init === 'function') {
    emailjs.init("eP9eKHycZP0E1SD-G");
  } else if (typeof ensureEmailJsInitialized === 'function') {
    ensureEmailJsInitialized();
  }

  updateBadges();
  loadProductsFromSupabase();
  if (getSessionUserFromStorage().id_cliente) {
    syncWishlistFromCloud().catch(() => {});
  }
  inicializarSelectoresUbicacion();
  inicializarValidacionesGlobalesFormularios();

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    initRealtimeSearchDropdown(searchInput);
  }
});
