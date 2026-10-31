/* ==================== AVISOS DE MERCADO PAGO ====================
   Mercado Pago avisa aquí cuando cambia el estado de un pago. Se vuelve a
   consultar el pago a la API (así un aviso falso no puede marcar nada como
   pagado) y se registra en la planilla mediante el Apps Script.
   Si MP_WEBHOOK_SECRET está configurado, además se valida la firma x-signature.
*/
import { createHmac, timingSafeEqual } from 'node:crypto';
import { json, notificarPlanilla, consultarPagoMP } from './_lib/catalogo.js';

export async function POST(request) {
    if (!process.env.MP_ACCESS_TOKEN) return json({ ok: false }, 503);

    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const tipo = body.type || url.searchParams.get('type') || url.searchParams.get('topic');
    const paymentId = String(body?.data?.id || url.searchParams.get('data.id') || url.searchParams.get('id') || '');

    if (tipo !== 'payment' || !/^\d{1,20}$/.test(paymentId)) return json({ ok: true, ignorado: true });

    if (process.env.MP_WEBHOOK_SECRET && !firmaValida(request, paymentId)) {
        return json({ ok: false, error: 'Firma inválida' }, 401);
    }

    let pago;
    try {
        pago = await consultarPagoMP(paymentId);
    } catch (err) {
        console.error('No se pudo consultar el pago', paymentId, err);
        return json({ ok: false }, 502); // Mercado Pago reintentará
    }
    if (!pago) return json({ ok: true, ignorado: true });

    try {
        await notificarPlanilla({
            accion: 'pago',
            pedidoId: pago.external_reference,
            pagoId: paymentId,
            estado: pago.status,
            detalle: pago.status_detail,
            total: pago.transaction_amount,
            email: pago.payer?.email || ''
        });
    } catch (err) {
        console.error('No se pudo registrar el pago en la planilla:', err);
    }
    return json({ ok: true });
}

// https://www.mercadopago.cl/developers/es/docs/your-integrations/notifications/webhooks
function firmaValida(request, dataId) {
    const firma = request.headers.get('x-signature') || '';
    const requestId = request.headers.get('x-request-id') || '';
    const partes = Object.fromEntries(firma.split(',').map(p => p.trim().split('=')));
    if (!partes.ts || !partes.v1) return false;

    const manifiesto = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${partes.ts};`;
    const esperada = createHmac('sha256', process.env.MP_WEBHOOK_SECRET).update(manifiesto).digest('hex');
    const a = Buffer.from(esperada);
    const b = Buffer.from(partes.v1);
    return a.length === b.length && timingSafeEqual(a, b);
}
