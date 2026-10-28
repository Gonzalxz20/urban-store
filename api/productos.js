/* ==================== API DE PRODUCTOS (Vercel Function) ====================
   Lee la hoja "inventario" publicada como CSV y devuelve solo los datos que
   necesita la tienda. El enlace del CSV vive en la variable SHEET_CSV_URL de
   Vercel, así que nunca llega al navegador del cliente.
*/

const WHATSAPP_POR_DEFECTO = '+56 9 5417 9298';

export async function GET() {
    const sheetUrl = process.env.SHEET_CSV_URL;
    if (!sheetUrl) {
        return json({ error: 'Falta configurar SHEET_CSV_URL en Vercel.' }, 500);
    }

    try {
        const res = await fetch(sheetUrl, { redirect: 'follow' });
        if (!res.ok) throw new Error(`Google respondió ${res.status}`);

        const productos = toProducts(parseCSV(await res.text()));
        return json(
            {
                tienda: { whatsapp: process.env.WHATSAPP_TIENDA || WHATSAPP_POR_DEFECTO },
                productos
            },
            200,
            // La CDN de Vercel guarda la respuesta 60 s y sirve la copia anterior mientras actualiza
            { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' }
        );
    } catch (err) {
        console.error('Error leyendo la hoja:', err);
        return json({ error: 'No se pudo leer el inventario.' }, 502);
    }
}

function json(body, status, headers = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
    });
}

/* ==================== CSV ==================== */
// Respeta comillas, comas y saltos de línea dentro de las celdas
function parseCSV(text) {
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

/* ==================== NORMALIZACIÓN ==================== */
// "Categoría", "PRECIO ANTERIOR" o "precio_anterior" terminan todos igual
function normalizeHeader(h) {
    return h.normalize('NFD').replace(/[̀-ͯ]/g, '')
        .trim().toLowerCase().replace(/[\s-]+/g, '_');
}

const HEADER_ALIASES = { imagen: 'imagenes', fotos: 'imagenes', foto: 'imagenes', oferta: 'precio_anterior' };

const DISPONIBILIDAD = {
    si: 'disponible', disponible: 'disponible', '': 'disponible',
    reservado: 'reservado', reservada: 'reservado',
    no: 'vendido', vendido: 'vendido', vendida: 'vendido',
    oculto: 'oculto', oculta: 'oculto'
};

function toProducts(rows) {
    if (rows.length < 2) return [];
    const headers = rows[0].map(h => {
        const key = normalizeHeader(h);
        return HEADER_ALIASES[key] || key;
    });

    return rows.slice(1).map((values, index) => {
        const raw = {};
        headers.forEach((h, i) => { raw[h] = (values[i] || '').trim(); });

        const disponibilidad = DISPONIBILIDAD[normalizeHeader(raw.disponible || '')] || 'disponible';
        const precioAnterior = toPrice(raw.precio_anterior);
        const precio = toPrice(raw.precio);

        return {
            id: raw.id || `fila-${index + 2}`,
            nombre: raw.nombre,
            categoria: raw.categoria || 'Otros',
            marca: raw.marca || '',
            talla: (raw.talla || '').toUpperCase(),
            estado: raw.estado || '',
            precio,
            precioAnterior: precioAnterior > precio ? precioAnterior : 0,
            disponibilidad,
            destacado: ['si', 'x', '1', 'true'].includes(normalizeHeader(raw.destacado || '')),
            imagenes: (raw.imagenes || '').split(/[|\n]/).map(u => convertDriveUrl(u.trim())).filter(Boolean),
            medidas: (raw.medidas || '').split(/[|;·\n]/).map(m => m.trim()).filter(Boolean),
            descripcion: raw.descripcion || ''
        };
    }).filter(p => p.disponibilidad !== 'oculto' && p.nombre && p.precio > 0);
}

// "$18.990", "18990" y "18,990" valen lo mismo (CLP no usa decimales)
function toPrice(value) {
    return parseInt(String(value || '').replace(/[^0-9]/g, ''), 10) || 0;
}

// Convierte enlaces de Google Drive normales a enlaces directos de imagen
function convertDriveUrl(url) {
    if (!/^https?:\/\//i.test(url)) return '';
    const match = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=)([\w-]+)/);
    return match ? `https://lh3.googleusercontent.com/d/${match[1]}` : url;
}
