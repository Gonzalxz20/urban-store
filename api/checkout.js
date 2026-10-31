/* ==================== CHECKOUT CON MERCADO PAGO ====================
   Crea una "preferencia" de pago en Mercado Pago con los precios de la hoja
   (no con los del navegador) y devuelve el enlace de pago seguro.
   Requiere MP_ACCESS_TOKEN. Sin esa variable responde 503 y la tienda ofrece
   solo el pedido por WhatsApp.
*/
import { randomBytes } from 'node:crypto';
import {
    cargarCatalogo, armarPedido, validarCliente, notificarPlanilla,
    origenSitio, json, NOMBRE_TIENDA, ErrorConfig
} from './_lib/catalogo.js';

const MP_API = 'https://api.mercadopago.com/checkout/preferences';

export async function POST(request) {
    const token = process.env.MP_ACCESS_TOKEN;
    if (!token) return json({ error: 'El pago online todavía no está habilitado.' }, 503);

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Solicitud inválida.' }, 400);
    }

    const { cliente, errores: erroresCliente } = validarCliente(body?.cliente);
    if (erroresCliente.length) return json({ error: erroresCliente[0], detalles: erroresCliente }, 422);

    let productos;
    try {
        ({ productos } = await cargarCatalogo({ fresco: true }));
    } catch (err) {
        if (err instanceof ErrorConfig) return json({ error: err.message }, 500);
        console.error(err);
        return json({ error: 'No pudimos verificar el inventario. Intenta otra vez.' }, 502);
    }

    const { lineas, errores } = armarPedido(body?.items, productos);
    if (errores.length) return json({ error: errores[0], detalles: errores }, 409);

    const pedidoId = `US-${Date.now().toString(36).toUpperCase()}-${randomBytes(2).toString('hex').toUpperCase()}`;
    const origen = origenSitio(request);
    const esPublico = origen.startsWith('https://');
    const total = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);

    const preferencia = {
        external_reference: pedidoId,
        statement_descriptor: NOMBRE_TIENDA.replace(/[^A-Z0-9]/gi, '').slice(0, 13),
        items: lineas.map(l => ({
            id: l.id,
            title: [l.nombre, l.talla && `Talla ${l.talla}`, l.color].filter(Boolean).join(' · ').slice(0, 250),
            quantity: l.cantidad,
            unit_price: l.precio,
            currency_id: 'CLP',
            ...(l.imagen.startsWith('https://') ? { picture_url: l.imagen } : {})
        })),
        payer: {
            name: cliente.nombre,
            email: cliente.email,
            phone: { number: cliente.telefono.replace(/[^0-9+]/g, '') }
        },
        back_urls: {
            success: `${origen}/pedido/resultado`,
            pending: `${origen}/pedido/resultado`,
            failure: `${origen}/pedido/resultado`
        },
        // Mercado Pago solo acepta retorno automático y avisos hacia sitios https
        ...(esPublico ? { auto_return: 'approved', notification_url: `${origen}/api/mp-webhook` } : {}),
        metadata: { pedido_id: pedidoId }
    };

    let data;
    try {
        const res = await fetch(MP_API, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': pedidoId
            },
            body: JSON.stringify(preferencia)
        });
        data = await res.json().catch(() => ({}));
        if (!res.ok || !data.init_point) throw new Error(`Mercado Pago rechazó la preferencia (${res.status}): ${JSON.stringify(data)}`);
    } catch (err) {
        console.error(err);
        return json({ error: 'No pudimos iniciar el pago. Intenta otra vez o compra por WhatsApp.' }, 502);
    }

    try {
        await notificarPlanilla({
            accion: 'pedido',
            pedidoId,
            estado: 'pago_pendiente',
            total,
            cliente,
            lineas: lineas.map(({ imagen, ...l }) => l)
        });
    } catch (err) {
        console.error('No se pudo registrar el pedido en la planilla:', err);
    }

    return json({ pedidoId, total, url: data.init_point });
}
