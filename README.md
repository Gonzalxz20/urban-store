# RE-VIBE · Tienda

Tienda de ropa pre-loved que lee el inventario desde Google Sheets y recibe pedidos por WhatsApp.

```
index.html              La tienda (diseño mobile-first)
api/productos.js        Función de Vercel: lee la hoja y entrega los productos
plantilla/              Plantilla de la hoja "inventario" para importar
scripts/dev.js          Servidor para probar en tu computador
```

## 1. Preparar la hoja "inventario"

1. Abre la hoja y ve a **Archivo > Importar > Subir** y elige `plantilla/inventario-plantilla.csv`.
   Selecciona **Reemplazar hoja actual**.
2. Columnas:

| Columna | Qué poner |
|---|---|
| `id` | Código único (ej. `RV-001`). Si lo dejas vacío se usa el número de fila |
| `nombre` | Nombre de la prenda (obligatorio) |
| `categoria` | Poleras, Chaquetas, etc. Se crean los botones solos |
| `marca` | Opcional |
| `talla` | XS, S, M, L, XL, 38, 40… |
| `estado` | Ej. "Como Nuevo". Se usa en el filtro de estado |
| `precio` | Solo el número: `18990` (también acepta `$18.990`). Obligatorio |
| `precio_anterior` | Opcional. Si es mayor al precio, se muestra tachado con % de descuento |
| `disponible` | `SI` (o vacío), `RESERVADO`, `VENDIDO`, `OCULTO` (no aparece) |
| `destacado` | `SI` para que aparezca primero con estrella |
| `imagenes` | Enlaces de fotos separados por ` \| `. Sirven enlaces normales de Google Drive (la foto debe estar compartida como "Cualquier persona con el enlace") |
| `medidas` | Separadas por ` \| `, ej. `Largo 70 cm \| Ancho 55 cm` |
| `descripcion` | Texto libre (puede tener comas) |

## 2. Publicarla como CSV y dejarla privada

1. **Archivo > Compartir > Publicar en la web** → pestaña `Hoja 1` → formato **Valores separados por comas (.csv)** → Publicar. Copia el enlace.
2. **Compartir** (botón verde) → Acceso general: **Restringido**. Así nadie puede abrir la planilla; solo existe el enlace CSV, que queda guardado en Vercel y nunca aparece en la tienda.

> Google actualiza el CSV publicado cada ~5 minutos y Vercel guarda la respuesta 1 minuto, así que los cambios de la hoja tardan unos minutos en verse.

## 3. Subir a Vercel

1. Crea una cuenta en [vercel.com](https://vercel.com) e instala la CLI, o usa `npx`:
   ```bash
   npx vercel
   ```
   Acepta los valores por defecto (Framework: **Other**, sin comando de build).
   El archivo `vercel.json` configura automáticamente las funciones de API.
2. En el proyecto de Vercel: **Settings > Environment Variables** y agrega:
   - `SHEET_CSV_URL` = el enlace CSV del paso 2
   - `WHATSAPP_TIENDA` = `+56943544565` (el número que recibe los pedidos)
3. Publica en producción:
   ```bash
   npx vercel --prod
   ```

## Probar en tu computador

```bash
npm run dev
```

Abre http://localhost:3000. Sin `.env.local` usa la plantilla de ejemplo; para usar tu hoja real copia `.env.example` como `.env.local` y pega tu enlace.
