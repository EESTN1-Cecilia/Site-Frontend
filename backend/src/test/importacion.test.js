process.env.NODE_ENV = 'test';
process.env.TEST_DB_NAME = 'test-database-importacion.sqlite';
process.env.JWT_SECRET = 'clave-test-segura-para-testing-123';

const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const rutaDb = path.join(__dirname, '..', '..', 'data', 'test-database-importacion.sqlite');
if (fs.existsSync(rutaDb)) fs.unlinkSync(rutaDb);

const db = require('../database/db');
const { analizar, aplicar, asignarEspacio } = require('../utils/importacion');
const { clave, titulo, esSigla } = require('../utils/normalizar');
const datos = require('../datos/organizacion-octubre-2026.json');

const existentes = async () => ({
  materias: await db.obtenerFilas('SELECT id, nombre FROM materias'),
  docentes: await db.obtenerFilas('SELECT id, nombre FROM docentes'),
  grupos: await db.obtenerFilas('SELECT id, nombre FROM grupos'),
  salones: await db.obtenerFilas('SELECT id, nombre, clasificacion FROM salones'),
});
const contar = async (tabla) => (await db.obtenerFila(`SELECT COUNT(*) AS n FROM ${tabla}`)).n;

before(async () => {
  await db.asegurarMigraciones();
  // Un grupo que ya existía con otro formato: no se duplica.
  await db.ejecutar("INSERT INTO grupos (nombre, curso) VALUES ('Grupo 1.1', '1° 1')");
});

describe('Extracción del PDF', () => {
  it('se procesaron las 4 páginas (los dos turnos y los dos módulos de cada uno)', () => {
    assert.strictEqual(datos.paginas, 4);
    assert.deepStrictEqual(datos.franjas.map((f) => `${f.turno} ${f.modulo}`), ['MAÑANA 1', 'MAÑANA 2', 'TARDE 1', 'TARDE 2']);
    assert.strictEqual(datos.franjas.reduce((s, f) => s + f.celdas.length, 0), 282);
  });

  it('cada celda separa grupo, materia, docente y espacio (no los confunde)', () => {
    const c = datos.franjas[0].celdas.find((x) => x.dia === 'Lunes' && x.fila === 1);
    assert.deepStrictEqual(
      [c.inicio, c.fin, c.materia, c.grupo, c.alumnos, c.espacio, c.docente],
      ['07:10', '09:10', 'SISTEMAS TECNOLOGICOS', '1.9', 17, 'SUM', 'GUIRLAND']
    );
    for (const celda of datos.franjas.flatMap((f) => f.celdas)) {
      if (celda.grupo) assert.match(celda.grupo, /^\d\.\d{1,2}$/);
      assert.ok(!/^\d\.\d{1,2}$/.test(celda.materia ?? ''), 'un grupo no es materia');
      assert.ok(!/^(AULA|TALLER|SUM|BIBLIOTECA|LABORATORIO)$/.test(celda.docente ?? ''), 'un espacio no es docente');
    }
  });
});

describe('Normalización', () => {
  it('compara sin tildes, mayúsculas ni palabras de enlace; muestra con tildes', () => {
    assert.strictEqual(clave('LABORATORIO SISTEMAS OPERATIVOS'), clave('Laboratorio de Sistemas Operativos'));
    assert.strictEqual(titulo('LENGUAJES TECNOLOGICOS'), 'Lenguajes Tecnológicos');
    assert.strictEqual(titulo('DE LA TORRE', { tildes: false }), 'De la Torre');
  });

  it('distingue siglas de apellidos', () => {
    assert.ok(esSigla('P.D.I.S.C.') && esSigla('PDSPM'));
    assert.ok(!esSigla('GRASSO') && !esSigla('REDES'));
  });
});

describe('Importación de catálogos', () => {
  let informe;

  it('analiza todo el documento sin tocar la base', async () => {
    informe = analizar(datos, await existentes());
    assert.strictEqual(await contar('materias'), 0);
    const materias = informe.materias.map((m) => m.nombre);
    for (const esperada of [
      'Sistemas Tecnológicos', 'Procedimientos Técnicos', 'Lenguajes Tecnológicos', 'Laboratorio de Programación',
      'Laboratorio de Hardware', 'Laboratorio de Sistemas Operativos', 'Laboratorio de Aplicaciones',
      'Laboratorio de Redes Informáticas', 'Laboratorio de Diseño Web', 'Desarrollo de Aplicaciones Web Dinámicas',
      'Laboratorio de Procesos Industriales',
    ]) assert.ok(materias.includes(esperada), esperada);
    // Materias de la tarde (sólo en las páginas 3 y 4).
    assert.ok(materias.includes('Laboratorio de Base de Datos'));
  });

  it('las siglas se unen con su nombre completo sólo si las iniciales coinciden', () => {
    const pdisc = informe.materias.find((m) => m.siglas.includes('PDISC'));
    assert.strictEqual(pdisc.nombre, 'Proyecto Diseño e Implementación de Sistemas Computacionales');
    const imrri = informe.materias.find((m) => m.nombre === 'IMRRI');
    assert.match(imrri.revisar, /Sigla sin el nombre completo/);
    assert.match(informe.materias.find((m) => m.nombre === 'DISWD').revisar, /PISWD/);
  });

  it('grupos con curso, alumnos y turno; el que ya estaba («Grupo 1.1») coincide', () => {
    const g19 = informe.grupos.find((g) => g.nombre === '1.9');
    assert.deepStrictEqual([g19.curso, g19.alumnos, g19.turno, g19.estado], ['1° año', 17, 'manana', 'nuevo']);
    assert.strictEqual(informe.grupos.find((g) => g.nombre === '1.1').estado, 'coincide');
    assert.ok(informe.grupos.find((g) => g.nombre === '1.6').turno === 'tarde');
  });

  it('docentes: los ambiguos se marcan para revisar', () => {
    assert.match(informe.docentes.find((d) => d.nombre === 'Grasso').revisar, /Grasso C\. o Grasso E\./);
    assert.ok(informe.docentes.some((d) => d.nombre === 'Grasso E.'));
  });

  it('espacios: se vinculan con el plano (Aula 17 incluida) y los que no están se informan', () => {
    const por = Object.fromEntries(informe.espacios.map((e) => [e.original, e]));
    assert.strictEqual(por['AULA 17'].salon_id, '1p-18');
    assert.strictEqual(por['BIBLIOTECA'].salon_id, '1p-11');
    assert.strictEqual(por['SUM'].salon_id, null);
    assert.match(por['TALLER'].revisar, /Taller grande/);
  });

  it('aplicar dos veces no duplica nada', async () => {
    await aplicar(db, informe);
    const despues = [await contar('materias'), await contar('docentes'), await contar('grupos')];
    assert.deepStrictEqual(despues, [24, 58, 58]);
    const otra = analizar(datos, await existentes());
    assert.ok(otra.materias.every((m) => m.estado === 'coincide'));
    const r = await aplicar(db, otra);
    assert.deepStrictEqual([r.materias, r.docentes, r.grupos], [0, 0, 0]);
    assert.deepStrictEqual([await contar('materias'), await contar('docentes'), await contar('grupos')], despues);
    // Al «Grupo 1.1» que ya estaba sólo se le completaron los datos vacíos.
    const g = await db.obtenerFila("SELECT nombre, curso, alumnos, turno FROM grupos WHERE nombre = 'Grupo 1.1'");
    assert.deepStrictEqual(g, { nombre: 'Grupo 1.1', curso: '1° 1', alumnos: 16, turno: 'manana' });
  });

  it('sin --con-clases no se importa ninguna clase; con él, una vez y sin superposiciones', async () => {
    assert.strictEqual(await contar('asignaciones'), 0);
    const r = await aplicar(db, analizar(datos, await existentes()), { clases: true, fuente: datos.fuente });
    assert.strictEqual(r.clases + r.conflictos.length, 282);
    assert.strictEqual(await contar('asignaciones'), r.clases);
    const otra = await aplicar(db, analizar(datos, await existentes()), { clases: true, fuente: datos.fuente });
    assert.deepStrictEqual([otra.clases, otra.yaImportadas], [0, r.clases]);
    // Ninguna clase importada quedó en un espacio común.
    const enComun = await db.obtenerFila(
      "SELECT COUNT(*) AS n FROM asignaciones a JOIN salones s ON s.id = a.salon_id WHERE s.clasificacion <> 'AULA'"
    );
    assert.strictEqual(enComun.n, 0);
  });

  it('«TALLER» del PDF → Taller grande: sólo las que no chocan, sin superposiciones, y repetible', async () => {
    const antes = (await db.obtenerFila("SELECT COUNT(*) AS n FROM asignaciones WHERE observaciones LIKE '%espacio en el PDF: TALLER%'")).n;
    const r = await asignarEspacio(db, { original: 'TALLER', salonId: 'pb-18' });
    assert.ok(r.asignadas > 0);
    assert.strictEqual(r.asignadas + r.sinLugar.length, antes);
    // En el Taller grande no quedó ninguna superposición.
    const enTaller = await db.obtenerFilas(
      `SELECT a.dia, COALESCE(a.inicio, m.inicio) AS inicio, COALESCE(a.fin, m.fin) AS fin
       FROM asignaciones a JOIN modulos m ON m.id = a.modulo_id WHERE a.salon_id = 'pb-18' AND a.estado = 'activa'`
    );
    for (const [i, x] of enTaller.entries()) {
      for (const y of enTaller.slice(i + 1)) {
        assert.ok(x.dia !== y.dia || !(x.inicio < y.fin && x.fin > y.inicio), `superposición ${JSON.stringify([x, y])}`);
      }
    }
    // A las asignadas se les quitó la nota; a las otras no.
    assert.strictEqual(
      (await db.obtenerFila("SELECT COUNT(*) AS n FROM asignaciones WHERE salon_id = 'pb-18' AND observaciones LIKE '%espacio en el PDF%'")).n,
      0
    );
    const otra = await asignarEspacio(db, { original: 'TALLER', salonId: 'pb-18' });
    assert.deepStrictEqual([otra.asignadas, otra.sinLugar.length], [0, r.sinLugar.length]);
  });

  it('«AULA 9» del PDF ya se vincula con el Aula 9 del plano', () => {
    const aula9 = analizar(datos, { materias: [], docentes: [], grupos: [], salones: [{ id: '1p-4', nombre: 'Aula 9', clasificacion: 'AULA' }] })
      .espacios.find((e) => e.original === 'AULA 9');
    assert.deepStrictEqual([aula9.salon_id, aula9.revisar], ['1p-4', null]);
  });

  it('nunca asigna clases a la Jefatura de Área', async () => {
    await assert.rejects(
      asignarEspacio(db, { original: 'SUM', salonId: '1p-5' }),
      /La Jefatura de Área es un espacio institucional reservado/
    );
  });

  it('no asigna a un espacio común ni a uno que no existe', async () => {
    await assert.rejects(asignarEspacio(db, { original: 'SUM', salonId: 'pb-15' }), /no admite clases/);
    await assert.rejects(asignarEspacio(db, { original: 'SUM', salonId: 'pb-99' }), /No existe/);
  });
});

describe('Depuración: sólo queda lo de la grilla oficial', () => {
  const { planificar, depurar } = require('../utils/depuracion');

  it('borra materias y docentes que no están en el PDF, y las clases que los usan; renombra grupos al oficial', async () => {
    const extra = (await db.ejecutar("INSERT INTO materias (nombre) VALUES ('Materia de ejemplo')")).lastID;
    const docente = (await db.ejecutar("INSERT INTO docentes (nombre) VALUES ('Prof. De Ejemplo')")).lastID;
    const modulo = (await db.obtenerFila("SELECT id FROM modulos WHERE grilla_id = 'org-octubre2026' LIMIT 1")).id;
    const clase = (await db.ejecutar(
      "INSERT INTO asignaciones (modulo_id, dia, docente_id, materia_id) VALUES (?, 'Viernes', ?, ?)", modulo, docente, extra
    )).lastID;
    const antes = await contar('asignaciones');

    const plan = await planificar(db, datos);
    assert.deepStrictEqual(plan.fuera.materias.map((m) => m.nombre), ['Materia de ejemplo']);
    assert.deepStrictEqual(plan.fuera.docentes.map((d) => d.nombre), ['Prof. De Ejemplo']);
    assert.deepStrictEqual(plan.clases.map((c) => c.id), [clase]);
    assert.deepStrictEqual(plan.renombrar, [{ id: plan.renombrar[0].id, de: 'Grupo 1.1', a: '1.1' }]);

    await depurar(db, plan);
    assert.strictEqual(await db.obtenerFila('SELECT 1 FROM materias WHERE id = ?', extra), undefined);
    assert.strictEqual(await db.obtenerFila('SELECT 1 FROM asignaciones WHERE id = ?', clase), undefined);
    assert.strictEqual(await contar('asignaciones'), antes - 1);
    assert.ok(await db.obtenerFila("SELECT 1 FROM grupos WHERE nombre = '1.1'"));
    // Sin huérfanas: ninguna clase apunta a algo que no existe.
    const huerfanas = await db.obtenerFila(`SELECT COUNT(*) AS n FROM asignaciones a
      WHERE (a.docente_id IS NOT NULL AND a.docente_id NOT IN (SELECT id FROM docentes))
         OR (a.materia_id IS NOT NULL AND a.materia_id NOT IN (SELECT id FROM materias))
         OR (a.grupo_id IS NOT NULL AND a.grupo_id NOT IN (SELECT id FROM grupos))`);
    assert.strictEqual(huerfanas.n, 0);
    // Repetir no hace nada.
    const otra = await planificar(db, datos);
    assert.deepStrictEqual([otra.fuera.materias.length, otra.fuera.docentes.length, otra.clases.length, otra.renombrar.length], [0, 0, 0, 0]);
  });
});

describe('Una sola grilla: ciclo básico y superior, mañana y tarde', () => {
  const { planificar, unir } = require('../utils/unificacion');
  const { migrar } = require('../database/espacios');

  it('el PDF entra en una grilla, con el turno en cada módulo (mañana primero)', async () => {
    const grillas = await db.obtenerFilas("SELECT id, turno, ciclo FROM grillas WHERE id LIKE 'org-%'");
    assert.deepStrictEqual(grillas, [{ id: 'org-octubre2026', turno: '', ciclo: 'ambos' }]);
    const modulos = await db.obtenerFilas("SELECT clave, nombre, turno FROM modulos WHERE grilla_id = 'org-octubre2026' ORDER BY orden, id");
    assert.deepStrictEqual(modulos.map((m) => `${m.turno} ${m.nombre}`), ['manana 1° módulo', 'manana 2° módulo', 'tarde 1° módulo', 'tarde 2° módulo']);
  });

  it('una base con las grillas de mañana y tarde separadas se une sola, sin perder clases', async () => {
    await db.ejecutar("INSERT INTO grillas (id, nombre, turno, periodo, dias) VALUES ('org-prueba-manana', 'M', 'manana', 'Prueba', '[\"Lunes\"]'), ('org-prueba-tarde', 'T', 'tarde', 'Prueba', '[\"Lunes\"]')");
    const m = (await db.ejecutar("INSERT INTO modulos (grilla_id, clave, nombre, inicio, fin) VALUES ('org-prueba-manana', '1°', '1° módulo', '07:10', '09:10')")).lastID;
    const t = (await db.ejecutar("INSERT INTO modulos (grilla_id, clave, nombre, inicio, fin) VALUES ('org-prueba-tarde', '1°', '1° módulo', '13:00', '15:00')")).lastID;
    await db.ejecutar("INSERT INTO asignaciones (modulo_id, dia) VALUES (?, 'Lunes'), (?, 'Lunes')", m, t);
    await db.ejecutar("DELETE FROM migraciones WHERE nombre = 'grilla-unica-organizacion'");
    await migrar(db);
    assert.deepStrictEqual(await db.obtenerFilas("SELECT id FROM grillas WHERE id LIKE 'org-prueba%'"), [{ id: 'org-prueba' }]);
    const modulos = await db.obtenerFilas("SELECT id, clave, turno FROM modulos WHERE grilla_id = 'org-prueba' ORDER BY orden");
    assert.deepStrictEqual(modulos.map((x) => [x.id, x.clave, x.turno]), [[m, 'manana-1°', 'manana'], [t, 'tarde-1°', 'tarde']]);
    assert.strictEqual((await db.obtenerFila('SELECT COUNT(*) AS n FROM asignaciones WHERE modulo_id IN (?, ?)', m, t)).n, 2);
  });

  it('unir otra grilla (Superior): cada clase va al módulo de su turno que más se superpone y conserva su horario', async () => {
    await db.ejecutar("INSERT INTO grillas (id, nombre, ciclo) VALUES ('sup-prueba', 'Superior prueba', 'superior')");
    const mod = (await db.ejecutar("INSERT INTO modulos (grilla_id, clave, nombre, inicio, fin) VALUES ('sup-prueba', '1°/2°', '1°/2°', '08:00', '09:20')")).lastID;
    const vacio = (await db.ejecutar("INSERT INTO modulos (grilla_id, clave, nombre) VALUES ('sup-prueba', '7°/8°', '7°/8°')")).lastID;
    const clase = (await db.ejecutar("INSERT INTO asignaciones (modulo_id, dia, inicio, fin) VALUES (?, 'Miércoles', '07:30', '09:30')", mod)).lastID;

    const plan = await planificar(db, { destino: 'org-octubre2026', origen: 'sup-prueba' });
    assert.deepStrictEqual(plan.mover.map((c) => [c.id, c.a.clave]), [[clase, 'manana-1°']]);
    await unir(db, plan);
    const a = await db.obtenerFila('SELECT a.inicio, a.fin, m.grilla_id, m.clave FROM asignaciones a JOIN modulos m ON m.id = a.modulo_id WHERE a.id = ?', clase);
    assert.deepStrictEqual(a, { inicio: '07:30', fin: '09:30', grilla_id: 'org-octubre2026', clave: 'manana-1°' });
    assert.strictEqual(await db.obtenerFila("SELECT 1 FROM grillas WHERE id = 'sup-prueba'"), undefined);
    assert.strictEqual(await db.obtenerFila('SELECT 1 FROM modulos WHERE id = ?', vacio), undefined);
    assert.ok((await db.obtenerFila("SELECT detalle FROM asignaciones_registro ORDER BY id DESC LIMIT 1")).detalle.includes('se unió'));
  });
});

describe('Encabezado de cada franja como el PDF', () => {
  it('cada módulo guarda los otros horarios del encabezado (9:30 a 11:30, 15:30 a 17:30…)', async () => {
    const filas = await db.obtenerFilas("SELECT clave, rangos FROM modulos WHERE grilla_id = 'org-octubre2026' ORDER BY orden");
    assert.deepStrictEqual(filas.map((m) => [m.clave, JSON.parse(m.rangos)]), [
      ['manana-1°', [['07:30', '09:30']]],
      ['manana-2°', [['09:30', '11:30']]],
      ['tarde-1°', [['13:30', '15:30']]],
      ['tarde-2°', [['15:30', '17:30']]],
    ]);
  });
});

describe('Aulas compartidas según el PDF', () => {
  it('con «compartidas» entran las clases que comparten aula o grupo con otra del PDF; quedan las 282', async () => {
    const informe = analizar(datos, await existentes());
    const r = await aplicar(db, informe, { clases: true, compartidas: true, fuente: datos.fuente });
    assert.ok(r.compartidas > 0, 'importó alguna compartida');
    assert.deepStrictEqual(r.conflictos.filter((c) => c.recurso === 'docente'), []);
    assert.strictEqual(await contar("asignaciones WHERE origen LIKE 'organizacionoctubre-%'"), 282);
    // Ejemplo del PDF: lunes 7:10, el Aula 8 la usan 2.5 (Rodríguez) y 3.3 (Farco).
    const aula8 = await db.obtenerFilas(
      `SELECT g.nombre, a.compartida FROM asignaciones a JOIN grupos g ON g.id = a.grupo_id
       WHERE a.origen IN ('organizacionoctubre-octubre2026:p1:Lunes:f5', 'organizacionoctubre-octubre2026:p1:Lunes:f8') ORDER BY g.nombre`
    );
    assert.deepStrictEqual(aula8, [{ nombre: '2.5', compartida: 1 }, { nombre: '3.3', compartida: 1 }]);
    // Repetir no duplica.
    assert.strictEqual((await aplicar(db, analizar(datos, await existentes()), { clases: true, compartidas: true })).clases, 0);
  });
});
