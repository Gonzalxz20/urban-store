/* ==================== ESTADO DE UN PAGO ====================
   La página de resultado consulta aquí el estado real del pago directamente a
   Mercado Pago. Nunca se muestra una compra como pagada solo porque la URL lo diga.
*/
import { json, consultarPagoMP } from './_lib/catalogo.js';

export async function GET(request) {
    if (!process.env.MP_ACCESS_TOKEN) return json({ error: 'El pago online no está habilitado.' }, 503);

    // Se pide también el número de pedido para que nadie pueda consultar pagos ajenos adivinando ids
    const params = new URL(request.url).searchParams;
    const paymentId = params.get('payment_id') || '';
    const pedidoId = params.get('ref') || '';
    if (!/^\d{1,20}$/.test(paymentId) || !pedidoId) return json({ error: 'Pago no encontrado.' }, 400);

    let pago;
    try {
        pago = await consultarPagoMP(paymentId);
    } catch (err) {
        console.error(err);
        return json({ error: 'No pudimos confirmar el pago. Intenta más tarde.' }, 502);
    }
    if (!pago || pago.external_reference !== pedidoId) return json({ error: 'Pago no encontrado.' }, 404);

    return json({
        estado: pago.status,                  // approved | pending | in_process | rejected | cancelled | refunded
        detalle: pago.status_detail,
        pedidoId: pago.external_reference,
        total: pago.transaction_amount,
        moneda: pago.currency_id,
        metodo: pago.payment_method_id
    });
}
