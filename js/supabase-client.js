/**
 * ============================================================================
 * ToteArt - Capa de datos Supabase (stock, pedidos, sesión) + correo EmailJS
 * Archivo: js/supabase-client.js
 * ============================================================================
 * CONFIGURACIÓN OBLIGATORIA:
 *   1. Reemplaza SUPABASE_URL y SUPABASE_ANON_KEY con los valores de tu proyecto
 *      (Supabase → Project Settings → API).
 *   2. Ejecuta sql/supabase-schema.sql en el SQL Editor de Supabase para crear
 *      las tablas productos, pedidos, detalle_pedidos y la función descontar_stock.
 *   3. (Opcional) Completa EMAILJS_CONFIG para el envío real de correos.
 *
 * Mientras las credenciales no estén configuradas, todas las funciones operan
 * en modo local (localStorage) para que la tienda siga funcionando.
 */

// --------------------------------------------------------------------------
// 1. CREDENCIALES (reemplazar por las reales del proyecto)
// --------------------------------------------------------------------------
const SUPABASE_URL = window.__SUPABASE_URL__ || 'https://yaxvrznnqieaxmzvmwct.supabase.co';
const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__ || 'sb_publishable_aTNqK1njckUxP7rbA07Tsg_oEHiic17';

const EMAIL_CONFIG = {
  serviceID: 'service_z2x76bg',
  templateBienvenida: 'template_3ndh55m',
  templatePedidoYSeguimiento: 'template_x75943b'
};
if (typeof window !== 'undefined') {
  window.EMAIL_CONFIG = EMAIL_CONFIG;
}

const EMAILJS_CONFIG = {
  serviceId: window.__EMAILJS_SERVICE_ID__ || EMAIL_CONFIG.serviceID,
  templateBienvenida: window.__EMAILJS_TEMPLATE_BIENVENIDA__ || EMAIL_CONFIG.templateBienvenida,
  templatePedido: window.__EMAILJS_TEMPLATE_PEDIDO__ || EMAIL_CONFIG.templatePedidoYSeguimiento,
  templatePedidoYSeguimiento: window.__EMAILJS_TEMPLATE_PEDIDO__ || EMAIL_CONFIG.templatePedidoYSeguimiento,
  templateId: window.__EMAILJS_TEMPLATE_PEDIDO__ || EMAIL_CONFIG.templatePedidoYSeguimiento,
  publicKey: window.__EMAILJS_PUBLIC_KEY__ || 'eP9eKHycZP0E1SD-G'
};

// Cargar e inicializar EmailJS SDK automáticamente si no está en el DOM
function ensureEmailJsInitialized() {
  if (typeof window === 'undefined') return;
  if (typeof emailjs !== 'undefined' && typeof emailjs.init === 'function') {
    if (!window.__EMAILJS_INITIALIZED__) {
      emailjs.init("eP9eKHycZP0E1SD-G");
      window.__EMAILJS_INITIALIZED__ = true;
    }
    return;
  }
  if (typeof document !== 'undefined' && !document.getElementById('emailjs-sdk-script')) {
    const s = document.createElement('script');
    s.id = 'emailjs-sdk-script';
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.async = true;
    s.onload = () => {
      if (typeof emailjs !== 'undefined' && typeof emailjs.init === 'function') {
        emailjs.init("eP9eKHycZP0E1SD-G");
        window.__EMAILJS_INITIALIZED__ = true;
      }
    };
    document.head.appendChild(s);
  }
}
if (typeof document !== 'undefined') {
  ensureEmailJsInitialized();
}

const LOCAL_KEYS = {
  STOCK: 'toteart_stock',
  ORDERS: 'toteart_orders',
  REVIEWS: 'toteart_resenas',
  USERS: 'toteart_registered_users'
};

// --------------------------------------------------------------------------
// 2. INICIALIZACIÓN DEL CLIENTE
// --------------------------------------------------------------------------
function isSupabaseConfigured() {
  return /^https:\/\/.+\.supabase\.co/.test(SUPABASE_URL) && !SUPABASE_ANON_KEY.startsWith('TU_');
}

let supabaseInstance = null;
if (window.supabase && typeof window.supabase.createClient === 'function') {
  try {
    supabaseInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    console.warn('[Supabase] No se pudo inicializar el cliente:', err);
  }
}
window.supabaseClient = supabaseInstance;

// --------------------------------------------------------------------------
// 3. STOCK
// --------------------------------------------------------------------------
function getLocalStockMap() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEYS.STOCK)) || {};
  } catch (e) {
    return {};
  }
}

function saveLocalStockMap(map) {
  try { localStorage.setItem(LOCAL_KEYS.STOCK, JSON.stringify(map)); } catch (e) {}
}

/** Stock disponible sincrónico (último valor conocido de la BD o stock inicial). */
function getAvailableStock(productId) {
  const map = getLocalStockMap();
  if (typeof map[productId] === 'number') return map[productId];
  const p = (typeof PRODUCTS !== 'undefined') ? PRODUCTS.find(x => x.id === productId) : null;
  return p && typeof p.stock === 'number' ? p.stock : 0;
}

/** Consulta el stock real en Supabase y sincroniza la caché local. Devuelve { id: stock }. */
async function refreshStockFromDatabase(productIds) {
  const map = getLocalStockMap();
  if (window.supabaseClient) {
    try {
      let query = window.supabaseClient.from('productos').select('id_producto, stock');
      if (Array.isArray(productIds) && productIds.length) query = query.in('id_producto', productIds);
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        data.forEach(row => { map[row.id_producto] = Number(row.stock) || 0; });
        saveLocalStockMap(map);
      }
    } catch (err) {
      console.warn('[Supabase] Error al consultar stock:', err);
    }
  }
  const result = {};
  (productIds || Object.keys(map)).forEach(id => { result[id] = getAvailableStock(id); });
  return result;
}

/**
 * Descuenta stock por cada ítem comprado:
 *   UPDATE productos SET stock = stock - cantidad WHERE id_producto = id;
 * Usa la función RPC atómica descontar_stock (ver sql/supabase-schema.sql).
 */
async function decrementStockInDatabase(items) {
  const map = getLocalStockMap();
  for (const item of items) {
    const id = item.id != null ? item.id : (item.product ? item.product.id : null);
    const qty = Number(item.qty != null ? item.qty : item.quantity) || 1;
    if (!id) continue;
    const currentStock = getAvailableStock(id);
    const nextStock = Math.max(0, currentStock - qty);
    let updatedRemote = false;

    if (window.supabaseClient) {
      try {
        const { data, error: stockErr } = await window.supabaseClient.rpc('fn_descontar_stock', {
          p_id_producto: id,
          p_cantidad: qty
        });
        if (stockErr) {
          console.error("DEBUG SUPABASE STOCK ERROR:", stockErr);
          const fallbackRpc = await window.supabaseClient.rpc('descontar_stock', {
            p_id_producto: id,
            p_cantidad: qty
          });
          if (!fallbackRpc.error && typeof fallbackRpc.data === 'number') {
            map[id] = fallbackRpc.data;
            updatedRemote = true;
          }
        } else {
          map[id] = typeof data === 'number' ? data : nextStock;
          updatedRemote = true;
        }
      } catch (err) {
        console.error("DEBUG SUPABASE STOCK ERROR:", err);
      }

      if (!updatedRemote) {
        try {
          const { data: prodRow } = await window.supabaseClient
            .from('productos')
            .select('stock')
            .eq('id_producto', id)
            .maybeSingle();
          const baseStock = (prodRow && typeof prodRow.stock === 'number') ? prodRow.stock : currentStock;
          const computed = Math.max(0, baseStock - qty);
          const { error: updErr } = await window.supabaseClient
            .from('productos')
            .update({ stock: computed })
            .eq('id_producto', id);
          if (!updErr) {
            map[id] = computed;
            updatedRemote = true;
          }
        } catch (err2) {
          console.warn(`[Supabase] Error al descontar stock de ${id}:`, err2);
        }
      }
    }

    if (!updatedRemote) {
      map[id] = nextStock;
    }
    if (typeof window !== 'undefined' && Array.isArray(window.PRODUCTS)) {
      const pObj = window.PRODUCTS.find(p => String(p.id) === String(id));
      if (pObj) pObj.stock = map[id];
    }
  }
  saveLocalStockMap(map);

  // Actualizar de inmediato catálogo y PDP en pantalla sin recargar
  if (typeof renderCatalog === 'function') {
    try { renderCatalog(); } catch (e) {}
  }
  if (typeof updatePdpStockUI === 'function') {
    try { updatePdpStockUI(); } catch (e) {}
  }
}

// --------------------------------------------------------------------------
// 4. CATÁLOGO
// --------------------------------------------------------------------------
/** Lee los productos desde Supabase y los combina con los datos visuales locales. */
async function fetchCatalogProductsFromSupabase() {
  if (typeof loadProductsFromSupabase === 'function') {
    const loaded = await loadProductsFromSupabase();
    if (Array.isArray(loaded) && loaded.length > 0) return loaded;
  }
  const local = (typeof window !== 'undefined' && Array.isArray(window.PRODUCTS)) ? window.PRODUCTS : [];
  if (window.supabaseClient) {
    try {
      let { data, error } = await window.supabaseClient
        .from('productos')
        .select('*')
        .order('id_categoria', { ascending: true });
      if (error) {
        const retry = await window.supabaseClient.from('productos').select('*');
        data = retry.data;
        error = retry.error;
      }
      if (!error && Array.isArray(data) && data.length > 0) {
        const map = getLocalStockMap();
        const mapped = data.map(p => {
          const id = String(p.id_producto);
          const cat = p.id_categoria === 1 ? 'flores'
            : p.id_categoria === 2 ? 'animales'
            : p.id_categoria === 3 ? 'personajes'
            : (p.categoria || 'personajes');
          const catLabel = p.id_categoria === 1 ? 'Colección Flores'
            : p.id_categoria === 2 ? 'Colección Animales'
            : p.id_categoria === 3 ? 'Colección Personajes'
            : (cat === 'flores' ? 'Colección Flores' : cat === 'animales' ? 'Colección Animales' : 'Colección Personajes');
          const stockNum = Number(p.stock) || 0;
          map[id] = stockNum;
          const rawImg = p.imagen_url || p.imagen || p.url_imagen || p.img || p.imgFile || '';
          let title = p.titulo || p.nombre || '';
          let desc = p.descripcion || '';
          if (/kero/i.test(title) || /kero/i.test(rawImg) || /kero/i.test(id)) {
            title = 'Tote de Pikachu';
            if (!desc || /kero|sakura/i.test(desc)) {
              desc = 'Tote bag bordado a mano con el diseño de Pikachu en hilos vibrantes sobre lona 100% algodón.';
            }
          }
          const imagePath = typeof resolveExactImgFile === 'function'
            ? resolveExactImgFile(rawImg, title, id)
            : 'Tote Pikachu.jpeg';
          return {
            id,
            title,
            category: cat,
            categoryLabel: catLabel,
            price: parseFloat(p.precio) || 0,
            stock: stockNum,
            rating: parseFloat(p.rating_promedio || p.calificacion_promedio || p.rating) || 4.8,
            desc,
            specs: p.especificaciones || '',
            imgFile: imagePath,
            isFeatured: Boolean(p.destacado)
          };
        });
        saveLocalStockMap(map);
        window.PRODUCTS = mapped;
        return mapped;
      }
    } catch (err) {
      console.warn('[Supabase] Catálogo remoto no disponible:', err);
    }
  }
  return local;
}

// --------------------------------------------------------------------------
// 5. CLIENTE ACTIVO, AUTENTICACIÓN SEGURA Y SESIÓN
// --------------------------------------------------------------------------
async function hashPasswordSha256(plainText) {
  const text = String(plainText || '');
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {}
  }
  return text;
}

function getLocalRegisteredUsers() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEYS.USERS));
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function saveLocalRegisteredUsers(list) {
  try {
    localStorage.setItem(LOCAL_KEYS.USERS, JSON.stringify(Array.isArray(list) ? list : []));
  } catch (e) {}
}

function buildNormalizedSessionUser(raw) {
  if (!raw) return null;
  const fullName = String(raw.nombre_completo || raw.nombre || '').trim();
  const nombres = String(raw.nombres || (fullName ? fullName.split(/\s+/)[0] : '') || '').trim();
  const apellidos = String(raw.apellidos || (fullName ? fullName.split(/\s+/).slice(1).join(' ') : '') || '').trim();
  const displayNombre = [nombres, apellidos].filter(Boolean).join(' ').trim() || fullName;
  const telefono = String(raw.telefono || raw.phone || '').trim();
  const email = String(raw.email || raw.correo || '').trim().toLowerCase();
  return {
    id_usuario: raw.id_usuario || null,
    id_cliente: raw.id_cliente || null,
    id: raw.id_usuario || raw.id_cliente || raw.id || email,
    nombres: nombres || displayNombre,
    apellidos: apellidos,
    nombre: displayNombre || nombres,
    telefono: telefono,
    phone: telefono,
    email: email
  };
}

/**
 * Autentica al usuario invocando `fn_autenticar_usuario` en Supabase
 * o validando contra `password_hash` / `password`. NUNCA acepta solo el correo.
 */
async function authenticateUserInSupabase(emailInput, passwordInput) {
  const email = String(emailInput || '').trim().toLowerCase();
  const password = String(passwordInput || '');
  if (!email || !password) {
    return { ok: false, message: 'Correo o contraseña incorrectos' };
  }

  const pwdHash = await hashPasswordSha256(password);

  if (window.supabaseClient) {
    // 1. Intentar función RPC fn_verificar_login (segura con hash)
    try {
      const { data, error } = await window.supabaseClient.rpc('fn_verificar_login', {
        p_email: email,
        p_password: password
      });
      if (!error && data && data.length > 0 && data[0].valido) {
        const usuarioLogueado = data[0];
        let clientProfile = null;
        if (usuarioLogueado.id_usuario) {
          try {
            const { data: cData } = await window.supabaseClient
              .from('CLIENTES')
              .select('*')
              .eq('id_usuario', usuarioLogueado.id_usuario)
              .maybeSingle();
            clientProfile = cData;
          } catch (e) {}
        }
        const nombres = clientProfile?.nombres || usuarioLogueado.nombres || usuarioLogueado.nombre || '';
        const apellidos = clientProfile?.apellidos || usuarioLogueado.apellidos || '';
        return {
          ok: true,
          user: buildNormalizedSessionUser({
            ...(clientProfile || {}),
            ...usuarioLogueado,
            id_usuario: usuarioLogueado.id_usuario,
            nombres: nombres,
            apellidos: apellidos,
            email: email
          })
        };
      }
    } catch (e) {}

    // 2. Intentar función RPC fn_autenticar_usuario
    const rpcPayloads = [
      { p_email: email, p_password: password },
      { p_correo: email, p_password: password },
      { email: email, password: password }
    ];
    for (const params of rpcPayloads) {
      try {
        const { data, error } = await window.supabaseClient.rpc('fn_autenticar_usuario', params);
        if (!error && data) {
          const row = Array.isArray(data) ? data[0] : data;
          if (row && (row.email || row.correo || row.nombres || row.nombre || row.id_usuario || row.id_cliente || row.autenticado === true)) {
            if (row.autenticado === false) {
              return { ok: false, message: 'Correo o contraseña incorrectos' };
            }
            return { ok: true, user: buildNormalizedSessionUser({ ...row, email }) };
          }
        }
      } catch (e) {}
    }

    // 2. Verificar contra tabla `usuarios` o `clientes` en Supabase validando contraseña/hash
    for (const table of ['usuarios', 'clientes']) {
      for (const emailCol of ['email', 'correo']) {
        try {
          const { data: row, error } = await window.supabaseClient
            .from(table)
            .select('*')
            .ilike(emailCol, email)
            .maybeSingle();
          if (!error && row) {
            const storedHash = String(row.password_hash || row.contrasena_hash || row.password || row.contrasena || '');
            if (storedHash && (storedHash === password || storedHash === pwdHash)) {
              return { ok: true, user: buildNormalizedSessionUser(row) };
            } else if (storedHash) {
              return { ok: false, message: 'Correo o contraseña incorrectos' };
            }
          }
        } catch (e) {}
      }
    }
  }

  // 3. Verificar en registro local persistente (comparando hash/contraseña estrictamente)
  const localUsers = getLocalRegisteredUsers();
  const foundLocal = localUsers.find(u => String(u.email || '').toLowerCase() === email);
  if (foundLocal) {
    if (foundLocal.passwordHash === pwdHash || foundLocal.password === password) {
      return { ok: true, user: buildNormalizedSessionUser(foundLocal) };
    }
    return { ok: false, message: 'Correo o contraseña incorrectos' };
  }

  return { ok: false, message: 'Correo o contraseña incorrectos' };
}

/**
 * Registra un nuevo usuario en Supabase y almacena su sesión con nombres, apellidos, telefono y email.
 */
async function registerUserInSupabase({ nombres, apellidos, telefono, email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanNombres = String(nombres || '').trim();
  const cleanApellidos = String(apellidos || '').trim();
  const cleanTelefono = String(telefono || '').trim();
  const pwdHash = await hashPasswordSha256(password);

  let remoteUser = null;
  if (window.supabaseClient) {
    // Intentar RPC si existe
    try {
      const { data, error } = await window.supabaseClient.rpc('fn_registrar_usuario', {
        p_nombres: cleanNombres,
        p_apellidos: cleanApellidos,
        p_telefono: cleanTelefono,
        p_email: cleanEmail,
        p_password: password
      });
      if (!error && data) {
        remoteUser = Array.isArray(data) ? data[0] : data;
      }
    } catch (e) {}

    // Intentar insertar en `usuarios` o `clientes`
    if (!remoteUser) {
      for (const table of ['usuarios', 'clientes']) {
        try {
          const payload = {
            nombres: cleanNombres,
            apellidos: cleanApellidos,
            nombre: [cleanNombres, cleanApellidos].filter(Boolean).join(' ').trim(),
            telefono: cleanTelefono,
            email: cleanEmail,
            password_hash: pwdHash
          };
          const { data, error } = await window.supabaseClient.from(table).insert(payload).select().maybeSingle();
          if (!error && data) {
            remoteUser = data;
            break;
          }
        } catch (e) {}
      }
    }
  }

  const userRecord = buildNormalizedSessionUser({
    ...(remoteUser || {}),
    nombres: cleanNombres,
    apellidos: cleanApellidos,
    telefono: cleanTelefono,
    email: cleanEmail
  });

  // Guardar en lista local de usuarios registrados con su passwordHash
  const localUsers = getLocalRegisteredUsers().filter(u => String(u.email || '').toLowerCase() !== cleanEmail);
  localUsers.push({
    ...userRecord,
    passwordHash: pwdHash
  });
  saveLocalRegisteredUsers(localUsers);

  return { ok: true, user: userRecord };
}

async function getActiveClientId() {
  let session = {};
  try { session = JSON.parse(localStorage.getItem('toteart_user') || '{}') || {}; } catch (e) {}
  if (session.id_cliente) return session.id_cliente;
  if (session.id_usuario) return session.id_usuario;
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if (!user) return session.email || null;
  return user.id_cliente || user.id_usuario || user.id || user.email || session.email || null;
}

async function signOutFromSupabase() {
  if (window.supabaseClient) {
    try { await window.supabaseClient.auth.signOut(); } catch (e) {}
  }
}

// --------------------------------------------------------------------------
// 6. PEDIDOS (pedidos + detalle_pedidos + pagos)
// --------------------------------------------------------------------------
const ORDER_STATUS_FLOW = ['PAGADO', 'BORDADO_TALLER', 'EN_CAMINO'];
const ORDER_STATUS_STEP_MS = 120000; // 2 minutos (120,000 ms)

function getLocalOrders() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEYS.ORDERS));
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function saveLocalOrders(orders) {
  try { localStorage.setItem(LOCAL_KEYS.ORDERS, JSON.stringify(orders)); } catch (e) {}
}

/** Inserta el pedido en `pedidos`, sus ítems en `detalle_pedidos` y el pago tokenizado en `pagos`. */
async function saveOrderToDatabase(order) {
  let sessionUser = {};
  try { sessionUser = JSON.parse(localStorage.getItem('toteart_user') || '{}') || {}; } catch (e) {}
  const activeClientId = sessionUser.id_cliente || sessionUser.id_usuario || order.idCliente || order.id_cliente || null;

  // Respaldo Local Garantizado: guardar siempre el pedido completado en localStorage ('toteart_orders')
  try {
    let localOrders = JSON.parse(localStorage.getItem('toteart_orders') || '[]');
    localOrders.unshift({
      ...order,
      id_cliente: activeClientId,
      idCliente: activeClientId,
      customerEmail: order.customerEmail || order.email || sessionUser.email || '',
      fecha_pedido: order.fechaPedido || new Date().toISOString()
    });
    localStorage.setItem('toteart_orders', JSON.stringify(localOrders));
    if (typeof updateBadges === 'function') updateBadges();
  } catch (e) {}

  if (!window.supabaseClient) return { remote: false };
  try {
    const isPickup = String(order.deliveryMethod || order.metodo_entrega || order.metodo_envio || '').toUpperCase().includes('RETIRO');
    const resolvedGuia = isPickup
      ? null
      : (order.trackingNumber || order.guia_servientrega || order.guia || `SERV-EC-2026-${Math.floor(10000 + Math.random() * 90000)}`);

    const basePedido = {
      codigo_orden: order.code,
      id_cliente: activeClientId,
      calle_principal: order.shippingAddress?.street1 || order.calle_principal || 'No especificada',
      calle_secundaria: order.shippingAddress?.street2 || order.calle_secundaria || '',
      referencia: order.shippingAddress?.ref || order.referencia || '',
      ciudad: order.shippingAddress?.city || order.ciudad || 'Quito',
      provincia: order.provincia || 'Pichincha',
      telefono_contacto: order.shippingAddress?.phone || order.customerPhone || '0999999999',
      subtotal: order.subtotal || 0,
      costo_envio: order.shippingCost != null ? order.shippingCost : 5.00,
      total: order.total || 0,
      estado: 'PAGADO',
      guia_servientrega: resolvedGuia
    };

    let insertedOrder = null;
    let { data: orderData, error: errPedido } = await window.supabaseClient
      .from('pedidos')
      .insert([basePedido])
      .select()
      .single();

    if (!errPedido && orderData) {
      insertedOrder = orderData;
    } else if (errPedido) {
      // Fallback por si el esquema de `pedidos` utiliza `direccion_entrega` / `metodo_entrega`
      const fallbackPedido = {
        codigo_orden: order.code,
        id_cliente: activeClientId,
        fecha_pedido: order.fechaPedido || new Date().toISOString(),
        estado: 'PAGADO',
        guia_servientrega: basePedido.guia_servientrega,
        metodo_entrega: order.deliveryMethod || order.metodo_entrega || 'DOMICILIO',
        direccion_entrega: order.address || `${basePedido.calle_principal} ${basePedido.calle_secundaria}`.trim(),
        ciudad: basePedido.ciudad,
        provincia: basePedido.provincia,
        subtotal: basePedido.subtotal,
        costo_envio: basePedido.costo_envio,
        total: basePedido.total
      };
      const retry = await window.supabaseClient
        .from('pedidos')
        .insert([fallbackPedido])
        .select()
        .single();
      if (!retry.error && retry.data) {
        insertedOrder = retry.data;
        errPedido = null;
      } else {
        const minimalRetry = await window.supabaseClient
          .from('pedidos')
          .insert([{
            codigo_orden: order.code,
            id_cliente: activeClientId,
            subtotal: basePedido.subtotal,
            costo_envio: basePedido.costo_envio,
            total: basePedido.total,
            estado: 'PAGADO',
            guia_servientrega: basePedido.guia_servientrega
          }])
          .select()
          .single();
        if (!minimalRetry.error && minimalRetry.data) {
          insertedOrder = minimalRetry.data;
          errPedido = null;
        }
      }
    }

    if (errPedido) {
      console.error('[Error Crítico Supabase - Pedido]:', errPedido);
      throw new Error(`No se pudo registrar el pedido en la base de datos: ${errPedido.message}`);
    }

    const pedidoId = (insertedOrder && (insertedOrder.id_pedido || insertedOrder.id)) || order.code;

    const detallePayload = (order.items || []).map(item => {
      const prodId = item.id != null ? item.id : (item.product ? item.product.id : '');
      const prodTitle = item.title || item.nombre || (item.product ? item.product.title : '') || 'Tote Bag';
      const qty = Number(item.quantity != null ? item.quantity : item.cantidad) || 1;
      const unitPrice = Number(item.price != null ? item.price : (item.product ? item.product.price : 0)) || 0;
      const lineTotal = Number((qty * unitPrice).toFixed(2));
      return {
        id_pedido: insertedOrder.id_pedido || pedidoId,
        id_producto: String(prodId),
        nombre_producto: prodTitle,
        cantidad: qty,
        precio_unitario: unitPrice,
        subtotal: lineTotal,
        subtotal_linea: lineTotal
      };
    });

    let { error: errDetalle } = await window.supabaseClient
      .from('detalle_pedidos')
      .insert(detallePayload);

    if (errDetalle) {
      // Fallback si `detalle_pedidos` no tiene `subtotal_linea` o requiere `codigo_orden`
      const fallbackDetalles = detallePayload.map(d => ({
        id_pedido: d.id_pedido,
        codigo_orden: order.code,
        id_producto: d.id_producto,
        nombre_producto: d.nombre_producto,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal: d.subtotal
      }));
      const retryDet = await window.supabaseClient
        .from('detalle_pedidos')
        .insert(fallbackDetalles);
      if (retryDet.error) {
        const retryDet2 = await window.supabaseClient
          .from('detalle_pedidos')
          .insert(detallePayload.map(d => ({
            id_pedido: d.id_pedido,
            id_producto: d.id_producto,
            nombre_producto: d.nombre_producto,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            subtotal: d.subtotal
          })));
        errDetalle = retryDet2.error;
      } else {
        errDetalle = null;
      }
    }

    if (errDetalle) {
      console.error('[Error Supabase - Detalle]:', errDetalle);
    }

    // Sanitización Absoluta de Tarjetas en Checkout:
    // Inserción en la tabla PAGOS únicamente con id_pedido, monto, metodo, estado, ultimos_cuatro y transaccion_token
    const lastFour = order.ultimos_cuatro || order.cardLast4 || '0000';
    const transaccionToken = order.transaccion_token || order.transaccionToken || order.cardTokenHash || ('TOK-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('TOK-' + Date.now())));

    const pagoPayload = {
      id_pedido: pedidoId,
      monto: order.total,
      metodo: 'TARJETA',
      estado: 'APROBADO',
      ultimos_cuatro: lastFour,           // Ej: "8910"
      transaccion_token: transaccionToken  // Hash/Token único sin datos bancarios
    };

    try {
      const { error: errPago } = await window.supabaseClient.from('PAGOS').insert([pagoPayload]);
      if (errPago) {
        // Fallback para tabla en minúsculas 'pagos'
        await window.supabaseClient.from('pagos').insert([{
          id_pedido: pedidoId,
          codigo_orden: order.code,
          monto: order.total,
          metodo: 'TARJETA',
          estado: 'APROBADO',
          ultimos_cuatro: lastFour,
          ultimos_4_digitos: lastFour,
          transaccion_token: transaccionToken,
          token_hash: transaccionToken,
          marca_tarjeta: order.cardBrand || 'Visa',
          fecha_pago: order.fechaPedido
        }]);
      }
    } catch (e) {
      console.warn('[Supabase] Error al registrar pago:', e);
    }

    return { remote: true, data: insertedOrder };
  } catch (err) {
    console.warn('[Supabase] No se pudo guardar el pedido en la base de datos:', err);
    return { remote: false, error: err };
  }
}

/** Convierte una fila de Supabase al formato de pedido usado por la interfaz. */
function mapDbOrder(row) {
  const local = (typeof PRODUCTS !== 'undefined') ? PRODUCTS : [];
  return {
    code: row.codigo_orden,
    idCliente: row.id_cliente,
    fechaPedido: row.fecha_pedido,
    estado: row.estado,
    guia: row.guia_servientrega || null,
    deliveryMethod: row.metodo_entrega,
    address: row.direccion_entrega,
    ciudad: row.ciudad || '',
    subtotal: Number(row.subtotal),
    shippingCost: Number(row.costo_envio),
    total: Number(row.total),
    items: (row.detalle_pedidos || []).map(item => {
      const base = local.find(p => String(p.id) === String(item.id_producto)) || {};
      const resolvedTitle = item.productos?.titulo || item.productos?.nombre || item.nombre_producto || base.title || 'Tote Bag';
      const rawImg = item.productos?.imagen_url || item.productos?.imagen || base.imgFile || 'img/placeholder.jpg';
      const imgFile = base.imgFile || (typeof resolveExactImgFile === 'function'
        ? resolveExactImgFile(rawImg, resolvedTitle, item.id_producto)
        : rawImg);
      const lineSubtotal = Number(item.subtotal_linea || item.subtotal || (Number(item.precio_unitario || 0) * Number(item.cantidad || 1)) || 0);
      return {
        product: {
          ...base,
          id: item.id_producto,
          title: resolvedTitle,
          imgFile: imgFile || 'placeholder.jpg',
          price: Number(item.precio_unitario) || (item.cantidad ? lineSubtotal / item.cantidad : 0)
        },
        subtotal: lineSubtotal,
        quantity: item.cantidad
      };
    })
  };
}

/**
 * SELECT * FROM pedidos WHERE id_cliente = [id_cliente_activo] ORDER BY fecha_pedido DESC;
 */
async function fetchOrdersForActiveClient() {
  let session = {};
  try { session = JSON.parse(localStorage.getItem('toteart_user') || '{}') || {}; } catch (e) {}
  const idCliente = await getActiveClientId();
  const candidateIds = Array.from(new Set(
    [idCliente, session.id_cliente, session.id_usuario, session.id, session.email]
      .filter(v => v != null && String(v).trim() !== '')
      .map(v => String(v))
  ));
  if (candidateIds.length === 0) return [];

  if (window.supabaseClient) {
    for (const currentId of candidateIds) {
      try {
        let { data, error } = await window.supabaseClient
          .from('pedidos')
          .select('*, detalle_pedidos(*, productos(*))')
          .eq('id_cliente', currentId)
          .order('fecha_pedido', { ascending: false });
        if (error) {
          const retry = await window.supabaseClient
            .from('pedidos')
            .select('*, detalle_pedidos(*)')
            .eq('id_cliente', currentId)
            .order('fecha_pedido', { ascending: false });
          data = retry.data;
          error = retry.error;
        }
        if (!error && Array.isArray(data) && data.length > 0) {
          return data.map(mapDbOrder);
        }
      } catch (err) {
        console.error('Error al obtener pedidos:', err);
      }
    }
  }
  return [];
}

async function updateOrderStatusInDatabase(code, estado, guia) {
  const localOrders = getLocalOrders();
  const o = localOrders.find(x => x.code === code);
  if (o) {
    o.estado = estado;
    if (guia) o.guia = guia;
    saveLocalOrders(localOrders);
  }

  if (window.supabaseClient) {
    try {
      const payload = { estado };
      if (guia) payload.guia_servientrega = guia;
      let { error } = await window.supabaseClient.from('pedidos').update(payload).eq('codigo_orden', code);
      if (error && estado === 'EN_CAMINO') {
        const fallbackPayload = { estado: 'EN_TRANSITO' };
        if (guia) fallbackPayload.guia_servientrega = guia;
        await window.supabaseClient.from('pedidos').update(fallbackPayload).eq('codigo_orden', code);
      }
    } catch (err) {
      console.warn('[Supabase] Error al actualizar estado del pedido:', err);
    }
  }
}

function isHomeDeliveryMethod(method) {
  const m = String(method || '').toUpperCase();
  return m === 'DOMICILIO' || m === 'ENVIO';
}

/** Estado esperado según el tiempo transcurrido. */
function computeExpectedStatus(order) {
  if (!isHomeDeliveryMethod(order.deliveryMethod)) {
    return order.estado || 'PAGADO';
  }
  const start = new Date(order.fechaPedido).getTime();
  if (isNaN(start)) return order.estado || 'PAGADO';
  const elapsed = Date.now() - start;
  if (elapsed >= ORDER_STATUS_STEP_MS) {
    return 'EN_CAMINO';
  }
  return order.estado || 'PAGADO';
}

/**
 * Disparador 3 y avance a EN_CAMINO tras 2 minutos (120,000 ms).
 * CONDICIÓN ESTRICTA: Se ejecuta ÚNICAMENTE si metodo_entrega === 'DOMICILIO' (o 'envio').
 * Si fue con retiro en tienda, este temporizador y correo QUEDAN DESACTIVADOS.
 */
function scheduleOrderStatusProgression(order, onChange, userOverride) {
  if (!order || !isHomeDeliveryMethod(order.metodo_entrega || order.deliveryMethod)) {
    return;
  }
  const start = new Date(order.fechaPedido).getTime();
  const delay = isNaN(start) ? 120000 : Math.max(0, (start + 120000) - Date.now());

  if ((order.estado === 'EN_CAMINO' || order.estado === 'EN_TRANSITO') && order.dispatchEmailSent) {
    return;
  }

  setTimeout(async () => {
    const guia = /^90\d{8}$/.test(String(order.guia_servientrega || order.guia || ''))
      ? String(order.guia_servientrega || order.guia)
      : ('90' + Math.floor(10000000 + Math.random() * 90000000).toString());
    order.estado = 'EN_CAMINO';
    order.guia = guia;
    order.guia_servientrega = guia;
    await updateOrderStatusInDatabase(order.code || order.codigo_orden, 'EN_CAMINO', guia);

    // El correo de guía Servientrega ya se envía de forma encadenada en el checkout
    // (no depende de este temporizador); aquí solo se avanza el estado.
    if (typeof onChange === 'function') onChange(order);
  }, delay);
}

// --------------------------------------------------------------------------
// 7. GUÍA SERVIENTREGA (10 DÍGITOS EMPEZANDO CON 90) Y SISTEMA EMAILJS (2 PLANTILLAS)
// --------------------------------------------------------------------------
function generateServientregaGuide() {
  const guia = '90' + Math.floor(10000000 + Math.random() * 90000000).toString();
  return guia;
}

function generateOrderCode() {
  return '#TAT-' + String(Math.floor(1000 + Math.random() * 9000));
}

async function sendEmailJsTemplate(templateId, templateParams) {
  ensureEmailJsInitialized();
  const safeParams = { ...(templateParams || {}) };
  const fallbackUser = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  const resolvedEmail = String(
    safeParams.email_usuario ||
    safeParams.to_email ||
    safeParams.email ||
    (fallbackUser && fallbackUser.email) ||
    ''
  ).trim();
  safeParams.email_usuario = resolvedEmail;

  if (!resolvedEmail) {
    console.error("❌ ERROR CRÍTICO EMAILJS: email_usuario vacío o inválido", safeParams);
    return { sent: false, error: 'email_usuario vacío' };
  }

  if (typeof emailjs !== 'undefined' && typeof emailjs.send === 'function') {
    emailjs.init('eP9eKHycZP0E1SD-G');
    return emailjs.send(EMAIL_CONFIG.serviceID, templateId, safeParams)
      .then((res) => {
        console.log("✅ EMAIL ENVIADO:", res.status, res.text);
        return { sent: true, status: res.status, text: res.text };
      })
      .catch((err) => {
        console.error("❌ ERROR CRÍTICO EMAILJS:", err);
        console.warn("Fallo EmailJS detalle:", JSON.stringify(err));
        return { sent: false, error: err };
      });
  }
  return fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAIL_CONFIG.serviceID,
      template_id: templateId,
      user_id: 'eP9eKHycZP0E1SD-G',
      template_params: safeParams
    })
  })
    .then(async res => {
      const text = await res.text();
      if (!res.ok) {
        const err = { status: res.status, text };
        console.error("❌ ERROR CRÍTICO EMAILJS:", err);
        return { sent: false, error: err };
      }
      console.log("✅ EMAIL ENVIADO:", res.status, text);
      return { sent: true, status: res.status, text };
    })
    .catch(err => {
      console.error("❌ ERROR CRÍTICO EMAILJS:", err);
      return { sent: false, error: err };
    });
}

/**
 * A. Correo de Bienvenida (Registro)
 * Inmediatamente después de registrar con éxito al usuario en Supabase:
 */
async function sendWelcomeEmail(nuevoUsuario) {
  const activeUser = nuevoUsuario || ((typeof getCurrentUser === 'function') ? getCurrentUser() : null) || {};
  const validEmail = String(activeUser.email || activeUser.correo || '').trim();
  const nombre = activeUser.nombres || activeUser.nombre || 'Cliente';
  if (!validEmail) return { sent: false };

  ensureEmailJsInitialized();
  if (typeof emailjs !== 'undefined' && typeof emailjs.send === 'function') {
    emailjs.init('eP9eKHycZP0E1SD-G');
    return emailjs.send(EMAIL_CONFIG.serviceID, EMAIL_CONFIG.templateBienvenida, {
      nombre_usuario: nombre,
      email_usuario: validEmail
    })
      .then(res => {
        console.log('✅ Bienvenida enviada:', res.status);
        return { sent: true, status: res.status };
      })
      .catch(err => {
        console.error('❌ Error Bienvenida:', err);
        return { sent: false, error: err };
      });
  }
  return sendEmailJsTemplate(EMAIL_CONFIG.templateBienvenida, {
    nombre_usuario: nombre,
    email_usuario: validEmail
  });
}

/**
 * B. Correo 1 de Pedido: Separación absoluta entre Retiro en Local vs. Domicilio
 */
async function sendOrderConfirmationEmail(order, user) {
  const currentUser = user || ((typeof getCurrentUser === 'function') ? getCurrentUser() : null) || {};
  const validEmail = String(currentUser.email || currentUser.correo || '').trim();
  if (!validEmail) return { sent: false };

  const esDomicilio = isHomeDeliveryMethod(order.metodo_entrega || order.deliveryMethod);
  const cleanCode = String(order.codigo_orden || order.code || '').replace(/^#+/, '');
  const orderData = {
    codigo_orden: cleanCode,
    metodo_entrega: esDomicilio ? 'DOMICILIO' : 'RETIRO_TIENDA',
    calle_principal: order.calle_principal || '',
    calle_secundaria: order.calle_secundaria || '',
    provincia: order.provincia || 'Pichincha',
    ciudad: order.ciudad || 'Quito',
    costo_envio: Number(order.costo_envio != null ? order.costo_envio : (order.shippingCost || 0)),
    total: Number(order.total || 0)
  };

  const itemsHtml = (order.items || []).map(i => {
    const sub = (i.product.price * i.quantity).toFixed(2);
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #E6E1DA;">
        <div style="color:#5A3E2D; font-weight:700; font-size:14px;">${i.product.title} (x${i.quantity})</div>
        <div style="color:#2D5A43; font-weight:700; font-size:14px;">$${sub} USD</div>
      </div>
    `;
  }).join('');

  let paramsConfirmacion;
  if (orderData.metodo_entrega !== 'DOMICILIO') {
    // CASO A: RETIRO EN TIENDA FÍSICA (Solo 1 correo, sin Servientrega)
    paramsConfirmacion = {
      email_usuario: validEmail,
      asunto_correo: `Tu pedido #${orderData.codigo_orden} para retiro en taller - ToteArt`,
      subtitulo_cabecera: 'Pedido confirmado para retiro en taller',
      mensaje_principal: 'Hemos registrado tu pedido con éxito. Comenzaremos la preparación de tus tote bags y estaremos actualizando el estado de tu pedido para que sepas cuándo puedes acercarte a retirarlo en nuestro taller en Quito (horario: 09:00 a 18:00).',
      codigo_orden: orderData.codigo_orden,
      order_id: orderData.codigo_orden,
      cuerpo_dinamico_html: `
        <div style="margin: 16px 0;">${itemsHtml}</div>
        <table style="width: 100%; border-top: 1.5px solid #5A3E2D; margin-top: 12px; padding-top: 8px;">
          <tr><td style="color: #6F574E;">Método:</td><td align="right" style="color: #5A3E2D; font-weight: 600;">Retiro en taller (Quito)</td></tr>
          <tr><td style="color: #6F574E;">Costo de entrega:</td><td align="right" style="color: #2D5A43; font-weight: 600;">$0.00</td></tr>
          <tr><td style="font-size: 16px; font-weight: 700; color: #5A3E2D; padding-top: 8px;">Total pagado:</td><td align="right" style="font-size: 18px; font-weight: 800; color: #2D5A43; padding-top: 8px;">$${orderData.total.toFixed(2)} USD</td></tr>
        </table>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${typeof window !== 'undefined' && window.location ? window.location.origin : 'https://toteart.ec'}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #5A3E2D; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
            Revisar el estado de mi pedido en ToteArt →
          </a>
        </div>
      `
    };
  } else {
    // CASO B (Correo 1): Confirmación de orden a domicilio
    const ubicacionTexto = orderData.provincia
      ? `${orderData.ciudad}, ${orderData.provincia}`
      : orderData.ciudad;
    const direccionTexto = (orderData.calle_principal && orderData.calle_secundaria)
      ? `${orderData.calle_principal} y ${orderData.calle_secundaria}, ${ubicacionTexto}`
      : (order.address || ubicacionTexto);
    paramsConfirmacion = {
      email_usuario: validEmail,
      asunto_correo: `Confirmación de pedido #${orderData.codigo_orden} - Envío a Domicilio`,
      subtitulo_cabecera: 'Gracias por tu compra',
      mensaje_principal: `Hemos recibido tu pago con éxito. Tu pedido entrará en preparación y te notificaremos por este medio con tu guía de Servientrega en cuanto el paquete sea despachado a tu dirección (${ubicacionTexto}).`,
      codigo_orden: orderData.codigo_orden,
      order_id: orderData.codigo_orden,
      cuerpo_dinamico_html: `
        <div style="margin: 16px 0;">${itemsHtml}</div>
        <table style="width: 100%; border-top: 1.5px solid #5A3E2D; margin-top: 12px; padding-top: 8px;">
          <tr><td style="color: #6F574E;">Dirección de destino:</td><td align="right" style="color: #5A3E2D;">${direccionTexto}</td></tr>
          <tr><td style="color: #6F574E;">Provincia / Ciudad:</td><td align="right" style="color: #5A3E2D;">${orderData.provincia} - ${orderData.ciudad}</td></tr>
          <tr><td style="color: #6F574E;">Costo de envío:</td><td align="right" style="color: #2D5A43; font-weight: 600;">$5.00</td></tr>
          <tr><td style="font-size: 16px; font-weight: 700; color: #5A3E2D; padding-top: 8px;">Total pagado:</td><td align="right" style="font-size: 18px; font-weight: 800; color: #2D5A43; padding-top: 8px;">$${orderData.total.toFixed(2)} USD</td></tr>
        </table>
      `
    };
  }

  ensureEmailJsInitialized();
  if (typeof emailjs !== 'undefined' && typeof emailjs.send === 'function') {
    emailjs.init('eP9eKHycZP0E1SD-G');
    return emailjs.send(EMAIL_CONFIG.serviceID, EMAIL_CONFIG.templatePedidoYSeguimiento, paramsConfirmacion)
      .then(res => {
        console.log('✅ Confirmación de compra enviada:', res.status);
        return { sent: true, status: res.status };
      })
      .catch(err => {
        console.error('❌ Error Confirmación:', err);
        return { sent: false, error: err };
      });
  }
  return sendEmailJsTemplate(EMAIL_CONFIG.templatePedidoYSeguimiento, paramsConfirmacion);
}

/**
 * C. Correo 2 de Pedido: Despacho y Seguimiento (Solo Domicilio, a los 2 minutos)
 */
async function sendOrderDispatchEmail(order, user, guiaParam) {
  const currentUser = user || ((typeof getCurrentUser === 'function') ? getCurrentUser() : null) || {};
  const validEmail = String(currentUser.email || currentUser.correo || '').trim();
  if (!order || !isHomeDeliveryMethod(order.metodo_entrega || order.deliveryMethod) || !validEmail) {
    return { sent: false, reason: 'not-home-delivery' };
  }

  const guia = guiaParam || ('90' + Math.floor(10000000 + Math.random() * 90000000));
  const cleanCode = String(order.codigo_orden || order.code || '').replace(/^#+/, '');
  const orderData = {
    codigo_orden: cleanCode,
    ciudad: order.ciudad || 'tu ciudad'
  };

  const paramsSeguimiento = {
    email_usuario: validEmail,
    asunto_correo: `Tu pedido #${orderData.codigo_orden} va en camino - Guía Servientrega`,
    codigo_orden: orderData.codigo_orden,
    order_id: orderData.codigo_orden,
    subtitulo_cabecera: 'Tu paquete ha sido despachado',
    mensaje_principal: '¡Buenas noticias! Tu paquete ha sido entregado a Servientrega y va en camino a tu domicilio.',
    cuerpo_dinamico_html: `
      <div style="background-color: #FAF7F2; border: 1px solid #EADDD3; border-radius: 8px; padding: 20px; text-align: center; margin: 18px 0;">
        <p style="margin: 0 0 6px 0; font-size: 13px; color: #6F574E; text-transform: uppercase; font-weight: 600;">Número de Guía Servientrega</p>
        <div style="font-size: 24px; font-weight: 800; color: #5A3E2D; letter-spacing: 1.5px; margin-bottom: 16px;">${guia}</div>
        <a href="https://www.servientrega.com.ec/" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #2D5A43; color: #FFFFFF; text-decoration: none; padding: 10px 22px; border-radius: 4px; font-weight: 600; font-size: 14px;">
          Ir al portal de Servientrega →
        </a>
      </div>
    `
  };

  ensureEmailJsInitialized();
  if (typeof emailjs !== 'undefined' && typeof emailjs.send === 'function') {
    emailjs.init('eP9eKHycZP0E1SD-G');
    return emailjs.send(EMAIL_CONFIG.serviceID, EMAIL_CONFIG.templatePedidoYSeguimiento, paramsSeguimiento)
      .then(res => {
        console.log('✅ Correo de guía enviado:', res.status);
        return { sent: true, status: res.status };
      })
      .catch(err => {
        console.error('❌ Error Guía:', err);
        return { sent: false, error: err };
      });
  }
  return sendEmailJsTemplate(EMAIL_CONFIG.templatePedidoYSeguimiento, paramsSeguimiento);
}

// --------------------------------------------------------------------------
// 8. VALIDACIÓN DE TARJETA (ALGORITMO DE LUHN + TARJETAS DE PRUEBA VISA/MC/DINERS)
// --------------------------------------------------------------------------
const TEST_CARDS_ALLOWLIST = new Set([
  '4532015012345674',
  '4242424242424242',
  '4000000000000002',
  '5555555555554444',
  '30569309025904',
  '38520000023237',
  '36000000000008'
]);

function isDinersPrefix(digits) {
  return /^(36|38|30[0-5])/.test(String(digits || ''));
}

function isValidLuhn(cardNumber) {
  const digits = String(cardNumber).replace(/\D/g, '');
  const isDiners = isDinersPrefix(digits);
  if (isDiners) {
    if (digits.length !== 14 && digits.length !== 16) return false;
  } else {
    if (digits.length !== 16) return false;
  }
  if (TEST_CARDS_ALLOWLIST.has(digits)) return true;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = parseInt(digits[digits.length - 1 - i], 10);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

// --------------------------------------------------------------------------
// 9. RESEÑAS DINÁMICAS (tabla `resenas` + verificación en `detalle_pedidos`)
// --------------------------------------------------------------------------
function getLocalReviews() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEYS.REVIEWS));
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function saveLocalReviews(reviews) {
  try {
    localStorage.setItem(LOCAL_KEYS.REVIEWS, JSON.stringify(reviews));
  } catch (e) {}
}

/**
 * Calcula la calificación del producto leyendo `rating_promedio` de la BD
 * o el promedio matemático de la tabla `resenas` si existen registros.
 * Muestra: ★ [rating] ([stock] disponibles) en lugar de "Nuevo (Sin reseñas)".
 */
function getProductRatingSummary(productId) {
  const all = getLocalReviews().filter(r => String(r.id_producto) === String(productId));
  const count = all.length;
  const prodList = (typeof window !== 'undefined' && Array.isArray(window.PRODUCTS)) ? window.PRODUCTS : [];
  const prod = prodList.find(p => String(p.id) === String(productId));

  let avgNum = prod && prod.rating ? Number(prod.rating) : 4.8;
  if (count > 0) {
    const sum = all.reduce((acc, r) => acc + (Number(r.calificacion) || 0), 0);
    avgNum = sum / count;
  }
  const avg = avgNum.toFixed(1);
  return {
    count,
    average: Number(avg),
    ratingText: avg,
    text: avg,
    fullText: `★ ${avg}`,
    reviews: all
  };
}

/** Consulta la tabla `resenas` en Supabase y sincroniza la caché local. */
async function fetchReviewsFromDatabase(productId) {
  if (window.supabaseClient) {
    try {
      let query = window.supabaseClient
        .from('resenas')
        .select('*')
        .order('fecha_resena', { ascending: false });
      if (productId) {
        query = query.eq('id_producto', productId);
      }
      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        if (productId) {
          const others = getLocalReviews().filter(r => String(r.id_producto) !== String(productId));
          saveLocalReviews([...data, ...others]);
        } else {
          saveLocalReviews(data);
        }
      }
    } catch (err) {
      console.warn('[Supabase] Error al consultar reseñas:', err);
    }
  }
  const all = getLocalReviews();
  return productId
    ? all.filter(r => String(r.id_producto) === String(productId))
    : all;
}

/** Actualiza todos los indicadores de calificación en el DOM. */
async function refreshAllProductRatingsUI(productId) {
  await fetchReviewsFromDatabase(productId);
  document.querySelectorAll('[data-rating-text-for]').forEach(el => {
    const pid = el.getAttribute('data-rating-text-for');
    const summary = getProductRatingSummary(pid);
    el.textContent = summary.text;
  });
}

/**
 * Verifica si el cliente con sesión activa compró este producto
 * consultando `detalle_pedidos` vinculado a `pedidos` en Supabase (o historial local).
 */
async function hasClientPurchasedProduct(productId) {
  const idCliente = await getActiveClientId();
  if (!idCliente || !productId) return false;

  if (window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient
        .from('pedidos')
        .select('*, detalle_pedidos!inner(id_producto)')
        .eq('id_cliente', idCliente)
        .eq('detalle_pedidos.id_producto', productId)
        .limit(1);
      if (!error && Array.isArray(data) && data.length > 0) {
        return true;
      }
    } catch (err) {
      console.warn('[Supabase] Error verificando compra en detalle_pedidos:', err);
    }
  }

  const clientOrders = getLocalOrders().filter(o => o.idCliente === idCliente);
  return clientOrders.some(o =>
    Array.isArray(o.items) && o.items.some(i => i.product && String(i.product.id) === String(productId))
  );
}

/** Guarda una nueva reseña en la tabla `resenas` de Supabase y recalcula el promedio. */
async function submitProductReview({ productId, calificacion, comentario }) {
  const idCliente = await getActiveClientId();
  const user = (typeof getCurrentUser === 'function') ? getCurrentUser() : null;
  if (!idCliente || !user) {
    return { ok: false, error: 'Solo compradores verificados pueden calificar este diseño' };
  }

  const purchased = await hasClientPurchasedProduct(productId);
  if (!purchased) {
    return { ok: false, error: 'Solo compradores verificados pueden calificar este diseño' };
  }

  const ratingNum = Math.min(5, Math.max(1, parseInt(calificacion, 10) || 5));
  const cleanComment = String(comentario || '').trim();
  const commentValue = cleanComment.length > 0 ? cleanComment : null;
  const newReview = {
    id_producto: String(productId),
    id_cliente: idCliente,
    nombre_cliente: user.nombres || user.nombre || user.email || 'Cliente verificado',
    calificacion: ratingNum,
    comentario: commentValue,
    fecha_resena: new Date().toISOString()
  };

  if (window.supabaseClient) {
    try {
      let { data, error } = await window.supabaseClient
        .from('resenas')
        .insert(newReview)
        .select()
        .single();
      if (error) {
        // Fallback por si la columna comentario tiene restricción NOT NULL en BD
        const fallbackReview = {
          id_producto: String(productId),
          id_cliente: idCliente,
          calificacion: ratingNum,
          comentario: commentValue !== null ? commentValue : ''
        };
        const retry = await window.supabaseClient
          .from('resenas')
          .insert(fallbackReview)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }
      if (!error && data) {
        const list = getLocalReviews();
        list.unshift(data);
        saveLocalReviews(list);
        await refreshAllProductRatingsUI(productId);
        return { ok: true, review: data };
      }
    } catch (err) {
      console.warn('[Supabase] Error al insertar reseña en BD:', err);
    }
  }

  const list = getLocalReviews();
  list.unshift(newReview);
  saveLocalReviews(list);
  await refreshAllProductRatingsUI(productId);
  return { ok: true, review: newReview };
}

/**
 * Actualiza el perfil del usuario en Supabase invocando `fn_actualizar_perfil`
 * con los nuevos nombres, apellidos y ciudad, y sincroniza la sesión local.
 */
async function updateUserProfileInSupabase({ id, email, nombres, apellidos, ciudad }) {
  const cleanNombres = String(nombres || '').trim();
  const cleanApellidos = String(apellidos || '').trim();
  const cleanCiudad = String(ciudad || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (window.supabaseClient) {
    const rpcPayloads = [
      { p_id_usuario: id, p_nombres: cleanNombres, p_apellidos: cleanApellidos, p_ciudad: cleanCiudad },
      { p_email: cleanEmail, p_nombres: cleanNombres, p_apellidos: cleanApellidos, p_ciudad: cleanCiudad },
      { nombres: cleanNombres, apellidos: cleanApellidos, ciudad: cleanCiudad, email: cleanEmail }
    ];
    for (const payload of rpcPayloads) {
      try {
        const { error } = await window.supabaseClient.rpc('fn_actualizar_perfil', payload);
        if (!error) break;
      } catch (e) {}
    }

    for (const table of ['usuarios', 'clientes']) {
      try {
        await window.supabaseClient
          .from(table)
          .update({
            nombres: cleanNombres,
            apellidos: cleanApellidos,
            nombre: [cleanNombres, cleanApellidos].filter(Boolean).join(' ').trim(),
            ciudad: cleanCiudad
          })
          .ilike('email', cleanEmail);
      } catch (e) {}
    }
  }

  const localUsers = getLocalRegisteredUsers();
  const idx = localUsers.findIndex(u => String(u.email || '').toLowerCase() === cleanEmail);
  if (idx >= 0) {
    localUsers[idx].nombres = cleanNombres;
    localUsers[idx].apellidos = cleanApellidos;
    localUsers[idx].nombre = [cleanNombres, cleanApellidos].filter(Boolean).join(' ').trim();
    localUsers[idx].ciudad = cleanCiudad;
    saveLocalRegisteredUsers(localUsers);
  }

  return {
    ok: true,
    user: {
      id: id || cleanEmail,
      nombres: cleanNombres,
      apellidos: cleanApellidos,
      nombre: [cleanNombres, cleanApellidos].filter(Boolean).join(' ').trim(),
      ciudad: cleanCiudad,
      email: cleanEmail
    }
  };
}

