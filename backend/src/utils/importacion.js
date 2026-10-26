const { clave, claveNombre, parecido, titulo, sigla, esSigla, iniciales } = require('./normalizar');
const { DIAS } = require('./salones');

// Importación de la organización institucional (grillas del PDF extraídas a
// JSON por frontend/scripts/extraer-organizacion.mjs).
//
// analizar() no toca la base: compara lo extraído con lo que ya hay y arma
// el informe (nuevos, coincidentes y dudosos). aplicar() guarda, en una
// transacción y sin duplicar: los catálogos (materias, docentes, grupos) y,
// sólo si se pide (`clases`), las grillas y sus clases. Los espacios no se
// crean: son los del plano; los que no están se informan.

const TURNO = { 'MAÑANA': 'manana', MANANA: 'manana', TARDE: 'tarde', VESPERTINO: 'vespertino' };
const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

const claveGrupo = (nombre) => {
  const m = /(\d+)\.(\d+)/.exec(String(nombre));
  return m ? `${Number(m[1])}.${Number(m[2])}` : clave(nombre);
};
const moda = (valores) => {
  const cuenta = new Map();
  valores.forEach((v) => cuenta.set(v, (cuenta.get(v) ?? 0) + 1));
  return [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
};
const slug = (texto) => clave(texto).replace(/[^a-z0-9]/g, '') || 'organizacion';

// Período y nombre de la organización a partir del archivo y los títulos.
function periodoDe(datos) {
  const anio = datos.franjas.map((f) => f.anio).find(Boolean) ?? null;
  const mes = MESES.find((m) => datos.fuente.toUpperCase().includes(m));
  const nombreMes = mes ? mes.charAt(0) + mes.slice(1).toLowerCase() : null;
  return [nombreMes, anio].filter(Boolean).join(' ');
}

function analizar(datos, existentes) {
  const celdas = datos.franjas.flatMap((f) => f.celdas.map((c) => ({ ...c, franja: f })));
  const informe = { materias: [], docentes: [], grupos: [], espacios: [], clases: [] };

  // ---------- Materias ----------
  const porClave = new Map();
  const siglas = new Map();
  // «IMRRI» tiene vocales, pero el PDF también la escribe «I.M.R.R.I».
  const conPuntos = new Set(celdas.filter((c) => c.materia?.includes('.') && esSigla(c.materia)).map((c) => sigla(c.materia)));
  for (const c of celdas.filter((c) => c.materia)) {
    if (esSigla(c.materia) || (!c.materia.includes(' ') && conPuntos.has(sigla(c.materia)))) {
      const s = sigla(c.materia);
      siglas.set(s, [...(siglas.get(s) ?? []), c.materia]);
      continue;
    }
    const k = clave(c.materia);
    const grupo = porClave.get(k) ?? { variantes: new Map() };
    grupo.variantes.set(c.materia, (grupo.variantes.get(c.materia) ?? 0) + 1);
    porClave.set(k, grupo);
  }
  const materias = [...porClave.entries()].map(([k, g]) => {
    // La variante más completa («LABORATORIO DE SISTEMAS…» antes que «LABORATORIO SISTEMAS…»).
    const original = [...g.variantes.entries()].sort(
      (a, b) => b[0].split(' ').length - a[0].split(' ').length || b[1] - a[1]
    )[0][0];
    return { clave: k, nombre: titulo(original), variantes: [...g.variantes.keys()], apariciones: [...g.variantes.values()].reduce((s, n) => s + n, 0), siglas: [] };
  });
  for (const [s, usos] of siglas) {
    const completa = materias.find((m) => iniciales(m.nombre) === s);
    if (completa) {
      completa.siglas.push(s);
      completa.apariciones += usos.length;
      continue;
    }
    const parecida = [...siglas.keys()].find(
      (otra) => otra !== s && otra.length === s.length && [...otra].filter((l, i) => l !== s[i]).length === 1 && siglas.get(otra).length > usos.length
    );
    materias.push({
      clave: clave(s),
      nombre: s,
      variantes: [...new Set(usos)],
      apariciones: usos.length,
      siglas: [],
      revisar: parecida
        ? `Sigla que aparece ${usos.length} vez: ¿error de tipeo de ${parecida}?`
        : 'Sigla sin el nombre completo en el documento',
    });
  }
  // Nombres que aparecen una o dos veces y se parecen mucho a otro más usado:
  // no se unen solos (pueden ser materias distintas), quedan para revisar.
  for (const m of materias.filter((x) => !x.revisar && x.apariciones <= 2)) {
    const similar = materias
      .filter((o) => o !== m && !esSigla(o.nombre) && o.apariciones >= m.apariciones)
      .map((o) => [o, parecido(m.nombre, o.nombre)])
      .filter(([, p]) => p >= 0.5)
      .sort((a, b) => b[1] - a[1] || b[0].apariciones - a[0].apariciones)[0];
    if (similar) m.revisar = `Aparece ${m.apariciones === 1 ? 'una vez' : 'dos veces'}: ¿es la misma que «${similar[0].nombre}»?`;
  }
  for (const m of materias) {
    const existente = existentes.materias.find((e) => clave(e.nombre) === m.clave || (m.siglas.length && m.siglas.includes(sigla(e.nombre))));
    informe.materias.push({ ...m, estado: existente ? 'coincide' : 'nueva', id: existente?.id, nombreExistente: existente?.nombre });
  }

  // ---------- Grupos ----------
  const grupos = new Map();
  for (const c of celdas.filter((c) => c.grupo)) {
    const k = claveGrupo(c.grupo);
    const g = grupos.get(k) ?? { nombre: c.grupo, alumnos: [], turnos: new Set() };
    if (Number.isInteger(c.alumnos)) g.alumnos.push(c.alumnos);
    g.turnos.add(TURNO[c.franja.turno] ?? '');
    grupos.set(k, g);
  }
  for (const [k, g] of [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0], 'es', { numeric: true }))) {
    const distintos = [...new Set(g.alumnos)].sort((a, b) => a - b);
    const turnos = [...g.turnos].filter(Boolean);
    const dudas = [];
    if (distintos.length > 1) dudas.push(`en el PDF figura con ${distintos.join(', ')} alumnos (se toma ${moda(g.alumnos)})`);
    if (turnos.length > 1) dudas.push('aparece en los dos turnos');
    const existente = existentes.grupos.find((e) => claveGrupo(e.nombre) === k);
    informe.grupos.push({
      clave: k,
      nombre: g.nombre,
      curso: `${g.nombre.split('.')[0]}° año`,
      alumnos: moda(g.alumnos) ?? null,
      turno: turnos.length === 1 ? turnos[0] : '',
      apariciones: g.alumnos.length,
      revisar: dudas.length ? dudas.join('; ') : null,
      estado: existente ? 'coincide' : 'nuevo',
      id: existente?.id,
      nombreExistente: existente?.nombre,
    });
  }

  // ---------- Docentes ----------
  const docentes = new Map();
  for (const c of celdas.filter((c) => c.docente)) {
    const k = claveNombre(c.docente);
    const d = docentes.get(k) ?? { original: c.docente, apariciones: 0 };
    d.apariciones += 1;
    docentes.set(k, d);
  }
  for (const [k, d] of [...docentes.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const nombre = titulo(d.original, { tildes: false });
    const conInicial = [...docentes.values()]
      .map((o) => titulo(o.original, { tildes: false }))
      .filter((o) => o !== nombre && o.startsWith(`${nombre} `) && /\s[A-Z]\.$/.test(o));
    const existente = existentes.docentes.find((e) => claveNombre(e.nombre) === k);
    // ¿Alguien del catálogo con ese apellido? («Prof. Elena Paz» y «PAZ»)
    const mismoApellido = !existente && existentes.docentes.find((e) => claveNombre(e.nombre.split(' ').pop()) === k);
    const dudas = [];
    if (conInicial.length) dudas.push(`puede ser ${conInicial.join(' o ')}`);
    if (mismoApellido) dudas.push(`¿es ${mismoApellido.nombre}?`);
    informe.docentes.push({
      clave: k,
      nombre,
      original: d.original,
      apariciones: d.apariciones,
      revisar: dudas.length ? `Sólo apellido en el PDF: ${dudas.join('; ')}` : null,
      estado: existente ? 'coincide' : 'nuevo',
      id: existente?.id,
      nombreExistente: existente?.nombre,
    });
  }

  // ---------- Espacios (se vinculan con el plano; no se crean) ----------
  const espacios = new Map();
  for (const c of celdas.filter((c) => c.espacio)) espacios.set(c.espacio, (espacios.get(c.espacio) ?? 0) + 1);
  for (const [original, apariciones] of [...espacios.entries()].sort()) {
    const iguales = existentes.salones.filter((s) => clave(s.nombre) === clave(original));
    const salon = iguales.length === 1 ? iguales[0] : null;
    const parecido = !salon && existentes.salones.find((s) => clave(s.nombre).startsWith(clave(original)) && s.clasificacion === 'AULA');
    let revisar = null;
    if (iguales.length > 1) revisar = `hay ${iguales.length} espacios con ese nombre en el plano`;
    else if (!salon) revisar = parecido ? `no está en el plano con ese nombre: ¿es ${parecido.nombre}?` : 'no está en el plano';
    else if (salon.clasificacion !== 'AULA') revisar = `${salon.nombre} es un espacio común: no admite clases`;
    informe.espacios.push({ original, apariciones, salon_id: salon && salon.clasificacion === 'AULA' ? salon.id : null, salon: salon?.nombre ?? null, revisar });
  }

  // ---------- Clases (sólo se guardan si se pide) ----------
  const fuente = slug(datos.fuente.replace(/\.pdf$/i, ''));
  const periodo = periodoDe(datos);
  for (const c of celdas) {
    const turno = TURNO[c.franja.turno] ?? '';
    const espacio = informe.espacios.find((e) => e.original === c.espacio);
    informe.clases.push({
      origen: `${fuente}${periodo ? `-${slug(periodo)}` : ''}:p${c.franja.pagina}:${c.dia}:f${c.fila}`,
      // Una sola grilla (ciclo básico y superior, mañana y tarde); el turno va en cada módulo.
      grilla: { id: `org-${slug(periodo || fuente)}`, periodo, organizacion: titulo(c.franja.titulo) },
      modulo: {
        clave: `${turno}-${c.franja.modulo}°`, nombre: `${c.franja.modulo}° módulo`, turno, ...c.franja.rangos[0],
        rangos: c.franja.rangos.slice(1).map((r) => [r.inicio, r.fin]),
      },
      dia: c.dia,
      fila: c.fila,
      pagina: c.franja.pagina,
      inicio: c.inicio,
      fin: c.fin,
      materia: c.materia && (informe.materias.find((m) => m.variantes.includes(c.materia)) ?? informe.materias.find((m) => m.siglas.includes(sigla(c.materia)))),
      docente: c.docente && informe.docentes.find((d) => d.clave === claveNombre(c.docente)),
      grupo: c.grupo && informe.grupos.find((g) => g.clave === claveGrupo(c.grupo)),
      alumnos: c.alumnos,
      espacio,
      espacioOriginal: c.espacio,
    });
  }
  return informe;
}

// ---------- Guardar ----------
const intervalo = (a) => {
  const m = (h) => (h ? Number(h.slice(0, 2)) * 60 + Number(h.slice(3)) : null);
  return a.inicio && a.fin ? [m(a.inicio), m(a.fin)] : null;
};
const chocan = (a, b) => {
  if (a.dia !== b.dia) return false;
  const [x, y] = [intervalo(a), intervalo(b)];
  if (x && y) return x[0] < y[1] && x[1] > y[0];
  return a.hora === b.hora;
};

// compartidas: si una clase del PDF choca sólo por aula (o grupo) con otras
// clases del mismo PDF, se importa igual y todas quedan marcadas
// «compartida» (así figura en la organización oficial). Con el docente
// nunca: esas siguen sin importarse.
async function aplicar(db, informe, { clases = false, fuente = 'organización', compartidas = false } = {}) {
  const resultado = { materias: 0, docentes: 0, grupos: 0, gruposCompletados: 0, grillas: 0, clases: 0, compartidas: 0, yaImportadas: 0, conflictos: [] };

  await db.transaccion(async () => {
    // Catálogos: se agregan los nuevos; a los que coinciden sólo se les
    // completa lo que tengan vacío. Nada existente se renombra ni se borra.
    for (const m of informe.materias) {
      if (m.estado === 'coincide') continue;
      const r = await db.ejecutar('INSERT OR IGNORE INTO materias (nombre, revisar) VALUES (?, ?)', m.nombre, m.revisar ?? null);
      m.id = r.lastID || (await db.obtenerFila('SELECT id FROM materias WHERE nombre = ?', m.nombre)).id;
      resultado.materias += r.changes;
    }
    for (const d of informe.docentes) {
      if (d.estado === 'coincide') continue;
      const r = await db.ejecutar('INSERT OR IGNORE INTO docentes (nombre, revisar) VALUES (?, ?)', d.nombre, d.revisar ?? null);
      d.id = r.lastID || (await db.obtenerFila('SELECT id FROM docentes WHERE nombre = ?', d.nombre)).id;
      resultado.docentes += r.changes;
    }
    for (const g of informe.grupos) {
      if (g.estado === 'coincide') {
        const r = await db.ejecutar(
          `UPDATE grupos SET alumnos = COALESCE(alumnos, ?), turno = CASE WHEN turno = '' THEN ? ELSE turno END,
             revisar = COALESCE(revisar, ?) WHERE id = ? AND (alumnos IS NULL OR turno = '')`,
          g.alumnos, g.turno, g.revisar, g.id
        );
        resultado.gruposCompletados += r.changes;
        continue;
      }
      const r = await db.ejecutar(
        'INSERT OR IGNORE INTO grupos (nombre, curso, alumnos, turno, revisar) VALUES (?, ?, ?, ?, ?)',
        g.nombre, g.curso, g.alumnos, g.turno, g.revisar
      );
      g.id = r.lastID || (await db.obtenerFila('SELECT id FROM grupos WHERE nombre = ?', g.nombre)).id;
      resultado.grupos += r.changes;
    }

    if (!clases) return;

    // La grilla y sus módulos (con turno): si ya existen, no se tocan.
    const orden = (await db.obtenerFila('SELECT COALESCE(MAX(orden), -1) + 1 AS n FROM grillas')).n;
    const grillas = [...new Map(informe.clases.map((c) => [c.grilla.id, c.grilla])).values()];
    for (const [i, g] of grillas.entries()) {
      const nombre = `Talleres${g.periodo ? ` · ${g.periodo}` : ''}`;
      const r = await db.ejecutar(
        `INSERT OR IGNORE INTO grillas (id, nombre, orden, organizacion, periodo, turno, ciclo, dias, grupos, materias)
         VALUES (?, ?, ?, ?, ?, '', 'ambos', ?, '[]', '[]')`,
        g.id, nombre, orden + i, g.organizacion, g.periodo, JSON.stringify(DIAS)
      );
      resultado.grillas += r.changes;
      const modulos = [...new Map(informe.clases.filter((c) => c.grilla.id === g.id).map((c) => [c.modulo.clave, c.modulo])).values()];
      for (const [j, m] of modulos.entries()) {
        await db.ejecutar(
          'INSERT OR IGNORE INTO modulos (grilla_id, clave, nombre, turno, inicio, fin, orden, rangos) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          g.id, m.clave, m.nombre, m.turno, m.inicio, m.fin, j, JSON.stringify(m.rangos ?? [])
        );
      }
    }

    // Clases: cada celda una vez (origen único). Se revisan los mismos choques
    // que en el sistema; las que chocan no se guardan y se informan.
    const activas = await db.obtenerFilas(
      `SELECT a.id, a.dia, m.clave AS hora, COALESCE(a.inicio, m.inicio) AS inicio, COALESCE(a.fin, m.fin) AS fin,
              a.salon_id, a.docente_id, a.grupo_id, a.origen
       FROM asignaciones a JOIN modulos m ON m.id = a.modulo_id JOIN grillas g ON g.id = m.grilla_id
       WHERE a.estado = 'activa' AND g.vigente = 1`
    );
    for (const c of informe.clases) {
      if (await db.obtenerFila('SELECT 1 FROM asignaciones WHERE origen = ?', c.origen)) {
        resultado.yaImportadas += 1;
        continue;
      }
      const modulo = await db.obtenerFila('SELECT id, inicio, fin FROM modulos WHERE grilla_id = ? AND clave = ?', c.grilla.id, c.modulo.clave);
      const propia = c.inicio && (c.inicio !== modulo.inicio || c.fin !== modulo.fin);
      const nueva = {
        dia: c.dia, hora: c.modulo.clave,
        inicio: c.inicio || modulo.inicio, fin: c.fin || modulo.fin,
        salon_id: c.espacio?.salon_id ?? null, docente_id: c.docente?.id ?? null, grupo_id: c.grupo?.id ?? null,
      };
      const choques = activas.filter((b) => chocan(nueva, b) && (
        (nueva.salon_id && b.salon_id === nueva.salon_id) ||
        (nueva.docente_id && b.docente_id === nueva.docente_id) ||
        (nueva.grupo_id && b.grupo_id === nueva.grupo_id)
      ));
      // ¿Comparte sólo aula o grupo con clases del mismo PDF? Así figura en la organización.
      const delPdf = (b) => b.origen && b.origen.split(':')[0] === c.origen.split(':')[0];
      const comparte = compartidas && choques.length && choques.every((b) => delPdf(b) && !(nueva.docente_id && b.docente_id === nueva.docente_id));
      if (choques.length && !comparte) {
        const choque = choques[0];
        const recurso = nueva.salon_id === choque.salon_id ? 'espacio' : nueva.docente_id === choque.docente_id ? 'docente' : 'grupo';
        resultado.conflictos.push({ ...c, recurso, conClase: choque.id });
        continue;
      }
      const notas = [`Importada de ${fuente} (pág. ${c.pagina}, fila ${c.fila})`];
      if (c.espacioOriginal && !nueva.salon_id) notas.push(`espacio en el PDF: ${c.espacioOriginal}`);
      const r = await db.ejecutar(
        `INSERT INTO asignaciones (modulo_id, dia, salon_id, docente_id, materia_id, grupo_id, inicio, fin, alumnos, estado, observaciones, origen, compartida)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'activa', ?, ?, ?)`,
        modulo.id, c.dia, nueva.salon_id, nueva.docente_id, c.materia?.id ?? null, nueva.grupo_id,
        propia ? c.inicio : null, propia ? c.fin : null, c.alumnos ?? 0, notas.join('; '), c.origen, comparte ? 1 : 0
      );
      if (comparte) {
        for (const b of choques) await db.ejecutar('UPDATE asignaciones SET compartida = 1 WHERE id = ?', b.id);
        resultado.compartidas += 1;
      }
      activas.push({ id: r.lastID, ...nueva, origen: c.origen });
      resultado.clases += 1;
    }
    if (resultado.clases) {
      await db.ejecutar(
        "INSERT INTO asignaciones_registro (accion, detalle) VALUES ('alta', ?)",
        `Importación de ${fuente}: ${resultado.clases} clases en ${grillas.length} grillas`
      );
    }
  });
  return resultado;
}

// Un espacio del PDF que no está en el plano con ese nombre («TALLER») pasa
// a ser un espacio del plano (el Taller grande): las clases importadas que
// quedaron sin espacio y figuran con ese nombre lo reciben, de a una y sólo
// si no se superponen con otra clase en ese espacio. Las que chocan quedan
// sin espacio (para elegir otro) y se informan. Repetible: lo ya asignado no
// vuelve a aparecer.
const NOTA = (original) => `espacio en el PDF: ${original}`;

async function asignarEspacio(db, { original, salonId }) {
  const salon = await db.obtenerFila('SELECT id, nombre, tipo, clasificacion, habilitado FROM salones WHERE id = ?', salonId);
  if (!salon) throw new Error(`No existe el espacio ${salonId} en el plano`);
  if (salon.tipo === 'institucional') {
    throw new Error(`La ${salon.nombre} es un espacio institucional reservado y no puede asignarse a actividades académicas`);
  }
  if (salon.clasificacion !== 'AULA' || !salon.habilitado) throw new Error(`${salon.nombre} no admite clases`);
  const resultado = { original, salon: salon.nombre, asignadas: 0, sinLugar: [] };

  await db.transaccion(async () => {
    const consulta = `
      SELECT a.id, a.dia, m.clave AS hora, COALESCE(a.inicio, m.inicio) AS inicio, COALESCE(a.fin, m.fin) AS fin,
             a.salon_id, a.estado, a.observaciones, ma.nombre AS materia, g.nombre AS grupo, gr.nombre AS grilla
      FROM asignaciones a JOIN modulos m ON m.id = a.modulo_id JOIN grillas gr ON gr.id = m.grilla_id
      LEFT JOIN materias ma ON ma.id = a.materia_id LEFT JOIN grupos g ON g.id = a.grupo_id`;
    const ocupan = await db.obtenerFilas(`${consulta} WHERE a.salon_id = ? AND a.estado = 'activa' AND gr.vigente = 1`, salonId);
    const pendientes = (await db.obtenerFilas(`${consulta} WHERE a.salon_id IS NULL AND a.observaciones LIKE ?`, `%${NOTA(original)}%`))
      // Exacto: «TALLER» no es «TALLER 2».
      .filter((a) => a.observaciones.split('; ').includes(NOTA(original)))
      .sort((x, y) => DIAS.indexOf(x.dia) - DIAS.indexOf(y.dia) || (x.inicio ?? '').localeCompare(y.inicio ?? '') || x.id - y.id);

    for (const a of pendientes) {
      const choque = a.estado === 'activa' && ocupan.find((b) => chocan(a, b));
      if (choque) {
        resultado.sinLugar.push({ ...a, conClase: choque });
        continue;
      }
      const notas = a.observaciones.split('; ').filter((n) => n !== NOTA(original)).join('; ');
      await db.ejecutar(
        "UPDATE asignaciones SET salon_id = ?, observaciones = ?, version = version + 1, updated_at = datetime('now') WHERE id = ?",
        salonId, notas, a.id
      );
      if (a.estado === 'activa') ocupan.push(a);
      resultado.asignadas += 1;
    }
    if (resultado.asignadas) {
      await db.ejecutar(
        "INSERT INTO asignaciones_registro (accion, detalle) VALUES ('cambio', ?)",
        `Espacio «${original}» del PDF → ${salon.nombre}: ${resultado.asignadas} clases` +
          (resultado.sinLugar.length ? ` (${resultado.sinLugar.length} quedan sin espacio por superponerse)` : '')
      );
    }
  });
  return resultado;
}

module.exports = { analizar, aplicar, asignarEspacio, claveGrupo, periodoDe };
