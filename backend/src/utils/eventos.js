// Avisos en vivo (Server-Sent Events) para el plano y Espacios y horarios.
//
// Cada pantalla abierta mantiene un GET /api/eventos. Cuando alguien guarda
// una asignación, una grilla o un salón, el servidor manda un aviso
// { tipo, version } y las pantallas vuelven a pedir los datos: así lo que
// cambia una persona le aparece a las demás sin recargar.
//
// Los avisos no llevan datos de docentes ni de grupos: sólo qué cambió.
// Vale para un único proceso de Node (como corre hoy el backend). Con varias
// instancias detrás de un balanceador haría falta un canal compartido.

const clientes = new Set();
let version = Date.now();

const LATIDO_MS = 25000;

function suscribir(req, res) {
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    // nginx y otros proxies no deben guardar el stream en buffer.
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write(`retry: 3000\nevent: hola\ndata: ${JSON.stringify({ version })}\n\n`);

  // Un comentario cada tanto mantiene viva la conexión a través de proxies.
  const latido = setInterval(() => res.write(': latido\n\n'), LATIDO_MS);
  latido.unref();
  const cliente = { res, latido };
  clientes.add(cliente);

  req.on('close', () => {
    clearInterval(latido);
    clientes.delete(cliente);
  });
}

// tipo: 'asignaciones' | 'grillas' | 'salones' | 'catalogo'
function avisar(tipo) {
  version += 1;
  const mensaje = `event: cambio\ndata: ${JSON.stringify({ tipo, version })}\n\n`;
  for (const { res } of clientes) res.write(mensaje);
  return version;
}

const versionActual = () => version;
const conectados = () => clientes.size;

// Para los tests: corta todas las conexiones abiertas.
function cerrarTodo() {
  for (const { res, latido } of clientes) {
    clearInterval(latido);
    res.end();
  }
  clientes.clear();
}

module.exports = { suscribir, avisar, versionActual, conectados, cerrarTodo };
