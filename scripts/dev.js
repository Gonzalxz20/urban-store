/* Servidor local para probar la tienda sin Vercel: npm run dev
   - Sirve index.html y llama a api/productos.js igual que Vercel.
   - Si no hay SHEET_CSV_URL en .env.local, usa plantilla/inventario-plantilla.csv.
*/
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.env.PORT) || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };

const envFile = join(ROOT, '.env.local');
if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
        if (match && !(match[1] in process.env)) process.env[match[1]] = match[2];
    }
}
if (!process.env.SHEET_CSV_URL) {
    process.env.SHEET_CSV_URL = `http://localhost:${PORT}/__plantilla.csv`;
    console.log('Sin SHEET_CSV_URL: usando plantilla/inventario-plantilla.csv');
}

const { GET } = await import('../api/productos.js');

createServer(async (req, res) => {
    const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
    try {
        if (pathname === '/api/productos') {
            const response = await GET(new Request(`http://localhost:${PORT}${req.url}`));
            res.writeHead(response.status, Object.fromEntries(response.headers));
            return res.end(await response.text());
        }
        const file = pathname === '/__plantilla.csv'
            ? join(ROOT, 'plantilla', 'inventario-plantilla.csv')
            : join(ROOT, pathname === '/' ? 'index.html' : pathname);
        if (!file.startsWith(ROOT) || pathname.includes('/.')) throw new Error('Ruta inválida');
        const body = await readFile(file);
        res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
        res.end(body);
    } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('No encontrado');
    }
}).listen(PORT, () => console.log(`Tienda en http://localhost:${PORT}`));
