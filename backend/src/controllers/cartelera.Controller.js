const crypto = require('crypto');
const db = require('../database/db');
const { DatoInvalido, falla, esObjeto } = require('../utils/contenido');
const { ROLES } = require('../utils/roles');
const { restablecerSemana } = require('./asignaciones.Controller');

// Cartelera digital: imágenes y plano en vivo para los televisores.
//
// Jerarquía (de más a menos prioridad): Dirección > Jefatura de Área > EMATP.
//   - En la pantalla pasan primero las imágenes de Dirección, después las de
//     Jefatura y al final las de EMATP.
//   - «Fijada»: mientras esté vigente, en su nivel sólo se ven las fijadas
//     (y nada de los niveles de abajo); los niveles de arriba siguen.
//   - Cada uno cambia o quita lo de su nivel y lo de los niveles de abajo,
//     nunca lo de arriba (EMATP no toca lo de Dirección).
// Los televisores no inician sesión: entran con el enlace de su pantalla.

class NoEncontrado extends Error {}
class Prohibido extends Error {}

const NIVELES = { [ROLES.DIRECCION]: 3, [ROLES.JEFATURA_AREA]: 2, [ROLES.SERVIDOR]: 1 };
const NOMBRES = { 3: 'Dirección', 2: 'Jefatura de Área', 1: 'EMATP' };
const MAXIMO = 100;

const responder = (nombre, accion) => async (req, res) => {
  try {
    return await accion(req, res);
  } catch (error) {
    if (error instanceof DatoInvalido) return res.status(400).json({ error: error.message });
    if (error instanceof NoEncontrado) return res.status(404).json({ error: error.message });
    if (error instanceof Prohibido) return res.status(403).json({ error: error.message });
    console.error(`[Cartelera] Error en ${nombre}:`, error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Fecha local de hoy, «2026-10-26».
const hoy = (fecha = new Date()) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const fechaOpcional = (valor, nombre) => {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string' || !FECHA.test(valor) || Number.isNaN(Date.parse(valor))) falla(`${nombre}: fecha inválida`);
  return valor;
};

// Sólo imágenes de verdad: se mira el contenido, no lo que dice el navegador.
function tipoDeImagen(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buffer.toString('ascii', 0, 4) === 'GIF8') return 'image/gif';
  return null;
}

// Título, duración, vigencia, activo y fijada (lo común a cargar y cambiar).
function campos(cuerpo, actual = {}) {
  const c = esObjeto(cuerpo) ? cuerpo : {};
  const titulo = c.titulo === undefined ? actual.titulo ?? '' : String(c.titulo).trim();
  if (titulo.length > 120) falla('El título puede tener hasta 120 caracteres');
  const duracion = c.duracion === undefined || c.duracion === '' ? actual.duracion ?? 10 : Number(c.duracion);
  if (!Number.isInteger(duracion) || duracion < 5 || duracion > 120) falla('La duración tiene que ser de 5 a 120 segundos');
  const desde = c.desde === undefined ? actual.desde ?? null : fechaOpcional(c.desde, 'Desde');
  const hasta = c.hasta === undefined ? actual.hasta ?? null : fechaOpcional(c.hasta, 'Hasta');
  if (desde && hasta && desde > hasta) falla('La fecha «hasta» tiene que ser igual o posterior a «desde»');
  const si = (v, previo) => (v === undefined ? !!previo : v === true || v === 'true' || v === '1' || v === 1);
  return { titulo, duracion, desde, hasta, activo: si(c.activo, actual.activo ?? 1), fijada: si(c.fijada, actual.fijada) };
}

const publica = (f) => ({
  id: f.id,
  clave: f.clave,
  titulo: f.titulo,
  duracion: f.duracion,
  desde: f.desde,
  hasta: f.hasta,
  activo: !!f.activo,
  fijada: !!f.fijada,
  nivel: f.nivel,
  autor: f.autor ?? null,
  origen: NOMBRES[f.nivel],
  created_at: f.created_at,
});

const leer = () =>
  db.obtenerFilas(
    `SELECT c.id, c.clave, c.titulo, c.duracion, c.desde, c.hasta, c.activo, c.fijada, c.nivel, c.orden, c.created_at,
            COALESCE(u.nombre, u.username) AS autor
     FROM cartelera c LEFT JOIN usuarios u ON u.id = c.autor_id
     ORDER BY c.nivel DESC, c.orden, c.id DESC`
  );

// Lo que pasa hoy por la pantalla, en orden (ver la jerarquía arriba).
function programa(items, fecha = hoy()) {
  const vigentes = items.filter((i) => i.activo && (!i.desde || i.desde <= fecha) && (!i.hasta || i.hasta >= fecha));
  const fijadas = vigentes.filter((i) => i.fijada);
  const nivelFijado = fijadas.length ? Math.max(...fijadas.map((i) => i.nivel)) : 0;
  return vigentes
    .filter((i) => i.nivel > nivelFijado || (i.nivel === nivelFijado && i.fijada))
    .sort((a, b) => b.nivel - a.nivel || a.orden - b.orden || b.id - a.id);
}

const nivelDe = (req) => NIVELES[req.usuario.rol] ?? 0;
const exigirNivel = (req, item) => {
  if (!item) throw new NoEncontrado('Esa imagen ya no está en la cartelera');
  if (nivelDe(req) < item.nivel) {
    throw new Prohibido(`Es de ${NOMBRES[item.nivel]}: sólo la puede cambiar ${item.nivel === 3 ? 'Dirección' : 'Dirección o Jefatura de Área'}`);
  }
};

// GET /api/cartelera: imágenes (sin el archivo), qué pasa hoy y las pantallas.
const listar = responder('listar', async (req, res) => {
  const items = await leer();
  const ahora = programa(items).map((i) => i.id);
  const gestiona = [ROLES.DIRECCION, ROLES.JEFATURA_AREA].includes(req.usuario.rol);
  return res.json({
    imagenes: items.map((i) => ({ ...publica(i), enPantalla: ahora.includes(i.id), puedeCambiar: nivelDe(req) >= i.nivel })),
    nivel: nivelDe(req),
    niveles: NOMBRES,
    pantallas: gestiona ? await db.obtenerFilas('SELECT id, nombre, token, created_at FROM pantallas ORDER BY id') : null,
  });
});

// POST /api/cartelera (multipart: archivo + titulo, duracion, desde, hasta, fijada)
const crear = responder('crear', async (req, res) => {
  const mime = tipoDeImagen(req.file?.buffer);
  if (!mime) falla('El archivo tiene que ser una imagen JPG, PNG, WEBP o GIF');
  const total = (await db.obtenerFila('SELECT COUNT(*) AS n FROM cartelera')).n;
  if (total >= MAXIMO) falla(`La cartelera ya tiene ${MAXIMO} imágenes: quitá alguna antes de agregar otra`);
  const c = campos(req.body);
  const nivel = nivelDe(req);
  const orden = (await db.obtenerFila('SELECT COALESCE(MIN(orden), 1) - 1 AS n FROM cartelera WHERE nivel = ?', nivel)).n;
  const r = await db.ejecutar(
    `INSERT INTO cartelera (clave, titulo, mime, datos, duracion, desde, hasta, activo, fijada, nivel, orden, autor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    crypto.randomBytes(16).toString('hex'), c.titulo, mime, req.file.buffer, c.duracion, c.desde, c.hasta,
    c.activo ? 1 : 0, c.fijada ? 1 : 0, nivel, orden, req.usuario.id
  );
  const fila = (await leer()).find((i) => i.id === r.lastID);
  return res.status(201).json({ imagen: publica(fila) });
});

// PUT /api/cartelera/:id { titulo?, duracion?, desde?, hasta?, activo?, fijada? }
const modificar = responder('modificar', async (req, res) => {
  const actual = (await leer()).find((i) => i.id === Number(req.params.id));
  exigirNivel(req, actual);
  const c = campos(req.body, actual);
  await db.ejecutar(
    `UPDATE cartelera SET titulo = ?, duracion = ?, desde = ?, hasta = ?, activo = ?, fijada = ?, updated_at = datetime('now')
     WHERE id = ?`,
    c.titulo, c.duracion, c.desde, c.hasta, c.activo ? 1 : 0, c.fijada ? 1 : 0, actual.id
  );
  return res.json({ imagen: publica((await leer()).find((i) => i.id === actual.id)) });
});

// DELETE /api/cartelera/:id
const quitar = responder('quitar', async (req, res) => {
  const actual = (await leer()).find((i) => i.id === Number(req.params.id));
  exigirNivel(req, actual);
  await db.ejecutar('DELETE FROM cartelera WHERE id = ?', actual.id);
  return res.json({ ok: true });
});

// POST /api/cartelera/:id/mover { hacia: "arriba" | "abajo" }: dentro de su nivel.
const mover = responder('mover', async (req, res) => {
  const items = await leer();
  const actual = items.find((i) => i.id === Number(req.params.id));
  exigirNivel(req, actual);
  const hacia = (req.body || {}).hacia;
  if (!['arriba', 'abajo'].includes(hacia)) falla('Indicá si sube o baja');
  const delNivel = items.filter((i) => i.nivel === actual.nivel);
  const i = delNivel.findIndex((x) => x.id === actual.id);
  const otro = delNivel[hacia === 'arriba' ? i - 1 : i + 1];
  if (otro) {
    // Se renumera el nivel entero: así nunca quedan dos con el mismo orden.
    const nuevo = [...delNivel];
    [nuevo[i], nuevo[nuevo.indexOf(otro)]] = [otro, actual];
    await db.transaccion(async () => {
      for (const [n, x] of nuevo.entries()) await db.ejecutar('UPDATE cartelera SET orden = ? WHERE id = ?', n, x.id);
    });
  }
  return res.json({ ok: true });
});

// GET /api/cartelera/imagen/:clave: la imagen (pública por su clave aleatoria;
// el televisor la pide sin sesión).
const imagen = responder('imagen', async (req, res) => {
  const fila = await db.obtenerFila('SELECT mime, datos FROM cartelera WHERE clave = ?', String(req.params.clave));
  if (!fila) throw new NoEncontrado('No existe');
  res.setHeader('Content-Type', fila.mime);
  res.setHeader('Cache-Control', 'private, max-age=86400, immutable');
  return res.send(fila.datos);
});

// ---------- Pantallas (televisores) ----------
const nuevoToken = () => crypto.randomBytes(24).toString('base64url');

const crearPantalla = responder('crearPantalla', async (req, res) => {
  const nombre = String((req.body || {}).nombre ?? '').trim();
  if (!nombre || nombre.length > 60) falla('Poné un nombre a la pantalla (hasta 60 caracteres), por ejemplo «Corredor planta baja»');
  const r = await db.ejecutar('INSERT INTO pantallas (nombre, token) VALUES (?, ?)', nombre, nuevoToken());
  return res.status(201).json({ pantalla: await db.obtenerFila('SELECT id, nombre, token, created_at FROM pantallas WHERE id = ?', r.lastID) });
});

// Enlace nuevo: el anterior deja de funcionar (por si se filtró).
const renovarPantalla = responder('renovarPantalla', async (req, res) => {
  const r = await db.ejecutar('UPDATE pantallas SET token = ? WHERE id = ?', nuevoToken(), Number(req.params.id));
  if (!r.changes) throw new NoEncontrado('Esa pantalla no existe');
  return res.json({ pantalla: await db.obtenerFila('SELECT id, nombre, token, created_at FROM pantallas WHERE id = ?', Number(req.params.id)) });
});

const quitarPantalla = responder('quitarPantalla', async (req, res) => {
  const r = await db.ejecutar('DELETE FROM pantallas WHERE id = ?', Number(req.params.id));
  if (!r.changes) throw new NoEncontrado('Esa pantalla no existe');
  return res.json({ ok: true });
});

// GET /api/cartelera/pantalla/:token: todo lo que muestra el televisor.
// Sólo grillas vigentes y sólo lo necesario para el plano y la lista de clases.
const pantalla = responder('pantalla', async (req, res) => {
  const p = await db.obtenerFila('SELECT id, nombre FROM pantallas WHERE token = ?', String(req.params.token));
  if (!p) throw new NoEncontrado('Este enlace de pantalla no existe o fue renovado');
  await restablecerSemana();
  const [salones, clases, items] = await Promise.all([
    db.obtenerFilas('SELECT id, piso, nombre, tipo, clasificacion, habilitado FROM salones ORDER BY piso, id'),
    db.obtenerFilas(
      `SELECT a.id, a.dia, m.clave AS hora, m.nombre AS modulo_nombre, m.turno,
              COALESCE(a.inicio, m.inicio) AS inicio, COALESCE(a.fin, m.fin) AS fin,
              a.salon_id, s.nombre AS salon, s.piso, d.nombre AS docente, g.nombre AS grupo, ma.nombre AS materia, a.estado,
              sh.nombre AS salon_habitual, a.observaciones,
              -- Lo que cargó o cambió una persona en las últimas 24 horas (no la importación).
              CASE WHEN a.actualizado_por IS NULL THEN NULL
                   WHEN a.created_at >= datetime('now', '-1 day') THEN 'nueva'
                   WHEN a.updated_at >= datetime('now', '-1 day') THEN 'cambio' END AS reciente
       FROM asignaciones a
       JOIN modulos m ON m.id = a.modulo_id
       JOIN grillas gl ON gl.id = m.grilla_id AND gl.vigente = 1
       LEFT JOIN salones s ON s.id = a.salon_id
       LEFT JOIN salones sh ON sh.id = a.salon_habitual
       LEFT JOIN docentes d ON d.id = a.docente_id
       LEFT JOIN grupos g ON g.id = a.grupo_id
       LEFT JOIN materias ma ON ma.id = a.materia_id`
    ),
    leer(),
  ]);
  return res.json({
    pantalla: { nombre: p.nombre },
    ahora: new Date().toISOString(),
    salones: salones.map((s) => ({ ...s, habilitado: !!s.habilitado })),
    clases,
    imagenes: programa(items).map((i) => ({ clave: i.clave, titulo: i.titulo, duracion: i.duracion, origen: NOMBRES[i.nivel], nivel: i.nivel })),
  });
});

module.exports = {
  listar,
  crear,
  modificar,
  quitar,
  mover,
  imagen,
  crearPantalla,
  renovarPantalla,
  quitarPantalla,
  pantalla,
  // Para los tests de la jerarquía.
  programa,
  tipoDeImagen,
};
