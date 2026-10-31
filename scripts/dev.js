/* Servidor local para probar la tienda sin Vercel: npm run dev
   - Llama a las funciones de api/ igual que Vercel (GET/POST con Request/Response).
   - Las páginas (/producto/..., /carrito, etc.) devuelven index.html, igual que
     las reglas "rewrites" de vercel.json.
   - Si no hay SHEET_CSV_URL en .env.local, usa docs/plantilla-productos.csv.
*/
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, extname, dirname, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.csv': 'text/csv; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
    '.json': 'application/json', '.webmanifest': 'application/manifest+json'
};

const envFile = join(ROOT, '.env.local');
if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
        if (match && !(match[1] in process.env)) process.env[match[1]] = match[2];
    }
}
if (!process.env.SHEET_CSV_URL) {
    process.env.SHEET_CSV_URL = `http://localhost:${PORT}/__plantilla.csv`;
    console.log('Sin SHEET_CSV_URL: usando docs/plantilla-productos.csv');
}

// Mismas cabeceras de seguridad que en Vercel (vercel.json): así la CSP se prueba en local
const { headers: reglasCabeceras = [] } = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf8'));
function cabecerasVercel(pathname) {
    const cabeceras = {};
    for (const regla of reglasCabeceras) {
        const patron = new RegExp(`^${regla.source.replace(/\(\.\*\)/g, '.*')}$`);
        if (patron.test(pathname)) for (const { key, value } of regla.headers) cabeceras[key] = value;
    }
    return cabeceras;
}

async function llamarFuncion(nombre, req, url) {
    const archivo = join(ROOT, 'api', `${nombre}.js`);
    if (!/^[\w-]+$/.test(nombre) || !existsSync(archivo)) return null;
    const modulo = await import(pathToFileURL(archivo).href);
    const handler = modulo[req.method];
    if (!handler) return new Response('Método no permitido', { status: 405 });

    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? Buffer.concat(chunks) : undefined;
    return handler(new Request(url, { method: req.method, headers: req.headers, body }));
}

createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let { pathname } = url;
    try {
        if (pathname === '/sitemap.xml') pathname = '/api/sitemap';
        if (pathname === '/robots.txt') pathname = '/api/robots';

        if (pathname.startsWith('/api/')) {
            const response = await llamarFuncion(pathname.slice(5).replace(/\/$/, ''), req, url);
            if (response) {
                res.writeHead(response.status, { ...cabecerasVercel(url.pathname), ...Object.fromEntries(response.headers) });
                return res.end(Buffer.from(await response.arrayBuffer()));
            }
            throw new Error('Función inexistente');
        }

        if (pathname === '/__plantilla.csv') {
            res.writeHead(200, { 'Content-Type': TYPES['.csv'] });
            return res.end(await readFile(join(ROOT, 'docs', 'plantilla-productos.csv')));
        }

        const file = normalize(join(ROOT, decodeURIComponent(pathname)));
        const esArchivo = extname(pathname) && file.startsWith(ROOT) && !pathname.includes('/.') && existsSync(file);
        const destino = esArchivo ? file : join(ROOT, 'index.html');
        if (!esArchivo && extname(pathname)) throw new Error('No existe');

        res.writeHead(200, { ...cabecerasVercel(pathname), 'Content-Type': TYPES[extname(destino)] || 'application/octet-stream' });
        res.end(await readFile(destino));
    } catch (err) {
        if (pathname.startsWith('/api/') && err.message !== 'Función inexistente') console.error(err);
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('No encontrado');
    }
}).listen(PORT, () => console.log(`Tienda en http://localhost:${PORT}`));
