# URBAN-STORE · Tienda online

Tienda online pensada primero para el teléfono. El catálogo se administra desde Google Sheets, los pagos con tarjeta van por **Mercado Pago** (Checkout Pro) y también se pueden recibir pedidos por **WhatsApp**.
No usa frameworks ni dependencias: HTML, CSS y JavaScript, más funciones de Vercel en `api/`.

```
index.html               Estructura base, SEO y datos para redes sociales
assets/app.js            La tienda: portada, catálogo, búsqueda, ficha, favoritos, carrito, pago y ayuda
assets/styles.css        Diseño (mobile-first)
api/productos.js         Entrega el catálogo (lee la hoja; el enlace de la hoja nunca llega al navegador)
api/checkout.js          Crea el pago en Mercado Pago con los precios y el stock de la hoja
api/pago.js              Confirma el estado de un pago consultando directamente a Mercado Pago
api/mp-webhook.js        Recibe los avisos de pago de Mercado Pago
api/suscribir.js         Newsletter
api/sitemap.js           /sitemap.xml (todas las categorías y productos)
api/robots.js            /robots.txt
api/_lib/catalogo.js     Lectura de la hoja, validaciones y utilidades (no es una ruta pública)
docs/                    Plantillas de la hoja y Apps Script (no se publican)
scripts/dev.js           Servidor para probar en tu computador
vercel.json              Rutas de la tienda y cabeceras de seguridad
```

## 1. La hoja de productos (tu panel de administración)

Cada fila es un producto. Para empezar, importa `docs/plantilla-productos.csv` (**Archivo > Importar > Subir**) o agrega las columnas que falten a tu hoja actual: los nombres pueden ir con mayúsculas, tildes o espacios (`Precio anterior` = `precio_anterior`), y el orden de las columnas da lo mismo.

| Columna | Qué poner |
|---|---|
| `id` | Código único, ej. `US-001`. No lo cambies después de publicar: es lo que guarda el carrito. Si lo dejas vacío se usa el número de fila |
| `nombre` | Obligatorio |
| `categoria` | Ej. `Ropa Mujer`. Las categorías se crean solas con esta columna. Si está vacía, el producto va a `Otros` |
| `marca` | Opcional. Aparece en la ficha y en el buscador |
| `tallas` | Separadas por ` \| `: `S \| M \| L` o `38 \| 40 \| 42`. Si hay más de una, el cliente debe elegir antes de comprar |
| `colores` | Igual que las tallas: `Negro \| Blanco` |
| `estado` | Opcional: `Nuevo`, `Como nuevo`… |
| `precio` | Obligatorio. Solo el número: `19990` (también acepta `$19.990`). Sin precio, el producto no se muestra |
| `precio_anterior` | Opcional. Si es mayor que `precio`, se muestra tachado con el % de descuento y el producto entra en **Ofertas** |
| `stock` | Unidades disponibles. Vacío = 1 unidad (pieza única). `0` = agotado |
| `disponible` | `SI` (o vacío), `RESERVADO`, `VENDIDO` o `AGOTADO`, y `OCULTO` para que no aparezca |
| `destacado` | `SI`: sale en la portada (carrusel principal, hasta 4) y en **Destacados** |
| `nuevo` | `SI`: etiqueta "Nuevo" y sección **Novedades**. Si nadie lo tiene, Novedades muestra las últimas 12 filas |
| `mas_vendido` | `SI`: sección **Más vendidos** |
| `imagenes` | Enlaces separados por ` \| `; la primera es la foto principal. Sirven los enlaces normales de Google Drive si la foto está compartida como **Cualquier persona con el enlace** |
| `medidas` | Separadas por ` \| `: `Largo 70 cm \| Ancho 55 cm` |
| `caracteristicas` | Ficha técnica, separada por ` \| `: `Algodón 100% \| Lavar a máquina` |
| `descripcion` | Texto libre (puede tener comas y saltos de línea) |

> **Stock:** la hoja se lee pero no se escribe, así que el stock **no se descuenta solo**. Después de cada venta actualiza `stock` (o pon `VENDIDO`). La tienda sí impide comprar más unidades de las que indica la hoja, y el servidor vuelve a revisar precio y stock antes de cada pago.

## 2. Categorías (opcional)

Sin hacer nada, las categorías salen de la columna `categoria`. Para ordenarlas, ponerles foto y descripción, o esconderlas, crea una pestaña `categorias` en la misma planilla (puedes importar `docs/plantilla-categorias.csv`, que trae Ropa Mujer, Ropa Hombre, Ropa Infantil, Calzado, Accesorios, Tecnología, Hogar, Belleza, Deportes y Otros):

| Columna | Qué poner |
|---|---|
| `nombre` | Igual que en la columna `categoria` de los productos |
| `imagen` | Foto de la categoría (si no, se usa la del primer producto) |
| `descripcion` | Texto bajo el título de la categoría |
| `orden` | 1, 2, 3… (orden en el menú y en la portada) |
| `visible` | `NO` esconde la categoría **y sus productos** |

- **Agregar:** escribe la nueva categoría en los productos (y, si quieres, una fila en `categorias`).
- **Renombrar:** cambia el nombre en los productos y en `categorias`. La dirección de la página cambia con el nombre.
- **Eliminar:** pon `visible = NO` o mueve sus productos a otra categoría. Una categoría sin productos no se muestra.

Publica también esta pestaña como CSV (paso 3) y guarda su enlace en `SHEET_CATEGORIAS_CSV_URL`.

## 3. Publicar la hoja como CSV y dejarla privada

1. **Archivo > Compartir > Publicar en la web** → elige la pestaña de productos (hoy es `Hoja 4`) → formato **Valores separados por comas (.csv)** → Publicar. Copia el enlace. Repite con la pestaña `categorias` si la usas.
2. **Compartir** → Acceso general: **Restringido**. Nadie puede abrir la planilla; solo existen los enlaces CSV, que quedan guardados en Vercel y nunca aparecen en la tienda.

> Google actualiza el CSV publicado cada ~5 minutos y la tienda guarda el catálogo 1 minuto, así que los cambios tardan unos minutos en verse.

## 4. Pagos con Mercado Pago

Los precios del pago salen siempre de la hoja (nunca del navegador), y la tienda muestra "Compra confirmada" **solo** cuando Mercado Pago confirma el pago como aprobado. Sin `MP_ACCESS_TOKEN`, la tienda ofrece solo el pedido por WhatsApp.

1. Entra a [Mercado Pago Developers](https://www.mercadopago.cl/developers/panel/app) con la cuenta que recibirá el dinero y crea una aplicación (producto: **Checkout Pro**).
2. Para probar: usa el *Access Token* de las credenciales de prueba de tu aplicación como `MP_ACCESS_TOKEN` y paga con las tarjetas de prueba que indica la documentación de Checkout Pro. Ningún cobro de prueba es real.
3. Para vender: activa las **Credenciales de producción** y reemplaza `MP_ACCESS_TOKEN` por el *Access Token* de producción (empieza con `APP_USR-`).
4. En la aplicación, **Webhooks > Configurar notificaciones**: URL `https://TU-DOMINIO/api/mp-webhook`, evento **Pagos**. Copia la **clave secreta** que aparece ahí en `MP_WEBHOOK_SECRET`.

> El retorno automático a la tienda y los avisos de pago solo funcionan con `https`, es decir, una vez publicada en Vercel. En tu computador el pago se crea igual, pero hay que volver a la tienda manualmente.

## 5. Registro de pedidos, pagos y suscriptores (Apps Script)

Para que cada pedido, pago y suscripción quede anotado en tu planilla (pestañas `pedidos`, `pagos` y `suscriptores`, que se crean solas):

1. Planilla → **Extensiones > Apps Script**. Pega el contenido de `docs/apps-script.gs`.
2. Cambia `CAMBIA_ESTA_CLAVE` por una clave larga inventada por ti: va en Vercel como `APPS_SCRIPT_TOKEN`.
3. **Implementar > Nueva implementación > Aplicación web**, con *Ejecutar como: Yo* y *Quién tiene acceso: Cualquier usuario*. Autoriza y copia la URL (termina en `/exec`): va en `APPS_SCRIPT_URL`.

Sin `APPS_SCRIPT_URL`, el formulario de newsletter no se muestra y los pagos se pueden revisar igual en tu cuenta de Mercado Pago.

## 6. Publicar en Vercel (desde GitHub)

El proyecto está en GitHub (`Gonzalxz20/urban-store`):

1. Sube los cambios a GitHub (commit + push a `main`).
2. En [vercel.com/new](https://vercel.com/new) importa `urban-store` (o abre el proyecto si ya existe). **Framework Preset:** Other; deja vacíos Build Command y Output Directory.
3. En **Settings > Environment Variables** carga:

| Variable | Obligatoria | Para qué |
|---|---|---|
| `SHEET_CSV_URL` | Sí | Enlace CSV de la pestaña de productos |
| `SHEET_CATEGORIAS_CSV_URL` | No | Enlace CSV de la pestaña `categorias` |
| `WHATSAPP_TIENDA` | Sí | Número que recibe los pedidos, con código de país |
| `SITE_URL` | Recomendada | Tu dominio con `https://` y sin `/` final. Se usa en el sitemap y para volver desde Mercado Pago |
| `MP_ACCESS_TOKEN` | Para cobrar online | Access Token de Mercado Pago |
| `MP_WEBHOOK_SECRET` | Recomendada con Mercado Pago | Clave secreta de los webhooks |
| `APPS_SCRIPT_URL` | No | URL `/exec` del Apps Script |
| `APPS_SCRIPT_TOKEN` | Con Apps Script | La misma clave que pusiste en el script |

4. **Deploy**. Las variables nuevas se aplican en el siguiente despliegue (**Deployments > ⋯ > Redeploy**).
5. Tu dominio se conecta en **Settings > Domains**.

Para revisar que funciona abre `https://TU-DOMINIO/api/productos`: debe mostrar tus productos en JSON. Si dice "Falta configurar SHEET_CSV_URL", falta esa variable o el redeploy.

## Probar en tu computador

Necesitas Node.js 20 o superior.

```bash
npm run dev
```

Abre http://localhost:3000 (otro puerto con la variable `PORT`). Copia `.env.example` como `.env.local` y completa las variables que quieras probar; sin `SHEET_CSV_URL` usa `docs/plantilla-productos.csv`. El servidor local aplica las mismas rutas y cabeceras de seguridad de `vercel.json`.

## Qué queda en manos de la tienda

- **Sin cuentas de clientes:** los clientes compran sin registrarse. Productos, stock y ventas se gestionan desde la planilla (pestañas `pedidos` y `pagos`) y desde tu cuenta de Mercado Pago. Si el cliente lo marca en el pago, sus datos de envío quedan guardados en su propio dispositivo para la próxima compra.
- **Costo de envío:** se coordina después de la compra y no se cobra en el pago online. Si quieres cobrarlo en el checkout hay que definir las tarifas.
- **Textos legales:** agrega tus políticas de cambios y devoluciones (derecho a retracto), privacidad y términos de venta antes de vender.
