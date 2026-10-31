/* ==================== SITEMAP PARA BUSCADORES ====================
   Se sirve como /sitemap.xml (ver vercel.json) con la portada, las categorías
   y cada producto visible de la hoja.
*/
import { cargarCatalogo, origenSitio } from './_lib/catalogo.js';

export async function GET(request) {
    const origen = origenSitio(request);
    let urls = ['/', '/tienda', '/ofertas', '/novedades'];
    try {
        const { productos, categorias } = await cargarCatalogo();
        urls = urls.concat(
            categorias.map(c => `/categoria/${c.slug}`),
            productos.map(p => `/producto/${encodeURIComponent(p.id)}`)
        );
    } catch (err) {
        console.error('Sitemap sin productos:', err);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${escapeXml(origen + u)}</loc></url>`).join('\n')}
</urlset>`;

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=0, s-maxage=3600'
        }
    });
}

function escapeXml(text) {
    return text.replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}
