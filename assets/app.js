/* ==================== URBAN-STORE · APLICACIÓN ====================
   Tienda de una sola página con rutas reales (/producto/ID, /carrito, ...).
   Los datos vienen de /api/productos (Google Sheets). No hay cuentas de clientes:
   el carrito, los favoritos y (si el cliente lo pide) sus datos de envío se
   guardan en este navegador.
*/
'use strict';

(() => {
    /* ==================== CONFIG ==================== */
    const API_URL = '/api/productos';
    const STORE = 'URBAN-STORE';
    const PAGE_SIZE = 24;
    const NAV_CATEGORIAS = 7;        // categorías visibles en el menú de escritorio (el resto, en "Ver todo")
    const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const AVAILABILITY_RANK = { disponible: 0, reservado: 1, vendido: 2 };
    const PAGOS_WHATSAPP = ['Efectivo', 'Transferencia Bancaria'];
    const REGIONES = [
        'Arica y Parinacota', 'Tarapacá', 'Antofagasta', 'Atacama', 'Coquimbo', 'Valparaíso',
        'Metropolitana de Santiago', "Libertador Gral. Bernardo O'Higgins", 'Maule', 'Ñuble', 'Biobío',
        'La Araucanía', 'Los Ríos', 'Los Lagos', 'Aysén', 'Magallanes'
    ];
    const KEYS = {
        cart: 'us_carrito', favs: 'us_favoritos', client: 'us_cliente', lastOrder: 'us_ultimo_pedido',
        legacyCart: 'revibe_cart', legacyClient: 'revibe_cliente'
    };
    const PLACEHOLDER = 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#f4f4f2"/>' +
        '<path d="M120 170h60l-6 70h-48z" fill="none" stroke="#c9c9c4" stroke-width="3"/></svg>');

    const ICON = {
        heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
        plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
        close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
        trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
        filter: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
        truck: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
        lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
        chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z"/></svg>',
        box: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>',
        check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
        clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
        alert: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5M12 16.5v.5"/><circle cx="12" cy="12" r="9"/></svg>',
        swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>'
    };

    // Íconos de categoría. La hoja "categorias" puede elegir uno con la columna "icono";
    // si no, se deduce del nombre de la categoría (CAT_KEYWORDS, en orden).
    const CAT_ICONS = {
        polera: 'M8 4 3.5 6.5l1.8 3.8 2.2-.8V20h9V9.5l2.2.8 1.8-3.8L16 4c-.6 1.4-2.2 2.3-4 2.3S8.6 5.4 8 4z',
        camisa: 'M8.5 4 3.5 6.5l1.8 3.8 2.2-.8V20h9V9.5l2.2.8 1.8-3.8-5-2.5M8.5 4l1.5 4.2 2-1.4 2 1.4L15.5 4M12 10.5v.01M12 13.5v.01M12 16.5v.01',
        vestido: 'M9.5 3 9 7.5 5.5 20c4.3.8 8.7.8 13 0L15 7.5 14.5 3M9.5 3c.7 1.1 1.5 1.6 2.5 1.6s1.8-.5 2.5-1.6M9 7.5h6',
        infantil: 'M9 3.5c.6 1.3 1.7 2 3 2s2.4-.7 3-2l4 2-1.5 3.5L16 8.5V15c0 1-.5 1.7-1.3 2.2L13 18.5V20h-2v-1.5l-1.7-1.3C8.5 16.7 8 16 8 15V8.5l-1.5.5L5 5.5z',
        poleron: 'M9 4 5 5.5 3 16l2.5.6L7 10v10h10V10l1.5 6.6L21 16 19 5.5 15 4c-.6 1.2-1.7 1.8-3 1.8S9.6 5.2 9 4zM9 4c0-1.2 1.3-2 3-2s3 .8 3 2M10.8 5.6v2.6M13.2 5.6v2.6M7 18h10',
        chaqueta: 'M9 3.5 5 5 3 16l2.5.6L7 10v10.5h10V10l1.5 6.6L21 16 19 5l-4-1.5M9 3.5 12 8l3-4.5M12 8v12.5M8.8 14.5h1.8M13.4 14.5h1.8',
        pantalon: 'M6.5 3h11l1.5 17.5h-5L12 9.5 10 20.5H5zM6.3 6h11.4M12 6v3.5',
        zapatilla: 'M3 16V8.5a1 1 0 0 1 1-1h3c.4 1.4 1.7 2.5 3.4 2.5H11l6.7 2.8c1.9.8 3.3 1.9 3.3 3.2zM3 16v1.5A1.5 1.5 0 0 0 4.5 19h15a1.5 1.5 0 0 0 1.5-1.5V16M12.6 10.7l-.9 1.8M15.2 11.8l-.9 1.8',
        bolso: 'M5 9.5h14a1 1 0 0 1 1 1V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19v-8.5a1 1 0 0 1 1-1zM8.5 9.5V8a3.5 3.5 0 0 1 7 0v1.5M4 13.5h16M11 13.5V15h2v-1.5',
        mochila: 'M7 9a5 5 0 0 1 10 0v10.5a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1zM10.5 4.2V3a1.5 1.5 0 0 1 3 0v1.2M9.5 14h5a1 1 0 0 1 1 1v3h-7v-3a1 1 0 0 1 1-1z',
        lentes: 'M2 9.5h20M3.5 9.5V12a3.25 3.25 0 0 0 6.5 0V9.5M14 9.5V12a3.25 3.25 0 0 0 6.5 0V9.5',
        reloj: 'M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0zM9 8l.6-5h4.8L15 8M9 16l.6 5h4.8l.6-5M12 10v2l1.4 1.2',
        joya: 'M6.5 9.5 9.5 5h5l3 4.5L12 20zM6.5 9.5h11M10 9.5l2 10.5 2-10.5M9.5 5l.5 4.5M14.5 5l-.5 4.5',
        perfume: 'M9 8.5h6a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-8.5a2 2 0 0 1 2-2zM10.5 8.5v-2h3v2M9.5 3.5h5v3h-5z',
        celular: 'M9 2.5h6a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2zM11 18.5h2',
        audifonos: 'M4 16v-4a8 8 0 0 1 16 0v4M4 15.5a2 2 0 0 1 2-2h1V20H6a2 2 0 0 1-2-2zM20 15.5a2 2 0 0 0-2-2h-1V20h1a2 2 0 0 0 2-2z',
        computador: 'M6 5h12a1 1 0 0 1 1 1v9H5V6a1 1 0 0 1 1-1zM2.5 15h19l-1.2 3H3.7z',
        hogar: 'M4 10.5 12 4l8 6.5M6 9v11h12V9M10 20v-5.5h4V20',
        belleza: 'M8.5 13h7v8h-7zM9.5 13v-2.5h5V13M10.5 10.5V6.2L13.5 4v6.5',
        deportes: 'M5 8.5h3v7H5zM16 8.5h3v7h-3zM3 10.5h2v3H3zM19 10.5h2v3h-2zM8 12h8',
        juguete: 'M18 13a6 6 0 1 1-12 0 6 6 0 0 1 12 0zM6.6 10.5A2.2 2.2 0 1 1 9.5 7.6M14.5 7.6a2.2 2.2 0 1 1 2.9 2.9M9.8 11.7v.01M14.2 11.7v.01M14.1 15.4c0 1-1 1.8-2.1 1.8s-2.1-.8-2.1-1.8 1-1.7 2.1-1.7 2.1.7 2.1 1.7zM12 14.6v.01',
        mascota: 'M12 12.5c-2.4 0-4.5 2.6-4.5 4.8 0 1.4 1 2.2 2.3 2.2 1 0 1.5-.5 2.2-.5s1.2.5 2.2.5c1.3 0 2.3-.8 2.3-2.2 0-2.2-2.1-4.8-4.5-4.8zM8.1 10.2a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0zM11.2 6.8a1.7 1.7 0 1 1-3.4 0 1.7 1.7 0 0 1 3.4 0zM16.2 6.8a1.7 1.7 0 1 1-3.4 0 1.7 1.7 0 0 1 3.4 0zM19.1 10.2a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0z',
        libro: 'M12 6.5C10.3 5.2 7.8 4.5 4 4.5V18c3.8 0 6.3.7 8 2 1.7-1.3 4.2-2 8-2V4.5c-3.8 0-6.3.7-8 2zM12 6.5V20',
        otros: 'M4.5 4.5H10V10H4.5zM14 4.5h5.5V10H14zM4.5 14H10v5.5H4.5zM14 14h5.5v5.5H14z',
        etiqueta: 'M4 4h7.2l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-5.1 5.1a1.5 1.5 0 0 1-2.1 0L4 11.2zM9.2 8a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0z'
    };
    const CAT_KEYWORDS = [
        ['zapatilla', /zapat|calzado|\bbotas?\b|botin|sandalia/],
        ['poleron', /poleron|hoodie|sweater|sueter|chaleco/],
        ['polera', /polera|camiseta|remera|t-?shirt/],
        ['chaqueta', /chaqueta|abrigo|parka|casaca|cortaviento|blazer/],
        ['pantalon', /pantalon|jeans?|shorts?|calza|bermuda/],
        ['vestido', /vestido|falda/],
        ['camisa', /camisa|blusa/],
        ['bolso', /bolso|cartera|billetera|bandolera|maleta/],
        ['mochila', /mochila/],
        ['lentes', /\blentes?\b|gafas?|anteojo/],
        ['reloj', /reloj/],
        ['joya', /joya|anillo|collar|\baros?\b|pulsera|bisuteria/],
        ['perfume', /perfum|fragancia|colonia/],
        ['celular', /celular|telefon|smartphone|movil/],
        ['audifonos', /audio|audifono|parlante|musica/],
        ['computador', /computa|notebook|laptop|gamer|videojuego|consola|tecnolog|electronica/],
        ['infantil', /infantil|\bninos?\b|\bninas?\b|\bbebes?\b|kids|guagua|junior/],
        ['vestido', /mujer|dama|femenin/],
        ['camisa', /hombre|caballero|masculin/],
        ['polera', /\bropa\b|vestuario|\bmoda\b/],
        ['lentes', /accesorio/],
        ['hogar', /hogar|\bcasa\b|deco|mueble|cocina|\bbanos?\b|jardin/],
        ['belleza', /belleza|maquilla|cosmetic|cuidado/],
        ['deportes', /deporte|fitness|\bgym\b|outdoor|entrena/],
        ['juguete', /juguete|juego/],
        ['mascota', /mascota|perro|gato/],
        ['libro', /libro|libreria|papeleria|oficina/],
        ['otros', /\botros?\b|varios/]
    ];
    function categoryIcon(c) {
        const buscar = texto => (CAT_KEYWORDS.find(([, re]) => re.test(texto)) || [])[0];
        const icono = c.icono || '';
        const nombre = Object.hasOwn(CAT_ICONS, icono) ? icono : buscar(icono) || buscar(c.slug) || 'etiqueta';
        return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${CAT_ICONS[nombre]}"/></svg>`;
    }

    const state = {
        tienda: { nombre: STORE, whatsapp: '', pagoOnline: false, newsletter: false },
        productos: [],
        categorias: [],
        status: 'loading',           // loading | ready | error
        error: '',
        cart: [],
        favs: [],
        ui: { filtersOpen: false, visible: PAGE_SIZE, listKey: '' }
    };
    let pdp = null;                  // estado de la página de producto abierta
    let heroTimer = null;
    let stickyObserver = null;

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const app = $('#app');

    /* ==================== ALMACENAMIENTO ==================== */
    function load(key, fallback) {
        try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
    }
    function save(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* modo privado: sigue funcionando sin guardar */ }
    }

    function initStorage() {
        state.cart = [].concat(load(KEYS.cart, []))
            .filter(i => i && typeof i.id === 'string' && Number(i.cantidad) >= 1)
            .map(i => {
                const talla = String(i.talla || ''), color = String(i.color || '');
                return { key: lineKey(i.id, talla, color), id: i.id, talla, color, cantidad: Math.floor(i.cantidad) };
            });
        state.favs = [].concat(load(KEYS.favs, [])).filter(id => typeof id === 'string');

        // Carrito y datos de la versión anterior de la tienda
        const legacy = load(KEYS.legacyCart, null);
        if (Array.isArray(legacy) && state.cart.length === 0) {
            state.cart = legacy.filter(id => typeof id === 'string').map(id => ({ key: lineKey(id, '', ''), id, talla: '', color: '', cantidad: 1 }));
            save(KEYS.cart, state.cart);
        }
        if (legacy) try { localStorage.removeItem(KEYS.legacyCart); } catch { /* sin almacenamiento */ }

        const legacyClient = load(KEYS.legacyClient, null);
        if (legacyClient && !load(KEYS.client, null)) {
            save(KEYS.client, { nombre: legacyClient.nombre || '', telefono: legacyClient.telefono || '', pagoWhatsapp: legacyClient.pago || '' });
        }
    }

    /* ==================== DATOS ==================== */
    async function loadCatalog() {
        state.status = 'loading';
        try {
            const res = await fetch(API_URL);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
            state.tienda = { ...state.tienda, ...data.tienda };
            state.productos = data.productos || [];
            state.categorias = data.categorias || [];
            state.status = 'ready';
            reconcileCart();
            renderChrome();
        } catch (err) {
            console.error(err);
            state.status = 'error';
            state.error = err.message;
        }
    }

    const findProduct = id => state.productos.find(p => p.id === id);
    const isAvailable = p => p && p.disponibilidad === 'disponible' && p.stock > 0;
    const discountPct = p => p.precioAnterior ? Math.round((1 - p.precio / p.precioAnterior) * 100) : 0;
    const productUrl = p => `/producto/${encodeURIComponent(p.id)}`;

    function novedades() {
        const marcados = state.productos.filter(p => p.nuevo);
        if (marcados.length) return marcados;
        return [...state.productos].sort((a, b) => b.orden - a.orden).slice(0, 12);
    }
    function byRelevance(list) {
        const rank = p => AVAILABILITY_RANK[p.disponibilidad] ?? 0;
        return [...list].sort((a, b) => rank(a) - rank(b) || Number(b.destacado) - Number(a.destacado) || a.orden - b.orden);
    }

    /* ==================== UTILIDADES ==================== */
    function esc(text) {
        return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function money(n) { return '$' + Math.round(Number(n) || 0).toLocaleString('es-CL'); }
    function normalize(text) {
        return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9\s]/g, '');
    }
    function compareSizes(a, b) {
        const ia = SIZE_ORDER.indexOf(a), ib = SIZE_ORDER.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1 || ib !== -1) return ia === -1 ? 1 : -1;
        const na = parseFloat(a), nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return a.localeCompare(b, 'es');
    }
    function plural(n, uno, varios) { return `${n} ${n === 1 ? uno : varios}`; }

    // Pide a Google Drive / Unsplash la imagen al tamaño justo
    function imgUrl(src, w) {
        if (!src) return PLACEHOLDER;
        if (src.includes('lh3.googleusercontent.com/d/')) return src.replace(/=[\w-]+$/, '') + `=w${w}`;
        if (src.includes('images.unsplash.com')) {
            try {
                const u = new URL(src);
                u.searchParams.set('w', w);
                u.searchParams.delete('h');
                u.searchParams.set('q', '80');
                u.searchParams.set('auto', 'format');
                return u.toString();
            } catch { return src; }
        }
        return src;
    }
    function imgTag(src, { w = 600, sizes = '50vw', cls = '', alt = '', eager = false, lazy = !eager } = {}) {
        const set = [400, 700, 1000, 1400].filter(x => x <= w * 2).map(x => `${esc(imgUrl(src, x))} ${x}w`).join(', ');
        return `<img src="${esc(imgUrl(src, w))}" ${src ? `srcset="${set}" sizes="${sizes}"` : ''} alt="${esc(alt)}" class="${cls}" ${eager ? 'fetchpriority="high"' : lazy ? 'loading="lazy"' : ''} decoding="async">`;
    }

    let toastTimer;
    function toast(html, ms = 3200) {
        const t = $('#toast');
        t.innerHTML = html;
        t.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => t.classList.remove('show'), ms);
    }

    function whatsappUrl(text = '') {
        const num = (state.tienda.whatsapp || '').replace(/[^0-9]/g, '');
        return num ? `https://wa.me/${num}${text ? `?text=${encodeURIComponent(text)}` : ''}` : '';
    }

    /* ==================== CARRITO ==================== */
    const lineKey = (id, talla, color) => `${id}|${talla}|${color}`;

    function inCartQty(id, exceptKey = '') {
        return state.cart.filter(i => i.id === id && i.key !== exceptKey).reduce((s, i) => s + i.cantidad, 0);
    }

    function addToCart(p, talla, color, cantidad) {
        const key = lineKey(p.id, talla, color);
        const libre = p.stock - inCartQty(p.id);
        if (libre <= 0) {
            toast(p.stock === 1 ? 'Esta pieza ya está en tu carrito. <a href="/carrito">Ver carrito</a>' : 'Ya tienes todo el stock disponible en tu carrito.');
            return false;
        }
        const qty = Math.min(cantidad, libre);
        const linea = state.cart.find(i => i.key === key);
        if (linea) linea.cantidad += qty;
        else state.cart.push({ key, id: p.id, talla, color, cantidad: qty });
        saveCart();
        bump('#cartBadge');
        toast(`${esc(p.nombre)} añadido al carrito <a href="/carrito">Ver carrito</a>`);
        return true;
    }

    function saveCart() {
        save(KEYS.cart, state.cart);
        updateBadges();
    }

    function cartLines() {
        return state.cart.map(i => ({ ...i, p: findProduct(i.id) })).filter(l => l.p);
    }

    function cartTotals() {
        const lines = cartLines();
        const lista = lines.reduce((s, l) => s + (l.p.precioAnterior || l.p.precio) * l.cantidad, 0);
        const total = lines.reduce((s, l) => s + l.p.precio * l.cantidad, 0);
        return { lines, lista, descuento: lista - total, total, unidades: lines.reduce((s, l) => s + l.cantidad, 0) };
    }

    // Ajusta el carrito guardado al inventario actual (vendidos, stock, variantes)
    function reconcileCart() {
        if (state.status !== 'ready') return; // sin catálogo no se toca el carrito guardado
        const avisos = [];
        const usados = new Map();
        state.cart = state.cart.filter(item => {
            const p = findProduct(item.id);
            if (!isAvailable(p)) { avisos.push(p ? `${p.nombre} ya no está disponible` : 'Un producto ya no está disponible'); return false; }
            if (p.tallas.length > 1 && item.talla && !p.tallas.includes(item.talla)) item.talla = '';
            if (p.colores.length > 1 && item.color && !p.colores.includes(item.color)) item.color = '';
            const usado = usados.get(p.id) || 0;
            const max = p.stock - usado;
            if (max <= 0) { avisos.push(`Sin más stock de ${p.nombre}`); return false; }
            if (item.cantidad > max) { item.cantidad = max; avisos.push(`Ajustamos la cantidad de ${p.nombre} al stock disponible`); }
            usados.set(p.id, usado + item.cantidad);
            item.key = lineKey(item.id, item.talla, item.color);
            return true;
        });
        saveCart();
        if (avisos.length) toast(esc(avisos[0]) + (avisos.length > 1 ? ` (y ${avisos.length - 1} cambio(s) más)` : ''), 5000);
    }

    /* ==================== FAVORITOS ==================== */
    function toggleFav(id) {
        const on = !state.favs.includes(id);
        state.favs = on ? [...state.favs, id] : state.favs.filter(f => f !== id);
        save(KEYS.favs, state.favs);
        $$(`[data-action="toggle-fav"][data-id="${CSS.escape(id)}"]`).forEach(b => {
            b.classList.toggle('on', on);
            b.setAttribute('aria-pressed', on);
            b.setAttribute('aria-label', on ? 'Quitar de favoritos' : 'Añadir a favoritos');
        });
        updateBadges();
        if (on) { bump('#favBadge'); toast('Guardado en favoritos <a href="/favoritos">Ver favoritos</a>'); }
        if (location.pathname === '/favoritos') render();
    }

    function updateBadges() {
        const units = state.cart.reduce((s, i) => s + i.cantidad, 0);
        const cb = $('#cartBadge');
        cb.textContent = units; cb.hidden = units === 0;
        const favs = state.favs.filter(id => !state.productos.length || findProduct(id)).length;
        const fb = $('#favBadge');
        fb.textContent = favs; fb.hidden = favs === 0;
    }
    function bump(sel) {
        const el = $(sel);
        el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
    }

    /* ==================== COMPONENTES ==================== */
    function priceHtml(p, cls = '') {
        const pct = discountPct(p);
        return `<div class="price ${cls}">
            <span class="now ${p.precioAnterior ? 'sale' : ''}">${money(p.precio)}</span>
            ${p.precioAnterior ? `<s>${money(p.precioAnterior)}</s><span class="pct">-${pct}%</span>` : ''}
        </div>`;
    }

    function badgesHtml(p) {
        const tags = [];
        if (p.disponibilidad === 'vendido') tags.push('<span class="tag tag-dark">Agotado</span>');
        else if (p.disponibilidad === 'reservado') tags.push('<span class="tag tag-dark">Reservado</span>');
        else {
            if (p.precioAnterior) tags.push(`<span class="tag tag-sale">-${discountPct(p)}%</span>`);
            if (p.nuevo) tags.push('<span class="tag">Nuevo</span>');
            if (p.masVendido) tags.push('<span class="tag">Más vendido</span>');
        }
        return tags.length ? `<div class="card-badges">${tags.join('')}</div>` : '';
    }

    function favButton(p, cls = 'card-fav') {
        const on = state.favs.includes(p.id);
        return `<button class="${cls} ${on ? 'on' : ''}" data-action="toggle-fav" data-id="${esc(p.id)}" aria-pressed="${on}" aria-label="${on ? 'Quitar de favoritos' : 'Añadir a favoritos'}">${ICON.heart}</button>`;
    }

    function card(p, { eager = false } = {}) {
        const [main, alt] = p.imagenes;
        const quick = isAvailable(p) && p.tallas.length <= 1 && p.colores.length <= 1;
        const variantes = [p.tallas.length > 1 && plural(p.tallas.length, 'talla', 'tallas'), p.colores.length > 1 && plural(p.colores.length, 'color', 'colores')].filter(Boolean);
        return `
        <article class="card ${isAvailable(p) ? '' : 'unavailable'}">
            <div class="card-visual">
                <a class="card-media" href="${productUrl(p)}" aria-label="${esc(p.nombre)}">
                    ${imgTag(main, { w: 500, sizes: '(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw', cls: `main ${alt ? 'has-alt' : ''}`, alt: p.nombre, eager })}
                    ${alt ? imgTag(alt, { w: 500, sizes: '25vw', cls: 'alt', alt: '' }) : ''}
                </a>
                ${badgesHtml(p)}
                ${favButton(p)}
                ${quick ? `<button class="card-quick" data-action="quick-add" data-id="${esc(p.id)}" aria-label="Añadir ${esc(p.nombre)} al carrito">${ICON.plus}</button>` : ''}
            </div>
            <div class="card-info">
                ${p.marca ? `<span class="card-brand">${esc(p.marca)}</span>` : ''}
                <a class="card-name" href="${productUrl(p)}">${esc(p.nombre)}</a>
                ${priceHtml(p)}
                ${variantes.length ? `<span class="card-swatches">${variantes.join(' · ')}</span>` : ''}
            </div>
        </article>`;
    }

    function skeletonCards(n) {
        return Array.from({ length: n }, () => `<div class="card" aria-hidden="true"><div class="card-media skeleton"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line short"></div></div>`).join('');
    }

    function rail(title, items, link) {
        if (!items.length) return '';
        return `
        <section class="section container fade-in">
            <div class="section-head">
                <h2 class="section-title">${title}</h2>
                ${link ? `<a class="section-link" href="${link}">Ver todo</a>` : ''}
            </div>
            <div class="product-rail">${items.slice(0, 12).map(p => card(p)).join('')}</div>
        </section>`;
    }

    function emptyBlock(title, text, actions = '') {
        return `<div class="empty fade-in"><h2>${title}</h2><p>${text}</p>${actions}</div>`;
    }

    function errorView() {
        return {
            title: 'No pudimos cargar la tienda',
            html: emptyBlock('No pudimos cargar la tienda', 'Revisa tu conexión e inténtalo otra vez.',
                '<button class="btn" data-action="retry">Reintentar</button>'),
            noindex: true
        };
    }

    /* ==================== CABECERA, MENÚ Y PIE ==================== */
    function renderChrome() {
        const cats = state.categorias;
        $('#mainNav').innerHTML = `
            <li><a href="/novedades">Novedades</a></li>
            ${cats.slice(0, NAV_CATEGORIAS).map(c => `<li><a href="/categoria/${esc(c.slug)}">${esc(c.nombre)}</a></li>`).join('')}
            ${cats.length > NAV_CATEGORIAS ? '<li><a href="/tienda">Ver todo</a></li>' : ''}`;
        $('#drawerCategories').innerHTML = cats.map(c =>
            `<a href="/categoria/${esc(c.slug)}">${esc(c.nombre)} <small>${c.cantidad}</small></a>`).join('');
        $('#footerCategories').innerHTML = `
            <li><a href="/novedades">Novedades</a></li>
            ${cats.slice(0, 8).map(c => `<li><a href="/categoria/${esc(c.slug)}">${esc(c.nombre)}</a></li>`).join('')}`;

        const wa = whatsappUrl(`Hola ${STORE}, tengo una consulta.`);
        const footerWa = $('#footerWhatsapp');
        if (wa) footerWa.href = wa; else footerWa.hidden = true;
        $('#footerPay').textContent = state.tienda.pagoOnline ? 'Pago seguro con Mercado Pago' : 'Paga en efectivo, transferencia o tarjeta';

        startPromoBar();
        updateBadges();
        markActiveNav();
    }

    let promoTimer;
    function startPromoBar() {
        const mensajes = ['Envíos dentro de Curicó'];
        if (state.tienda.pagoOnline) mensajes.push('Pago seguro con Mercado Pago');
        mensajes.push('Atención personalizada por WhatsApp');
        const el = $('#promoText');
        let i = 0;
        el.innerHTML = mensajes[0];
        clearInterval(promoTimer);
        if (mensajes.length < 2) return;
        promoTimer = setInterval(() => {
            el.classList.add('fade');
            setTimeout(() => { i = (i + 1) % mensajes.length; el.innerHTML = mensajes[i]; el.classList.remove('fade'); }, 400);
        }, 4500);
    }

    function markActiveNav() {
        $$('#mainNav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === location.pathname));
    }

    /* ==================== VISTA: PORTADA ==================== */
    function viewHome() {
        const P = state.productos;
        const conImagen = P.filter(p => p.imagenes.length && isAvailable(p));
        const destacados = byRelevance(P.filter(p => p.destacado && isAvailable(p)));
        const slides = (destacados.filter(p => p.imagenes.length).length ? destacados.filter(p => p.imagenes.length) : conImagen).slice(0, 4);
        const masVendidos = byRelevance(P.filter(p => p.masVendido));
        const nuevos = byRelevance(novedades());
        const marcas = [...new Set(P.map(p => p.marca).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));

        const hero = slides.length ? `
            <section class="hero" aria-label="Destacados">
                <div class="hero-slides" id="heroSlides">
                    ${slides.map((p, i) => `
                        <a class="hero-slide" href="${productUrl(p)}">
                            ${imgTag(p.imagenes[0], { w: 1400, sizes: '100vw', alt: p.nombre, eager: i === 0 })}
                            <div class="hero-copy">
                                <p class="hero-kicker">${esc(p.categoria)}${p.marca ? ` · ${esc(p.marca)}` : ''}</p>
                                <h2 class="hero-title">${esc(p.nombre)}</h2>
                                <p class="hero-price">${p.precioAnterior ? `<s>${money(p.precioAnterior)}</s> ` : ''}${money(p.precio)}</p>
                                <span class="btn btn-light">Comprar ahora</span>
                            </div>
                        </a>`).join('')}
                </div>
                ${slides.length > 1 ? `<div class="hero-dots">${slides.map((_, i) => `<button class="hero-dot ${i ? '' : 'active'}" data-action="hero-go" data-index="${i}" aria-label="Ver destacado ${i + 1}"></button>`).join('')}</div>` : ''}
            </section>` : `
            <section class="hero hero-empty">
                <div>
                    <h1 class="hero-title">${STORE}</h1>
                    <p>Muy pronto publicaremos nuestros productos.</p>
                </div>
            </section>`;

        const nCat = state.categorias.length;
        // Columnas que reparten las categorías en filas parejas (como máximo `max` por fila)
        const columnas = max => Math.ceil(nCat / Math.ceil(nCat / max));
        const categorias = nCat ? `
            <section class="section container fade-in">
                <div class="section-head"><h2 class="section-title">Categorías</h2><a class="section-link" href="/tienda">Ver todo</a></div>
                <div class="cat-grid tcols-${columnas(5)} cols-${columnas(6)}">
                    ${state.categorias.map(c => `
                        <a class="cat-card" href="/categoria/${esc(c.slug)}">
                            ${categoryIcon(c)}
                            <span>${esc(c.nombre)}</span>
                        </a>`).join('')}
                </div>
            </section>` : '';

        const beneficios = [
            [ICON.truck, 'Envíos dentro de Curicó', 'Coordinamos la entrega contigo después de tu compra.'],
            state.tienda.pagoOnline
                ? [ICON.lock, 'Pago seguro', 'Paga con tarjeta de crédito o débito mediante Mercado Pago.']
                : [ICON.lock, 'Paga como prefieras', 'Efectivo, transferencia o tarjeta, a tu elección.'],
            [ICON.chat, 'Atención por WhatsApp', 'Resolvemos tus dudas antes y después de comprar.'],
            [ICON.box, 'Stock al día', 'La disponibilidad que ves sale directamente de nuestro inventario.']
        ];

        return {
            title: `${STORE} | Tienda online`,
            description: `Compra online en ${STORE}: ${state.categorias.slice(0, 5).map(c => c.nombre).join(', ') || 'moda, tecnología, hogar y más'}. Envíos dentro de Curicó.`,
            html: `
                <h1 class="visually-hidden">${STORE} · Tienda online</h1>
                ${hero}
                ${marcas.length > 1 ? `<nav class="brands" aria-label="Marcas">${marcas.map(m => `<a href="/tienda?marca=${encodeURIComponent(m)}">${esc(m)}</a>`).join('')}</nav>` : ''}
                ${categorias}
                ${rail('Destacados', destacados, '/tienda')}
                ${rail('Novedades', nuevos, '/novedades')}
                ${rail('Más vendidos', masVendidos, '/tienda?orden=mas-vendidos')}
                ${P.length === 0 ? emptyBlock('Muy pronto', 'Estamos preparando nuestros productos. Vuelve pronto.') : ''}
                <section class="benefits" aria-label="Beneficios">
                    ${beneficios.map(([icon, t, d]) => `<div class="benefit">${icon}<div><h3>${t}</h3><p>${d}</p></div></div>`).join('')}
                </section>
                ${newsletterHtml()}`,
            after: initHero
        };
    }

    function initHero() {
        const track = $('#heroSlides');
        if (!track || track.children.length < 2) return;
        const dots = $$('.hero-dot');
        const go = i => track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
        track._go = go;
        track.dataset.w = track.clientWidth;
        track.addEventListener('scroll', () => {
            const i = Math.round(track.scrollLeft / track.clientWidth);
            dots.forEach((d, j) => d.classList.toggle('active', i === j));
        }, { passive: true });
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const next = () => go((Math.round(track.scrollLeft / track.clientWidth) + 1) % track.children.length);
        heroTimer = setInterval(next, 6000);
        const stop = () => { clearInterval(heroTimer); heroTimer = null; };
        track.addEventListener('pointerdown', stop, { once: true });
        track.addEventListener('touchstart', stop, { once: true, passive: true });
    }

    function newsletterHtml() {
        if (!state.tienda.newsletter) return '';
        return `
        <section class="newsletter" aria-labelledby="nlTitle">
            <h2 id="nlTitle">Suscríbete a las novedades</h2>
            <p>Recibe primero los nuevos productos y ofertas. Puedes pedir la baja cuando quieras.</p>
            <form class="newsletter-form" data-form="newsletter" novalidate>
                <label class="visually-hidden" for="nlEmail">Correo electrónico</label>
                <input class="input" id="nlEmail" type="email" name="email" placeholder="Tu correo electrónico" autocomplete="email" required>
                <input class="hp-field" type="text" name="empresa" tabindex="-1" autocomplete="off" aria-hidden="true">
                <button class="btn" type="submit">Suscribirme</button>
            </form>
            <p class="newsletter-msg" role="status" aria-live="polite"></p>
        </section>`;
    }

    /* ==================== VISTA: LISTADO ==================== */
    const SORTS = [
        ['relevancia', 'Recomendados'], ['novedades', 'Novedades'], ['precio-asc', 'Precio: menor a mayor'],
        ['precio-desc', 'Precio: mayor a menor'], ['descuento', 'Mayor descuento'], ['mas-vendidos', 'Más vendidos']
    ];
    const FILTER_KEYS = ['talla', 'color', 'marca', 'estado', 'disponible'];

    function viewListing(opts) {
        const params = new URLSearchParams(location.search);
        let base = state.productos;
        let title = 'Todos los productos';
        let description = `Catálogo completo de ${STORE}.`;
        let categoria = null;

        if (opts.categoria) {
            categoria = state.categorias.find(c => c.slug === opts.categoria);
            if (!categoria) return viewNotFound();
            base = base.filter(p => p.categoriaSlug === opts.categoria);
            title = categoria.nombre;
            description = categoria.descripcion || `Compra ${categoria.nombre} en ${STORE}. ${plural(categoria.cantidad, 'producto', 'productos')} disponibles.`;
        }
        if (opts.ofertas) { base = base.filter(p => p.precioAnterior); title = 'Ofertas'; description = `Ofertas y descuentos en ${STORE}.`; }
        if (opts.novedades) { base = novedades(); title = 'Novedades'; description = `Lo último en ${STORE}.`; }
        const q = (params.get('q') || '').trim();
        if (opts.buscar) {
            base = searchProducts(q);
            title = q ? `Resultados para “${q}”` : 'Buscar';
        }

        // Facetas a partir de la lista base
        const facet = fn => [...new Set(base.flatMap(fn).filter(Boolean))];
        const facets = {
            talla: facet(p => p.tallas).sort(compareSizes),
            color: facet(p => p.colores).sort((a, b) => a.localeCompare(b, 'es')),
            marca: facet(p => [p.marca]).sort((a, b) => a.localeCompare(b, 'es')),
            estado: facet(p => [p.estado])
        };
        const f = Object.fromEntries(FILTER_KEYS.map(k => [k, params.get(k) || '']));
        const orden = params.get('orden') || (opts.novedades ? 'novedades' : 'relevancia');

        let list = base.filter(p =>
            (!f.talla || p.tallas.includes(f.talla)) &&
            (!f.color || p.colores.includes(f.color)) &&
            (!f.marca || p.marca === f.marca) &&
            (!f.estado || p.estado === f.estado) &&
            (!f.disponible || isAvailable(p)));

        const rank = p => AVAILABILITY_RANK[p.disponibilidad] ?? 0;
        const sorters = {
            relevancia: (a, b) => Number(b.destacado) - Number(a.destacado) || a.orden - b.orden,
            novedades: (a, b) => Number(b.nuevo) - Number(a.nuevo) || b.orden - a.orden,
            'precio-asc': (a, b) => a.precio - b.precio,
            'precio-desc': (a, b) => b.precio - a.precio,
            descuento: (a, b) => discountPct(b) - discountPct(a),
            'mas-vendidos': (a, b) => Number(b.masVendido) - Number(a.masVendido) || Number(b.destacado) - Number(a.destacado)
        };
        list = [...list].sort((a, b) => rank(a) - rank(b) || (sorters[orden] || sorters.relevancia)(a, b));

        const listKey = location.pathname + location.search;
        if (state.ui.listKey !== listKey.replace(/[?&]?$/, '')) {
            state.ui.listKey = listKey.replace(/[?&]?$/, '');
            state.ui.visible = PAGE_SIZE;
        }
        const visibles = list.slice(0, state.ui.visible);
        const activos = FILTER_KEYS.filter(k => f[k]).length;

        const catChips = (opts.categoria || opts.ofertas || opts.novedades || !opts.buscar) && state.categorias.length ? `
            <div class="cat-chips" role="navigation" aria-label="Categorías">
                <a class="chip ${!opts.categoria && !opts.ofertas && !opts.novedades ? 'active' : ''}" href="/tienda">Todo</a>
                ${state.categorias.map(c => `<a class="chip ${c.slug === opts.categoria ? 'active' : ''}" href="/categoria/${esc(c.slug)}">${esc(c.nombre)}</a>`).join('')}
            </div>` : '';

        const controls = filterControls(facets, f, orden);
        const grid = list.length
            ? `<div class="product-grid">${visibles.map((p, i) => card(p, { eager: i < 4 })).join('')}</div>
               ${list.length > visibles.length ? `<div class="empty"><p>Viendo ${visibles.length} de ${list.length}</p><button class="btn btn-outline" data-action="load-more">Cargar más</button></div>` : ''}`
            : opts.buscar && !q
                ? emptyBlock('¿Qué estás buscando?', 'Escribe el nombre de un producto, una marca o una categoría.', '<button class="btn" data-action="open-search">Buscar</button>')
                : emptyBlock('No encontramos productos', activos ? 'Prueba quitando algunos filtros.' : 'No hay productos en esta sección por ahora.',
                    activos ? '<button class="btn btn-outline" data-action="clear-filters">Quitar filtros</button>' : '<a class="btn" href="/tienda">Ver todos los productos</a>');

        return {
            title: `${title} | ${STORE}`,
            description,
            noindex: Boolean(opts.buscar),
            html: `
            <div class="container fade-in">
                <div class="page-head">
                    <h1 class="page-title">${esc(title)}</h1>
                    ${categoria?.descripcion ? `<p class="page-sub">${esc(categoria.descripcion)}</p>` : ''}
                </div>
                ${catChips}
                <div class="listing-layout">
                    <aside class="listing-side" aria-label="Filtros">${controls}</aside>
                    <div>
                        <div class="listing-toolbar">
                            <span class="listing-count">${plural(list.length, 'producto', 'productos')}</span>
                            <div class="listing-actions">
                                <button class="filter-btn hide-desktop" data-action="open-filters">${ICON.filter} Filtrar y ordenar ${activos ? `<span class="filter-count">${activos}</span>` : ''}</button>
                                ${activos ? '<button class="link-btn hide-mobile" data-action="clear-filters">Quitar filtros</button>' : ''}
                            </div>
                        </div>
                        ${grid}
                    </div>
                </div>
            </div>
            <div class="sheet-backdrop ${state.ui.filtersOpen ? 'no-anim' : ''}" id="filtersSheet" ${state.ui.filtersOpen ? '' : 'hidden'} data-backdrop="filters">
                <div class="sheet" role="dialog" aria-modal="true" aria-label="Filtrar y ordenar">
                    <div class="sheet-head"><h2>Filtrar y ordenar</h2><button class="icon-btn" data-action="close-filters" aria-label="Cerrar">${ICON.close}</button></div>
                    <div class="sheet-body">${controls}</div>
                    <div class="sheet-foot">
                        <button class="btn btn-outline" data-action="clear-filters">Limpiar</button>
                        <button class="btn" data-action="close-filters">Ver ${plural(list.length, 'producto', 'productos')}</button>
                    </div>
                </div>
            </div>`
        };
    }

    function filterControls(facets, f, orden) {
        const group = (key, title, values) => values.length > 1 || f[key] ? `
            <div class="filter-group">
                <h3>${title}</h3>
                <div class="option-list">
                    ${values.map(v => `<button class="chip ${f[key] === v ? 'active' : ''}" data-action="set-filter" data-key="${key}" data-value="${esc(v)}" aria-pressed="${f[key] === v}">${esc(v)}</button>`).join('')}
                </div>
            </div>` : '';
        return `
            <div class="filter-group">
                <h3>Ordenar por</h3>
                <div class="option-list">
                    ${SORTS.map(([v, label]) => `<button class="chip ${orden === v ? 'active' : ''}" data-action="set-filter" data-key="orden" data-value="${v}" aria-pressed="${orden === v}">${label}</button>`).join('')}
                </div>
            </div>
            ${group('talla', 'Talla', facets.talla)}
            ${group('color', 'Color', facets.color)}
            ${group('marca', 'Marca', facets.marca)}
            ${group('estado', 'Estado', facets.estado)}
            <div class="filter-group">
                <label class="check-row"><input type="checkbox" data-change="only-available" ${f.disponible ? 'checked' : ''}> Solo disponibles</label>
            </div>`;
    }

    function setParam(key, value) {
        const params = new URLSearchParams(location.search);
        if (!value || params.get(key) === value) params.delete(key); else params.set(key, value);
        const qs = params.toString();
        history.replaceState(null, '', location.pathname + (qs ? `?${qs}` : ''));
        // Los paneles de filtros conservan su desplazamiento al volver a dibujarse
        const paneles = ['#filtersSheet .sheet-body', '.listing-side'];
        const tops = paneles.map(sel => $(sel)?.scrollTop || 0);
        render({ keepScroll: true });
        paneles.forEach((sel, i) => { const el = $(sel); if (el) el.scrollTop = tops[i]; });
    }

    /* ==================== VISTA: PRODUCTO ==================== */
    function viewProduct(id) {
        const p = findProduct(id);
        if (!p) return viewNotFound('Este producto no existe o ya no está publicado.');

        pdp = {
            id: p.id,
            talla: p.tallas.length === 1 ? p.tallas[0] : '',
            color: p.colores.length === 1 ? p.colores[0] : '',
            cantidad: 1,
            error: ''
        };
        const imgs = p.imagenes.length ? p.imagenes : [''];
        const cat = state.categorias.find(c => c.slug === p.categoriaSlug);
        const relacionados = byRelevance(state.productos.filter(x => x.id !== p.id && x.categoriaSlug === p.categoriaSlug && isAvailable(x)));
        const usados = new Set([p.id, ...relacionados.slice(0, 12).map(x => x.id)]);
        const recomendados = byRelevance(state.productos.filter(x => !usados.has(x.id) && isAvailable(x)))
            .sort((a, b) => Number(b.masVendido || b.destacado) - Number(a.masVendido || a.destacado));
        const specs = [...p.caracteristicas, ...p.medidas];

        const jsonld = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: p.nombre,
            sku: p.id,
            image: p.imagenes.map(src => imgUrl(src, 1200)),
            description: p.descripcion || p.nombre,
            category: p.categoria,
            ...(p.marca ? { brand: { '@type': 'Brand', name: p.marca } } : {}),
            offers: {
                '@type': 'Offer',
                url: location.origin + productUrl(p),
                priceCurrency: 'CLP',
                price: p.precio,
                availability: isAvailable(p) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
                itemCondition: /usad|segunda|como nuevo|excelente/i.test(p.estado) ? 'https://schema.org/UsedCondition' : 'https://schema.org/NewCondition'
            }
        };

        return {
            title: `${p.nombre}${p.marca ? ` · ${p.marca}` : ''} | ${STORE}`,
            description: (p.descripcion || `${p.nombre} en ${STORE}.`).slice(0, 155),
            image: p.imagenes[0] ? imgUrl(p.imagenes[0], 1200) : '',
            jsonld,
            bodyClass: 'has-sticky',
            html: `
            <div class="container fade-in">
                <nav class="breadcrumb" aria-label="Ruta">
                    <a href="/">Inicio</a><span>/</span>
                    ${cat ? `<a href="/categoria/${esc(cat.slug)}">${esc(cat.nombre)}</a><span>/</span>` : ''}
                    <span aria-current="page">${esc(p.nombre)}</span>
                </nav>
                <div class="pdp">
                    <div class="pdp-gallery ${imgs.length > 1 ? '' : 'single'}">
                        ${imgs.length > 1 ? `<div class="pdp-thumbs">
                            ${imgs.map((src, i) => `<button class="${i ? '' : 'active'}" data-action="pdp-thumb" data-index="${i}" aria-label="Ver foto ${i + 1}">${imgTag(src, { w: 160, sizes: '72px', alt: '' })}</button>`).join('')}
                        </div>` : ''}
                        <div class="pdp-track" id="pdpTrack">
                            ${imgs.map((src, i) => `<button data-action="open-lightbox" data-index="${i}" aria-label="Ampliar foto ${i + 1}">${imgTag(src, { w: 1000, sizes: '(min-width:1024px) 55vw, 100vw', alt: `${p.nombre} — foto ${i + 1}`, eager: i === 0 })}</button>`).join('')}
                        </div>
                        ${imgs.length > 1 ? `<div class="pdp-dots" aria-hidden="true">${imgs.map((_, i) => `<span class="${i ? '' : 'active'}"></span>`).join('')}</div>` : ''}
                        ${badgesHtml(p)}
                    </div>

                    <div class="pdp-info">
                        <div>
                            ${p.marca ? `<p class="pdp-brand">${esc(p.marca)}</p>` : ''}
                            <h1 class="pdp-title">${esc(p.nombre)}</h1>
                        </div>
                        ${priceHtml(p, 'pdp-price')}
                        <div id="pdpBuy"></div>
                        <div class="pdp-perks">
                            <div class="perk">${ICON.truck}<div><strong>Envíos dentro de Curicó</strong><span>El costo y el plazo de entrega se coordinan contigo después de la compra.</span></div></div>
                            <div class="perk">${ICON.lock}<div><strong>${state.tienda.pagoOnline ? 'Pago seguro con Mercado Pago' : 'Paga como prefieras'}</strong><span>${state.tienda.pagoOnline ? 'Tarjetas de crédito y débito. También puedes coordinar tu pago por WhatsApp.' : 'Efectivo, transferencia o tarjeta, coordinado por WhatsApp.'}</span></div></div>
                        </div>
                        <div>
                            <details class="accordion" open>
                                <summary>Descripción</summary>
                                <div class="accordion-body accordion-text">${esc(p.descripcion || 'Sin descripción adicional.')}</div>
                            </details>
                            ${specs.length || p.estado || p.tallas.length || p.colores.length ? `
                            <details class="accordion">
                                <summary>Características</summary>
                                <div class="accordion-body">
                                    <ul class="spec-list">
                                        ${p.estado ? `<li><strong>Estado:</strong> ${esc(p.estado)}</li>` : ''}
                                        ${p.marca ? `<li><strong>Marca:</strong> ${esc(p.marca)}</li>` : ''}
                                        ${p.tallas.length ? `<li><strong>${p.tallas.length > 1 ? 'Tallas' : 'Talla'}:</strong> ${esc(p.tallas.join(', '))}</li>` : ''}
                                        ${p.colores.length ? `<li><strong>${p.colores.length > 1 ? 'Colores' : 'Color'}:</strong> ${esc(p.colores.join(', '))}</li>` : ''}
                                        ${specs.map(s => `<li>${esc(s)}</li>`).join('')}
                                        <li><strong>Código:</strong> ${esc(p.id)}</li>
                                    </ul>
                                </div>
                            </details>` : ''}
                            <details class="accordion">
                                <summary>Envío y entrega</summary>
                                <div class="accordion-body">Hacemos Envíos dentro de Curicó. Después de tu compra te contactamos por WhatsApp para confirmar la dirección, el costo y el plazo de entrega. <a class="link-btn" href="/ayuda#envios">Más información</a></div>
                            </details>
                        </div>
                    </div>
                </div>
            </div>
            ${rail('Productos relacionados', relacionados, cat ? `/categoria/${cat.slug}` : '')}
            ${rail('Te puede interesar', recomendados, '/tienda')}
            <div class="sticky-buy" id="stickyBuy" aria-hidden="true">
                ${priceHtml(p)}
                <button class="btn" data-action="pdp-add" tabindex="-1">${isAvailable(p) ? 'Añadir al carrito' : 'Agotado'}</button>
            </div>`,
            after: () => {
                renderBuyBox();
                initPdpGallery(imgs.length);
            }
        };
    }

    function renderBuyBox() {
        const p = findProduct(pdp?.id);
        const box = $('#pdpBuy');
        if (!p || !box) return;
        const libre = Math.max(0, p.stock - inCartQty(p.id));
        pdp.cantidad = Math.max(1, Math.min(pdp.cantidad, libre || 1));

        let stock;
        if (p.disponibilidad === 'vendido') stock = '<p class="stock out">Agotado</p>';
        else if (p.disponibilidad === 'reservado') stock = '<p class="stock low">Reservado</p>';
        else if (libre === 0) stock = '<p class="stock low">Ya tienes todo el stock disponible en tu carrito</p>';
        else if (p.stock === 1) stock = '<p class="stock low">Última unidad disponible</p>';
        else if (p.stock <= 5) stock = `<p class="stock low">Últimas ${p.stock} unidades</p>`;
        else stock = '<p class="stock">Disponible</p>';

        const puedeComprar = isAvailable(p) && libre > 0;
        box.innerHTML = `
            <div class="pdp-options">
                ${p.colores.length > 1 ? `
                <div>
                    <div class="option-head"><span>Color</span><strong>${esc(pdp.color || 'Elige un color')}</strong></div>
                    <div class="color-list">${p.colores.map(c => `<button class="chip ${pdp.color === c ? 'active' : ''}" data-action="pdp-color" data-value="${esc(c)}" aria-pressed="${pdp.color === c}">${esc(c)}</button>`).join('')}</div>
                </div>` : ''}
                ${p.tallas.length > 1 ? `
                <div>
                    <div class="option-head"><span>Talla</span><strong>${esc(pdp.talla || 'Elige tu talla')}</strong></div>
                    <div class="size-list">${p.tallas.map(t => `<button class="size-btn ${pdp.talla === t ? 'active' : ''}" data-action="pdp-size" data-value="${esc(t)}" aria-pressed="${pdp.talla === t}">${esc(t)}</button>`).join('')}</div>
                </div>` : ''}
                ${pdp.error ? `<p class="option-error" role="alert">${esc(pdp.error)}</p>` : ''}
                ${stock}
                <div class="pdp-buy">
                    ${puedeComprar && p.stock > 1 ? `
                    <div class="qty" aria-label="Cantidad">
                        <button data-action="pdp-qty" data-delta="-1" aria-label="Quitar uno" ${pdp.cantidad <= 1 ? 'disabled' : ''}>−</button>
                        <output aria-live="polite">${pdp.cantidad}</output>
                        <button data-action="pdp-qty" data-delta="1" aria-label="Agregar uno" ${pdp.cantidad >= libre ? 'disabled' : ''}>+</button>
                    </div>` : '<span></span>'}
                    ${puedeComprar
                        ? '<button class="btn" id="pdpAddBtn" data-action="pdp-add">Añadir al carrito</button>'
                        : inCartQty(p.id) ? '<a class="btn" id="pdpAddBtn" href="/carrito">Ver carrito</a>'
                        : `<button class="btn" id="pdpAddBtn" disabled>${p.disponibilidad === 'reservado' ? 'Reservado' : 'Agotado'}</button>`}
                    ${favButton(p, 'fav-btn')}
                </div>
            </div>`;
        const stickyBtn = $('#stickyBuy .btn');
        if (stickyBtn) {
            const enCarrito = !puedeComprar && isAvailable(p) && inCartQty(p.id) > 0;
            stickyBtn.disabled = !puedeComprar && !enCarrito;
            stickyBtn.dataset.action = enCarrito ? 'go-cart' : 'pdp-add';
            stickyBtn.textContent = puedeComprar ? 'Añadir al carrito' : enCarrito ? 'Ver carrito' : p.disponibilidad === 'reservado' ? 'Reservado' : 'Agotado';
        }
        observeSticky();
    }

    function observeSticky() {
        stickyObserver?.disconnect();
        const btn = $('#pdpAddBtn');
        const bar = $('#stickyBuy');
        if (!btn || !bar || !('IntersectionObserver' in window)) return;
        stickyObserver = new IntersectionObserver(([entry]) => {
            const show = !entry.isIntersecting && entry.boundingClientRect.top < 0;
            bar.classList.toggle('visible', show);
            bar.setAttribute('aria-hidden', !show);
        });
        stickyObserver.observe(btn);
    }

    function pdpAdd() {
        const p = findProduct(pdp?.id);
        if (!p || !isAvailable(p)) return;
        const faltaColor = p.colores.length > 1 && !pdp.color;
        const faltaTalla = p.tallas.length > 1 && !pdp.talla;
        if (faltaColor || faltaTalla) {
            pdp.error = faltaColor && faltaTalla ? 'Elige un color y una talla.' : faltaColor ? 'Elige un color.' : 'Elige una talla.';
            renderBuyBox();
            $('#pdpBuy')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        pdp.error = '';
        if (addToCart(p, pdp.talla, pdp.color, pdp.cantidad)) pdp.cantidad = 1;
        renderBuyBox();
    }

    // Al girar el teléfono o cambiar el tamaño de la ventana, los carruseles
    // (portada, fotos del producto y visor) vuelven a quedar alineados
    function realignCarousels() {
        $$('#heroSlides, #pdpTrack, #lightboxTrack').forEach(track => {
            const ancho = Number(track.dataset.w) || track.clientWidth;
            track.scrollLeft = Math.round(track.scrollLeft / ancho) * track.clientWidth;
            track.dataset.w = track.clientWidth;
        });
    }

    function initPdpGallery(count) {
        const track = $('#pdpTrack');
        if (!track || count < 2) return;
        track.dataset.w = track.clientWidth;
        track.addEventListener('scroll', () => {
            const i = Math.round(track.scrollLeft / track.clientWidth);
            $$('.pdp-dots span').forEach((d, j) => d.classList.toggle('active', i === j));
            $$('.pdp-thumbs button').forEach((b, j) => b.classList.toggle('active', i === j));
        }, { passive: true });
    }

    function openLightbox(index) {
        const p = findProduct(pdp?.id);
        if (!p) return;
        const imgs = p.imagenes.length ? p.imagenes : [''];
        const lb = $('#lightbox');
        const track = $('#lightboxTrack');
        track.innerHTML = imgs.map((src, i) => `<div>${imgTag(src, { w: 1400, sizes: '200vw', alt: `${p.nombre} — foto ${i + 1}`, eager: i === index, lazy: false })}</div>`).join('');
        lb.hidden = false;
        document.body.classList.add('no-scroll');
        const update = () => { $('#lightboxCount').textContent = `${Math.round(track.scrollLeft / track.clientWidth) + 1} / ${imgs.length}`; };
        track.onscroll = update;
        requestAnimationFrame(() => { track.scrollLeft = index * track.clientWidth; track.dataset.w = track.clientWidth; update(); });
        $('.lightbox-close').focus();
    }
    // Zoom al punto tocado para ver los detalles del producto
    function zoomPhoto(img, e) {
        const box = img.parentElement;
        const r = img.getBoundingClientRect();
        const fx = (e.clientX - r.left) / r.width;
        const fy = (e.clientY - r.top) / r.height;
        img.classList.toggle('zoomed');
        if (img.classList.contains('zoomed')) {
            box.scrollLeft = fx * img.offsetWidth - box.clientWidth / 2;
            box.scrollTop = fy * img.offsetHeight - box.clientHeight / 2;
        }
    }
    function closeLightbox() {
        $('#lightbox').hidden = true;
        $('#lightboxTrack').innerHTML = '';
        if (!document.querySelector('.drawer-backdrop:not([hidden]), .search-panel:not([hidden])')) document.body.classList.remove('no-scroll');
    }

    /* ==================== VISTA: CARRITO ==================== */
    function viewCart() {
        reconcileCart();
        const { lines, lista, descuento, total, unidades } = cartTotals();
        if (!lines.length) {
            return {
                title: `Carrito | ${STORE}`, noindex: true,
                html: `<div class="container">${emptyBlock('Tu carrito está vacío', 'Descubre nuestros productos y agrega tus favoritos.', '<a class="btn" href="/tienda">Ir a la tienda</a>')}
                    ${state.favs.length ? '<div class="empty"><a class="link-btn" href="/favoritos">Ver mis favoritos</a></div>' : ''}</div>`
            };
        }

        return {
            title: `Carrito (${unidades}) | ${STORE}`,
            noindex: true,
            bodyClass: 'has-checkout-bar',
            html: `
            <div class="container fade-in">
                <div class="page-head"><h1 class="page-title">Carrito <span class="page-sub">(${plural(unidades, 'producto', 'productos')})</span></h1></div>
                <div class="cart-layout">
                    <div class="cart-lines">
                        ${lines.map(l => cartLineHtml(l)).join('')}
                        <p class="cart-continue"><a class="link-btn" href="/tienda">Seguir comprando</a></p>
                    </div>
                    <aside class="summary" aria-label="Resumen">
                        <h2>Resumen</h2>
                        <div class="summary-row"><span>Subtotal</span><span>${money(lista)}</span></div>
                        ${descuento ? `<div class="summary-row discount"><span>Descuentos</span><span>−${money(descuento)}</span></div>` : ''}
                        <div class="summary-row"><span>Envío</span><span>Se coordina</span></div>
                        <div class="summary-row total"><span>Total</span><span>${money(total)}</span></div>
                        <p class="summary-note">El costo de envío se confirma contigo según tu dirección.</p>
                        <a class="btn btn-block" href="/checkout">Continuar al pago</a>
                        <p class="secure-note">${ICON.lock} Compra protegida</p>
                    </aside>
                </div>
            </div>
            <div class="mobile-checkout-bar">
                <div><span class="total-label">Total</span><strong>${money(total)}</strong></div>
                <a class="btn" href="/checkout">Continuar al pago</a>
            </div>`
        };
    }

    function cartLineHtml(l) {
        const p = l.p;
        const libre = p.stock - inCartQty(p.id, l.key);
        const select = (tipo, opciones, actual) => opciones.length > 1 ? `
            <label class="cart-line-meta">${tipo === 'talla' ? 'Talla' : 'Color'}:
                <select data-change="cart-variant" data-key="${esc(l.key)}" data-tipo="${tipo}" aria-label="Cambiar ${tipo}">
                    ${actual ? '' : `<option value="">Elegir</option>`}
                    ${opciones.map(o => `<option value="${esc(o)}" ${o === actual ? 'selected' : ''}>${esc(o)}</option>`).join('')}
                </select>
            </label>` : (opciones[0] ? `<span class="cart-line-meta">${tipo === 'talla' ? 'Talla' : 'Color'}: ${esc(opciones[0])}</span>` : '');
        const falta = (p.tallas.length > 1 && !l.talla) || (p.colores.length > 1 && !l.color);
        return `
        <div class="cart-line">
            <a href="${productUrl(p)}">${imgTag(p.imagenes[0], { w: 200, sizes: '92px', alt: p.nombre })}</a>
            <div class="cart-line-body">
                <div class="cart-line-top">
                    <a class="cart-line-name" href="${productUrl(p)}">${esc(p.nombre)}</a>
                    <button class="remove-btn" data-action="cart-remove" data-key="${esc(l.key)}" aria-label="Eliminar ${esc(p.nombre)}">${ICON.trash}</button>
                </div>
                ${priceHtml(p)}
                ${select('color', p.colores, l.color)}
                ${select('talla', p.tallas, l.talla)}
                ${falta ? '<span class="option-error">Elige una opción antes de pagar</span>' : ''}
                <div class="cart-line-bottom">
                    ${p.stock > 1 ? `
                    <div class="qty sm" aria-label="Cantidad">
                        <button data-action="cart-qty" data-key="${esc(l.key)}" data-delta="-1" aria-label="Quitar uno" ${l.cantidad <= 1 ? 'disabled' : ''}>−</button>
                        <span>${l.cantidad}</span>
                        <button data-action="cart-qty" data-key="${esc(l.key)}" data-delta="1" aria-label="Agregar uno" ${l.cantidad >= libre ? 'disabled' : ''}>+</button>
                    </div>` : '<span class="cart-line-meta">Última unidad</span>'}
                    <strong>${money(p.precio * l.cantidad)}</strong>
                </div>
            </div>
        </div>`;
    }

    function changeCartVariant(key, tipo, valor) {
        const item = state.cart.find(i => i.key === key);
        if (!item) return;
        item[tipo] = valor;
        const nuevaKey = lineKey(item.id, item.talla, item.color);
        const existente = state.cart.find(i => i.key === nuevaKey && i !== item);
        if (existente) {
            existente.cantidad += item.cantidad;
            state.cart = state.cart.filter(i => i !== item);
        } else item.key = nuevaKey;
        saveCart();
        render({ keepScroll: true });
    }

    /* ==================== VISTA: CHECKOUT ==================== */
    function viewCheckout() {
        reconcileCart();
        const { lines, lista, descuento, total } = cartTotals();
        if (!lines.length) return { redirect: '/carrito' };
        const faltan = lines.filter(l => (l.p.tallas.length > 1 && !l.talla) || (l.p.colores.length > 1 && !l.color));
        if (faltan.length) {
            setTimeout(() => toast('Elige la talla o el color de tus productos antes de pagar.'), 300);
            return { redirect: '/carrito' };
        }

        const c = load(KEYS.client, {});
        const field = (name, label, attrs = '', value = c[name] || '') => `
            <div class="field">
                <label for="ck-${name}">${label}</label>
                <input id="ck-${name}" name="${name}" value="${esc(value)}" ${attrs}>
            </div>`;
        const online = state.tienda.pagoOnline;

        return {
            title: `Finalizar compra | ${STORE}`,
            noindex: true,
            html: `
            <div class="container fade-in">
                <div class="page-head"><h1 class="page-title">Finalizar compra</h1></div>
                <form class="checkout-layout" data-form="checkout" novalidate>
                    <div>
                        <div class="form-alert" id="checkoutAlert" role="alert" hidden></div>
                        <section class="form-section">
                            <h2><span class="step-num">1</span> Contacto</h2>
                            <div class="form-grid">
                                ${field('nombre', 'Nombre y apellido', 'autocomplete="name" required minlength="3"')}
                                ${field('telefono', 'Teléfono', 'type="tel" autocomplete="tel" inputmode="tel" placeholder="+56 9 1234 5678" required')}
                            </div>
                        </section>
                        <section class="form-section">
                            <h2><span class="step-num">2</span> Entrega</h2>
                            <div class="form-grid">
                                ${field('direccion', 'Dirección (calle, número, depto.)', 'autocomplete="street-address" required')}
                                <div class="form-grid two">
                                    ${field('comuna', 'Comuna', 'autocomplete="address-level2" required', 'Curicó')}
                                    <div class="field">
                                        <label for="ck-region">Región</label>
                                        <select id="ck-region" name="region" autocomplete="address-level1" required>
                                            <option value="">Selecciona tu región</option>
                                            ${REGIONES.map(r => `<option value="${esc(r)}">${esc(r)}</option>`).join('')}
                                        </select>
                                    </div>
                                </div>
                                <div class="field">
                                    <label for="ck-notas">Indicaciones para la entrega (opcional)</label>
                                    <textarea id="ck-notas" name="notas" maxlength="500"></textarea>
                                </div>
                            </div>
                        </section>
                        <section class="form-section">
                            <h2><span class="step-num">3</span> Pago</h2>
                            <div class="pay-options" role="radiogroup" aria-label="Método de pago">
                                <div class="pay-option">
                                    <input type="radio" id="pm-wa" name="metodo" value="whatsapp">
                                    <div>
                                        <label for="pm-wa"><strong>Coordinar por WhatsApp</strong><span>Envías tu pedido por WhatsApp y acordamos contigo el pago y la entrega.</span></label>
                                        <div class="field">
                                            <label for="ck-pago">Forma de pago</label>
                                            <select id="ck-pago" name="pagoWhatsapp">
                                                ${PAGOS_WHATSAPP.map(m => `<option ${c.pagoWhatsapp === m ? 'selected' : ''}>${m}</option>`).join('')}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                        <label class="check-row"><input type="checkbox" name="recordar" ${c.recordar === false ? '' : 'checked'}> Guardar mis datos en este dispositivo para la próxima compra</label>
                    </div>

                    <aside class="summary" aria-label="Resumen del pedido">
                        <h2>Tu pedido</h2>
                        ${lines.map(l => `
                            <div class="summary-item">
                                ${imgTag(l.p.imagenes[0], { w: 120, sizes: '52px', alt: '' })}
                                <div>${esc(l.p.nombre)}<small>${esc([l.talla && `Talla ${l.talla}`, l.color, `x${l.cantidad}`].filter(Boolean).join(' · '))}</small></div>
                                <span>${money(l.p.precio * l.cantidad)}</span>
                            </div>`).join('')}
                        <div class="summary-row"><span>Subtotal</span><span>${money(lista)}</span></div>
                        ${descuento ? `<div class="summary-row discount"><span>Descuentos</span><span>−${money(descuento)}</span></div>` : ''}
                        <div class="summary-row"><span>Envío</span><span>Se coordina</span></div>
                        <div class="summary-row total"><span>Total</span><span>${money(total)}</span></div>
                        <button class="btn btn-block" type="submit" id="checkoutBtn">${online ? 'Pagar' : 'Enviar pedido por WhatsApp'}</button>
                        <p class="secure-note">${ICON.lock} Tus datos se usan solo para procesar tu pedido</p>
                        <a class="link-btn" href="/carrito">Volver al carrito</a>
                    </aside>
                </form>
            </div>`,
            after: syncCheckoutButton
        };
    }

    function syncCheckoutButton() {
        const form = $('[data-form="checkout"]');
        const btn = $('#checkoutBtn');
        if (!form || !btn) return;
        const metodo = form.metodo.value || (form.metodo[0]?.value);
        btn.textContent = metodo === 'mercadopago' ? `Pagar ${money(cartTotals().total)}` : 'Enviar pedido por WhatsApp';
        btn.classList.toggle('btn-whatsapp', metodo === 'whatsapp');
    }

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    function validateCheckout(form) {
        const datos = Object.fromEntries(new FormData(form));
        const errores = {};
        if ((datos.nombre || '').trim().length < 3) errores.nombre = 'Ingresa tu nombre completo.';
        if ((datos.telefono || '').replace(/[^0-9]/g, '').length < 8) errores.telefono = 'Ingresa un teléfono válido.';
        if (!(datos.direccion || '').trim()) errores.direccion = 'Ingresa tu dirección.';
        if (!(datos.comuna || '').trim()) errores.comuna = 'Ingresa tu comuna.';
        if (!datos.region) errores.region = 'Elige tu región.';

        $$('.field', form).forEach(f => {
            f.classList.remove('invalid');
            f.querySelector('.field-error')?.remove();
            f.querySelector('[aria-invalid]')?.removeAttribute('aria-invalid');
        });
        for (const [name, msg] of Object.entries(errores)) {
            const input = form.elements[name];
            const f = input?.closest('.field');
            if (!f) continue;
            f.classList.add('invalid');
            input.setAttribute('aria-invalid', 'true');
            f.insertAdjacentHTML('beforeend', `<span class="field-error">${msg}</span>`);
        }
        const primero = Object.keys(errores)[0];
        if (primero) form.elements[primero].focus();
        return primero ? null : datos;
    }

    async function submitCheckout(form) {
        const datos = validateCheckout(form);
        if (!datos) return;
        const cliente = {
            nombre: datos.nombre.trim(), email: datos.email.trim(), telefono: datos.telefono.trim(),
            direccion: datos.direccion.trim(), comuna: datos.comuna.trim(), region: datos.region, notas: (datos.notas || '').trim()
        };
        const recordar = Boolean(datos.recordar);
        save(KEYS.client, recordar
            ? { ...cliente, notas: '', pagoWhatsapp: datos.pagoWhatsapp, recordar: true }
            : { recordar: false });

        const { lines, total } = cartTotals();
        const metodo = datos.metodo || 'whatsapp';
        if (metodo === 'mercadopago') return payWithMercadoPago(cliente, lines);
        orderByWhatsapp(cliente, lines, total, datos.pagoWhatsapp || PAGOS_WHATSAPP[0]);
    }

    async function payWithMercadoPago(cliente, lines) {
        const btn = $('#checkoutBtn');
        const alerta = $('#checkoutAlert');
        btn.classList.add('loading');
        alerta.hidden = true;
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cliente,
                    items: lines.map(l => ({ id: l.id, talla: l.talla, color: l.color, cantidad: l.cantidad }))
                })
            });
            const data = await res.json().catch(() => ({}));
            if (res.status === 409) {
                // El stock o una variante cambió mientras comprabas: se actualiza el carrito
                await loadCatalog();
                navigate('/carrito', { replace: true });
                toast(esc((data.detalles || [data.error]).filter(Boolean).slice(0, 2).join(' ')), 6000);
                return;
            }
            if (!res.ok || !data.url) throw new Error(data.error || 'No pudimos iniciar el pago.');
            location.href = data.url;
        } catch (err) {
            btn.classList.remove('loading');
            const sugerencia = whatsappUrl() && !/whatsapp/i.test(err.message) ? ' También puedes elegir “Coordinar por WhatsApp”.' : '';
            alerta.textContent = err.message + sugerencia;
            alerta.hidden = false;
            alerta.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    function orderLine(l) {
        return { id: l.id, nombre: l.p.nombre, talla: l.talla || l.p.tallas[0] || '', color: l.color || l.p.colores[0] || '', cantidad: l.cantidad, precio: l.p.precio };
    }

    // Mantiene el formato de mensaje que ya usaba la tienda
    function orderByWhatsapp(cliente, lines, total, formaPago) {
        const lineas = lines.map(orderLine);
        const productLines = lineas.map(l =>
            `${l.nombre} x ${l.cantidad} ${[l.talla, l.color].filter(Boolean).join(' ')} -- ${money(l.precio * l.cantidad)}`).join('\n');
        const id = `WA-${Date.now().toString(36).toUpperCase()}`;
        const message = `----------- ° ------------
        Nuevo pedido
----------- ° ------------
${productLines}
-------------------------
TOTAL   -------   ${money(total)}
-------------------------
Datos cliente
${cliente.nombre}
${cliente.telefono}
-------------------------
Forma de pago
${formaPago}
-------------------------
Entrega
${cliente.direccion}, ${cliente.comuna}, ${cliente.region}
${cliente.email}${cliente.notas ? `\n${cliente.notas}` : ''}
-------------------------
Pedido ${id}`;

        const url = whatsappUrl(message);
        if (!url) { toast('No hay un número de WhatsApp configurado para la tienda.'); return; }
        save(KEYS.lastOrder, { id, waUrl: url });   // para "Abrir WhatsApp otra vez"
        state.cart = [];
        saveCart();
        // Algunos navegadores dentro de apps (Instagram, Facebook) bloquean ventanas nuevas
        const ventana = window.open(url, '_blank');
        if (!ventana) { location.href = url; return; }
        try { ventana.opener = null; } catch { /* la ventana ya cambió de sitio */ }
        navigate(`/pedido/resultado?via=whatsapp&pedido=${encodeURIComponent(id)}`);
    }

    /* ==================== VISTA: RESULTADO DEL PEDIDO ==================== */
    function viewResult() {
        const params = new URLSearchParams(location.search);
        if (params.get('via') === 'whatsapp') {
            const ultimo = load(KEYS.lastOrder, null);
            const order = ultimo && ultimo.id === params.get('pedido') ? ultimo : null;
            return {
                title: `Pedido enviado | ${STORE}`, noindex: true,
                html: `
                <div class="result fade-in">
                    <div class="result-icon ok">${ICON.chat}</div>
                    <h1>Tu pedido está en WhatsApp</h1>
                    <p>Abrimos WhatsApp con el detalle de tu pedido${order ? ` <strong>${esc(order.id)}</strong>` : ''}. <strong>Envía el mensaje</strong> para que lo confirmemos y coordinemos el pago y la entrega.</p>
                    ${order?.waUrl ? `<a class="btn btn-whatsapp" href="${esc(order.waUrl)}" target="_blank" rel="noopener">Abrir WhatsApp otra vez</a>` : ''}
                    <a class="link-btn" href="/tienda">Seguir comprando</a>
                </div>`
            };
        }

        const paymentId = params.get('payment_id') || params.get('collection_id');
        const ref = params.get('external_reference') || '';
        if (!paymentId || paymentId === 'null') {
            return {
                title: `Pago | ${STORE}`, noindex: true,
                html: `<div class="result fade-in"><div class="result-icon err">${ICON.alert}</div><h1>Pago no completado</h1>
                    <p>No recibimos la confirmación de un pago. Si cerraste la ventana de pago, tu carrito sigue guardado.</p>
                    <a class="btn" href="/checkout">Volver a intentar</a><a class="link-btn" href="/carrito">Ver carrito</a></div>`
            };
        }

        return {
            title: `Confirmando pago | ${STORE}`, noindex: true,
            html: `<div class="result" id="paymentResult"><div class="page-loading"><span></span></div><p>Confirmando tu pago con Mercado Pago…</p></div>`,
            after: () => checkPayment(paymentId, ref)
        };
    }

    // El estado se consulta siempre a Mercado Pago a través del servidor
    async function checkPayment(paymentId, ref) {
        const box = $('#paymentResult');
        let data;
        try {
            const res = await fetch(`/api/pago?payment_id=${encodeURIComponent(paymentId)}&ref=${encodeURIComponent(ref)}`);
            data = await res.json();
            if (!res.ok) throw new Error(data.error || 'No pudimos confirmar el pago.');
        } catch (err) {
            box.innerHTML = `<div class="result-icon pending">${ICON.clock}</div><h1>No pudimos confirmar tu pago</h1>
                <p>${esc(err.message)} Si se descontó dinero de tu cuenta, escríbenos con este número de pago: <strong>${esc(paymentId)}</strong>.</p>
                <button class="btn" data-action="recheck-payment" data-id="${esc(paymentId)}" data-ref="${esc(ref)}">Reintentar</button>
                ${whatsappUrl() ? `<a class="link-btn" href="${esc(whatsappUrl(`Hola, quiero confirmar mi pago ${paymentId}`))}" target="_blank" rel="noopener">Escribir por WhatsApp</a>` : ''}`;
            return;
        }

        document.title = `${data.estado === 'approved' ? 'Compra confirmada' : 'Estado del pago'} | ${STORE}`;
        if (data.estado === 'approved') {
            state.cart = [];
            saveCart();
            box.innerHTML = `<div class="result-icon ok">${ICON.check}</div><h1>¡Gracias por tu compra!</h1>
                <p>Mercado Pago confirmó tu pago de <strong>${money(data.total)}</strong>${data.pedidoId ? ` para el pedido <strong>${esc(data.pedidoId)}</strong>` : ''}. Te contactaremos para coordinar la entrega.</p>
                <a class="btn" href="/tienda">Seguir comprando</a>`;
        } else if (data.estado === 'pending' || data.estado === 'in_process' || data.estado === 'authorized') {
            box.innerHTML = `<div class="result-icon pending">${ICON.clock}</div><h1>Pago en proceso</h1>
                <p>Mercado Pago todavía está procesando tu pago${data.pedidoId ? ` del pedido <strong>${esc(data.pedidoId)}</strong>` : ''}. Te avisaremos cuando se confirme. No vuelvas a pagar.</p>
                <button class="btn btn-outline" data-action="recheck-payment" data-id="${esc(paymentId)}" data-ref="${esc(ref)}">Actualizar estado</button>
                <a class="link-btn" href="/tienda">Seguir comprando</a>`;
        } else {
            box.innerHTML = `<div class="result-icon err">${ICON.alert}</div><h1>El pago no se realizó</h1>
                <p>Mercado Pago rechazó o canceló el pago. No se hizo ningún cobro. Tu carrito sigue guardado para que lo intentes otra vez.</p>
                <a class="btn" href="/checkout">Intentar de nuevo</a><a class="link-btn" href="/carrito">Ver carrito</a>`;
        }
    }

    /* ==================== VISTA: FAVORITOS ==================== */
    function viewFavorites() {
        const favs = state.favs.map(findProduct).filter(Boolean);
        return {
            title: `Favoritos | ${STORE}`, noindex: true,
            html: `
            <div class="container fade-in">
                <div class="page-head"><h1 class="page-title">Favoritos</h1><p class="page-sub">${plural(favs.length, 'producto guardado', 'productos guardados')}</p></div>
                ${favs.length ? `<div class="product-grid section">${favs.map(p => card(p)).join('')}</div>`
                    : emptyBlock('Aún no tienes favoritos', 'Toca el corazón en cualquier producto para guardarlo aquí.', '<a class="btn" href="/tienda">Explorar productos</a>')}
            </div>`
        };
    }

    /* ==================== VISTA: AYUDA ==================== */
    function viewHelp() {
        const wa = whatsappUrl(`Hola ${STORE}, tengo una consulta.`);
        return {
            title: `Ayuda | ${STORE}`,
            description: `Envíos, formas de pago y contacto de ${STORE}.`,
            html: `
            <div class="container prose fade-in">
                <div class="page-head"><h1 class="page-title">Ayuda</h1></div>
                <h2 id="envios">Envíos</h2>
                <p>Hacemos Envíos dentro de Curicó. Después de tu compra te contactamos por WhatsApp para confirmar tu dirección, el costo y el plazo de entrega.</p>
                <h2 id="pagos">Formas de pago</h2>
                <ul>
                    ${state.tienda.pagoOnline ? '<li><strong>Tarjeta de crédito o débito</strong> mediante Mercado Pago. El pago se procesa en el sitio seguro de Mercado Pago; nosotros nunca vemos los datos de tu tarjeta.</li>' : ''}
                    <li><strong>Coordinado por WhatsApp:</strong> ${PAGOS_WHATSAPP.join(', ').toLowerCase()}.</li>
                </ul>
                <h2 id="contacto">Contacto</h2>
                <p>${wa ? `Escríbenos por <a class="link-btn" href="${esc(wa)}" target="_blank" rel="noopener">WhatsApp</a> y te responderemos lo antes posible.` : 'Pronto publicaremos nuestros datos de contacto.'}</p>
            </div>`
        };
    }

    function viewNotFound(text = 'La página que buscas no existe o fue movida.') {
        return {
            title: `Página no encontrada | ${STORE}`, noindex: true,
            html: `<div class="container">${emptyBlock('No encontramos esta página', esc(text), '<a class="btn" href="/tienda">Ir a la tienda</a>')}</div>`
        };
    }

    /* ==================== BÚSQUEDA RÁPIDA ==================== */
    function openSearch() {
        const panel = $('#searchPanel');
        panel.hidden = false;
        document.body.classList.add('no-scroll');
        const input = $('#searchPanelInput');
        input.value = new URLSearchParams(location.search).get('q') || '';
        renderSearchResults(input.value);
        setTimeout(() => input.focus(), 50);
    }
    function closeSearch() {
        $('#searchPanel').hidden = true;
        document.body.classList.remove('no-scroll');
    }
    // Cada palabra debe coincidir con el comienzo de alguna palabra del producto
    // ("poler" encuentra "polerón"); sin tildes, sin signos y en singular
    const STOPWORDS = new Set(['a', 'de', 'del', 'el', 'la', 'las', 'los', 'en', 'y', 'o', 'con', 'para', 'por', 'un', 'una']);
    const singular = w => w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w;
    function searchProducts(q) {
        let words = normalize(q).split(/\s+/).filter(Boolean);
        if (words.some(w => !STOPWORDS.has(w))) words = words.filter(w => !STOPWORDS.has(w));
        words = words.map(singular);
        if (!words.length) return [];
        return state.productos.filter(p => {
            const tokens = normalize([p.nombre, p.categoria, p.marca, p.estado, p.descripcion, p.colores.join(' '), p.tallas.join(' '), p.caracteristicas.join(' ')].join(' ')).split(/\s+/);
            return words.every(w => tokens.some(t => t.startsWith(w)));
        });
    }

    function renderSearchResults(q) {
        const box = $('#searchResults');
        if (!normalize(q).trim()) {
            box.innerHTML = state.categorias.length ? `<p class="search-hint">Categorías</p><div class="search-chips">${state.categorias.map(c => `<a class="chip" href="/categoria/${esc(c.slug)}">${esc(c.nombre)}</a>`).join('')}</div>` : '';
            return;
        }
        const hits = byRelevance(searchProducts(q));
        box.innerHTML = hits.length ? `
            <p class="search-hint">${plural(hits.length, 'resultado', 'resultados')}</p>
            ${hits.slice(0, 6).map(p => `
                <a class="search-result" href="${productUrl(p)}">
                    ${imgTag(p.imagenes[0], { w: 120, sizes: '56px', alt: '' })}
                    <span>${esc(p.nombre)}<br><small class="card-brand">${esc(p.categoria)}</small></span>
                    ${priceHtml(p)}
                </a>`).join('')}
            ${hits.length > 6 ? `<p class="section"><a class="btn btn-outline btn-block" href="/buscar?q=${encodeURIComponent(q)}">Ver los ${hits.length} resultados</a></p>` : ''}`
            : `<p class="search-hint">Sin resultados para “${esc(q)}”</p>`;
    }

    /* ==================== ROUTER ==================== */
    const ROUTES = [
        [/^\/$/, () => viewHome()],
        [/^\/tienda\/?$/, () => viewListing({})],
        [/^\/categoria\/([^/]+)\/?$/, m => viewListing({ categoria: decodeURIComponent(m[1]) })],
        [/^\/ofertas\/?$/, () => viewListing({ ofertas: true })],
        [/^\/novedades\/?$/, () => viewListing({ novedades: true })],
        [/^\/buscar\/?$/, () => viewListing({ buscar: true })],
        [/^\/producto\/([^/]+)\/?$/, m => viewProduct(decodeURIComponent(m[1]))],
        [/^\/carrito\/?$/, () => viewCart()],
        [/^\/checkout\/?$/, () => viewCheckout()],
        [/^\/pedido\/resultado\/?$/, () => viewResult(), true],
        [/^\/favoritos\/?$/, () => viewFavorites()],
        [/^\/ayuda\/?$/, () => viewHelp(), true]
    ];

    function navigate(url, { replace = false } = {}) {
        // Guarda la posición actual para volver al mismo punto con "atrás"
        if (!replace) history.replaceState({ scroll: window.scrollY }, '');
        history[replace ? 'replaceState' : 'pushState'](null, '', url);
        render();
        app.focus({ preventScroll: true });
    }

    // Las rutas marcadas con true funcionan aunque no cargue el catálogo
    function render(opts = {}) {
        clearInterval(heroTimer);
        stickyObserver?.disconnect();
        document.body.classList.remove('has-sticky', 'has-checkout-bar');

        const path = location.pathname;
        const route = ROUTES.find(([re]) => re.test(path));
        if (!route) return paint(viewNotFound(), opts);

        if (state.status === 'loading') {
            app.innerHTML = path === '/' ? '<div class="hero skeleton"></div>' : `<div class="container section"><div class="product-grid">${skeletonCards(8)}</div></div>`;
            return;
        }
        const sinCatalogo = route[2];
        if (state.status === 'error' && !sinCatalogo) return paint(errorView(), opts);

        const view = route[1](path.match(route[0]));
        if (view.redirect) return navigate(view.redirect, { replace: true });
        paint(view, opts);
    }

    function paint(view, { keepScroll = false, scrollTo = null } = {}) {
        document.title = view.title || STORE;
        setMeta('name', 'description', view.description || `Compra online en ${STORE}. Envíos dentro de Curicó.`);
        setMeta('name', 'robots', view.noindex ? 'noindex, follow' : 'index, follow');
        setMeta('property', 'og:title', view.title || STORE);
        setMeta('property', 'og:description', view.description || '');
        setMeta('property', 'og:url', location.origin + location.pathname);
        setMeta('property', 'og:image', view.image || '');
        let canonical = $('link[rel="canonical"]');
        if (!canonical) {
            canonical = document.createElement('link');
            canonical.rel = 'canonical';
            document.head.appendChild(canonical);
        }
        canonical.href = location.origin + location.pathname;
        $('#jsonld')?.remove();
        if (view.jsonld) {
            const s = document.createElement('script');
            s.type = 'application/ld+json';
            s.id = 'jsonld';
            s.textContent = JSON.stringify(view.jsonld);
            document.head.appendChild(s);
        }

        const y = window.scrollY;
        app.innerHTML = view.html;
        if (view.bodyClass) document.body.classList.add(view.bodyClass);
        markActiveNav();
        view.after?.();

        const ancla = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (scrollTo !== null) window.scrollTo(0, scrollTo);
        else if (keepScroll) window.scrollTo(0, y);
        else if (ancla) ancla.scrollIntoView();
        else window.scrollTo(0, 0);
    }

    function setMeta(attr, name, content) {
        let el = document.head.querySelector(`meta[${attr}="${name}"]`);
        if (!content) { el?.remove(); return; }
        if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
        el.setAttribute('content', content);
    }

    /* ==================== EVENTOS ==================== */
    function closePanels() {
        $('#menuDrawer').hidden = true;
        closeSearch();
        if (!$('#lightbox').hidden) closeLightbox();
        state.ui.filtersOpen = false;
        document.body.classList.remove('no-scroll');
    }

    function bindEvents() {
        // Enlaces internos sin recargar la página
        document.addEventListener('click', e => {
            const a = e.target.closest('a[href]');
            if (!a || a.target === '_blank' || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const url = new URL(a.href, location.href);
            if (url.origin !== location.origin || url.pathname.startsWith('/api/') || /\.\w+$/.test(url.pathname) || a.hasAttribute('download')) return;
            e.preventDefault();
            closePanels();
            const destino = url.pathname + url.search + url.hash;
            if (destino === location.pathname + location.search + location.hash) return render({ keepScroll: !url.hash });
            navigate(destino);
        });

        document.addEventListener('click', e => {
            const el = e.target.closest('[data-action]');
            if (!el) return;
            const { action, id, key } = el.dataset;
            switch (action) {
                case 'retry': loadCatalog().then(() => render()); break;
                case 'open-menu':
                    $('#menuDrawer').hidden = false;
                    document.body.classList.add('no-scroll');
                    $('#menuDrawer [data-action="close-menu"]').focus();
                    break;
                case 'close-menu': closePanels(); break;
                case 'open-search': openSearch(); break;
                case 'close-search': closeSearch(); break;
                case 'toggle-fav': e.preventDefault(); toggleFav(id); break;
                case 'quick-add': {
                    e.preventDefault();
                    const p = findProduct(id);
                    if (p) addToCart(p, p.tallas[0] || '', p.colores[0] || '', 1);
                    break;
                }
                case 'hero-go': $('#heroSlides')?._go?.(Number(el.dataset.index)); clearInterval(heroTimer); break;
                case 'open-filters': {
                    const sheet = $('#filtersSheet');
                    state.ui.filtersOpen = true;
                    sheet.classList.remove('no-anim');
                    sheet.hidden = false;
                    document.body.classList.add('no-scroll');
                    break;
                }
                case 'close-filters': state.ui.filtersOpen = false; $('#filtersSheet').hidden = true; document.body.classList.remove('no-scroll'); break;
                case 'set-filter': setParam(el.dataset.key, el.dataset.value); break;
                case 'clear-filters': {
                    const q = new URLSearchParams(location.search).get('q');
                    history.replaceState(null, '', location.pathname + (q ? `?q=${encodeURIComponent(q)}` : ''));
                    render({ keepScroll: true });
                    break;
                }
                case 'load-more': state.ui.visible += PAGE_SIZE; render({ keepScroll: true }); break;
                case 'pdp-size': pdp.talla = el.dataset.value; pdp.error = ''; renderBuyBox(); break;
                case 'pdp-color': pdp.color = el.dataset.value; pdp.error = ''; renderBuyBox(); break;
                case 'pdp-qty': pdp.cantidad += Number(el.dataset.delta); renderBuyBox(); break;
                case 'pdp-add': pdpAdd(); break;
                case 'go-cart': navigate('/carrito'); break;
                case 'pdp-thumb': {
                    const track = $('#pdpTrack');
                    track.scrollTo({ left: Number(el.dataset.index) * track.clientWidth, behavior: 'smooth' });
                    break;
                }
                case 'open-lightbox': openLightbox(Number(el.dataset.index)); break;
                case 'close-lightbox': closeLightbox(); break;
                case 'cart-qty': {
                    const item = state.cart.find(i => i.key === key);
                    const p = item && findProduct(item.id);
                    if (!item || !p) break;
                    const max = p.stock - inCartQty(p.id, key);
                    item.cantidad = Math.max(1, Math.min(max, item.cantidad + Number(el.dataset.delta)));
                    saveCart();
                    render({ keepScroll: true });
                    break;
                }
                case 'cart-remove': {
                    const item = state.cart.find(i => i.key === key);
                    state.cart = state.cart.filter(i => i.key !== key);
                    saveCart();
                    render({ keepScroll: true });
                    const p = item && findProduct(item.id);
                    if (p) toast(`${esc(p.nombre)} eliminado del carrito`);
                    break;
                }
                case 'recheck-payment': checkPayment(id, el.dataset.ref); break;
            }
        });

        // Clic fuera cierra menú, filtros y búsqueda; clic en una foto ampliada hace zoom
        document.addEventListener('click', e => {
            const t = e.target;
            if (t.id === 'menuDrawer') closePanels();
            if (t.dataset?.backdrop === 'filters') { state.ui.filtersOpen = false; t.hidden = true; document.body.classList.remove('no-scroll'); }
            if (!$('#searchPanel').hidden && !t.closest('#searchPanel, [data-action="open-search"], .header-search')) closeSearch();
            const foto = t.closest('#lightboxTrack img');
            if (foto) zoomPhoto(foto, e);
            // Toda la caja del método de pago es seleccionable
            const opcion = t.closest('.pay-option');
            if (opcion && !t.closest('label, input, select')) {
                const radio = opcion.querySelector('input[type="radio"]');
                if (!radio.checked) { radio.checked = true; syncCheckoutButton(); }
            }
        });

        document.addEventListener('change', e => {
            const el = e.target;
            if (el.dataset.change === 'only-available') setParam('disponible', el.checked ? 'si' : '');
            if (el.dataset.change === 'cart-variant') changeCartVariant(el.dataset.key, el.dataset.tipo, el.value);
            if (el.name === 'metodo') syncCheckoutButton();
            if (el.name === 'pagoWhatsapp') {
                const wa = $('#pm-wa');
                if (wa && !wa.checked) { wa.checked = true; syncCheckoutButton(); }
            }
            const campo = el.closest('.field.invalid');
            if (campo) {
                campo.classList.remove('invalid');
                campo.querySelector('.field-error')?.remove();
                el.removeAttribute('aria-invalid');
            }
        });

        document.addEventListener('submit', async e => {
            const form = e.target;
            if (form.matches('[data-search-form]')) {
                e.preventDefault();
                const q = form.q.value.trim();
                closePanels();
                form.q.blur();
                navigate(`/buscar?q=${encodeURIComponent(q)}`);
            } else if (form.dataset.form === 'checkout') {
                e.preventDefault();
                submitCheckout(form);
            } else if (form.dataset.form === 'newsletter') {
                e.preventDefault();
                subscribe(form);
            }
        });

        $('#searchPanelInput').addEventListener('input', e => renderSearchResults(e.target.value));
        // En escritorio, el buscador del encabezado abre el panel con resultados al instante
        $('.header-search input').addEventListener('focus', e => { e.target.blur(); openSearch(); });

        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            if (!$('#lightbox').hidden) closeLightbox();
            else if (state.ui.filtersOpen) { state.ui.filtersOpen = false; $('#filtersSheet').hidden = true; document.body.classList.remove('no-scroll'); }
            else closePanels();
        });

        // Imagen rota: se reemplaza por un fondo neutro (sin atributos onerror, por la CSP)
        document.addEventListener('error', e => {
            const img = e.target;
            if (img.tagName !== 'IMG' || img.dataset.failed) return;
            img.dataset.failed = '1';
            img.removeAttribute('srcset');
            img.src = PLACEHOLDER;
        }, true);

        window.addEventListener('popstate', () => { closePanels(); render({ scrollTo: history.state?.scroll ?? 0 }); });
        window.addEventListener('scroll', () => $('#siteHeader').classList.toggle('scrolled', window.scrollY > 4), { passive: true });
        let resizeTimer;
        window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(realignCarousels, 150); });
        window.addEventListener('storage', e => {
            if (e.key === KEYS.cart || e.key === KEYS.favs) { initStorage(); updateBadges(); }
        });
    }

    async function subscribe(form) {
        const msg = form.parentElement.querySelector('.newsletter-msg');
        const email = form.email.value.trim();
        if (!EMAIL_RE.test(email)) { msg.textContent = 'Ingresa un correo válido.'; form.email.focus(); return; }
        const btn = form.querySelector('button');
        btn.classList.add('loading');
        try {
            const res = await fetch('/api/suscribir', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, empresa: form.empresa.value })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || 'No pudimos registrar tu correo.');
            form.reset();
            msg.textContent = '¡Listo! Te avisaremos de las novedades.';
        } catch (err) {
            msg.textContent = err.message;
        } finally {
            btn.classList.remove('loading');
        }
    }

    /* ==================== INICIO ==================== */
    $('#year').textContent = new Date().getFullYear();
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    initStorage();
    bindEvents();
    updateBadges();
    render();
    loadCatalog().then(() => render({ keepScroll: true }));
})();
