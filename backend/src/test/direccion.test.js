process.env.NODE_ENV = 'test';
process.env.TEST_DB_NAME = 'test-database-direccion.sqlite';
process.env.JWT_SECRET = 'clave-test-segura-para-testing-123';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const rutaDb = path.join(__dirname, '..', '..', 'data', 'test-database-direccion.sqlite');
if (fs.existsSync(rutaDb)) fs.unlinkSync(rutaDb);

const app = require('../../app');
const db = require('../database/db');
const eventos = require('../utils/eventos');
const { OPCIONES } = require('../utils/tokens');

let servidor;
let base;
const ids = {};
const tokens = {};
const generarToken = (idUsuario) =>
  jwt.sign({ idUsuario }, process.env.JWT_SECRET, { ...OPCIONES, expiresIn: '1h', algorithm: 'HS256' });
const pedir = async (ruta, token) => {
  const r = await fetch(`${base}${ruta}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return { estado: r.status, cuerpo: await r.json() };
};

before(async () => {
  await db.asegurarMigraciones();
  for (const [usuario, rol, nombre, activo] of [
    ['director', 'direccion', 'Dirección', 1],
    ['daniela', 'jefatura_area', 'Daniela Monje', 1],
    ['vieja', 'jefatura_area', null, 0],
    ['ematp', 'server', null, 1],
  ]) {
    const r = await db.ejecutar('INSERT INTO usuarios (username, password_hash, rol, nombre, activo) VALUES (?, ?, ?, ?, ?)', usuario, 'x', rol, nombre, activo);
    ids[usuario] = r.lastID;
    tokens[rol] ??= generarToken(r.lastID);
  }
  // Algo de actividad: Jefatura cambia una clase, EMATP carga una imagen y hay una novedad esperando aprobación.
  await db.ejecutar("INSERT INTO asignaciones_registro (accion, detalle, usuario_id) VALUES ('cambio', '1.1: Taller en Aula 1', ?)", ids.daniela);
  await db.ejecutar("INSERT INTO asignaciones_registro (accion, detalle) VALUES ('alta', 'Importación de prueba')");
  await db.ejecutar("INSERT INTO cartelera (clave, titulo, mime, datos, nivel, autor_id) VALUES ('c1', 'Muestra', 'image/png', x'00', 1, ?)", ids.ematp);
  await db.ejecutar("INSERT INTO publicaciones (id, datos, estado, autor_id) VALUES ('p1', '{\"titulo\":\"Inscripción 2027\"}', 'pendiente', ?)", ids.daniela);
  servidor = http.createServer(app);
  await new Promise((r) => servidor.listen(0, r));
  base = `http://localhost:${servidor.address().port}`;
});

after(() => {
  eventos.cerrarTodo();
  return new Promise((r) => servidor.close(r));
});

describe('Tablero de Dirección', () => {
  it('sólo Dirección lo ve', async () => {
    assert.strictEqual((await pedir('/api/direccion/resumen')).estado, 401);
    assert.strictEqual((await pedir('/api/direccion/resumen', tokens.jefatura_area)).estado, 403);
    assert.strictEqual((await pedir('/api/direccion/resumen', tokens.server)).estado, 403);
  });

  it('el equipo en orden jerárquico, con lo que hizo cada persona en la semana', async () => {
    const { estado, cuerpo } = await pedir('/api/direccion/resumen', tokens.direccion);
    assert.strictEqual(estado, 200);
    assert.deepStrictEqual(cuerpo.equipo.map((n) => [n.nivel, n.nombre]), [[1, 'Dirección'], [2, 'Jefatura de Área'], [3, 'EMATP']]);
    const jefatura = cuerpo.equipo[1].personas;
    assert.deepStrictEqual(jefatura.map((p) => [p.nombre, p.activo]), [['Daniela Monje', true], ['vieja', false]]);
    assert.strictEqual(jefatura[0].actividad.clases, 1);
    assert.strictEqual(jefatura[0].actividad.publicaciones, 1);
    assert.strictEqual(cuerpo.equipo[2].personas[0].actividad.cartelera, 1);
  });

  it('la actividad reciente dice quién fue (o «Sistema») y lo pendiente de Dirección', async () => {
    const { cuerpo } = await pedir('/api/direccion/resumen', tokens.direccion);
    const quienes = new Set(cuerpo.recientes.map((r) => r.quien));
    assert.ok(quienes.has('Daniela Monje') && quienes.has('ematp'));
    assert.ok([...quienes].some((q) => q.startsWith('Sistema')));
    assert.ok(cuerpo.recientes.some((r) => r.detalle === 'Envió para revisar «Inscripción 2027»'));
    assert.deepStrictEqual(cuerpo.pendientes.find((p) => p.tipo === 'publicaciones')?.cantidad, 1);
    assert.ok(cuerpo.pendientes.some((p) => p.tipo === 'pantallas'));
    assert.strictEqual(cuerpo.cartelera.porNivel[1], 1);
    assert.ok(Number.isInteger(cuerpo.escuela.clases));
  });
});
