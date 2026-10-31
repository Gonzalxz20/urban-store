/* robots.txt con la dirección real del sitio (se sirve como /robots.txt, ver vercel.json) */
import { origenSitio } from './_lib/catalogo.js';

export function GET(request) {
    const texto = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /checkout
Disallow: /carrito
Disallow: /pedido/

Sitemap: ${origenSitio(request)}/sitemap.xml
`;
    return new Response(texto, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=0, s-maxage=86400' }
    });
}
