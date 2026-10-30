const { SALONES, NOMBRES_ANTERIORES, HORAS_BASE, GRILLAS_BASE, DIAS, clasificacionDe } = require('../utils/salones');

// Esquema de espacios y horarios, y la migración desde lo que había antes.
//
// Una sola fuente de datos para el plano y para Espacios y horarios:
//   salones      → espacios físicos del plano (nombre, tipo, clasificación
//                  AULA / ESPACIO_COMUN, capacidad, habilitado)
//   grillas      → Básico, Superior… (antes JSON en contenido.grillas)
//   modulos      → filas de cada grilla ("1°/2°") con su hora de inicio y fin
//   docentes, materias, grupos → catálogos para elegir
//   asignaciones → quién da qué, a qué grupo, en qué espacio, qué día y módulo
//   asignaciones_registro → historial de altas, cambios y bajas
// El estado libre / ocupado / por finalizar NO se guarda: lo calcula el
// frontend con estas asignaciones y el reloj del dispositivo.

const TABLAS = `
  CREATE TABLE IF NOT EXISTS migraciones (
    nombre TEXT PRIMARY KEY,
    aplicada_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS salones (
    id TEXT PRIMARY KEY,
    piso TEXT NOT NULL CHECK(piso IN ('pb', '1p')),
    nombre TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS docentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE COLLATE NOCASE,
    activo INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS materias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE COLLATE NOCASE,
    activo INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS grupos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE COLLATE NOCASE,
    curso TEXT NOT NULL DEFAULT '',
    activo INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS grillas (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS modulos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grilla_id TEXT NOT NULL REFERENCES grillas(id) ON DELETE CASCADE,
    clave TEXT NOT NULL,
    nombre TEXT NOT NULL,
    inicio TEXT,
    fin TEXT,
    orden INTEGER NOT NULL DEFAULT 0,
    UNIQUE(grilla_id, clave),
    CHECK((inicio IS NULL) = (fin IS NULL)),
    CHECK(inicio IS NULL OR inicio < fin)
  );

  CREATE TABLE IF NOT EXISTS asignaciones_registro (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asignacion_id INTEGER,
    accion TEXT NOT NULL CHECK(accion IN ('alta', 'cambio', 'baja', 'intercambio')),
    detalle TEXT NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    created_at TEXT DEFAULT (datetime('now'))
  );
`;

// La versión anterior de asignaciones (salón + hora como texto) se reemplaza.
const ASIGNACIONES = `
  CREATE TABLE IF NOT EXISTS asignaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    modulo_id INTEGER NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
    dia TEXT NOT NULL CHECK(dia IN (${DIAS.map((d) => `'${d}'`).join(', ')})),
    salon_id TEXT REFERENCES salones(id),
    docente_id INTEGER REFERENCES docentes(id),
    materia_id INTEGER REFERENCES materias(id),
    grupo_id INTEGER REFERENCES grupos(id),
    inicio TEXT,
    fin TEXT,
    alumnos INTEGER NOT NULL DEFAULT 0 CHECK(alumnos BETWEEN 0 AND 1000),
    estado TEXT NOT NULL DEFAULT 'activa' CHECK(estado IN ('activa', 'docente_ausente', 'suspendida')),
    observaciones TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    actualizado_por INTEGER REFERENCES usuarios(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    CHECK((inicio IS NULL) = (fin IS NULL)),
    CHECK(inicio IS NULL OR inicio < fin)
  );
  CREATE INDEX IF NOT EXISTS idx_asignaciones_salon ON asignaciones(salon_id, dia);
  CREATE INDEX IF NOT EXISTS idx_asignaciones_docente ON asignaciones(docente_id, dia);
  CREATE INDEX IF NOT EXISTS idx_asignaciones_grupo ON asignaciones(grupo_id, dia);
  CREATE INDEX IF NOT EXISTS idx_asignaciones_modulo ON asignaciones(modulo_id);
`;

// Lo que la grilla ponía en una clase recién creada: no son datos reales.
const RELLENO = { profesor: 'sin asignar', materia: 'materia', grupo: 'grupo', curso: 'curso' };
const limpio = (valor, campo) => {
  const texto = typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
  return texto && texto.length <= 120 && texto.toLowerCase() !== RELLENO[campo] ? texto : '';
};
const mismoNombre = (a = '', b = '') =>
  a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ');
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const ejecutarVarias = (db, sql) =>
  new Promise((resolve, reject) => db.exec(sql, (err) => (err ? reject(err) : resolve())));

const columnas = async (db, tabla) =>
  (await db.obtenerFilas(`PRAGMA table_info(${tabla})`)).map((c) => c.name);

// Pasos que se aplican una sola vez (quedan anotados en `migraciones`).
async function unaVez(db, nombre, paso) {
  if (await db.obtenerFila('SELECT 1 FROM migraciones WHERE nombre = ?', nombre)) return;
  await db.transaccion(async () => {
    await paso();
    await db.ejecutar('INSERT INTO migraciones (nombre) VALUES (?)', nombre);
  });
}

const idDe = async (db, tabla, nombre, extra = {}) => {
  if (!nombre) return null;
  const fila = await db.obtenerFila(`SELECT id FROM ${tabla} WHERE nombre = ?`, nombre);
  if (fila) return fila.id;
  const campos = ['nombre', ...Object.keys(extra)];
  const r = await db.ejecutar(
    `INSERT INTO ${tabla} (${campos.join(', ')}) VALUES (${campos.map(() => '?').join(', ')})`,
    nombre, ...Object.values(extra)
  );
  return r.lastID;
};

// El respaldo queda en contenido con otro nombre: si algo sale mal, está ahí.
const respaldar = async (db, seccion) => {
  await db.ejecutar('DELETE FROM contenido WHERE seccion = ?', `${seccion}_respaldo`);
  await db.ejecutar('UPDATE contenido SET seccion = ? WHERE seccion = ?', `${seccion}_respaldo`, seccion);
};

async function migrar(db) {
  await ejecutarVarias(db, TABLAS);

  // Salones: tipo, capacidad y si está habilitado (antes, "cancelados" del JSON).
  await db.agregarColumnaSiNoExiste('salones', 'tipo', "TEXT NOT NULL DEFAULT 'otro'");
  await db.agregarColumnaSiNoExiste('salones', 'capacidad', 'INTEGER');
  await db.agregarColumnaSiNoExiste('salones', 'habilitado', 'INTEGER NOT NULL DEFAULT 1');
  // AULA admite clases; ESPACIO_COMUN (PAÑOL, E.O.E., administración…) no.
  await db.agregarColumnaSiNoExiste(
    'salones', 'clasificacion', "TEXT NOT NULL DEFAULT 'AULA' CHECK(clasificacion IN ('AULA', 'ESPACIO_COMUN'))"
  );
  for (const [id, piso, nombre, tipo] of SALONES) {
    await db.ejecutar(
      'INSERT OR IGNORE INTO salones (id, piso, nombre, tipo, clasificacion) VALUES (?, ?, ?, ?, ?)',
      id, piso, nombre, tipo, clasificacionDe(tipo)
    );
  }
  await unaVez(db, 'salones-tipo', async () => {
    for (const [id, , , tipo] of SALONES) {
      await db.ejecutar("UPDATE salones SET tipo = ? WHERE id = ? AND tipo = 'otro'", tipo, id);
    }
  });

  // Bases anteriores: la clasificación sale del tipo de cada espacio.
  await unaVez(db, 'salones-clasificacion', async () => {
    for (const s of await db.obtenerFilas('SELECT id, tipo FROM salones')) {
      await db.ejecutar('UPDATE salones SET clasificacion = ? WHERE id = ?', clasificacionDe(s.tipo), s.id);
    }
  });

  // Nombres cambiados y salones cancelados del JSON "plano" → tabla salones.
  await unaVez(db, 'plano-a-salones', async () => {
    const fila = await db.obtenerFila("SELECT datos FROM contenido WHERE seccion = 'plano'");
    if (!fila) return;
    const plano = JSON.parse(fila.datos) || {};
    for (const [id, nombre] of Object.entries(plano.nombres || {})) {
      if (typeof nombre === 'string' && nombre.trim()) {
        await db.ejecutar('UPDATE salones SET nombre = ? WHERE id = ?', nombre.trim().slice(0, 100), id);
      }
    }
    for (const id of Array.isArray(plano.cancelados) ? plano.cancelados : []) {
      await db.ejecutar('UPDATE salones SET habilitado = 0 WHERE id = ?', id);
    }
    await respaldar(db, 'plano');
  });

  // La tabla de asignaciones de la versión anterior (salón + "hora" de texto).
  const previas = (await columnas(db, 'asignaciones')).includes('hora');
  if (previas) await db.ejecutar('ALTER TABLE asignaciones RENAME TO asignaciones_v1');
  await ejecutarVarias(db, ASIGNACIONES);

  // Grillas del JSON "grillas" → tablas grillas, modulos y asignaciones.
  await unaVez(db, 'grillas-a-tablas', async () => {
    if ((await db.obtenerFila('SELECT COUNT(*) AS n FROM grillas')).n) return;
    const fila = await db.obtenerFila("SELECT datos FROM contenido WHERE seccion = 'grillas'");
    const guardadas = fila ? JSON.parse(fila.datos) : null;
    const grillas = Array.isArray(guardadas) && guardadas.length
      ? guardadas
      : GRILLAS_BASE.map((nombre) => ({ id: nombre, nombre, horas: HORAS_BASE.map((h) => ({ id: h, nombre: h })), clases: [] }));
    const salones = await db.obtenerFilas('SELECT id, nombre FROM salones');

    for (const [i, g] of grillas.entries()) {
      await db.ejecutar('INSERT INTO grillas (id, nombre, orden) VALUES (?, ?, ?)', String(g.id), String(g.nombre || g.id), i);
      const modulos = {};
      for (const [j, h] of (Array.isArray(g.horas) ? g.horas : []).entries()) {
        const conHora = HORA.test(h.inicio) && HORA.test(h.fin) && h.inicio < h.fin;
        const r = await db.ejecutar(
          'INSERT INTO modulos (grilla_id, clave, nombre, inicio, fin, orden) VALUES (?, ?, ?, ?, ?, ?)',
          String(g.id), String(h.id), String(h.nombre || h.id), conHora ? h.inicio : null, conHora ? h.fin : null, j
        );
        modulos[h.id] = r.lastID;
      }
      for (const c of Array.isArray(g.clases) ? g.clases : []) {
        if (!modulos[c.hora] || !DIAS.includes(c.dia)) continue;
        // El aula se busca por nombre (también el de los PDF: "Taller 1" es
        // Aula 8); si hay varias con el mismo ("Aula 3"), no se adivina.
        const coinciden = salones.filter(
          (s) => mismoNombre(s.nombre, c.aula || '') || mismoNombre(NOMBRES_ANTERIORES[s.id], c.aula || '')
        );
        const grupo = limpio(c.grupo, 'grupo');
        await db.ejecutar(
          `INSERT INTO asignaciones (modulo_id, dia, salon_id, docente_id, materia_id, grupo_id, alumnos, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          modulos[c.hora], c.dia,
          coinciden.length === 1 ? coinciden[0].id : null,
          await idDe(db, 'docentes', limpio(c.profesor, 'profesor')),
          await idDe(db, 'materias', limpio(c.materia, 'materia')),
          await idDe(db, 'grupos', grupo, { curso: limpio(c.curso, 'curso') }),
          Number.isInteger(c.alumnos) && c.alumnos >= 0 && c.alumnos <= 1000 ? c.alumnos : 0,
          c.ausente ? 'docente_ausente' : 'activa'
        );
      }
    }
    if (fila) await respaldar(db, 'grillas');
  });

  // Filas de la versión anterior: van al módulo de la primera grilla con esa clave.
  if (previas) {
    await db.transaccion(async () => {
      for (const a of await db.obtenerFilas('SELECT * FROM asignaciones_v1')) {
        const modulo = await db.obtenerFila(
          'SELECT m.id FROM modulos m JOIN grillas g ON g.id = m.grilla_id WHERE m.clave = ? ORDER BY g.orden LIMIT 1',
          a.hora
        );
        if (!modulo) continue;
        await db.ejecutar(
          `INSERT INTO asignaciones (modulo_id, dia, salon_id, docente_id, materia_id, actualizado_por)
           VALUES (?, ?, ?, ?, ?, ?)`,
          modulo.id, a.dia, a.salon_id, a.docente_id, a.materia_id, a.actualizado_por
        );
      }
      await db.ejecutar('DROP TABLE asignaciones_v1');
    });
  }

  // La escuela renombró tres espacios: Aula 6 → PAÑOL y Bunker → E.O.E.
  // (espacios comunes, sin clases) y Taller 1 → Aula 8 (aula). Mismo id: no
  // se pierde ninguna relación. Las clases que ya estaban en PAÑOL no se
  // borran: quedan marcadas para reubicar (el backend no deja volver a
  // guardarlas ahí) y se anota en el historial.
  await unaVez(db, 'panol-aula8-eoe', async () => {
    for (const id of ['pb-1', 'pb-6', 'pb-15']) {
      const [, , nombre, tipo] = SALONES.find(([s]) => s === id);
      await db.ejecutar(
        'UPDATE salones SET nombre = ?, tipo = ?, clasificacion = ? WHERE id = ?',
        nombre, tipo, clasificacionDe(tipo), id
      );
      const { n } = await db.obtenerFila('SELECT COUNT(*) AS n FROM asignaciones WHERE salon_id = ?', id);
      if (n && clasificacionDe(tipo) !== 'AULA') {
        await db.ejecutar(
          "INSERT INTO asignaciones_registro (accion, detalle) VALUES ('cambio', ?)",
          `${NOMBRES_ANTERIORES[id]} pasó a ser ${nombre} (espacio común, no admite clases): ${n} clase${n === 1 ? '' : 's'} para reubicar`
        );
      }
    }
  });

  // Organización institucional (PDF «ORGANIZACION OCTUBRE»): datos de cada
  // grilla (período, turno, ciclo, días, grupos y materias que admite), de
  // cada grupo (alumnos, turno) y una marca `revisar` con el motivo para lo
  // que la importación no pudo resolver sola. `origen` identifica las clases
  // importadas (así, volver a importar no las duplica).
  for (const [tabla, columna, definicion] of [
    ['grillas', 'organizacion', "TEXT NOT NULL DEFAULT ''"],
    ['grillas', 'periodo', "TEXT NOT NULL DEFAULT ''"],
    ['grillas', 'turno', "TEXT NOT NULL DEFAULT ''"],
    ['grillas', 'ciclo', "TEXT NOT NULL DEFAULT ''"],
    ['grillas', 'dias', 'TEXT'],
    ['grillas', 'grupos', 'TEXT'],
    ['grillas', 'materias', 'TEXT'],
    ['grupos', 'alumnos', 'INTEGER'],
    ['grupos', 'turno', "TEXT NOT NULL DEFAULT ''"],
    ['grupos', 'revisar', 'TEXT'],
    ['docentes', 'revisar', 'TEXT'],
    ['materias', 'revisar', 'TEXT'],
    ['asignaciones', 'origen', 'TEXT'],
    // Sólo las grillas vigentes cuentan en el plano y en los choques (las
    // copias de semanas anteriores quedan archivadas).
    ['grillas', 'vigente', 'INTEGER NOT NULL DEFAULT 1'],
    // Cambio de aula excepcional: el aula de siempre, para volver a ella.
    ['asignaciones', 'salon_habitual', 'TEXT REFERENCES salones(id)'],
    // Cada módulo con su turno: una grilla puede tener mañana y tarde.
    ['modulos', 'turno', "TEXT NOT NULL DEFAULT ''"],
    // Lunes de la semana de una excepción (docente ausente, clase cancelada,
    // cambio de aula): la semana siguiente la clase vuelve a ser la de siempre.
    ['asignaciones', 'semana', 'TEXT'],
    // Los otros horarios que el PDF pone en el encabezado de la franja
    // («1º 7:10 a 9:10 - 7:30 a 9:30»), como JSON [["07:30","09:30"]].
    ['modulos', 'rangos', "TEXT NOT NULL DEFAULT '[]'"],
    // Clase que, según la organización oficial (PDF), comparte el aula (o el
    // grupo, si el PDF lo pone así) con otra clase marcada igual.
    ['asignaciones', 'compartida', 'INTEGER NOT NULL DEFAULT 0'],
  ]) {
    await db.agregarColumnaSiNoExiste(tabla, columna, definicion);
  }
  await db.ejecutar(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_asignaciones_origen ON asignaciones(origen) WHERE origen IS NOT NULL'
  );
  // Las grillas de siempre: Básico y Superior, sin turno ni período cargados.
  await unaVez(db, 'grillas-ciclo', async () => {
    await db.ejecutar("UPDATE grillas SET ciclo = 'basico' WHERE id = 'Básico' AND ciclo = ''");
    await db.ejecutar("UPDATE grillas SET ciclo = 'superior' WHERE id = 'Superior' AND ciclo = ''");
  });

  // Primer piso: el cuadrado junto al Laboratorio («Pañol») es el Aula 9; el
  // cubículo entre el Aula 10 y el Aula 11 («Sin nombre») es el SERVER
  // (espacio común) y el cuadrado frente al Aula 11 («Jefe de área») es la
  // Jefatura de Área, espacio institucional que nunca se asigna a clases.
  // Mismo id: no se duplica nada ni se pierde ninguna relación.
  await unaVez(db, 'aula9-server-jefatura', async () => {
    for (const id of ['1p-4', '1p-17', '1p-5']) {
      const [, , nombre, tipo] = SALONES.find(([s]) => s === id);
      await db.ejecutar(
        'UPDATE salones SET nombre = ?, tipo = ?, clasificacion = ?, habilitado = 1 WHERE id = ?',
        nombre, tipo, clasificacionDe(tipo), id
      );
    }
  });

  // Una sola grilla para la organización institucional: las de mañana y
  // tarde del PDF («org-…-manana», «org-…-tarde») se unen en «org-…», con el
  // turno en cada módulo. Mismos módulos y clases (sólo cambian de grilla).
  await unaVez(db, 'grilla-unica-organizacion', async () => {
    await db.ejecutar(
      "UPDATE modulos SET turno = (SELECT g.turno FROM grillas g WHERE g.id = modulos.grilla_id) WHERE turno = ''"
    );
    const porTurno = await db.obtenerFilas(
      "SELECT * FROM grillas WHERE id LIKE 'org-%-manana' OR id LIKE 'org-%-tarde' ORDER BY orden, id"
    );
    const bases = [...new Set(porTurno.map((g) => g.id.replace(/-(manana|tarde)$/, '')))];
    for (const base of bases) {
      const partes = porTurno.filter((g) => g.id.replace(/-(manana|tarde)$/, '') === base);
      const primera = partes[0];
      await db.ejecutar(
        `INSERT OR IGNORE INTO grillas (id, nombre, orden, organizacion, periodo, turno, ciclo, dias, grupos, materias, vigente)
         VALUES (?, ?, ?, ?, ?, '', 'ambos', ?, '[]', '[]', ?)`,
        base, `Talleres${primera.periodo ? ` · ${primera.periodo}` : ''}`, primera.orden, primera.organizacion,
        primera.periodo, primera.dias, partes.some((g) => g.vigente) ? 1 : 0
      );
      for (const [i, g] of partes.sort((a, b) => (a.turno === 'manana' ? -1 : 1) - (b.turno === 'manana' ? -1 : 1)).entries()) {
        await db.ejecutar(
          `UPDATE modulos SET grilla_id = ?, clave = turno || '-' || clave, orden = orden + ? WHERE grilla_id = ?`,
          base, i * 100, g.id
        );
        await db.ejecutar('DELETE FROM grillas WHERE id = ?', g.id);
      }
    }
  });

  // El encabezado de cada franja, tal cual el PDF de organización ya extraído.
  await unaVez(db, 'rangos-organizacion', async () => {
    const datos = require('../datos/organizacion-octubre-2026.json');
    const TURNO = { 'MAÑANA': 'manana', TARDE: 'tarde', VESPERTINO: 'vespertino' };
    for (const f of datos.franjas) {
      await db.ejecutar(
        "UPDATE modulos SET rangos = ? WHERE grilla_id LIKE 'org-%' AND clave = ?",
        JSON.stringify(f.rangos.slice(1).map((r) => [r.inicio, r.fin])), `${TURNO[f.turno]}-${f.modulo}°`
      );
    }
  });

  // Grilla principal de Espacios y horarios (una sola, marcada con principal = 1).
  await db.agregarColumnaSiNoExiste('grillas', 'principal', 'INTEGER NOT NULL DEFAULT 0');
  await db.ejecutar('CREATE UNIQUE INDEX IF NOT EXISTS idx_grillas_principal ON grillas(principal) WHERE principal = 1');
  await inicializarPrincipal(db);

  // Los textos de relleno que entraron al catálogo en la versión anterior.
  await unaVez(db, 'catalogo-sin-relleno', async () => {
    await db.ejecutar(
      "UPDATE docentes SET activo = 0 WHERE nombre = 'Sin asignar' AND id NOT IN (SELECT docente_id FROM asignaciones WHERE docente_id IS NOT NULL)"
    );
    await db.ejecutar(
      "UPDATE materias SET activo = 0 WHERE nombre = 'Materia' AND id NOT IN (SELECT materia_id FROM asignaciones WHERE materia_id IS NOT NULL)"
    );
  });
}

// La organización institucional (PDF «ORGANIZACION OCTUBRE», extraído a
// datos/organizacion-octubre-2026.json) es la grilla principal y permanente.
// Se carga UNA sola vez: si ya hay grilla principal, no se toca; si la grilla
// del PDF ya estaba importada, sólo se la marca como principal (sus datos
// actuales quedan como están). Ni los cambios de semana ni las copias la
// reemplazan. En los tests no se carga sola (INICIALIZAR_GRILLA=1 la fuerza).
async function inicializarPrincipal(db) {
  if (process.env.NODE_ENV === 'test' && !process.env.INICIALIZAR_GRILLA) return;
  const actual = await db.obtenerFila('SELECT id FROM grillas WHERE principal = 1');
  if (actual) {
    await db.ejecutar('UPDATE grillas SET vigente = 1 WHERE id = ? AND vigente = 0', actual.id);
    return;
  }
  const { analizar, aplicar } = require('../utils/importacion');
  const datos = require('../datos/organizacion-octubre-2026.json');
  const existentes = {
    materias: await db.obtenerFilas('SELECT id, nombre FROM materias'),
    docentes: await db.obtenerFilas('SELECT id, nombre FROM docentes'),
    grupos: await db.obtenerFilas('SELECT id, nombre FROM grupos'),
    salones: await db.obtenerFilas('SELECT id, nombre, clasificacion FROM salones'),
  };
  const informe = analizar(datos, existentes);
  const id = informe.clases[0]?.grilla.id;
  if (!id) return;
  const yaEstaba = await db.obtenerFila('SELECT 1 FROM grillas WHERE id = ?', id);
  if (!yaEstaba) {
    const r = await aplicar(db, informe, { clases: true, fuente: datos.fuente, compartidas: true });
    console.log(`[Grilla principal] Cargada desde ${datos.fuente}: ${r.clases} clases${r.conflictos.length ? `, ${r.conflictos.length} sin cargar por superposición` : ''}.`);
  }
  await db.transaccion(async () => {
    await db.ejecutar('UPDATE grillas SET principal = 0 WHERE principal = 1');
    await db.ejecutar('UPDATE grillas SET principal = 1, vigente = 1 WHERE id = ?', id);
    await db.ejecutar("INSERT OR IGNORE INTO migraciones (nombre) VALUES ('grilla-principal')");
  });
}

// ---------- Lecturas compartidas ----------

// Grillas con sus módulos, en el formato que usa el frontend:
// [{ id, nombre, horas: [{ id: clave, nombre, inicio, fin }] }]
const lista = (json) => {
  try {
    const valor = JSON.parse(json);
    return Array.isArray(valor) ? valor : null;
  } catch {
    return null;
  }
};

async function leerGrillas(db) {
  // La principal va primero: es la que se abre al entrar.
  const grillas = await db.obtenerFilas('SELECT * FROM grillas ORDER BY principal DESC, orden, id');
  const modulos = await db.obtenerFilas('SELECT * FROM modulos ORDER BY orden, id');
  return grillas.map((g) => ({
    id: g.id,
    nombre: g.nombre,
    organizacion: g.organizacion ?? '',
    periodo: g.periodo ?? '',
    turno: g.turno ?? '',
    ciclo: g.ciclo ?? '',
    vigente: g.vigente !== 0,
    principal: g.principal === 1,
    // Vacío = todos los días / todos los grupos / todas las materias.
    dias: lista(g.dias) ?? DIAS,
    grupos: lista(g.grupos) ?? [],
    materias: lista(g.materias) ?? [],
    horas: modulos
      .filter((m) => m.grilla_id === g.id)
      .map((m) => ({ id: m.clave, nombre: m.nombre, turno: m.turno ?? '', inicio: m.inicio, fin: m.fin, rangos: lista(m.rangos) ?? [] })),
  }));
}

// El plano como lo esperaba el frontend antes ({ nombres, cancelados }).
async function planoCompatible(db) {
  const filas = await db.obtenerFilas('SELECT id, nombre, habilitado FROM salones');
  const originales = Object.fromEntries(SALONES.map(([id, , nombre]) => [id, nombre]));
  return {
    nombres: Object.fromEntries(filas.filter((s) => s.nombre !== originales[s.id]).map((s) => [s.id, s.nombre])),
    cancelados: filas.filter((s) => !s.habilitado).map((s) => s.id),
  };
}

module.exports = { migrar, leerGrillas, planoCompatible, HORA, mismoNombre, limpio };
