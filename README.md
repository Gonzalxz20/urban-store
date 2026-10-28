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

1. **Archivo > Compartir > Publicar en la web** → la pestaña donde están tus prendas (hoy es `Hoja 4`) → formato **Valores separados por comas (.csv)** → Publicar. Copia el enlace.
2. **Compartir** (botón verde) → Acceso general: **Restringido**. Así nadie puede abrir la planilla; solo existe el enlace CSV, que queda guardado en Vercel y nunca aparece en la tienda.

> Google actualiza el CSV publicado cada ~5 minutos y Vercel guarda la respuesta 1 minuto, así que los cambios de la hoja tardan unos minutos en verse.

## 3. Subir a Vercel (desde GitHub)

El proyecto ya está en GitHub (`Gonzalxz20/urban-store`), así que no necesitas la terminal:

1. Sube tus últimos cambios a GitHub (commit + push).
2. En [vercel.com/new](https://vercel.com/new) elige **Import** junto a `urban-store`.
3. En la pantalla de configuración:
   - **Framework Preset:** Other
   - **Build Command / Output Directory:** déjalos vacíos
   - **Environment Variables:** agrega
     - `SHEET_CSV_URL` = el enlace CSV del paso 2
     - `WHATSAPP_TIENDA` = `+56 9 5417 9298` (el número que recibe los pedidos)
4. Presiona **Deploy**. Desde ahí, cada push a `main` se publica solo.

Para comprobar que funciona, abre `https://TU-PROYECTO.vercel.app/api/productos`: debe mostrar tus prendas en formato JSON. Si dice "Falta configurar SHEET_CSV_URL", agrega la variable en **Settings > Environment Variables** y vuelve a desplegar (**Deployments > ⋯ > Redeploy**), porque las variables nuevas solo se aplican en el siguiente despliegue.

## Probar en tu computador

```bash
npm run dev
```

Abre http://localhost:3000. Sin `.env.local` usa la plantilla de ejemplo; para usar tu hoja real copia `.env.example` como `.env.local` y pega tu enlace.
