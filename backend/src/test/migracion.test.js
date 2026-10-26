process.env.NODE_ENV = 'test';
process.env.TEST_DB_NAME = 'test-database-migracion.sqlite';
process.env.JWT_SECRET = 'clave-test-segura-para-testing-123';

const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const rutaDb = path.join(__dirname, '..', '..', 'data', 'test-database-migracion.sqlite');
if (fs.existsSync(rutaDb)) fs.unlinkSync(rutaDb);

const db = require('../database/db');

// Una base como la de antes: grillas y plano en JSON (tabla contenido) y la
// primera versión de la tabla asignaciones (salón + "hora" de texto).
before(async () => {
  await db.ejecutar(`CREATE TABLE IF NOT EXISTS contenido (
    seccion TEXT PRIMARY KEY, datos TEXT NOT NULL, actualizado_por INTEGER, updated_at TEXT)`);
  const grillas = [
    {
      id: 'Básico',
      nombre: 'Básico',
      horas: [{ id: '1°/2°', nombre: '1°/2°' }, { id: '3°/4°', nombre: '3°/4°' }],
      clases: [
        { id: 'g1', grupo: 'Grupo 1.1', curso: '1° 1', alumnos: 14, materia: 'Taller de Electricidad', profesor: 'Prof. Sandra Coria', aula: 'Taller 1', dia: 'Lunes', hora: '1°/2°', ausente: false },
        { id: 'g2', grupo: 'Grupo 1.2', curso: '1° 2', alumnos: 13, materia: 'Taller de Madera', profesor: 'Prof. Julio Ferreyra', aula: 'Aula 3', dia: 'Lunes', hora: '3°/4°', ausente: true },
        { id: 'g3', grupo: 'Grupo', curso: 'Curso', alumnos: 0, materia: 'Materia', profesor: 'Sin asignar', aula: 'Aula 6', dia: 'Martes', hora: '1°/2°', ausente: false },
      ],
    },
  ];
  await db.ejecutar("INSERT INTO contenido (seccion, datos) VALUES ('grillas', ?)", JSON.stringify(grillas));
  await db.ejecutar("INSERT INTO contenido (seccion, datos) VALUES ('plano', ?)",
    JSON.stringify({ nombres: { 'pb-21': 'Aula 8' }, cancelados: ['pb-2'] }));

  await db.ejecutar(`CREATE TABLE salones (id TEXT PRIMARY KEY, piso TEXT NOT NULL, nombre TEXT NOT NULL)`);
  await db.ejecutar(`CREATE TABLE docentes (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE COLLATE NOCASE, activo INTEGER DEFAULT 1, created_at TEXT)`);
  await db.ejecutar(`CREATE TABLE materias (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL UNIQUE COLLATE NOCASE, activo INTEGER DEFAULT 1, created_at TEXT)`);
  await db.ejecutar(`CREATE TABLE asignaciones (id INTEGER PRIMARY KEY AUTOINCREMENT, salon_id TEXT NOT NULL,
    docente_id INTEGER NOT NULL, materia_id INTEGER NOT NULL, dia TEXT NOT NULL, hora TEXT NOT NULL,
    actualizado_por INTEGER, created_at TEXT, updated_at TEXT)`);
  await db.ejecutar("INSERT INTO salones VALUES ('pb-13', 'pb', 'Aula 5')");
  await db.ejecutar("INSERT INTO docentes (nombre) VALUES ('Prof. Marcos Vega'), ('Sin asignar')");
  await db.ejecutar("INSERT INTO materias (nombre) VALUES ('Redes')");
  await db.ejecutar("INSERT INTO asignaciones (salon_id, docente_id, materia_id, dia, hora) VALUES ('pb-13', 1, 1, 'Viernes', '3°/4°')");

  await db.asegurarMigraciones();
});

const filas_ = () => db.obtenerFilas(`
  SELECT a.dia, m.grilla_id, m.clave, a.salon_id, d.nombre AS docente, ma.nombre AS materia,
         g.nombre AS grupo, g.curso, a.alumnos, a.estado
  FROM asignaciones a JOIN modulos m ON m.id = a.modulo_id
  LEFT JOIN docentes d ON d.id = a.docente_id LEFT JOIN materias ma ON ma.id = a.materia_id
  LEFT JOIN grupos g ON g.id = a.grupo_id ORDER BY a.id`);

describe('Migración a una sola fuente de datos', () => {
  it('las clases de las grillas pasan a asignaciones con sus docentes, materias y grupos', async () => {
    const [coria, ferreyra] = await filas_();
    assert.deepStrictEqual(coria, {
      dia: 'Lunes', grilla_id: 'Básico', clave: '1°/2°', salon_id: 'pb-1', docente: 'Prof. Sandra Coria',
      materia: 'Taller de Electricidad', grupo: 'Grupo 1.1', curso: '1° 1', alumnos: 14, estado: 'activa',
    });
    // "Aula 3" hay tres en el plano: no se adivina cuál era.
    assert.strictEqual(ferreyra.salon_id, null);
    assert.strictEqual(ferreyra.estado, 'docente_ausente');
  });

  it('los textos de relleno de la grilla no se inventan como datos', async () => {
    const relleno = (await filas_())[2];
    assert.deepStrictEqual(
      [relleno.salon_id, relleno.docente, relleno.materia, relleno.grupo],
      ['pb-15', null, null, null]
    );
    const sinAsignar = await db.obtenerFila("SELECT activo FROM docentes WHERE nombre = 'Sin asignar'");
    assert.strictEqual(sinAsignar.activo, 0);
  });

  it('la tabla de asignaciones de la versión anterior se pasa al módulo de la grilla', async () => {
    const vieja = (await filas_())[3];
    assert.deepStrictEqual(
      [vieja.dia, vieja.grilla_id, vieja.clave, vieja.salon_id, vieja.docente, vieja.materia],
      ['Viernes', 'Básico', '3°/4°', 'pb-13', 'Prof. Marcos Vega', 'Redes']
    );
    const tablas = await db.obtenerFilas("SELECT name FROM sqlite_master WHERE name = 'asignaciones_v1'");
    assert.deepStrictEqual(tablas, []);
  });

  it('el plano pasa a la tabla salones (nombre, habilitado, tipo)', async () => {
    const aula8 = await db.obtenerFila("SELECT nombre, tipo, habilitado FROM salones WHERE id = 'pb-21'");
    assert.deepStrictEqual(aula8, { nombre: 'Aula 8', tipo: 'aula', habilitado: 1 });
    assert.strictEqual((await db.obtenerFila("SELECT habilitado FROM salones WHERE id = 'pb-2'")).habilitado, 0);
  });

  it('Aula 6 → PAÑOL y Bunker → E.O.E. (espacios comunes), Taller 1 → Aula 8, con el mismo id', async () => {
    const filas = await db.obtenerFilas(
      "SELECT id, nombre, tipo, clasificacion FROM salones WHERE id IN ('pb-1', 'pb-6', 'pb-15') ORDER BY id"
    );
    assert.deepStrictEqual(filas, [
      { id: 'pb-1', nombre: 'Aula 8', tipo: 'aula', clasificacion: 'AULA' },
      { id: 'pb-15', nombre: 'PAÑOL', tipo: 'comun', clasificacion: 'ESPACIO_COMUN' },
      { id: 'pb-6', nombre: 'E.O.E.', tipo: 'comun', clasificacion: 'ESPACIO_COMUN' },
    ]);
    // La clase que estaba en "Aula 6" no se borra: queda en PAÑOL para reubicar, y se anota.
    assert.strictEqual((await filas_())[2].salon_id, 'pb-15');
    const nota = await db.obtenerFila("SELECT detalle FROM asignaciones_registro WHERE detalle LIKE 'Aula 6 pasó a ser PAÑOL%'");
    assert.match(nota.detalle, /1 clase para reubicar/);
  });

  it('el JSON de antes queda como respaldo y la migración no se repite', async () => {
    const secciones = (await db.obtenerFilas('SELECT seccion FROM contenido ORDER BY seccion')).map((f) => f.seccion);
    assert.deepStrictEqual(secciones, ['grillas_respaldo', 'plano_respaldo']);
    const antes = (await filas_()).length;
    await db.asegurarMigraciones();
    assert.strictEqual((await filas_()).length, antes);
  });
});
