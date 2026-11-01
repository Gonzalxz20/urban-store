/* ==================== CATÁLOGO (compartido por las funciones) ====================
   Lee la hoja de productos (y la de categorías, si existe) publicadas como CSV.
   Los archivos dentro de api/_lib no se publican como rutas en Vercel.
*/

export const NOMBRE_TIENDA = 'URBAN-STORE';
const WHATSAPP_POR_DEFECTO = '+56 9 5417 9298';
const CACHE_MS = 60_000;

let cache = { at: 0, data: null };

export function configTienda() {
    return {
        nombre: NOMBRE_TIENDA,
        whatsapp: process.env.WHATSAPP_TIENDA || WHATSAPP_POR_DEFECTO,
        pagoOnline: Boolean(process.env.MP_ACCESS_TOKEN),
        newsletter: Boolean(process.env.APPS_SCRIPT_URL)
    };
}

// Devuelve { productos, categorias }. Se guarda 60 s en memoria para no pedirle
// la hoja a Google en cada llamada (checkout, sitemap, etc.)
export async function cargarCatalogo({ fresco = false } = {}) {
    if (!fresco && cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;

    const sheetUrl = process.env.SHEET_CSV_URL;
    if (!sheetUrl) throw new ErrorConfig('Falta configurar SHEET_CSV_URL en Vercel.');

    const [csvProductos, csvCategorias] = await Promise.all([
        leerCSV(sheetUrl),
        process.env.SHEET_CATEGORIAS_CSV_URL ? leerCSV(process.env.SHEET_CATEGORIAS_CSV_URL).catch(err => {
            console.error('No se pudo leer la hoja de categorías:', err);
            return null;
        }) : null
    ]);

    // Una categoría con visible = NO se oculta junto con sus productos
    const filasCategorias = csvCategorias ? rowsToObjects(parseCSV(csvCategorias)) : [];
    const ocultas = new Set(filasCategorias
        .filter(c => c.nombre && normalizeKey(c.visible || 'si') === 'no')
        .map(c => slugify(c.nombre)));
    const productos = toProducts(parseCSV(csvProductos)).filter(p => !ocultas.has(p.categoriaSlug));
    const categorias = toCategories(filasCategorias, productos);
    cache = { at: Date.now(), data: { productos, categorias } };
    return cache.data;
}

export class ErrorConfig extends Error {}

async function leerCSV(url) {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`Google respondió ${res.status}`);
    return res.text();
}

export function json(body, status = 200, headers = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
    });
}

/* ==================== CSV ==================== */
// Respeta comillas, comas y saltos de línea dentro de las celdas
export function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    text = text.replace(/^﻿/, '');

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (ch === '"') inQuotes = false;
            else cell += ch;
        } else if (ch === '"') {
            inQuotes = true;
        } else if (ch === ',') {
            row.push(cell); cell = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(cell); rows.push(row);
            row = []; cell = '';
        } else {
            cell += ch;
        }
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => c.trim() !== ''));
}

function rowsToObjects(rows) {
    if (rows.length < 2) return [];
    const headers = rows[0].map(h => {
        const key = normalizeKey(h);
        return HEADER_ALIASES[key] || key;
    });
    return rows.slice(1).map((values, index) => {
        const raw = { _fila: index + 2 };
        headers.forEach((h, i) => { raw[h] = (values[i] || '').trim(); });
        return raw;
    });
}

/* ==================== NORMALIZACIÓN ==================== */
// "Categoría", "PRECIO ANTERIOR" o "precio_anterior" terminan todos igual
function normalizeKey(h) {
    return h.normalize('NFD').replace(/[̀-ͯ]/g, '')
        .trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function slugify(text) {
    return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const HEADER_ALIASES = {
    imagen: 'imagenes', fotos: 'imagenes', foto: 'imagenes',
    oferta: 'precio_anterior',
    talla: 'tallas', variantes: 'tallas',
    color: 'colores',
    caracteristica: 'caracteristicas', especificaciones: 'caracteristicas',
    mas_vendidos: 'mas_vendido', top_ventas: 'mas_vendido',
    novedad: 'nuevo'
};

const DISPONIBILIDAD = {
    si: 'disponible', disponible: 'disponible', '': 'disponible',
    reservado: 'reservado', reservada: 'reservado',
    no: 'vendido', vendido: 'vendido', vendida: 'vendido', agotado: 'vendido', agotada: 'vendido',
    oculto: 'oculto', oculta: 'oculto'
};

const esSi = value => ['si', 'x', '1', 'true'].includes(normalizeKey(value || ''));
const lista = (value, sep = /[|;\n]/) => String(value || '').split(sep).map(v => v.trim()).filter(Boolean);

function toProducts(rows) {
    const usados = new Set();
    return rowsToObjects(rows).map(raw => {
        let disponibilidad = DISPONIBILIDAD[normalizeKey(raw.disponible || '')] || 'disponible';
        const precio = toPrice(raw.precio);
        const precioAnterior = toPrice(raw.precio_anterior);

        // Sin columna "stock" cada producto es una pieza única (1 unidad), como hasta ahora
        const stockTexto = String(raw.stock ?? '').replace(/[^0-9]/g, '');
        let stock = stockTexto === '' ? 1 : parseInt(stockTexto, 10);
        if (disponibilidad === 'vendido') stock = 0;
        if (stock === 0 && disponibilidad === 'disponible') disponibilidad = 'vendido';

        let id = raw.id || `fila-${raw._fila}`;
        if (usados.has(id)) id = `${id}-${raw._fila}`;
        usados.add(id);

        return {
            id,
            nombre: raw.nombre,
            categoria: raw.categoria || 'Otros',
            categoriaSlug: slugify(raw.categoria || 'Otros'),
            marca: raw.marca || '',
            tallas: lista(raw.tallas, /[|;,/\n]/).map(t => t.toUpperCase()),
            colores: lista(raw.colores, /[|;,/\n]/),
            estado: raw.estado || '',
            precio,
            precioAnterior: precioAnterior > precio ? precioAnterior : 0,
            stock,
            disponibilidad,
            destacado: esSi(raw.destacado),
            nuevo: esSi(raw.nuevo),
            masVendido: esSi(raw.mas_vendido),
            imagenes: lista(raw.imagenes).map(u => convertDriveUrl(u)).filter(Boolean),
            medidas: lista(raw.medidas, /[|;·\n]/),
            caracteristicas: lista(raw.caracteristicas, /[|;·\n]/),
            descripcion: raw.descripcion || '',
            orden: raw._fila
        };
    }).filter(p => p.disponibilidad !== 'oculto' && p.nombre && p.precio > 0);
}

// La hoja "categorias" es opcional: nombre, icono, descripcion, orden, visible.
// Las categorías que tengan productos pero no estén en la hoja se agregan al final.
function toCategories(filas, productos) {
    const conteo = new Map();
    for (const p of productos) {
        const actual = conteo.get(p.categoriaSlug) || { nombre: p.categoria, cantidad: 0 };
        actual.cantidad++;
        conteo.set(p.categoriaSlug, actual);
    }

    const configuradas = filas
        .filter(c => c.nombre && normalizeKey(c.visible || 'si') !== 'no')
        .sort((a, b) => (parseFloat(a.orden) || 999) - (parseFloat(b.orden) || 999));

    const resultado = [];
    const vistos = new Set();
    for (const c of configuradas) {
        const slug = slugify(c.nombre);
        const datos = conteo.get(slug);
        if (!datos || vistos.has(slug)) continue; // sin productos no se muestra
        vistos.add(slug);
        resultado.push({
            slug,
            nombre: c.nombre,
            descripcion: c.descripcion || '',
            icono: slugify(c.icono || ''),      // vacío: la tienda lo elige según el nombre
            cantidad: datos.cantidad
        });
    }
    for (const [slug, datos] of conteo) {
        if (vistos.has(slug)) continue;
        resultado.push({ slug, nombre: datos.nombre, descripcion: '', icono: '', cantidad: datos.cantidad });
    }
    return resultado;
}

// "$18.990", "18990", "18,990" y "$18,990.00" valen lo mismo (CLP no usa decimales).
// Los decimales (1 o 2 dígitos al final) se descartan; 3 dígitos son miles.
export function toPrice(value) {
    const text = String(value || '').replace(/[^0-9.,]/g, '').replace(/[.,]\d{1,2}$/, '');
    return parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
}

// Convierte enlaces de Google Drive normales a enlaces directos de imagen
function convertDriveUrl(url) {
    url = String(url || '').trim();
    if (!/^https:\/\//i.test(url)) return '';
    const match = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]+)/);
    return match ? `https://lh3.googleusercontent.com/d/${match[1]}` : url;
}

/* ==================== PEDIDOS ==================== */
// Recalcula el pedido con los precios y el stock de la hoja: nunca se confía
// en precios enviados por el navegador.
export function armarPedido(items, productos) {
    const errores = [];
    const lineas = [];
    if (!Array.isArray(items) || items.length === 0) return { lineas, errores: ['El carrito está vacío.'] };
    if (items.length > 50) return { lineas, errores: ['El carrito tiene demasiados productos.'] };

    const usoStock = new Map();
    for (const item of items) {
        const p = productos.find(prod => prod.id === String(item?.id || ''));
        const cantidad = Math.floor(Number(item?.cantidad));
        if (!p) { errores.push('Un producto de tu carrito ya no existe.'); continue; }
        if (p.disponibilidad !== 'disponible') { errores.push(`${p.nombre} ya no está disponible.`); continue; }
        if (!Number.isFinite(cantidad) || cantidad < 1) { errores.push(`Cantidad inválida para ${p.nombre}.`); continue; }

        const talla = String(item.talla || '');
        const color = String(item.color || '');
        if (p.tallas.length > 1 && !p.tallas.includes(talla)) { errores.push(`Elige una talla válida para ${p.nombre}.`); continue; }
        if (p.colores.length > 1 && !p.colores.includes(color)) { errores.push(`Elige un color válido para ${p.nombre}.`); continue; }

        const usado = (usoStock.get(p.id) || 0) + cantidad;
        if (usado > p.stock) { errores.push(`Solo quedan ${p.stock} unidades de ${p.nombre}.`); continue; }
        usoStock.set(p.id, usado);

        lineas.push({
            id: p.id,
            nombre: p.nombre,
            talla: p.tallas.length > 1 ? talla : (p.tallas[0] || ''),
            color: p.colores.length > 1 ? color : (p.colores[0] || ''),
            cantidad,
            precio: p.precio,
            precioAnterior: p.precioAnterior,
            imagen: p.imagenes[0] || ''
        });
    }
    return { lineas, errores };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validarCliente(c = {}) {
    const limpio = campo => String(c[campo] || '').trim().slice(0, 200);
    const cliente = {
        nombre: limpio('nombre'),
        email: limpio('email').toLowerCase(),
        telefono: limpio('telefono'),
        direccion: limpio('direccion'),
        comuna: limpio('comuna'),
        region: limpio('region'),
        notas: String(c.notas || '').trim().slice(0, 500)
    };
    const errores = [];
    if (cliente.nombre.length < 3) errores.push('Ingresa tu nombre completo.');
    if (!EMAIL_RE.test(cliente.email)) errores.push('Ingresa un correo válido.');
    if (cliente.telefono.replace(/[^0-9]/g, '').length < 8) errores.push('Ingresa un teléfono válido.');
    if (!cliente.direccion) errores.push('Ingresa tu dirección.');
    if (!cliente.comuna) errores.push('Ingresa tu comuna.');
    if (!cliente.region) errores.push('Elige tu región.');
    return { cliente, errores };
}

export function esEmailValido(email) {
    return EMAIL_RE.test(String(email || '').trim());
}

// Envía datos a la planilla mediante el Apps Script (pedidos, pagos, suscriptores)
export async function notificarPlanilla(datos) {
    const url = process.env.APPS_SCRIPT_URL;
    if (!url) return false;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ token: process.env.APPS_SCRIPT_TOKEN || '', ...datos }),
        redirect: 'follow'
    });
    if (!res.ok) throw new Error(`Apps Script respondió ${res.status}`);
    const respuesta = await res.json().catch(() => ({}));
    if (respuesta.ok === false) throw new Error(respuesta.error || 'Apps Script rechazó la solicitud');
    return true;
}

// Consulta un pago directamente a Mercado Pago. Devuelve null si no existe y
// lanza un error si Mercado Pago no responde.
export async function consultarPagoMP(paymentId) {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` }
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Mercado Pago respondió ${res.status}`);
    return res.json();
}

export function origenSitio(request) {
    return (process.env.SITE_URL || new URL(request.url).origin).replace(/\/$/, '');
}
