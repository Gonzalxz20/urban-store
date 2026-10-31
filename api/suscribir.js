/* ==================== SUSCRIPCIÓN A NOVEDADES ====================
   Guarda el correo en la pestaña "suscriptores" de la planilla mediante el
   Apps Script (APPS_SCRIPT_URL). Sin esa variable la sección no se muestra.
*/
import { json, esEmailValido, notificarPlanilla } from './_lib/catalogo.js';

export async function POST(request) {
    if (!process.env.APPS_SCRIPT_URL) return json({ error: 'La suscripción todavía no está habilitada.' }, 503);

    const body = await request.json().catch(() => ({}));
    if (body.empresa) return json({ ok: true }); // campo trampa: solo lo llenan los bots

    const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
    if (!esEmailValido(email)) return json({ error: 'Ingresa un correo válido.' }, 422);

    try {
        await notificarPlanilla({ accion: 'suscripcion', email });
        return json({ ok: true });
    } catch (err) {
        console.error('No se pudo guardar la suscripción:', err);
        return json({ error: 'No pudimos registrar tu correo. Intenta más tarde.' }, 502);
    }
}
