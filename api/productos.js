/* ==================== API DE PRODUCTOS (Vercel Function) ====================
   Lee la hoja "inventario" publicada como CSV y devuelve solo los datos que
   necesita la tienda. El enlace del CSV vive en la variable SHEET_CSV_URL de
   Vercel, así que nunca llega al navegador del cliente.
*/
import { cargarCatalogo, configTienda, json, ErrorConfig } from './_lib/catalogo.js';

export async function GET() {
    try {
        const { productos, categorias } = await cargarCatalogo();
        return json(
            { tienda: configTienda(), categorias, productos },
            200,
            // La CDN de Vercel guarda la respuesta 60 s y sirve la copia anterior mientras actualiza
            { 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' }
        );
    } catch (err) {
        if (err instanceof ErrorConfig) return json({ error: err.message }, 500);
        console.error('Error leyendo la hoja:', err);
        return json({ error: 'No se pudo leer el inventario.' }, 502);
    }
}
