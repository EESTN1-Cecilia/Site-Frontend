process.env.NODE_ENV = 'test';
process.env.TEST_DB_NAME = 'test-database-cartelera.sqlite';
process.env.JWT_SECRET = 'clave-test-segura-para-testing-123';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const rutaDb = path.join(__dirname, '..', '..', 'data', 'test-database-cartelera.sqlite');
if (fs.existsSync(rutaDb)) fs.unlinkSync(rutaDb);

const app = require('../../app');
const db = require('../database/db');
const eventos = require('../utils/eventos');
const { programa, tipoDeImagen } = require('../controllers/cartelera.Controller');
const { OPCIONES } = require('../utils/tokens');

let servidor;
let base;
const tokens = {};
const generarToken = (idUsuario) =>
  jwt.sign({ idUsuario }, process.env.JWT_SECRET, { ...OPCIONES, expiresIn: '1h', algorithm: 'HS256' });

// Un PNG de 1×1 de verdad (y un «PNG» que no lo es).
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a8b80000000049454e44ae426082', 'hex');

const pedir = async (metodo, ruta, { cuerpo, token, archivo } = {}) => {
  const opciones = { method: metodo, headers: token ? { Authorization: `Bearer ${token}` } : {} };
  if (archivo) {
    const datos = new FormData();
    datos.append('archivo', new Blob([archivo]), 'imagen.png');
    for (const [k, v] of Object.entries(cuerpo ?? {})) datos.append(k, String(v));
    opciones.body = datos;
  } else if (cuerpo !== undefined) {
    opciones.headers['Content-Type'] = 'application/json';
    opciones.body = JSON.stringify(cuerpo);
  }
  const r = await fetch(`${base}${ruta}`, opciones);
  const tipo = r.headers.get('content-type') ?? '';
  return { estado: r.status, cuerpo: tipo.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()), tipo };
};
const subir = (token, cuerpo = {}) => pedir('POST', '/api/cartelera', { token, archivo: PNG, cuerpo });

before(async () => {
  await db.asegurarMigraciones();
  for (const [usuario, rol] of [['director', 'direccion'], ['jefe', 'jefatura_area'], ['ematp', 'server']]) {
    const r = await db.ejecutar('INSERT INTO usuarios (username, password_hash, rol) VALUES (?, ?, ?)', usuario, 'x', rol);
    tokens[rol] = generarToken(r.lastID);
  }
  servidor = http.createServer(app);
  await new Promise((r) => servidor.listen(0, r));
  base = `http://localhost:${servidor.address().port}`;
});

after(() => {
  eventos.cerrarTodo();
  return new Promise((r) => servidor.close(r));
});

describe('Orden de la cartelera: Dirección > Jefatura de Área > EMATP', () => {
  const item = (id, nivel, extra = {}) => ({ id, nivel, orden: 0, activo: 1, fijada: 0, desde: null, hasta: null, ...extra });

  it('pasan primero las de Dirección, después Jefatura y al final EMATP', () => {
    assert.deepStrictEqual(programa([item(1, 1), item(2, 3), item(3, 2)]).map((i) => i.id), [2, 3, 1]);
  });

  it('una fijada deja sólo las fijadas de su nivel y no tapa a los niveles de arriba', () => {
    const lista = [item(1, 3), item(2, 2, { fijada: 1 }), item(3, 2), item(4, 1), item(5, 1, { fijada: 1 })];
    assert.deepStrictEqual(programa(lista).map((i) => i.id), [1, 2]);
  });

  it('fuera de fecha o pausadas no pasan', () => {
    const lista = [item(1, 3, { hasta: '2026-01-01' }), item(2, 3, { desde: '2099-01-01' }), item(3, 3, { activo: 0 }), item(4, 3)];
    assert.deepStrictEqual(programa(lista, '2026-10-26').map((i) => i.id), [4]);
  });

  it('sólo acepta imágenes reales', () => {
    assert.strictEqual(tipoDeImagen(PNG), 'image/png');
    assert.strictEqual(tipoDeImagen(Buffer.from('%PDF-1.4 no es una imagen')), null);
  });
});

describe('Cargar y administrar imágenes', () => {
  let deDireccion;
  let deEmatp;

  it('los tres roles cargan; cada imagen queda con el nivel de quien la carga', async () => {
    deDireccion = (await subir(tokens.direccion, { titulo: 'Acto 20 de noviembre', duracion: 15 })).cuerpo.imagen;
    const deJefatura = (await subir(tokens.jefatura_area, { titulo: 'Muestra de talleres' })).cuerpo.imagen;
    const r = await subir(tokens.server, { titulo: 'Reserva de laboratorio' });
    assert.strictEqual(r.estado, 201);
    deEmatp = r.cuerpo.imagen;
    assert.deepStrictEqual([deDireccion.nivel, deJefatura.nivel, deEmatp.nivel], [3, 2, 1]);
    assert.deepStrictEqual([deDireccion.origen, deEmatp.origen], ['Dirección', 'EMATP']);
  });

  it('rechaza lo que no es imagen, sin sesión → 401', async () => {
    const falsa = await pedir('POST', '/api/cartelera', { token: tokens.direccion, archivo: Buffer.from('no soy una imagen, soy texto') });
    assert.strictEqual(falsa.estado, 400);
    assert.strictEqual((await pedir('GET', '/api/cartelera')).estado, 401);
  });

  it('EMATP no cambia ni quita lo de Dirección; Dirección sí lo de EMATP', async () => {
    const cambio = await pedir('PUT', `/api/cartelera/${deDireccion.id}`, { token: tokens.server, cuerpo: { activo: false } });
    assert.strictEqual(cambio.estado, 403);
    assert.match(cambio.cuerpo.error, /Es de Dirección/);
    assert.strictEqual((await pedir('DELETE', `/api/cartelera/${deDireccion.id}`, { token: tokens.jefatura_area })).estado, 403);
    const pausa = await pedir('PUT', `/api/cartelera/${deEmatp.id}`, { token: tokens.direccion, cuerpo: { activo: false } });
    assert.strictEqual(pausa.estado, 200);
    assert.strictEqual(pausa.cuerpo.imagen.activo, false);
  });

  it('el listado dice qué puede cambiar cada uno; las pantallas sólo las ven Dirección y Jefatura', async () => {
    const { cuerpo } = await pedir('GET', '/api/cartelera', { token: tokens.server });
    assert.deepStrictEqual(cuerpo.imagenes.map((i) => [i.nivel, i.puedeCambiar]), [[3, false], [2, false], [1, true]]);
    assert.strictEqual(cuerpo.pantallas, null);
    assert.ok(Array.isArray((await pedir('GET', '/api/cartelera', { token: tokens.direccion })).cuerpo.pantallas));
  });

  it('datos inválidos → 400', async () => {
    for (const cuerpo of [{ duracion: 2 }, { desde: '2026-12-10', hasta: '2026-12-01' }, { titulo: 'x'.repeat(200) }]) {
      assert.strictEqual((await pedir('PUT', `/api/cartelera/${deDireccion.id}`, { token: tokens.direccion, cuerpo })).estado, 400, JSON.stringify(cuerpo));
    }
  });
});

describe('Pantallas (televisores)', () => {
  let pantalla;

  it('Dirección crea la pantalla; EMATP no puede', async () => {
    assert.strictEqual((await pedir('POST', '/api/cartelera/pantallas', { token: tokens.server, cuerpo: { nombre: 'Corredor' } })).estado, 403);
    const r = await pedir('POST', '/api/cartelera/pantallas', { token: tokens.direccion, cuerpo: { nombre: 'Corredor planta baja' } });
    assert.strictEqual(r.estado, 201);
    pantalla = r.cuerpo.pantalla;
    assert.ok(pantalla.token.length >= 30);
  });

  it('el televisor entra con su enlace, sin sesión: plano, clases e imágenes en orden', async () => {
    const r = await pedir('GET', `/api/cartelera/pantalla/${pantalla.token}`);
    assert.strictEqual(r.estado, 200);
    assert.ok(r.cuerpo.salones.length > 30);
    assert.ok(Array.isArray(r.cuerpo.clases));
    // Con lo necesario para los turnos: aula habitual (cambio de aula) y novedades recientes.
    for (const k of ['salon_habitual', 'reciente', 'estado', 'grupo', 'salon']) {
      assert.ok(!r.cuerpo.clases.length || k in r.cuerpo.clases[0], `falta ${k}`);
    }
    assert.deepStrictEqual(r.cuerpo.imagenes.map((i) => i.origen), ['Dirección', 'Jefatura de Área']); // la de EMATP está pausada
    assert.ok(!Number.isNaN(Date.parse(r.cuerpo.ahora)));
    const img = await pedir('GET', `/api/cartelera/imagen/${r.cuerpo.imagenes[0].clave}`);
    assert.strictEqual(img.estado, 200);
    assert.strictEqual(img.tipo, 'image/png');
    assert.ok(img.cuerpo.equals(PNG));
  });

  it('con un enlace inventado o renovado → 404', async () => {
    assert.strictEqual((await pedir('GET', '/api/cartelera/pantalla/inventado')).estado, 404);
    const viejo = pantalla.token;
    const renovada = await pedir('POST', `/api/cartelera/pantallas/${pantalla.id}/renovar`, { token: tokens.jefatura_area });
    assert.notStrictEqual(renovada.cuerpo.pantalla.token, viejo);
    assert.strictEqual((await pedir('GET', `/api/cartelera/pantalla/${viejo}`)).estado, 404);
    assert.strictEqual((await pedir('GET', `/api/cartelera/pantalla/${renovada.cuerpo.pantalla.token}`)).estado, 200);
  });
});
