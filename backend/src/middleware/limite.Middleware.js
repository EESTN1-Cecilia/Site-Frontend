// Límite general de pedidos por IP (protege de ráfagas, scraping y fuerza bruta
// distribuida sobre cualquier ruta; el login además tiene su propio límite, más
// estricto). Vive en memoria: con varias instancias del backend cada una cuenta
// por su lado. Detrás de un proxy hay que definir TRUST_PROXY para que req.ip
// sea la IP real del cliente.
//
//   RATE_LIMIT_MAX        pedidos permitidos por ventana y por IP (600 por defecto)
//   RATE_LIMIT_VENTANA_S  duración de la ventana en segundos (60 por defecto)
function crearLimite({ max = 600, ventanaMs = 60 * 1000, ahora = Date.now } = {}) {
  const contadores = new Map(); // ip -> { desde, cuenta }

  // Se barren las IPs vencidas para que el mapa no crezca sin límite.
  const limpiar = setInterval(() => {
    const t = ahora();
    for (const [ip, c] of contadores) if (t - c.desde >= ventanaMs) contadores.delete(ip);
  }, ventanaMs);
  limpiar.unref();

  function limitar(req, res, next) {
    const t = ahora();
    const ip = req.ip || 'desconocida';
    let c = contadores.get(ip);

    if (!c || t - c.desde >= ventanaMs) {
      c = { desde: t, cuenta: 0 };
      contadores.set(ip, c);
    }

    c.cuenta += 1;
    const restan = Math.max(0, max - c.cuenta);
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(restan));

    if (c.cuenta > max) {
      const espera = Math.max(1, Math.ceil((c.desde + ventanaMs - t) / 1000));
      res.setHeader('Retry-After', String(espera));
      return res.status(429).json({ error: 'Demasiados pedidos. Probá de nuevo en unos instantes.' });
    }

    next();
  }

  limitar.reiniciar = () => contadores.clear();
  return limitar;
}

const entero = (valor, porDefecto) => {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : porDefecto;
};

const limitarPedidos = crearLimite({
  max: entero(process.env.RATE_LIMIT_MAX, 600),
  ventanaMs: entero(process.env.RATE_LIMIT_VENTANA_S, 60) * 1000,
});

module.exports = { crearLimite, limitarPedidos };
