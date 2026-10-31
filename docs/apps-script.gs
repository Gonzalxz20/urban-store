/**
 * URBAN-STORE · Apps Script para registrar pedidos, pagos y suscriptores en la planilla.
 *
 * Cómo instalarlo (una sola vez):
 * 1. Abre tu planilla "inventario" > Extensiones > Apps Script.
 * 2. Borra el contenido y pega este archivo completo.
 * 3. Cambia TOKEN por una clave larga inventada por ti (la misma irá en Vercel como APPS_SCRIPT_TOKEN).
 * 4. Implementar > Nueva implementación > Tipo: Aplicación web
 *      - Ejecutar como: Yo
 *      - Quién tiene acceso: Cualquier usuario
 * 5. Autoriza los permisos y copia la URL de la aplicación web (termina en /exec).
 *    Esa URL va en Vercel como APPS_SCRIPT_URL.
 *
 * Crea solo las pestañas "pedidos", "pagos" y "suscriptores" la primera vez que se usan.
 */

const TOKEN = 'CAMBIA_ESTA_CLAVE';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (!TOKEN || TOKEN === 'CAMBIA_ESTA_CLAVE' || data.token !== TOKEN) {
      return respuesta({ ok: false, error: 'No autorizado' });
    }

    if (data.accion === 'suscripcion') {
      const hoja = obtenerHoja('suscriptores', ['fecha', 'email']);
      const existentes = hoja.getRange(2, 2, Math.max(hoja.getLastRow() - 1, 1), 1).getValues().flat();
      if (!existentes.includes(data.email)) hoja.appendRow([new Date(), data.email]);
    }

    if (data.accion === 'pedido') {
      const hoja = obtenerHoja('pedidos', [
        'fecha', 'pedido', 'estado', 'total', 'nombre', 'email', 'telefono',
        'direccion', 'comuna', 'region', 'notas', 'productos'
      ]);
      const c = data.cliente || {};
      const productos = (data.lineas || [])
        .map(l => `${l.nombre}${l.talla ? ' T:' + l.talla : ''}${l.color ? ' C:' + l.color : ''} x${l.cantidad} ($${l.precio})`)
        .join('\n');
      hoja.appendRow([
        new Date(), data.pedidoId, data.estado, data.total, c.nombre, c.email, c.telefono,
        c.direccion, c.comuna, c.region, c.notas, productos
      ]);
    }

    if (data.accion === 'pago') {
      const hoja = obtenerHoja('pagos', ['fecha', 'pedido', 'pago_id', 'estado', 'detalle', 'total', 'email']);
      hoja.appendRow([new Date(), data.pedidoId, data.pagoId, data.estado, data.detalle, data.total, data.email]);
      actualizarEstadoPedido(data.pedidoId, data.estado);
    }

    return respuesta({ ok: true });
  } catch (err) {
    return respuesta({ ok: false, error: String(err) });
  }
}

function obtenerHoja(nombre, encabezados) {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(nombre);
  if (!hoja) {
    hoja = libro.insertSheet(nombre);
    hoja.appendRow(encabezados);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function actualizarEstadoPedido(pedidoId, estado) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('pedidos');
  if (!hoja || !pedidoId) return;
  const ids = hoja.getRange(2, 2, Math.max(hoja.getLastRow() - 1, 1), 1).getValues().flat();
  const fila = ids.indexOf(pedidoId);
  if (fila !== -1) hoja.getRange(fila + 2, 3).setValue(estado);
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
