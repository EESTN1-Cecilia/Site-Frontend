const db = require('../database/db');
const { leerGrillas, planoCompatible, HORA } = require('../database/espacios');
const { DIAS, TIPOS, PISOS, ESTADOS, CLASIFICACIONES, TURNOS, CICLOS } = require('../utils/salones');
const { DatoInvalido, falla, esObjeto, texto, textoOpcional, lista, identificador } = require('../utils/contenido');
const eventos = require('../utils/eventos');

// Espacios y horarios: una sola fuente de datos para la grilla semanal y el
// plano del colegio. Cada asignación es "tal docente da tal materia a tal
// grupo, en tal espacio, tal día y módulo (con su hora de inicio y fin)".
//
// Reglas (el frontend avisa antes, pero acá son las que valen):
//   - un espacio, un docente o un grupo no pueden tener dos clases activas
//     que se superpongan. Dos intervalos se superponen si cada uno empieza
//     antes de que termine el otro: 08:00-09:20 y 09:20-10:40 NO chocan;
//   - si alguna de las dos clases no tiene hora (el módulo no la tiene
//     cargada), se comparan por módulo: mismo día y mismo módulo chocan;
//   - sólo las asignaciones "activas" ocupan (docente ausente o suspendida no);
//   - excepción: dos clases marcadas «compartida» (así figuran en la
//     organización oficial) pueden compartir aula y grupo; el docente nunca;
//   - sólo se asignan clases a espacios clasificados AULA: los espacios
//     comunes (PAÑOL, E.O.E., administración…) se ven pero no admiten clases;
//   - no se asigna un espacio deshabilitado, ni más alumnos que su capacidad;
//   - cada cambio lleva la versión que vio quien edita: si otra persona lo
//     cambió en el medio, se rechaza (409) en vez de pisarlo.
// Todo cambio se hace en una transacción, de a uno (cola), y se avisa a las
// pantallas abiertas (utils/eventos.js).

class Conflicto extends Error {
  constructor(mensaje, extra = {}) {
    super(mensaje);
    this.extra = extra;
  }
}
class NoEncontrado extends Error {}

const responder = (nombre, accion) => async (req, res) => {
  try {
    return await accion(req, res);
  } catch (error) {
    if (error instanceof DatoInvalido) return res.status(400).json({ error: error.message });
    if (error instanceof NoEncontrado) return res.status(404).json({ error: error.message });
    if (error instanceof Conflicto) return res.status(409).json({ error: error.message, ...error.extra });
    if (error.code === 'SQLITE_CONSTRAINT') {
      return res.status(409).json({ error: 'Los datos chocan con otros guardados. Recargá y volvé a intentar.' });
    }
    console.error(`[Asignaciones] Error en ${nombre}:`, error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

let cola = Promise.resolve();
const enSerie = (tarea) => {
  const resultado = cola.then(tarea, tarea);
  cola = resultado.catch(() => {});
  return resultado;
};
const escribir = (tarea) => enSerie(() => db.transaccion(tarea));

// Lunes de la semana de `fecha` (hora local), «2026-10-26».
const lunesDe = (fecha = new Date()) => {
  const d = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---------- Horarios ----------
const aMinutos = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Intervalo [inicio, fin) en minutos de una asignación: el propio o el del módulo.
const intervalo = (a) =>
  a.inicio && a.fin ? [aMinutos(a.inicio), aMinutos(a.fin)] : null;

function seSuperponen(a, b) {
  if (a.dia !== b.dia) return false;
  const [x, y] = [intervalo(a), intervalo(b)];
  if (x && y) return x[0] < y[1] && x[1] > y[0];
  return a.hora === b.hora;
}

const cuando = (a) => `el ${a.dia} ${a.inicio ? `de ${a.inicio} a ${a.fin}` : `en ${a.modulo_nombre}`}`;

// ---------- Lecturas ----------
const CONSULTA = `
  SELECT a.id, a.version, m.grilla_id, m.clave AS hora, m.nombre AS modulo_nombre, a.modulo_id, a.dia,
         a.salon_id, s.nombre AS salon, s.piso,
         a.docente_id, d.nombre AS docente, a.materia_id, ma.nombre AS materia,
         a.grupo_id, gr.nombre AS grupo, gr.curso,
         COALESCE(a.inicio, m.inicio) AS inicio, COALESCE(a.fin, m.fin) AS fin,
         a.inicio AS inicio_propio, a.fin AS fin_propio,
         a.alumnos, a.estado, a.observaciones, a.updated_at, a.semana, a.compartida,
         a.salon_habitual, sh.nombre AS salon_habitual_nombre, gl.vigente AS grilla_vigente, m.turno AS turno
  FROM asignaciones a
  JOIN modulos m ON m.id = a.modulo_id
  JOIN grillas gl ON gl.id = m.grilla_id
  LEFT JOIN salones sh ON sh.id = a.salon_habitual
  LEFT JOIN salones s ON s.id = a.salon_id
  LEFT JOIN docentes d ON d.id = a.docente_id
  LEFT JOIN materias ma ON ma.id = a.materia_id
  LEFT JOIN grupos gr ON gr.id = a.grupo_id`;

const buscar = (id) => db.obtenerFila(`${CONSULTA} WHERE a.id = ?`, id);
const todas = () => db.obtenerFilas(`${CONSULTA} ORDER BY a.dia, m.orden, a.id`);
const salones = () =>
  db.obtenerFilas('SELECT id, piso, nombre, tipo, clasificacion, capacidad, habilitado FROM salones ORDER BY piso, id')
    .then((filas) => filas.map((s) => ({ ...s, habilitado: !!s.habilitado })));

// Un resumen sin datos de más, para mensajes de conflicto.
const resumen = (a) => ({
  id: a.id,
  dia: a.dia,
  inicio: a.inicio,
  fin: a.fin,
  hora: a.hora,
  modulo: a.modulo_nombre,
  grilla_id: a.grilla_id,
  salon_id: a.salon_id,
  salon: a.salon,
  docente: a.docente,
  materia: a.materia,
  grupo: a.grupo,
});

// ---------- Validación ----------
const idPositivo = (valor, nombre, opcional = false) => {
  if (opcional && (valor === null || valor === undefined || valor === '')) return null;
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) falla(`Elegí ${nombre}`);
  return n;
};

const horaOpcional = (valor, nombre) => {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor !== 'string' || !HORA.test(valor)) falla(`${nombre} tiene que tener el formato HH:MM`);
  return valor;
};

// Los espacios comunes no admiten clases, se pida como se pida.
const exigirAula = (salon) => {
  if (salon.tipo === 'institucional') {
    falla(`La ${salon.nombre} es un espacio institucional reservado y no puede asignarse a actividades académicas`);
  }
  if (salon.clasificacion !== 'AULA') {
    falla(`${salon.nombre} es un espacio común de uso institucional: no admite asignaciones de clases. Elegí un aula`);
  }
};

// Lo que llega del formulario → una asignación lista para comparar y guardar.
async function normalizar(cuerpo) {
  if (!esObjeto(cuerpo)) falla('La asignación tiene que ser un objeto');

  const grillaId = texto(cuerpo.grilla_id, 'grilla', 100);
  const clave = texto(cuerpo.hora, 'módulo', 100);
  const modulo = await db.obtenerFila(
    'SELECT id, clave, nombre, inicio, fin FROM modulos WHERE grilla_id = ? AND clave = ?', grillaId, clave
  );
  if (!modulo) falla('Elegí un módulo de la grilla');
  if (!DIAS.includes(cuerpo.dia)) falla('Elegí un día de lunes a viernes');
  // Lo que la grilla admite (vacío = todo): días, grupos y materias.
  const grilla = (await leerGrillas(db)).find((g) => g.id === grillaId);
  if (!grilla.dias.includes(cuerpo.dia)) falla(`La grilla ${grilla.nombre} no tiene actividad el ${cuerpo.dia}`);

  // Sin espacio vale (p. ej. «SUM» del PDF, que no está en el plano): la clase
  // no ocupa ningún aula hasta que se le asigne una.
  const sinEspacio = cuerpo.salon_id === null || cuerpo.salon_id === '';
  const salonId = sinEspacio ? null : identificador(cuerpo.salon_id, 'espacio');
  const salon = salonId && await db.obtenerFila(
    'SELECT id, nombre, tipo, clasificacion, capacidad, habilitado FROM salones WHERE id = ?', salonId
  );
  if (salonId && !salon) falla('Ese espacio no existe en el plano');
  if (salon) {
    exigirAula(salon);
    if (!salon.habilitado) falla(`${salon.nombre} está deshabilitado: habilitalo antes de asignarlo`);
  }

  const docenteId = idPositivo(cuerpo.docente_id, 'un docente');
  const docente = await db.obtenerFila('SELECT nombre FROM docentes WHERE id = ? AND activo = 1', docenteId);
  if (!docente) falla('Ese docente no está cargado o está inactivo');

  const materiaId = idPositivo(cuerpo.materia_id, 'una materia o actividad');
  const materia = await db.obtenerFila('SELECT nombre FROM materias WHERE id = ? AND activo = 1', materiaId);
  if (!materia) falla('Esa materia no está cargada o está inactiva');

  if (grilla.materias.length && !grilla.materias.includes(materiaId)) {
    falla(`${materia.nombre} no está entre las materias de la grilla ${grilla.nombre}`);
  }

  const grupoId = idPositivo(cuerpo.grupo_id, 'un grupo', true);
  const grupo = grupoId && (await db.obtenerFila('SELECT nombre, curso FROM grupos WHERE id = ? AND activo = 1', grupoId));
  if (grupoId && !grupo) falla('Ese grupo no está cargado o está inactivo');
  if (grupoId && grilla.grupos.length && !grilla.grupos.includes(grupoId)) {
    falla(`El grupo ${grupo.nombre} no está en la grilla ${grilla.nombre}`);
  }

  const inicioPropio = horaOpcional(cuerpo.inicio, 'La hora de inicio');
  const finPropio = horaOpcional(cuerpo.fin, 'La hora de fin');
  if (!inicioPropio !== !finPropio) falla('Poné la hora de inicio y la de fin, o ninguna (vale la del módulo)');
  if (inicioPropio && inicioPropio >= finPropio) falla('La hora de fin tiene que ser posterior a la de inicio');
  // Si coincide con la del módulo no se guarda aparte: así sigue al módulo si cambia.
  const igualAlModulo = inicioPropio === modulo.inicio && finPropio === modulo.fin;

  const alumnos = cuerpo.alumnos === undefined || cuerpo.alumnos === '' ? 0 : Number(cuerpo.alumnos);
  if (!Number.isInteger(alumnos) || alumnos < 0 || alumnos > 1000) falla('Alumnos tiene que ser un número entre 0 y 1000');
  if (salon?.capacidad && alumnos > salon.capacidad) {
    falla(`${salon.nombre} tiene capacidad para ${salon.capacidad}: no entran ${alumnos} alumnos`);
  }

  const estado = cuerpo.estado === undefined ? 'activa' : cuerpo.estado;
  if (!Object.hasOwn(ESTADOS, estado)) falla('Estado inválido');

  return {
    grilla_id: grillaId,
    grilla_vigente: grilla.vigente ? 1 : 0,
    modulo_id: modulo.id,
    hora: modulo.clave,
    modulo_nombre: modulo.nombre,
    dia: cuerpo.dia,
    salon_id: salonId,
    salon: salon?.nombre ?? null,
    salon_tipo: salon?.tipo ?? null,
    docente_id: docenteId,
    docente: docente.nombre,
    materia_id: materiaId,
    materia: materia.nombre,
    grupo_id: grupoId,
    grupo: grupo ? grupo.nombre : null,
    inicio_propio: igualAlModulo ? null : inicioPropio,
    fin_propio: igualAlModulo ? null : finPropio,
    inicio: inicioPropio || modulo.inicio,
    fin: finPropio || modulo.fin,
    alumnos,
    estado,
    observaciones: textoOpcional(cuerpo.observaciones, 'observaciones', 500).trim(),
  };
}

// Dos clases sólo compiten si sus grillas están vigentes (o son la misma
// grilla): una copia archivada de otra semana no ocupa nada.
const compiten = (a, b) => a.grilla_id === b.grilla_id || (!!a.grilla_vigente && !!b.grilla_vigente);

// Con qué choca `a` entre las activas (sin contar los ids de `excluir`).
function conflictosDe(a, existentes, excluir = []) {
  if (a.estado !== 'activa') return [];
  const otras = existentes.filter(
    (b) => b.estado === 'activa' && !excluir.includes(b.id) && compiten(a, b) && seSuperponen(a, b)
  );
  const lista = [];
  // Las dos marcadas «compartida» (organización oficial): aula y grupo se comparten.
  for (const b of otras) {
    const compartidas = !!a.compartida && !!b.compartida;
    if (b.salon_id && b.salon_id === a.salon_id && !compartidas) {
      lista.push({ recurso: 'espacio', mensaje: `${a.salon} ya está ocupado ${cuando(b)}`, asignacion: resumen(b) });
    }
    if (b.docente_id && b.docente_id === a.docente_id) {
      lista.push({ recurso: 'docente', mensaje: `${a.docente} ya tiene clase en ${b.salon || 'otro espacio'} ${cuando(b)}`, asignacion: resumen(b) });
    }
    if (b.grupo_id && b.grupo_id === a.grupo_id && !compartidas) {
      lista.push({ recurso: 'grupo', mensaje: `${a.grupo} ya tiene ${b.materia || 'otra clase'} ${cuando(b)}`, asignacion: resumen(b) });
    }
  }
  return lista;
}

// Espacios habilitados libres en ese momento (primero los del mismo tipo).
async function alternativas(a, existentes, excluir = []) {
  const ocupados = new Set(
    existentes
      .filter((b) => b.estado === 'activa' && !excluir.includes(b.id) && b.salon_id && compiten(a, b) && seSuperponen(a, b))
      .map((b) => b.salon_id)
  );
  return (await salones())
    .filter((s) => s.habilitado && s.clasificacion === 'AULA' && s.id !== a.salon_id && !ocupados.has(s.id))
    .filter((s) => !s.capacidad || s.capacidad >= a.alumnos)
    .sort((x, y) => (y.tipo === a.salon_tipo) - (x.tipo === a.salon_tipo))
    .slice(0, 6)
    .map((s) => ({ id: s.id, nombre: s.nombre, piso: PISOS[s.piso], tipo: TIPOS[s.tipo] }));
}

async function exigirSinConflictos(a, existentes, excluir) {
  const conflictos = conflictosDe(a, existentes, excluir);
  if (conflictos.length) {
    throw new Conflicto(conflictos.map((c) => c.mensaje).join('. ') + '.', {
      conflictos,
      alternativas: conflictos.some((c) => c.recurso === 'espacio') ? await alternativas(a, existentes, excluir) : [],
    });
  }
}

const exigirVersion = (actual, version) => {
  if (!actual) throw new NoEncontrado('La asignación ya no existe: alguien la quitó');
  if (Number(version) !== actual.version) {
    throw new Conflicto('Otra persona cambió esta asignación mientras la editabas. Se recargaron los datos: revisalos y volvé a guardar.', {
      cambio: true,
      asignacion: actual,
    });
  }
};

const registrar = (accion, asignacionId, detalle, usuarioId) =>
  db.ejecutar(
    'INSERT INTO asignaciones_registro (asignacion_id, accion, detalle, usuario_id) VALUES (?, ?, ?, ?)',
    asignacionId, accion, detalle, usuarioId
  );

const describir = (a) =>
  `${a.grupo ? `${a.grupo}: ` : ''}${a.materia || 'sin materia'} con ${a.docente || 'sin docente'} en ${a.salon || 'sin espacio'}, ${cuando(a)}`;

// ---------- Endpoints ----------

// GET /api/asignaciones?dia=&piso=&grilla=: todo lo que necesitan el plano y
// la grilla en una sola respuesta (catálogos incluidos).
const listar = responder('listar', async (req, res) => {
  const { dia, piso, grilla } = req.query;
  if (dia !== undefined && !DIAS.includes(dia)) falla('Día inválido');
  if (piso !== undefined && !Object.hasOwn(PISOS, piso)) falla('Piso inválido');
  await restablecerSemana();

  const [asignaciones, espacios, docentes, materias, grupos, grillas] = await Promise.all([
    todas(),
    salones(),
    db.obtenerFilas('SELECT id, nombre, revisar FROM docentes WHERE activo = 1 ORDER BY nombre COLLATE NOCASE'),
    db.obtenerFilas('SELECT id, nombre, revisar FROM materias WHERE activo = 1 ORDER BY nombre COLLATE NOCASE'),
    db.obtenerFilas('SELECT id, nombre, curso, alumnos, turno, revisar FROM grupos WHERE activo = 1 ORDER BY nombre COLLATE NOCASE'),
    leerGrillas(db),
  ]);
  return res.json({
    version: eventos.versionActual(),
    asignaciones: asignaciones.filter(
      (a) => (!dia || a.dia === dia) && (!piso || a.piso === piso) && (!grilla || a.grilla_id === grilla)
    ),
    salones: espacios.filter((s) => !piso || s.piso === piso),
    docentes,
    materias,
    grupos,
    grillas,
    dias: DIAS,
    tipos: TIPOS,
    clasificaciones: CLASIFICACIONES,
    pisos: PISOS,
    estados: ESTADOS,
    turnos: TURNOS,
    ciclos: CICLOS,
  });
});

// GET /api/salones/:id: un espacio con sus asignaciones de la semana.
const detalleSalon = responder('detalleSalon', async (req, res) => {
  const salon = (await salones()).find((s) => s.id === req.params.id);
  if (!salon) throw new NoEncontrado('Ese espacio no existe');
  const asignaciones = (await todas()).filter((a) => a.salon_id === salon.id);
  return res.json({ salon, asignaciones });
});

const listarSalones = responder('listarSalones', async (req, res) => res.json({ salones: await salones() }));

// PUT /api/salones/:id { nombre?, tipo?, capacidad?, habilitado? }
const modificarSalon = responder('modificarSalon', (req, res) =>
  escribir(async () => {
    const actual = await db.obtenerFila('SELECT * FROM salones WHERE id = ?', req.params.id);
    if (!actual) throw new NoEncontrado('Ese espacio no existe');
    const cuerpo = esObjeto(req.body) ? req.body : falla('Datos inválidos');
    const nombre = cuerpo.nombre === undefined ? actual.nombre : texto(cuerpo.nombre, 'nombre', 100).trim() || 'Sin nombre';
    const tipo = cuerpo.tipo === undefined ? actual.tipo : cuerpo.tipo;
    if (!Object.hasOwn(TIPOS, tipo)) falla('Tipo de espacio inválido');
    let capacidad = actual.capacidad;
    if (cuerpo.capacidad !== undefined) {
      capacidad = cuerpo.capacidad === null || cuerpo.capacidad === '' ? null : Number(cuerpo.capacidad);
      if (capacidad !== null && (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 1000)) {
        falla('La capacidad tiene que ser un número entre 1 y 1000');
      }
    }
    const habilitado = cuerpo.habilitado === undefined ? !!actual.habilitado : cuerpo.habilitado === true;
    const clasificacion = cuerpo.clasificacion === undefined ? actual.clasificacion : cuerpo.clasificacion;
    if (!Object.hasOwn(CLASIFICACIONES, clasificacion)) falla('Clasificación inválida: AULA o ESPACIO_COMUN');
    if (tipo === 'institucional' && clasificacion === 'AULA') {
      falla(`La ${nombre} es un espacio institucional reservado y no puede asignarse a actividades académicas`);
    }
    await db.ejecutar(
      'UPDATE salones SET nombre = ?, tipo = ?, clasificacion = ?, capacidad = ?, habilitado = ? WHERE id = ?',
      nombre, tipo, clasificacion, capacidad, habilitado ? 1 : 0, actual.id
    );
    eventos.avisar('salones');
    return res.json({ salon: (await salones()).find((s) => s.id === actual.id) });
  })
);

// GET /api/disponibilidad?dia=&grilla_id=&hora=[&inicio=&fin=]: qué espacios
// están libres y cuáles ocupados en ese momento.
const disponibilidad = responder('disponibilidad', async (req, res) => {
  const { dia, grilla_id: grillaId, hora } = req.query;
  if (!DIAS.includes(dia)) falla('Elegí un día de lunes a viernes');
  const modulo = await db.obtenerFila(
    'SELECT clave, nombre, inicio, fin FROM modulos WHERE grilla_id = ? AND clave = ?', String(grillaId), String(hora)
  );
  if (!modulo) falla('Elegí un módulo de la grilla');
  const inicio = horaOpcional(req.query.inicio, 'La hora de inicio') || modulo.inicio;
  const fin = horaOpcional(req.query.fin, 'La hora de fin') || modulo.fin;
  const momento = { dia, hora: modulo.clave, inicio, fin };
  const ocupadas = (await todas()).filter((a) => a.estado === 'activa' && a.grilla_vigente && a.salon_id && seSuperponen(momento, a));
  const ocupados = new Set(ocupadas.map((a) => a.salon_id));
  return res.json({
    libres: (await salones()).filter((s) => s.habilitado && s.clasificacion === 'AULA' && !ocupados.has(s.id)),
    ocupados: ocupadas.map(resumen),
  });
});

// POST /api/asignaciones/verificar: los conflictos que tendría, sin guardar.
const verificar = responder('verificar', async (req, res) => {
  const a = await normalizar(req.body);
  const existentes = await todas();
  const excluir = req.body.id ? [Number(req.body.id)] : [];
  const conflictos = conflictosDe(a, existentes, excluir);
  return res.json({
    conflictos,
    alternativas: conflictos.some((c) => c.recurso === 'espacio') ? await alternativas(a, existentes, excluir) : [],
  });
});

const COLUMNAS = ['modulo_id', 'dia', 'salon_id', 'docente_id', 'materia_id', 'grupo_id', 'alumnos', 'estado', 'observaciones'];

// POST /api/asignaciones
const crear = responder('crear', (req, res) =>
  escribir(async () => {
    const a = await normalizar(req.body);
    await exigirSinConflictos(a, await todas(), []);
    const r = await db.ejecutar(
      `INSERT INTO asignaciones (${COLUMNAS.join(', ')}, inicio, fin, semana, actualizado_por)
       VALUES (${COLUMNAS.map(() => '?').join(', ')}, ?, ?, ?, ?)`,
      ...COLUMNAS.map((c) => a[c]), a.inicio_propio, a.fin_propio, a.estado === 'activa' ? null : lunesDe(), req.usuario.id
    );
    await registrar('alta', r.lastID, describir(a), req.usuario.id);
    eventos.avisar('asignaciones');
    return res.status(201).json({ asignacion: await buscar(r.lastID) });
  })
);

// PUT /api/asignaciones/:id { ..., version }
const modificar = responder('modificar', (req, res) =>
  escribir(async () => {
    const id = Number(req.params.id);
    const actual = await buscar(id);
    exigirVersion(actual, (req.body || {}).version);
    const a = { ...(await normalizar(req.body)), compartida: actual.compartida };
    await exigirSinConflictos(a, await todas(), [id]);
    await actualizar(id, a, req.usuario.id);
    await registrar('cambio', id, describir(a), req.usuario.id);
    eventos.avisar('asignaciones');
    return res.json({ asignacion: await buscar(id) });
  })
);

// Guarda una asignación ya normalizada. Cambiar el espacio a mano deja sin
// efecto un cambio de aula excepcional; un estado distinto de «activa» vale
// para esta semana (la siguiente la clase vuelve a ser la de siempre).
const actualizar = (id, a, usuarioId) =>
  db.ejecutar(
    `UPDATE asignaciones SET ${COLUMNAS.map((c) => `${c} = ?`).join(', ')}, inicio = ?, fin = ?,
       salon_habitual = CASE WHEN salon_id IS ? THEN salon_habitual ELSE NULL END,
       semana = CASE WHEN ? = 'activa' AND (salon_habitual IS NULL OR salon_id IS NOT ?) THEN NULL ELSE ? END,
       actualizado_por = ?, version = version + 1, updated_at = datetime('now')
     WHERE id = ?`,
    ...COLUMNAS.map((c) => a[c]), a.inicio_propio, a.fin_propio, a.salon_id,
    a.estado, a.salon_id, lunesDe(), usuarioId, id
  );

// PUT /api/asignaciones { altas: [...], cambios: [{ id, version, ... }], bajas: [{ id, version }] }
// «Guardar cambios» de la planilla: todo junto, en una transacción. Si una
// sola cosa no se puede (dato inválido, otra persona la cambió, choque), no
// se guarda nada y el error dice cuál fue.
const guardarLote = responder('guardarLote', (req, res) =>
  escribir(async () => {
    const cuerpo = esObjeto(req.body) ? req.body : falla('Datos inválidos');
    const altas = lista(cuerpo.altas ?? [], 'altas', 300);
    const cambios = lista(cuerpo.cambios ?? [], 'cambios', 300);
    const bajas = lista(cuerpo.bajas ?? [], 'bajas', 300);
    if (!altas.length && !cambios.length && !bajas.length) falla('No hay cambios para guardar');

    // Cada error dice de qué clase es.
    const deCual = async (etiqueta, tarea) => {
      try {
        return await tarea();
      } catch (error) {
        error.message = `${etiqueta}: ${error.message}`;
        throw error;
      }
    };
    const etiqueta = (x) => [x.dia, x.modulo_nombre ?? x.hora, x.grupo ?? x.materia].filter(Boolean).join(' · ') || 'una clase';

    for (const b of bajas) {
      const actual = await buscar(Number(b?.id));
      await deCual(actual ? etiqueta(actual) : 'una clase', async () => exigirVersion(actual, b?.version));
      await db.ejecutar('DELETE FROM asignaciones WHERE id = ?', actual.id);
      await registrar('baja', actual.id, describir(actual), req.usuario.id);
    }
    const tocadas = [];
    for (const c of cambios) {
      const actual = await buscar(Number(c?.id));
      await deCual(actual ? etiqueta(actual) : 'una clase', async () => {
        exigirVersion(actual, c?.version);
        const a = await normalizar(c);
        await actualizar(actual.id, a, req.usuario.id);
        await registrar('cambio', actual.id, describir(a), req.usuario.id);
      });
      tocadas.push(actual.id);
    }
    for (const n of altas) {
      await deCual(etiqueta(n || {}), async () => {
        const a = await normalizar(n);
        const r = await db.ejecutar(
          `INSERT INTO asignaciones (${COLUMNAS.join(', ')}, inicio, fin, semana, actualizado_por)
           VALUES (${COLUMNAS.map(() => '?').join(', ')}, ?, ?, ?, ?)`,
          ...COLUMNAS.map((col) => a[col]), a.inicio_propio, a.fin_propio, a.estado === 'activa' ? null : lunesDe(), req.usuario.id
        );
        await registrar('alta', r.lastID, describir(a), req.usuario.id);
        tocadas.push(r.lastID);
      });
    }

    // Con todo aplicado, ¿alguna de las clases tocadas choca con otra?
    const activas = (await todas()).filter((a) => a.estado === 'activa');
    for (const a of activas.filter((x) => tocadas.includes(x.id))) {
      const choque = conflictosDe(a, activas, [a.id]);
      if (choque.length) {
        throw new Conflicto(`${etiqueta(a)}: ${choque.map((x) => x.mensaje).join('. ')}. No se guardó nada.`, { conflictos: choque });
      }
    }
    eventos.avisar('asignaciones');
    const guardadas = (await todas()).filter((a) => tocadas.includes(a.id));
    return res.json({ asignaciones: guardadas, bajas: bajas.map((b) => Number(b.id)) });
  })
);

// Al empezar la semana, las excepciones de la anterior (docente ausente,
// clase cancelada, cambio de aula) se restablecen solas: la grilla queda con
// la última configuración. Si el aula habitual quedó ocupada por otra clase,
// la clase se queda donde está (y se anota).
async function restablecerSemana() {
  const lunes = lunesDe();
  const pendientes = await db.obtenerFila('SELECT COUNT(*) AS n FROM asignaciones WHERE semana IS NOT NULL AND semana < ?', lunes);
  if (!pendientes.n) return 0;
  return escribir(async () => {
    const filas = await db.obtenerFilas('SELECT id FROM asignaciones WHERE semana IS NOT NULL AND semana < ?', lunes);
    let n = 0;
    for (const { id } of filas) {
      const a = await buscar(id);
      const vuelta = { ...a, estado: 'activa', salon_id: a.salon_habitual ?? a.salon_id };
      const choca = a.salon_habitual && conflictosDe(vuelta, await todas(), [id]).some((c) => c.recurso === 'espacio');
      await db.ejecutar(
        `UPDATE asignaciones SET estado = 'activa', salon_id = ?, salon_habitual = NULL, semana = NULL,
           version = version + 1, updated_at = datetime('now') WHERE id = ?`,
        choca ? a.salon_id : vuelta.salon_id, id
      );
      if (choca) await registrar('cambio', id, `Nueva semana: ${describir(a)} sigue en ${a.salon} (su aula habitual está ocupada)`, null);
      n += 1;
    }
    await registrar('cambio', null, `Nueva semana: ${n} clase${n === 1 ? '' : 's'} con ausencia, cancelación o cambio de aula volvieron a la configuración habitual`, null);
    eventos.avisar('asignaciones');
    return n;
  });
}

// DELETE /api/asignaciones/:id?version=N
const quitar = responder('quitar', (req, res) =>
  escribir(async () => {
    const id = Number(req.params.id);
    const actual = await buscar(id);
    exigirVersion(actual, req.query.version);
    await db.ejecutar('DELETE FROM asignaciones WHERE id = ?', id);
    await registrar('baja', id, describir(actual), req.usuario.id);
    eventos.avisar('asignaciones');
    return res.json({ ok: true });
  })
);

// POST /api/asignaciones/intercambiar { a: { id, version }, b: { id, version } }:
// las dos clases cambian de día y módulo (lo que hace arrastrar en la grilla).
const intercambiar = responder('intercambiar', (req, res) =>
  escribir(async () => {
    const cuerpo = esObjeto(req.body) ? req.body : falla('Datos inválidos');
    const [x, y] = [await buscar(Number(cuerpo.a?.id)), await buscar(Number(cuerpo.b?.id))];
    exigirVersion(x, cuerpo.a?.version);
    exigirVersion(y, cuerpo.b?.version);
    if (x.id === y.id) falla('Elegí dos clases distintas');
    // Mover una clase que quedó en un espacio común también es asignarla ahí.
    for (const c of [x, y]) {
      const salon = c.salon_id && (await db.obtenerFila('SELECT nombre, tipo, clasificacion FROM salones WHERE id = ?', c.salon_id));
      if (salon) exigirAula(salon);
    }

    const mover = (de, a) => ({
      ...de,
      dia: a.dia,
      modulo_id: a.modulo_id,
      hora: a.hora,
      modulo_nombre: a.modulo_nombre,
      // La hora propia no viaja: vale la del módulo nuevo (o la propia del otro).
      inicio: a.inicio,
      fin: a.fin,
      inicio_propio: a.inicio_propio,
      fin_propio: a.fin_propio,
    });
    const [nx, ny] = [mover(x, y), mover(y, x)];
    const existentes = await todas();
    // Cada una contra el resto y contra la otra ya movida.
    await exigirSinConflictos(nx, [...existentes.filter((e) => e.id !== y.id), ny], [x.id]);
    await exigirSinConflictos(ny, existentes.filter((e) => e.id !== x.id), [y.id]);

    for (const m of [nx, ny]) {
      await db.ejecutar(
        `UPDATE asignaciones SET dia = ?, modulo_id = ?, inicio = ?, fin = ?, actualizado_por = ?,
           version = version + 1, updated_at = datetime('now') WHERE id = ?`,
        m.dia, m.modulo_id, m.inicio_propio, m.fin_propio, req.usuario.id, m.id
      );
    }
    await registrar('intercambio', x.id, `Intercambio: ${describir(nx)} ↔ ${describir(ny)}`, req.usuario.id);
    eventos.avisar('asignaciones');
    return res.json({ asignaciones: [await buscar(x.id), await buscar(y.id)] });
  })
);

// POST /api/asignaciones/:id/cambiar-aula { salon_id, version }: cambio de aula
// excepcional. Recuerda el aula habitual; pedir el aula habitual la restituye.
const cambiarAula = responder('cambiarAula', (req, res) =>
  escribir(async () => {
    const id = Number(req.params.id);
    const actual = await buscar(id);
    exigirVersion(actual, (req.body || {}).version);
    const destino = identificador((req.body || {}).salon_id, 'espacio');
    if (destino === actual.salon_id) falla('La clase ya está en ese espacio');
    const a = await normalizar({
      grilla_id: actual.grilla_id, hora: actual.hora, dia: actual.dia, salon_id: destino,
      docente_id: actual.docente_id, materia_id: actual.materia_id, grupo_id: actual.grupo_id,
      inicio: actual.inicio_propio, fin: actual.fin_propio, alumnos: actual.alumnos, estado: actual.estado,
      observaciones: actual.observaciones,
    });
    a.compartida = actual.compartida;
    await exigirSinConflictos(a, await todas(), [id]);
    const vuelve = destino === actual.salon_habitual;
    await db.ejecutar(
      `UPDATE asignaciones SET salon_id = ?, salon_habitual = ?, semana = ?, actualizado_por = ?,
         version = version + 1, updated_at = datetime('now') WHERE id = ?`,
      destino, vuelve ? null : actual.salon_habitual ?? actual.salon_id,
      vuelve && actual.estado === 'activa' ? null : lunesDe(), req.usuario.id, id
    );
    await registrar(
      'cambio', id,
      vuelve
        ? `Vuelve a su aula habitual (${a.salon}): ${describir(a)}`
        : `Cambio de aula excepcional (${actual.salon ?? 'sin espacio'} → ${a.salon}): ${describir(a)}`,
      req.usuario.id
    );
    eventos.avisar('asignaciones');
    return res.json({ asignacion: await buscar(id) });
  })
);

// POST /api/grillas/:id/copiar { nombre, periodo, archivarOriginal }: reutiliza
// la grilla (otra semana): mismos módulos y clases, sin ausencias,
// cancelaciones ni cambios de aula. Con archivarOriginal, la copia queda
// vigente y la original archivada; si no, la copia queda archivada.
const copiarGrilla = responder('copiarGrilla', (req, res) =>
  escribir(async () => {
    const original = (await leerGrillas(db)).find((g) => g.id === req.params.id);
    if (!original) throw new NoEncontrado('Esa grilla ya no existe');
    const cuerpo = esObjeto(req.body) ? req.body : {};
    const nombre = texto(cuerpo.nombre ?? `${original.nombre} (copia)`, 'nombre', 100).trim();
    if (!nombre) falla('Poné un nombre a la grilla nueva');
    const periodo = textoOpcional(cuerpo.periodo, 'período', 60).trim();
    const archivar = cuerpo.archivarOriginal === true;
    if (archivar && original.principal) falla('La grilla principal no se archiva: la copia queda como consulta y los cambios se hacen sobre la principal');
    const nueva = `${original.id.slice(0, 60)}-c${Date.now().toString(36)}`;

    const orden = (await db.obtenerFila('SELECT COALESCE(MAX(orden), -1) + 1 AS n FROM grillas')).n;
    if (archivar) await db.ejecutar('UPDATE grillas SET vigente = 0 WHERE id = ?', original.id);
    await db.ejecutar(
      `INSERT INTO grillas (id, nombre, orden, organizacion, periodo, turno, ciclo, dias, grupos, materias, vigente)
       SELECT ?, ?, ?, organizacion, ?, turno, ciclo, dias, grupos, materias, ? FROM grillas WHERE id = ?`,
      nueva, nombre, orden, periodo || original.periodo, archivar ? 1 : 0, original.id
    );
    const modulos = await db.obtenerFilas('SELECT * FROM modulos WHERE grilla_id = ?', original.id);
    let clases = 0;
    for (const m of modulos) {
      const r = await db.ejecutar(
        'INSERT INTO modulos (grilla_id, clave, nombre, turno, inicio, fin, orden, rangos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        nueva, m.clave, m.nombre, m.turno, m.inicio, m.fin, m.orden, m.rangos
      );
      const copia = await db.ejecutar(
        `INSERT INTO asignaciones (modulo_id, dia, salon_id, docente_id, materia_id, grupo_id, inicio, fin,
           alumnos, estado, observaciones, actualizado_por)
         SELECT ?, dia, COALESCE(salon_habitual, salon_id), docente_id, materia_id, grupo_id, inicio, fin,
           alumnos, 'activa', observaciones, ? FROM asignaciones WHERE modulo_id = ?`,
        r.lastID, req.usuario.id, m.id
      );
      clases += copia.changes;
    }
    // La copia vigente no puede chocar con otras grillas vigentes.
    if (archivar) {
      const activas = (await todas()).filter((a) => a.estado === 'activa');
      for (const a of activas.filter((x) => x.grilla_id === nueva)) {
        const choque = conflictosDe(a, activas, [a.id])[0];
        if (choque) throw new Conflicto(`La copia choca con otra grilla vigente: ${choque.mensaje}. No se copió.`, { conflictos: [choque] });
      }
    }
    await registrar('alta', null, `Copia de la grilla ${original.nombre} → ${nombre}: ${clases} clases${archivar ? ` (${original.nombre} queda archivada)` : ''}`, req.usuario.id);
    eventos.avisar('grillas');
    return res.status(201).json({ grilla: (await leerGrillas(db)).find((g) => g.id === nueva), clases });
  })
);

// GET /api/asignaciones/registro?limite=30: últimos cambios (más nuevos primero).
const registro = responder('registro', async (req, res) => {
  const limite = Math.min(Math.max(Number(req.query.limite) || 30, 1), 100);
  const filas = await db.obtenerFilas(
    `SELECT r.id, r.asignacion_id, r.accion, r.detalle, r.created_at, u.username AS usuario
     FROM asignaciones_registro r LEFT JOIN usuarios u ON u.id = r.usuario_id
     ORDER BY r.id DESC LIMIT ?`,
    limite
  );
  return res.json({ registro: filas });
});

// POST /api/docentes | /api/materias | /api/grupos { nombre[, curso] }: suma uno
// al catálogo. Si ya estaba (sin importar mayúsculas), devuelve el existente.
const agregarAlCatalogo = (tabla, etiqueta, conCurso = false) =>
  responder(`agregar ${etiqueta}`, (req, res) =>
    escribir(async () => {
      const cuerpo = req.body || {};
      const nombre = texto(cuerpo.nombre, etiqueta, 120).trim().replace(/\s+/g, ' ');
      if (nombre.length < 2) falla(`Escribí el nombre ${etiqueta === 'materia' ? 'de la materia' : `del ${etiqueta}`}`);
      const curso = conCurso ? textoOpcional(cuerpo.curso, 'curso', 60).trim() : null;
      const existente = await db.obtenerFila(`SELECT * FROM ${tabla} WHERE nombre = ?`, nombre);
      if (existente) {
        if (!existente.activo) await db.ejecutar(`UPDATE ${tabla} SET activo = 1 WHERE id = ?`, existente.id);
        eventos.avisar('catalogo');
        return res.json({ [etiqueta]: { id: existente.id, nombre: existente.nombre, ...(conCurso ? { curso: existente.curso } : {}) } });
      }
      const r = conCurso
        ? await db.ejecutar(`INSERT INTO ${tabla} (nombre, curso) VALUES (?, ?)`, nombre, curso)
        : await db.ejecutar(`INSERT INTO ${tabla} (nombre) VALUES (?)`, nombre);
      eventos.avisar('catalogo');
      return res.status(201).json({ [etiqueta]: { id: r.lastID, nombre, ...(conCurso ? { curso } : {}) } });
    })
  );

// ---------- Grillas y plano (antes en contenido.Controller) ----------

// GET /api/panel: grillas (con módulos y horas) y el plano en el formato de antes.
const obtenerPanel = responder('obtenerPanel', async (req, res) =>
  res.json({ grillas: await leerGrillas(db), plano: await planoCompatible(db) })
);

// PUT /api/grillas { grillas: [{ id, nombre, horas: [{ id, nombre, inicio, fin }] }] }
// Guarda grillas y módulos (las clases van por /api/asignaciones). Lo que ya
// no está se borra con sus clases. Si las horas nuevas hacen chocar clases
// que antes no chocaban, no se guarda nada.
const guardarGrillas = responder('guardarGrillas', (req, res) =>
  escribir(async () => {
    const grillas = lista((req.body || {}).grillas, 'grillas', 50).map((g, i) => {
      if (!esObjeto(g)) falla(`grillas[${i}] inválida`);
      const horas = lista(g.horas, `grillas[${i}].horas`, 30).map((h, j) => {
        if (!esObjeto(h)) falla(`grillas[${i}].horas[${j}] inválido`);
        const inicio = horaOpcional(h.inicio, 'La hora de inicio');
        const fin = horaOpcional(h.fin, 'La hora de fin');
        if (!inicio !== !fin) falla(`El módulo "${h.nombre}" necesita hora de inicio y de fin, o ninguna`);
        if (inicio && inicio >= fin) falla(`En el módulo "${h.nombre}" la hora de fin tiene que ser posterior a la de inicio`);
        const turno = h.turno === undefined || h.turno === null ? '' : h.turno;
        if (turno && !Object.hasOwn(TURNOS, turno)) falla(`El turno del módulo "${h.nombre}" es inválido`);
        return { id: texto(h.id, 'id de horario', 100), nombre: texto(h.nombre, 'horario', 100), turno, inicio, fin };
      });
      if (new Set(horas.map((h) => h.id)).size !== horas.length) falla('Hay dos horarios con el mismo id');
      const opcion = (valor, opciones, nombre) => {
        if (valor === undefined || valor === null || valor === '') return '';
        if (!Object.hasOwn(opciones, valor)) falla(`${nombre} inválido`);
        return valor;
      };
      const ids = (valor, nombre) =>
        lista(valor ?? [], nombre, 500).map((v) => idPositivo(v, `un ${nombre} válido`));
      const dias = g.dias === undefined ? DIAS : lista(g.dias, 'días', 5);
      if (!dias.length || dias.some((d) => !DIAS.includes(d))) falla('Elegí al menos un día de lunes a viernes');
      return {
        id: texto(g.id, `grillas[${i}].id`, 100),
        nombre: texto(g.nombre, `grillas[${i}].nombre`, 100),
        vigente: g.vigente !== false,
        organizacion: textoOpcional(g.organizacion, 'organización', 150).trim(),
        periodo: textoOpcional(g.periodo, 'período', 60).trim(),
        turno: opcion(g.turno, TURNOS, 'Turno'),
        ciclo: opcion(g.ciclo, CICLOS, 'Ciclo'),
        dias: DIAS.filter((d) => dias.includes(d)),
        grupos: ids(g.grupos, 'grupo'),
        materias: ids(g.materias, 'materia'),
        horas,
      };
    });
    if (!grillas.length) falla('Tiene que quedar al menos una grilla');
    if (new Set(grillas.map((g) => g.id)).size !== grillas.length) falla('Hay dos grillas con el mismo id');

    // La grilla principal es permanente: no se borra ni se archiva, y sus
    // horarios con clases no se quitan (así no se pierden asignaciones).
    const principal = await db.obtenerFila('SELECT id, nombre FROM grillas WHERE principal = 1');
    if (principal) {
      const enviada = grillas.find((g) => g.id === principal.id);
      if (!enviada) falla(`La grilla principal «${principal.nombre}» no se puede eliminar`);
      if (!enviada.vigente) falla(`La grilla principal «${principal.nombre}» no se puede archivar`);
      const claves = enviada.horas.map((h) => h.id);
      const conClases = await db.obtenerFila(
        `SELECT m.nombre FROM modulos m WHERE m.grilla_id = ? AND m.clave NOT IN (${claves.map(() => '?').join(', ') || "''"})
           AND EXISTS (SELECT 1 FROM asignaciones a WHERE a.modulo_id = m.id) LIMIT 1`,
        principal.id, ...claves
      );
      if (conClases) falla(`El horario ${conClases.nombre} de la grilla principal tiene clases: quitalas antes de eliminarlo`);
    }

    const ids = grillas.map((g) => g.id);
    const borradas = await db.obtenerFilas(
      `SELECT id, nombre FROM grillas WHERE id NOT IN (${ids.map(() => '?').join(', ')})`, ...ids
    );
    for (const g of borradas) {
      const n = (await db.obtenerFila(
        'SELECT COUNT(*) AS n FROM asignaciones a JOIN modulos m ON m.id = a.modulo_id WHERE m.grilla_id = ?', g.id
      )).n;
      await db.ejecutar('DELETE FROM grillas WHERE id = ?', g.id);
      await registrar('baja', null, `Se eliminó la grilla ${g.nombre} con ${n} clases`, req.usuario.id);
    }

    for (const [i, g] of grillas.entries()) {
      await db.ejecutar(
        `INSERT INTO grillas (id, nombre, orden, organizacion, periodo, turno, ciclo, dias, grupos, materias, vigente)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET nombre = excluded.nombre, orden = excluded.orden, vigente = excluded.vigente,
           organizacion = excluded.organizacion, periodo = excluded.periodo, turno = excluded.turno,
           ciclo = excluded.ciclo, dias = excluded.dias, grupos = excluded.grupos, materias = excluded.materias`,
        g.id, g.nombre, i, g.organizacion, g.periodo, g.turno, g.ciclo,
        JSON.stringify(g.dias), JSON.stringify(g.grupos), JSON.stringify(g.materias), g.vigente ? 1 : 0
      );
      const claves = g.horas.map((h) => h.id);
      const quitados = await db.obtenerFilas(
        `SELECT m.id, m.nombre, (SELECT COUNT(*) FROM asignaciones a WHERE a.modulo_id = m.id) AS n
         FROM modulos m WHERE m.grilla_id = ? AND m.clave NOT IN (${claves.map(() => '?').join(', ') || "''"})`,
        g.id, ...claves
      );
      for (const m of quitados) {
        await db.ejecutar('DELETE FROM modulos WHERE id = ?', m.id);
        if (m.n) await registrar('baja', null, `Se eliminó el horario ${m.nombre} de ${g.nombre} con ${m.n} clases`, req.usuario.id);
      }
      for (const [j, h] of g.horas.entries()) {
        await db.ejecutar(
          `INSERT INTO modulos (grilla_id, clave, nombre, turno, inicio, fin, orden) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(grilla_id, clave) DO UPDATE SET nombre = excluded.nombre, turno = excluded.turno,
             inicio = excluded.inicio, fin = excluded.fin, orden = excluded.orden`,
          g.id, h.id, h.nombre, h.turno, h.inicio, h.fin, j
        );
      }
    }

    // Con las horas nuevas, ¿quedaron clases superpuestas?
    const activas = (await todas()).filter((a) => a.estado === 'activa');
    for (const a of activas) {
      const choque = conflictosDe(a, activas, [a.id])[0];
      if (choque) {
        throw new Conflicto(`Con esos cambios se superponen clases: ${choque.mensaje}. No se guardó.`, { conflictos: [choque] });
      }
    }

    eventos.avisar('grillas');
    return res.json({ grillas: await leerGrillas(db) });
  })
);

// PUT /api/plano { nombres, cancelados }: lo de antes, ahora sobre la tabla salones.
const guardarPlano = responder('guardarPlano', (req, res) =>
  escribir(async () => {
    const cuerpo = esObjeto(req.body) ? req.body : falla('El plano tiene que ser un objeto');
    const entradas = Object.entries(esObjeto(cuerpo.nombres) ? cuerpo.nombres : {});
    if (entradas.length > 200) falla('nombres tiene demasiados elementos');
    const nombres = entradas.map(([id, nombre]) => [identificador(id, 'salón'), texto(nombre, `nombre de ${id}`, 100)]);
    const cancelados = lista(cuerpo.cancelados ?? [], 'cancelados', 200).map((id) => identificador(id, 'salón'));
    for (const [id, nombre] of nombres) await db.ejecutar('UPDATE salones SET nombre = ? WHERE id = ?', nombre, id);
    await db.ejecutar(
      `UPDATE salones SET habilitado = CASE WHEN id IN (${cancelados.map(() => '?').join(', ') || "''"}) THEN 0 ELSE 1 END`,
      ...cancelados
    );
    eventos.avisar('salones');
    return res.json({ plano: await planoCompatible(db) });
  })
);

module.exports = {
  listar,
  detalleSalon,
  listarSalones,
  modificarSalon,
  disponibilidad,
  verificar,
  crear,
  modificar,
  quitar,
  intercambiar,
  cambiarAula,
  copiarGrilla,
  guardarLote,
  restablecerSemana,
  lunesDe,
  registro,
  agregarDocente: agregarAlCatalogo('docentes', 'docente'),
  agregarMateria: agregarAlCatalogo('materias', 'materia'),
  agregarGrupo: agregarAlCatalogo('grupos', 'grupo', true),
  obtenerPanel,
  guardarGrillas,
  guardarPlano,
  // Para los tests de la lógica horaria.
  seSuperponen,
};
