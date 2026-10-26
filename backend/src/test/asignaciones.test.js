process.env.NODE_ENV = 'test';
process.env.TEST_DB_NAME = 'test-database-asignaciones.sqlite';
process.env.JWT_SECRET = 'clave-test-segura-para-testing-123';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const rutaDb = path.join(__dirname, '..', '..', 'data', 'test-database-asignaciones.sqlite');
if (fs.existsSync(rutaDb)) fs.unlinkSync(rutaDb);

const app = require('../../app');
const db = require('../database/db');
const eventos = require('../utils/eventos');
const { seSuperponen } = require('../controllers/asignaciones.Controller');
const { OPCIONES } = require('../utils/tokens');

let servidorHTTP;
let puerto;
const tokens = {};

const generarToken = (idUsuario) =>
  jwt.sign({ idUsuario }, process.env.JWT_SECRET, { ...OPCIONES, expiresIn: '1h', algorithm: 'HS256' });

function peticion(metodo, ruta, cuerpo, token) {
  return new Promise((resolve, reject) => {
    const datos = cuerpo === undefined ? null : JSON.stringify(cuerpo);
    const req = http.request(
      {
        method: metodo,
        hostname: 'localhost',
        port: puerto,
        path: encodeURI(ruta),
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let texto = '';
        res.on('data', (c) => (texto += c));
        res.on('end', () => {
          try { resolve({ estado: res.statusCode, cuerpo: JSON.parse(texto) }); }
          catch { resolve({ estado: res.statusCode, cuerpo: texto }); }
        });
      }
    );
    req.on('error', reject);
    if (datos) req.write(datos);
    req.end();
  });
}

// Módulos con hora: 1°/2° 08:00-09:20, 3°/4° 09:20-10:40 (consecutivos), 5°/6° sin hora.
const grillas = [
  {
    id: 'Básico',
    nombre: 'Básico',
    horas: [
      { id: '1°/2°', nombre: '1°/2°', inicio: '08:00', fin: '09:20' },
      { id: '3°/4°', nombre: '3°/4°', inicio: '09:20', fin: '10:40' },
      { id: '5°/6°', nombre: '5°/6°', inicio: null, fin: null },
    ],
  },
  {
    id: 'Superior',
    nombre: 'Superior',
    horas: [{ id: '1°/2°', nombre: '1°/2°', inicio: '08:00', fin: '09:20' }],
  },
];

const ids = {};
const base = () => ({
  grilla_id: 'Básico', hora: '1°/2°', dia: 'Lunes', salon_id: 'pb-8',
  docente_id: ids.paz, materia_id: ids.matematica, grupo_id: ids.g11, alumnos: 20,
});
const crear = (cambios, token = tokens.jefatura_area) =>
  peticion('POST', '/api/asignaciones', { ...base(), ...cambios }, token);

before(async () => {
  await db.asegurarMigraciones();
  for (const [username, rol] of [['director', 'direccion'], ['jefe', 'jefatura_area'], ['jefe2', 'jefatura_area'], ['ematp', 'server']]) {
    const r = await db.ejecutar(
      'INSERT INTO usuarios (username, password_hash, rol) VALUES (?, ?, ?)',
      username, 'hash-que-no-se-usa', rol
    );
    tokens[username === 'jefe2' ? 'otra_jefatura' : rol] = generarToken(r.lastID);
  }
  servidorHTTP = http.createServer(app);
  await new Promise((r) => servidorHTTP.listen(0, () => { puerto = servidorHTTP.address().port; r(); }));
});

after(() => {
  eventos.cerrarTodo();
  return new Promise((r) => servidorHTTP.close(r));
});

describe('Superposición de horarios', () => {
  const clase = (dia, inicio, fin, hora = 'x') => ({ dia, inicio, fin, hora });
  it('dos intervalos se superponen si cada uno empieza antes de que termine el otro', () => {
    assert.ok(seSuperponen(clase('Lunes', '08:00', '09:20'), clase('Lunes', '09:00', '10:00')));
    assert.ok(seSuperponen(clase('Lunes', '08:00', '09:20'), clase('Lunes', '08:30', '08:40')));
  });
  it('las clases consecutivas no chocan; otro día tampoco', () => {
    assert.ok(!seSuperponen(clase('Lunes', '08:00', '09:20'), clase('Lunes', '09:20', '10:40')));
    assert.ok(!seSuperponen(clase('Lunes', '08:00', '09:20'), clase('Martes', '08:00', '09:20')));
  });
  it('sin hora, se compara por módulo', () => {
    assert.ok(seSuperponen(clase('Lunes', null, null, '5°/6°'), clase('Lunes', null, null, '5°/6°')));
    assert.ok(!seSuperponen(clase('Lunes', null, null, '5°/6°'), clase('Lunes', null, null, '7°/8°')));
  });
});

describe('Datos para el plano y la grilla', () => {
  it('sin sesión → 401', async () => {
    assert.strictEqual((await peticion('GET', '/api/asignaciones')).estado, 401);
    assert.strictEqual((await peticion('GET', '/api/eventos')).estado, 401);
  });

  it('todo en una respuesta: 38 espacios con tipo, grillas iniciales sin hora, catálogos vacíos', async () => {
    const { estado, cuerpo } = await peticion('GET', '/api/asignaciones', undefined, tokens.server);
    assert.strictEqual(estado, 200);
    assert.strictEqual(cuerpo.salones.length, 38);
    // Aula 17: una sola vez, en el primer piso, habilitada para clases.
    assert.deepStrictEqual(
      cuerpo.salones.filter((s) => s.nombre === 'Aula 17').map((s) => [s.id, s.piso, s.clasificacion]),
      [['1p-18', '1p', 'AULA']]
    );
    assert.deepStrictEqual(
      cuerpo.salones.find((s) => s.id === '1p-3'),
      { id: '1p-3', piso: '1p', nombre: 'Laboratorio', tipo: 'laboratorio', clasificacion: 'AULA', capacidad: null, habilitado: true }
    );
    assert.deepStrictEqual(cuerpo.grillas.map((g) => g.id), ['Básico', 'Superior']);
    assert.deepStrictEqual(cuerpo.grillas[0].horas[0], { id: '1°/2°', nombre: '1°/2°', turno: '', inicio: null, fin: null, rangos: [] });
    assert.deepStrictEqual([cuerpo.docentes, cuerpo.materias, cuerpo.grupos, cuerpo.asignaciones], [[], [], [], []]);
  });

  it('filtra por piso', async () => {
    const { cuerpo } = await peticion('GET', '/api/asignaciones?piso=1p', undefined, tokens.server);
    assert.ok(cuerpo.salones.length === 16 && cuerpo.salones.every((s) => s.piso === '1p'));
    assert.strictEqual((await peticion('GET', '/api/asignaciones?piso=3p', undefined, tokens.server)).estado, 400);
  });

  it('jefatura carga horas de los módulos, docentes, materias y grupos', async () => {
    assert.strictEqual((await peticion('PUT', '/api/grillas', { grillas }, tokens.jefatura_area)).estado, 200);
    for (const [ruta, cuerpo, clave] of [
      ['/api/docentes', { nombre: 'Prof. Elena Paz' }, 'paz'],
      ['/api/docentes', { nombre: 'Prof. Marcos Vega' }, 'vega'],
      ['/api/docentes', { nombre: 'Prof. Sandra Coria' }, 'coria'],
      ['/api/materias', { nombre: 'Matemática' }, 'matematica'],
      ['/api/materias', { nombre: 'Taller de Electricidad' }, 'electricidad'],
      ['/api/grupos', { nombre: 'Grupo 1.1', curso: '1° 1' }, 'g11'],
      ['/api/grupos', { nombre: 'Grupo 1.2', curso: '1° 2' }, 'g12'],
    ]) {
      const res = await peticion('POST', ruta, cuerpo, tokens.jefatura_area);
      assert.strictEqual(res.estado, 201, ruta);
      ids[clave] = (res.cuerpo.docente || res.cuerpo.materia || res.cuerpo.grupo).id;
    }
    const repetido = await peticion('POST', '/api/grupos', { nombre: 'grupo 1.1' }, tokens.direccion);
    assert.strictEqual(repetido.estado, 200);
    assert.strictEqual(repetido.cuerpo.grupo.id, ids.g11);
  });
});

describe('Asignaciones y conflictos', () => {
  let primera;

  it('crea una asignación: toma la hora del módulo', async () => {
    const res = await crear({});
    assert.strictEqual(res.estado, 201);
    primera = res.cuerpo.asignacion;
    assert.strictEqual(primera.salon, 'Aula 1');
    assert.strictEqual(primera.grupo, 'Grupo 1.1');
    assert.deepStrictEqual([primera.inicio, primera.fin, primera.inicio_propio], ['08:00', '09:20', null]);
    assert.strictEqual(primera.version, 1);
  });

  it('el mismo espacio en el módulo siguiente (consecutivo) se permite', async () => {
    const res = await crear({ hora: '3°/4°', docente_id: ids.vega, grupo_id: ids.g12 });
    assert.strictEqual(res.estado, 201);
  });

  it('mismo espacio con horario superpuesto → 409 con el recurso, la clase existente y alternativas', async () => {
    const res = await crear({ hora: '5°/6°', inicio: '09:00', fin: '09:40', docente_id: ids.coria, grupo_id: null });
    assert.strictEqual(res.estado, 409);
    assert.ok(res.cuerpo.conflictos.some((c) => c.recurso === 'espacio' && c.asignacion.id === primera.id));
    assert.match(res.cuerpo.error, /Aula 1 ya está ocupado el Lunes de 08:00 a 09:20/);
    assert.ok(res.cuerpo.alternativas.length > 0 && !res.cuerpo.alternativas.some((a) => a.id === 'pb-8'));
  });

  it('un docente no puede tener dos clases simultáneas', async () => {
    const res = await crear({ salon_id: 'pb-9', grupo_id: ids.g12 });
    assert.strictEqual(res.estado, 409);
    assert.deepStrictEqual(res.cuerpo.conflictos.map((c) => c.recurso), ['docente']);
  });

  it('un grupo no puede tener dos clases simultáneas', async () => {
    const res = await crear({ salon_id: 'pb-9', docente_id: ids.coria });
    assert.strictEqual(res.estado, 409);
    assert.deepStrictEqual(res.cuerpo.conflictos.map((c) => c.recurso), ['grupo']);
  });

  it('el mismo módulo en otra grilla con la misma hora también choca', async () => {
    const res = await crear({ grilla_id: 'Superior', docente_id: ids.coria, grupo_id: null });
    assert.strictEqual(res.estado, 409);
  });

  it('verificar avisa los conflictos sin guardar nada', async () => {
    const antes = (await peticion('GET', '/api/asignaciones', undefined, tokens.server)).cuerpo.asignaciones.length;
    const res = await peticion('POST', '/api/asignaciones/verificar', { ...base(), salon_id: 'pb-9' }, tokens.jefatura_area);
    assert.strictEqual(res.estado, 200);
    assert.deepStrictEqual(res.cuerpo.conflictos.map((c) => c.recurso).sort(), ['docente', 'grupo']);
    const sinChoque = await peticion('POST', '/api/asignaciones/verificar', { ...base(), id: primera.id }, tokens.jefatura_area);
    assert.deepStrictEqual(sinChoque.cuerpo.conflictos, []);
    const despues = (await peticion('GET', '/api/asignaciones', undefined, tokens.server)).cuerpo.asignaciones.length;
    assert.strictEqual(antes, despues);
  });

  it('una clase con docente ausente no ocupa el espacio', async () => {
    const ausente = await crear({ dia: 'Martes', estado: 'docente_ausente' });
    assert.strictEqual(ausente.estado, 201);
    const otra = await crear({ dia: 'Martes', docente_id: ids.vega, grupo_id: ids.g12 });
    assert.strictEqual(otra.estado, 201);
  });

  it('reglas de disponibilidad: espacio deshabilitado y capacidad', async () => {
    assert.strictEqual((await peticion('PUT', '/api/salones/pb-16', { habilitado: false, capacidad: 10 }, tokens.direccion)).estado, 200);
    const deshabilitado = await crear({ dia: 'Miércoles', salon_id: 'pb-16' });
    assert.strictEqual(deshabilitado.estado, 400);
    assert.match(deshabilitado.cuerpo.error, /Aula 7 está deshabilitado/);
    assert.strictEqual((await peticion('PUT', '/api/salones/pb-16', { habilitado: true }, tokens.direccion)).estado, 200);
    const lleno = await crear({ dia: 'Miércoles', salon_id: 'pb-16', alumnos: 25 });
    assert.strictEqual(lleno.estado, 400);
    assert.match(lleno.cuerpo.error, /capacidad para 10/);
  });

  it('datos inválidos → 400', async () => {
    for (const cambio of [
      { salon_id: 'pb-99' }, { salon_id: '../pb-1' }, { docente_id: 9999 }, { docente_id: 'Prof. Paz' },
      { materia_id: 0 }, { grupo_id: 999 }, { dia: 'Sábado' }, { hora: '9°/10°' }, { grilla_id: 'Otra' },
      { inicio: '10:00', fin: '09:00' }, { inicio: '10:00' }, { inicio: '25:00', fin: '26:00' },
      { alumnos: -1 }, { estado: 'borrada' }, { observaciones: 'x'.repeat(501) },
    ]) {
      const res = await crear({ dia: 'Jueves', ...cambio });
      assert.strictEqual(res.estado, 400, JSON.stringify(cambio));
    }
  });

  it('modificar con la versión correcta; con una vieja → 409 (dos personas a la vez)', async () => {
    const cambio = { ...base(), materia_id: ids.electricidad, observaciones: 'Llevar guardapolvo' };
    const [a, b] = await Promise.all([
      peticion('PUT', `/api/asignaciones/${primera.id}`, { ...cambio, version: 1 }, tokens.jefatura_area),
      peticion('PUT', `/api/asignaciones/${primera.id}`, { ...cambio, alumnos: 5, version: 1 }, tokens.otra_jefatura),
    ]);
    assert.deepStrictEqual([a.estado, b.estado].sort(), [200, 409]);
    const perdedora = a.estado === 409 ? a : b;
    assert.strictEqual(perdedora.cuerpo.cambio, true);
    const actual = (await peticion('GET', '/api/salones/pb-8', undefined, tokens.server)).cuerpo.asignaciones
      .find((x) => x.id === primera.id);
    assert.strictEqual(actual.version, 2);
    assert.strictEqual(actual.materia, 'Taller de Electricidad');
    primera = actual;
  });

  it('dos personas crean a la vez en el mismo espacio y horario: sólo una se guarda', async () => {
    const pedido = { dia: 'Viernes', salon_id: 'pb-10', grupo_id: null };
    const [a, b] = await Promise.all([
      crear({ ...pedido, docente_id: ids.paz }, tokens.jefatura_area),
      crear({ ...pedido, docente_id: ids.vega }, tokens.otra_jefatura),
    ]);
    assert.deepStrictEqual([a.estado, b.estado].sort(), [201, 409]);
  });

  it('intercambiar dos clases de lugar (lo que hace arrastrar en la grilla)', async () => {
    const x = (await crear({ dia: 'Jueves', hora: '1°/2°', salon_id: 'pb-13', grupo_id: null })).cuerpo.asignacion;
    const y = (await crear({ dia: 'Jueves', hora: '3°/4°', salon_id: 'pb-14', docente_id: ids.vega, grupo_id: null })).cuerpo.asignacion;
    const res = await peticion('POST', '/api/asignaciones/intercambiar',
      { a: { id: x.id, version: x.version }, b: { id: y.id, version: y.version } }, tokens.jefatura_area);
    assert.strictEqual(res.estado, 200);
    const [nx, ny] = res.cuerpo.asignaciones;
    assert.deepStrictEqual([nx.hora, nx.inicio, ny.hora, ny.inicio], ['3°/4°', '09:20', '1°/2°', '08:00']);
    const vieja = await peticion('POST', '/api/asignaciones/intercambiar',
      { a: { id: x.id, version: x.version }, b: { id: y.id, version: y.version + 1 } }, tokens.jefatura_area);
    assert.strictEqual(vieja.estado, 409);
  });

  it('disponibilidad de un momento: libres y ocupados', async () => {
    const { estado, cuerpo } = await peticion('GET', '/api/disponibilidad?dia=Lunes&grilla_id=Básico&hora=1°/2°', undefined, tokens.server);
    assert.strictEqual(estado, 200);
    assert.ok(cuerpo.ocupados.some((o) => o.salon_id === 'pb-8'));
    assert.ok(!cuerpo.libres.some((s) => s.id === 'pb-8') && cuerpo.libres.some((s) => s.id === 'pb-9'));
  });

  it('server ve todo pero no cambia nada → 403', async () => {
    assert.strictEqual((await peticion('GET', '/api/asignaciones/registro', undefined, tokens.server)).estado, 200);
    for (const [metodo, ruta] of [
      ['POST', '/api/asignaciones'], ['PUT', `/api/asignaciones/${primera.id}`], ['DELETE', `/api/asignaciones/${primera.id}?version=2`],
      ['POST', '/api/asignaciones/verificar'], ['POST', '/api/asignaciones/intercambiar'], ['PUT', '/api/salones/pb-1'],
      ['POST', '/api/docentes'], ['POST', '/api/grupos'], ['PUT', '/api/grillas'],
    ]) {
      const cuerpo = metodo === 'DELETE' ? undefined : {};
      assert.strictEqual((await peticion(metodo, ruta, cuerpo, tokens.server)).estado, 403, `${metodo} ${ruta}`);
    }
  });

  it('quitar: con versión vieja → 409; con la actual → 200; otra vez → 404', async () => {
    assert.strictEqual((await peticion('DELETE', `/api/asignaciones/${primera.id}?version=1`, undefined, tokens.jefatura_area)).estado, 409);
    assert.strictEqual((await peticion('DELETE', `/api/asignaciones/${primera.id}?version=2`, undefined, tokens.jefatura_area)).estado, 200);
    assert.strictEqual((await peticion('DELETE', `/api/asignaciones/${primera.id}?version=2`, undefined, tokens.jefatura_area)).estado, 404);
  });

  it('el historial registra altas, cambios, bajas e intercambios', async () => {
    const { cuerpo } = await peticion('GET', '/api/asignaciones/registro?limite=100', undefined, tokens.jefatura_area);
    const acciones = new Set(cuerpo.registro.map((r) => r.accion));
    for (const accion of ['alta', 'cambio', 'baja', 'intercambio']) assert.ok(acciones.has(accion), accion);
    assert.ok(cuerpo.registro.every((r) => r.usuario));
  });
});

describe('Espacios comunes: PAÑOL y E.O.E. no admiten clases; Aula 8 sí', () => {
  it('los nombres y la clasificación vienen de la base', async () => {
    const { cuerpo } = await peticion('GET', '/api/salones', undefined, tokens.server);
    const por = Object.fromEntries(cuerpo.salones.map((s) => [s.id, [s.nombre, s.tipo, s.clasificacion]]));
    assert.deepStrictEqual(por['pb-15'], ['PAÑOL', 'comun', 'ESPACIO_COMUN']);
    assert.deepStrictEqual(por['pb-6'], ['E.O.E.', 'comun', 'ESPACIO_COMUN']);
    assert.deepStrictEqual(por['pb-1'], ['Aula 8', 'aula', 'AULA']);
  });

  it('el backend rechaza crear clases en PAÑOL o en E.O.E. (aunque se pida directo a la API)', async () => {
    for (const [salon, nombre] of [['pb-15', 'PAÑOL'], ['pb-6', 'E\\.O\\.E\\.']]) {
      const res = await crear({ dia: 'Miércoles', hora: '5°/6°', salon_id: salon, grupo_id: null });
      assert.strictEqual(res.estado, 400, salon);
      assert.match(res.cuerpo.error, new RegExp(`${nombre} es un espacio común de uso institucional: no admite asignaciones de clases`));
    }
  });

  it('tampoco se puede mover una clase existente a un espacio común', async () => {
    const clase = (await crear({ dia: 'Miércoles', hora: '5°/6°', salon_id: 'pb-1', grupo_id: null })).cuerpo.asignacion;
    assert.strictEqual(clase.salon, 'Aula 8');
    const res = await peticion('PUT', `/api/asignaciones/${clase.id}`,
      { ...base(), dia: 'Miércoles', hora: '5°/6°', salon_id: 'pb-6', grupo_id: null, version: clase.version }, tokens.jefatura_area);
    assert.strictEqual(res.estado, 400);
    // En Aula 8 sí se edita.
    const ok = await peticion('PUT', `/api/asignaciones/${clase.id}`,
      { ...base(), dia: 'Miércoles', hora: '5°/6°', salon_id: 'pb-1', grupo_id: null, alumnos: 9, version: clase.version }, tokens.jefatura_area);
    assert.strictEqual(ok.estado, 200);
    assert.strictEqual(ok.cuerpo.asignacion.alumnos, 9);
  });

  it('los espacios comunes no aparecen como libres ni como alternativa', async () => {
    const { cuerpo } = await peticion('GET', '/api/disponibilidad?dia=Miércoles&grilla_id=Básico&hora=5°/6°', undefined, tokens.server);
    assert.ok(!cuerpo.libres.some((s) => ['pb-15', 'pb-6', 'pb-11'].includes(s.id)));
    assert.ok(cuerpo.libres.every((s) => s.clasificacion === 'AULA'));
  });

  it('Dirección puede cambiar la clasificación; con ESPACIO_COMUN ya no admite clases', async () => {
    assert.strictEqual((await peticion('PUT', '/api/salones/pb-14', { clasificacion: 'ESPACIO_COMUN' }, tokens.direccion)).estado, 200);
    assert.strictEqual((await crear({ dia: 'Miércoles', hora: '5°/6°', salon_id: 'pb-14', docente_id: ids.vega, grupo_id: null })).estado, 400);
    assert.strictEqual((await peticion('PUT', '/api/salones/pb-14', { clasificacion: 'AULA' }, tokens.direccion)).estado, 200);
    assert.strictEqual((await peticion('PUT', '/api/salones/pb-14', { clasificacion: 'OTRA' }, tokens.direccion)).estado, 400);
  });
});

describe('Primer piso: Aula 9, SERVER y Jefatura de Área', () => {
  it('mismo id que antes, con su nombre, tipo y clasificación', async () => {
    const { cuerpo } = await peticion('GET', '/api/salones', undefined, tokens.server);
    const por = Object.fromEntries(cuerpo.salones.map((s) => [s.id, [s.nombre, s.tipo, s.clasificacion, s.habilitado]]));
    assert.deepStrictEqual(por['1p-4'], ['Aula 9', 'aula', 'AULA', true]);
    assert.deepStrictEqual(por['1p-17'], ['SERVER', 'comun', 'ESPACIO_COMUN', true]);
    assert.deepStrictEqual(por['1p-5'], ['Jefatura de Área', 'institucional', 'ESPACIO_COMUN', true]);
    assert.strictEqual(cuerpo.salones.filter((s) => s.nombre === 'Aula 9').length, 1);
  });

  it('Aula 9 admite clases', async () => {
    const res = await crear({ dia: 'Viernes', hora: '1°/2°', salon_id: '1p-4', grupo_id: null, docente_id: ids.coria });
    assert.strictEqual(res.estado, 201);
    assert.strictEqual(res.cuerpo.asignacion.salon, 'Aula 9');
  });

  it('la Jefatura de Área rechaza clases con su mensaje, aunque se pida directo a la API', async () => {
    const res = await crear({ dia: 'Viernes', hora: '3°/4°', salon_id: '1p-5', grupo_id: null });
    assert.strictEqual(res.estado, 400);
    assert.strictEqual(
      res.cuerpo.error,
      'La Jefatura de Área es un espacio institucional reservado y no puede asignarse a actividades académicas'
    );
    assert.strictEqual((await crear({ dia: 'Viernes', hora: '3°/4°', salon_id: '1p-17', grupo_id: null })).estado, 400);
  });

  it('la Jefatura de Área no se puede volver asignable cambiándole la clasificación', async () => {
    const res = await peticion('PUT', '/api/salones/1p-5', { clasificacion: 'AULA' }, tokens.direccion);
    assert.strictEqual(res.estado, 400);
    assert.match(res.cuerpo.error, /espacio institucional reservado/);
  });

  it('no aparecen como libres para clases; el Aula 9 sí', async () => {
    const { cuerpo } = await peticion('GET', '/api/disponibilidad?dia=Viernes&grilla_id=Básico&hora=5°/6°', undefined, tokens.server);
    const libres = cuerpo.libres.map((s) => s.id);
    assert.ok(libres.includes('1p-4'));
    assert.ok(!libres.includes('1p-5') && !libres.includes('1p-17'));
  });
});

describe('Aula 17 y datos de cada grilla', () => {
  it('Aula 17 admite crear y modificar clases', async () => {
    const res = await crear({ dia: 'Jueves', hora: '5°/6°', salon_id: '1p-18', grupo_id: null, docente_id: ids.coria });
    assert.strictEqual(res.estado, 201);
    assert.strictEqual(res.cuerpo.asignacion.salon, 'Aula 17');
    const cambio = await peticion('PUT', `/api/asignaciones/${res.cuerpo.asignacion.id}`,
      { ...base(), dia: 'Jueves', hora: '5°/6°', salon_id: '1p-18', grupo_id: null, docente_id: ids.coria, alumnos: 11, version: 1 },
      tokens.jefatura_area);
    assert.strictEqual(cambio.estado, 200);
    assert.strictEqual(cambio.cuerpo.asignacion.alumnos, 11);
  });

  it('la grilla guarda organización, período, turno, ciclo, días, grupos y materias', async () => {
    const cambio = structuredClone(grillas);
    Object.assign(cambio[1], {
      organizacion: 'Talleres del Ciclo Básico y Superior', periodo: 'Octubre 2026', turno: 'tarde',
      ciclo: 'ambos', dias: ['Lunes', 'Martes'], grupos: [ids.g12], materias: [ids.matematica],
    });
    assert.strictEqual((await peticion('PUT', '/api/grillas', { grillas: cambio }, tokens.jefatura_area)).estado, 200);
    const { cuerpo } = await peticion('GET', '/api/panel', undefined, tokens.server);
    const superior = cuerpo.grillas.find((g) => g.id === 'Superior');
    assert.deepStrictEqual(
      [superior.organizacion, superior.periodo, superior.turno, superior.ciclo, superior.dias, superior.grupos, superior.materias],
      ['Talleres del Ciclo Básico y Superior', 'Octubre 2026', 'tarde', 'ambos', ['Lunes', 'Martes'], [ids.g12], [ids.matematica]]
    );
  });

  it('el backend respeta los días, grupos y materias que admite la grilla', async () => {
    const enSuperior = { grilla_id: 'Superior', hora: '1°/2°', salon_id: '1p-12', docente_id: ids.vega, materia_id: ids.matematica, grupo_id: ids.g12 };
    assert.match((await crear({ ...enSuperior, dia: 'Viernes' })).cuerpo.error, /no tiene actividad el Viernes/);
    assert.match((await crear({ ...enSuperior, dia: 'Martes', grupo_id: ids.g11 })).cuerpo.error, /no está en la grilla/);
    assert.match((await crear({ ...enSuperior, dia: 'Martes', materia_id: ids.electricidad })).cuerpo.error, /no está entre las materias/);
    assert.strictEqual((await crear({ ...enSuperior, dia: 'Martes', inicio: '13:00', fin: '14:00' })).estado, 201);
  });

  it('turno y ciclo inválidos → 400', async () => {
    for (const cambio of [{ turno: 'noche' }, { ciclo: 'medio' }, { dias: [] }, { dias: ['Sábado'] }, { grupos: ['x'] }]) {
      const g = structuredClone(grillas);
      Object.assign(g[0], cambio);
      assert.strictEqual((await peticion('PUT', '/api/grillas', { grillas: g }, tokens.jefatura_area)).estado, 400, JSON.stringify(cambio));
    }
  });
});

describe('Grillas y módulos', () => {
  it('cambiar la hora de un módulo que hace superponer clases → 409 y no se guarda nada', async () => {
    // Lunes: Aula 1 tiene 3°/4° (09:20-10:40). Si 1°/2° pasa a terminar 10:00, chocan si hay otra en 1°/2°.
    await crear({ dia: 'Lunes', hora: '1°/2°', salon_id: 'pb-8', docente_id: ids.coria, grupo_id: null });
    const cambio = structuredClone(grillas);
    cambio[0].horas[0].fin = '10:00';
    const res = await peticion('PUT', '/api/grillas', { grillas: cambio }, tokens.jefatura_area);
    assert.strictEqual(res.estado, 409);
    const { cuerpo } = await peticion('GET', '/api/panel', undefined, tokens.server);
    assert.strictEqual(cuerpo.grillas[0].horas[0].fin, '09:20');
  });

  it('borrar un módulo borra sus clases (y queda en el historial)', async () => {
    const cambio = structuredClone(grillas);
    cambio[0].horas = cambio[0].horas.filter((h) => h.id !== '3°/4°');
    assert.strictEqual((await peticion('PUT', '/api/grillas', { grillas: cambio }, tokens.jefatura_area)).estado, 200);
    const { cuerpo } = await peticion('GET', '/api/asignaciones?grilla=Básico', undefined, tokens.server);
    assert.ok(!cuerpo.asignaciones.some((a) => a.hora === '3°/4°'));
    const { cuerpo: r } = await peticion('GET', '/api/asignaciones/registro', undefined, tokens.server);
    assert.match(r.registro[0].detalle, /Se eliminó el horario 3°\/4° de Básico con \d+ clases/);
  });
});

describe('Cambio de aula excepcional y copia de la semana', () => {
  let clase;

  it('cambia de aula recordando la habitual; vuelve si el aula habitual está libre', async () => {
    clase = (await crear({ dia: 'Jueves', hora: '5°/6°' })).cuerpo.asignacion;
    const r = await peticion('POST', `/api/asignaciones/${clase.id}/cambiar-aula`, { salon_id: '1p-4', version: clase.version }, tokens.jefatura_area);
    assert.strictEqual(r.estado, 200);
    assert.deepStrictEqual([r.cuerpo.asignacion.salon, r.cuerpo.asignacion.salon_habitual], ['Aula 9', 'pb-8']);
    clase = r.cuerpo.asignacion;

    // Mientras tanto otra clase ocupa el aula habitual: no se puede volver.
    const otra = (await crear({ dia: 'Jueves', hora: '5°/6°', docente_id: ids.vega, grupo_id: ids.g12 })).cuerpo.asignacion;
    const choque = await peticion('POST', `/api/asignaciones/${clase.id}/cambiar-aula`, { salon_id: 'pb-8', version: clase.version }, tokens.jefatura_area);
    assert.strictEqual(choque.estado, 409);
    await peticion('DELETE', `/api/asignaciones/${otra.id}?version=${otra.version}`, undefined, tokens.jefatura_area);

    const vuelve = await peticion('POST', `/api/asignaciones/${clase.id}/cambiar-aula`, { salon_id: 'pb-8', version: clase.version }, tokens.jefatura_area);
    assert.strictEqual(vuelve.estado, 200);
    assert.deepStrictEqual([vuelve.cuerpo.asignacion.salon_id, vuelve.cuerpo.asignacion.salon_habitual], ['pb-8', null]);
    clase = vuelve.cuerpo.asignacion;
    const { cuerpo } = await peticion('GET', '/api/asignaciones/registro', undefined, tokens.server);
    assert.match(cuerpo.registro[0].detalle, /Vuelve a su aula habitual \(Aula 1\)/);
  });

  it('cambio de aula: versión vieja → 409; a la Jefatura o a un espacio común → 400; server → 403', async () => {
    const url = `/api/asignaciones/${clase.id}/cambiar-aula`;
    assert.strictEqual((await peticion('POST', url, { salon_id: '1p-4', version: 1 }, tokens.jefatura_area)).estado, 409);
    const jefatura = await peticion('POST', url, { salon_id: '1p-5', version: clase.version }, tokens.jefatura_area);
    assert.strictEqual(jefatura.estado, 400);
    assert.match(jefatura.cuerpo.error, /espacio institucional reservado/);
    assert.strictEqual((await peticion('POST', url, { salon_id: 'pb-15', version: clase.version }, tokens.jefatura_area)).estado, 400);
    assert.strictEqual((await peticion('POST', url, { salon_id: '1p-4', version: clase.version }, tokens.server)).estado, 403);
  });

  it('copiar la grilla: mismas clases, todas activas y en su aula habitual; la copia archivada no ocupa', async () => {
    // Una ausencia y un cambio de aula en la original no pasan a la copia.
    const ausente = (await crear({ dia: 'Miércoles', hora: '5°/6°', docente_id: ids.vega, grupo_id: ids.g12, estado: 'docente_ausente' })).cuerpo.asignacion;
    await peticion('POST', `/api/asignaciones/${clase.id}/cambiar-aula`, { salon_id: '1p-4', version: clase.version }, tokens.jefatura_area);
    const originales = (await peticion('GET', '/api/asignaciones?grilla=Básico', undefined, tokens.server)).cuerpo.asignaciones;

    const r = await peticion('POST', '/api/grillas/Básico/copiar', { nombre: 'Básico · semana 2', periodo: 'Semana 2' }, tokens.jefatura_area);
    assert.strictEqual(r.estado, 201);
    assert.strictEqual(r.cuerpo.clases, originales.length);
    assert.strictEqual(r.cuerpo.grilla.vigente, false);
    assert.strictEqual(r.cuerpo.grilla.periodo, 'Semana 2');
    const copias = (await peticion('GET', `/api/asignaciones?grilla=${r.cuerpo.grilla.id}`, undefined, tokens.server)).cuerpo.asignaciones;
    assert.ok(copias.every((a) => a.estado === 'activa' && a.salon_habitual === null && a.grilla_vigente === 0));
    assert.ok(copias.some((a) => a.dia === 'Jueves' && a.hora === '5°/6°' && a.salon_id === 'pb-8'));
    assert.ok(copias.some((a) => a.dia === 'Miércoles' && a.hora === '5°/6°' && a.docente_id === ausente.docente_id));

    // La copia archivada no choca con nada: en la original se sigue pudiendo editar.
    const sinChoque = await peticion('POST', '/api/asignaciones/verificar', { ...base(), id: originales[0].id, ...{ dia: originales[0].dia, hora: originales[0].hora, salon_id: originales[0].salon_id, docente_id: originales[0].docente_id, grupo_id: originales[0].grupo_id } }, tokens.jefatura_area);
    assert.deepStrictEqual(sinChoque.cuerpo.conflictos, []);
  });

  it('copiar y archivar la original: la copia queda vigente y la original deja de ocupar', async () => {
    const r = await peticion('POST', '/api/grillas/Superior/copiar', { nombre: 'Superior · semana 2', archivarOriginal: true }, tokens.jefatura_area);
    assert.strictEqual(r.estado, 201);
    const { cuerpo } = await peticion('GET', '/api/panel', undefined, tokens.server);
    const porId = Object.fromEntries(cuerpo.grillas.map((g) => [g.id, g]));
    assert.strictEqual(porId.Superior.vigente, false);
    assert.strictEqual(porId[r.cuerpo.grilla.id].vigente, true);
    const { cuerpo: reg } = await peticion('GET', '/api/asignaciones/registro', undefined, tokens.server);
    assert.match(reg.registro[0].detalle, /Copia de la grilla Superior → Superior · semana 2: \d+ clases \(Superior queda archivada\)/);
  });

  it('copiar: grilla inexistente → 404; server → 403', async () => {
    assert.strictEqual((await peticion('POST', '/api/grillas/no-existe/copiar', {}, tokens.jefatura_area)).estado, 404);
    assert.strictEqual((await peticion('POST', '/api/grillas/Básico/copiar', {}, tokens.server)).estado, 403);
  });
});

describe('Guardar cambios de la planilla (todo junto) y nueva semana', () => {
  const { restablecerSemana, lunesDe } = require('../controllers/asignaciones.Controller');
  const enMartes = (cambios) => ({ ...base(), dia: 'Martes', hora: '5°/6°', ...cambios });

  it('altas, cambios y bajas en una sola operación', async () => {
    const x = (await crear(enMartes({ salon_id: 'pb-13', grupo_id: null }))).cuerpo.asignacion;
    const y = (await crear(enMartes({ salon_id: 'pb-14', docente_id: ids.vega, grupo_id: ids.g12 }))).cuerpo.asignacion;
    const r = await peticion('PUT', '/api/asignaciones', {
      cambios: [{ ...enMartes({ salon_id: 'pb-13', grupo_id: null, alumnos: 12 }), id: x.id, version: x.version }],
      bajas: [{ id: y.id, version: y.version }],
      altas: [enMartes({ salon_id: 'pb-14', docente_id: ids.vega, grupo_id: ids.g12, alumnos: 9 })],
    }, tokens.jefatura_area);
    assert.strictEqual(r.estado, 200, JSON.stringify(r.cuerpo));
    assert.strictEqual(r.cuerpo.asignaciones.length, 2);
    assert.strictEqual(r.cuerpo.asignaciones.find((a) => a.id === x.id).alumnos, 12);
    assert.deepStrictEqual(r.cuerpo.bajas, [y.id]);
  });

  it('si una sola cosa choca, no se guarda nada y dice cuál', async () => {
    const antes = (await peticion('GET', '/api/asignaciones', undefined, tokens.server)).cuerpo.asignaciones;
    const x = antes.find((a) => a.dia === 'Martes' && a.salon_id === 'pb-13');
    const r = await peticion('PUT', '/api/asignaciones', {
      cambios: [{ ...enMartes({ salon_id: 'pb-13', grupo_id: null, alumnos: 30 }), id: x.id, version: x.version }],
      // Misma aula y horario que otra clase: choca.
      altas: [enMartes({ salon_id: 'pb-14', docente_id: ids.coria, grupo_id: null })],
    }, tokens.jefatura_area);
    assert.strictEqual(r.estado, 409);
    assert.match(r.cuerpo.error, /^Martes · 5°\/6°.*No se guardó nada/);
    const despues = (await peticion('GET', '/api/asignaciones', undefined, tokens.server)).cuerpo.asignaciones;
    assert.strictEqual(despues.length, antes.length);
    assert.strictEqual(despues.find((a) => a.id === x.id).alumnos, 12);
  });

  it('versión vieja o dato inválido → nada guardado; server → 403', async () => {
    const x = (await peticion('GET', '/api/asignaciones', undefined, tokens.server)).cuerpo.asignaciones.find((a) => a.dia === 'Martes' && a.salon_id === 'pb-13');
    const vieja = await peticion('PUT', '/api/asignaciones', { cambios: [{ ...enMartes({ salon_id: 'pb-13', grupo_id: null }), id: x.id, version: 1 }] }, tokens.jefatura_area);
    assert.strictEqual(vieja.estado, 409);
    const invalida = await peticion('PUT', '/api/asignaciones', { altas: [enMartes({ salon_id: '1p-5' })] }, tokens.jefatura_area);
    assert.strictEqual(invalida.estado, 400);
    assert.match(invalida.cuerpo.error, /espacio institucional reservado/);
    assert.strictEqual((await peticion('PUT', '/api/asignaciones', { altas: [enMartes({})] }, tokens.server)).estado, 403);
    assert.strictEqual((await peticion('PUT', '/api/asignaciones', {}, tokens.jefatura_area)).estado, 400);
  });

  it('una clase puede quedar sin espacio (el del PDF que no está en el plano)', async () => {
    const r = await crear(enMartes({ salon_id: null, docente_id: ids.coria, grupo_id: null, observaciones: 'espacio en el PDF: SUM' }));
    assert.strictEqual(r.estado, 201, JSON.stringify(r.cuerpo));
    assert.strictEqual(r.cuerpo.asignacion.salon_id, null);
  });

  it('al empezar la semana, ausencias, cancelaciones y cambios de aula vuelven a lo de siempre', async () => {
    const todas = (await peticion('GET', '/api/asignaciones', undefined, tokens.server)).cuerpo.asignaciones;
    const x = todas.find((a) => a.dia === 'Martes' && a.salon_id === 'pb-13');
    const ausente = await peticion('PUT', `/api/asignaciones/${x.id}`, { ...enMartes({ salon_id: 'pb-13', grupo_id: null, alumnos: 12, estado: 'docente_ausente' }), version: x.version }, tokens.jefatura_area);
    assert.strictEqual(ausente.cuerpo.asignacion.semana, lunesDe());
    const movida = await peticion('POST', `/api/asignaciones/${x.id}/cambiar-aula`, { salon_id: '1p-13', version: ausente.cuerpo.asignacion.version }, tokens.jefatura_area);
    assert.strictEqual(movida.estado, 200);

    // Simula que esto fue la semana pasada.
    await db.ejecutar("UPDATE asignaciones SET semana = '2000-01-03' WHERE id = ?", x.id);
    assert.strictEqual(await restablecerSemana(), 1);
    const despues = (await peticion('GET', '/api/asignaciones', undefined, tokens.server)).cuerpo.asignaciones.find((a) => a.id === x.id);
    assert.deepStrictEqual([despues.estado, despues.salon_id, despues.salon_habitual, despues.semana], ['activa', 'pb-13', null, null]);
    assert.strictEqual(await restablecerSemana(), 0);
    assert.strictEqual(lunesDe(new Date(2026, 9, 25)), '2026-10-19'); // domingo → lunes anterior
    assert.strictEqual(lunesDe(new Date(2026, 9, 26)), '2026-10-26');
  });
});

describe('Aula compartida (así figura en la organización)', () => {
  const enJueves = (cambios) => ({ ...base(), dia: 'Jueves', hora: '1°/2°', salon_id: 'pb-21', ...cambios });

  it('dos clases marcadas «compartida» pueden usar la misma aula; una tercera no; el docente nunca', async () => {
    const nuevoDocente = async (nombre) => (await peticion('POST', '/api/docentes', { nombre }, tokens.jefatura_area)).cuerpo.docente.id;
    const [uno, dos, tres] = [await nuevoDocente('Prof. Compartida Uno'), await nuevoDocente('Prof. Compartida Dos'), await nuevoDocente('Prof. Compartida Tres')];
    const rx = await crear(enJueves({ docente_id: uno, grupo_id: null }));
    assert.strictEqual(rx.estado, 201, JSON.stringify(rx.cuerpo));
    const x = rx.cuerpo.asignacion;
    // Lo que hace el importador con --compartidas: la segunda entra marcada, y la primera también.
    const ry = await crear(enJueves({ salon_id: 'pb-10', docente_id: dos, grupo_id: null }));
    assert.strictEqual(ry.estado, 201, JSON.stringify(ry.cuerpo));
    const y = ry.cuerpo.asignacion;
    await db.ejecutar('UPDATE asignaciones SET compartida = 1, salon_id = ? WHERE id IN (?, ?)', 'pb-21', x.id, y.id);

    // Editar una de las dos (misma aula) se puede.
    const edit = await peticion('PUT', `/api/asignaciones/${y.id}`, { ...enJueves({ docente_id: dos, grupo_id: null, alumnos: 8 }), version: y.version }, tokens.jefatura_area);
    assert.strictEqual(edit.estado, 200, JSON.stringify(edit.cuerpo));
    // Una clase común en esa aula y horario sigue chocando.
    const tercera = await crear(enJueves({ docente_id: tres, grupo_id: null }));
    assert.strictEqual(tercera.estado, 409);
    assert.ok(tercera.cuerpo.conflictos.some((c) => c.recurso === 'espacio'));
    // Aunque estén marcadas, el mismo docente no puede estar en las dos.
    const docente = await peticion('PUT', `/api/asignaciones/${y.id}`, { ...enJueves({ docente_id: uno, grupo_id: null }), version: edit.cuerpo.asignacion.version }, tokens.jefatura_area);
    assert.strictEqual(docente.estado, 409);
    assert.deepStrictEqual(docente.cuerpo.conflictos.map((c) => c.recurso), ['docente']);
    assert.strictEqual(edit.cuerpo.asignacion.compartida, 1);
  });
});

describe('Avisos en vivo (Server-Sent Events)', () => {
  it('quien está conectado recibe un aviso cuando otra persona guarda', async () => {
    const recibido = new Promise((resolve, reject) => {
      const req = http.get(
        { hostname: 'localhost', port: puerto, path: '/api/eventos', headers: { Authorization: `Bearer ${tokens.server}` } },
        (res) => {
          assert.strictEqual(res.headers['content-type'], 'text/event-stream; charset=utf-8');
          let texto = '';
          res.on('data', async (c) => {
            texto += c;
            if (texto.includes('event: hola') && !texto.includes('guardado')) {
              texto += 'guardado';
              await crear({ dia: 'Viernes', hora: '5°/6°', salon_id: 'pb-20', grupo_id: null });
            }
            const m = texto.match(/event: cambio\ndata: (.+)\n/);
            if (m) {
              req.destroy();
              resolve(JSON.parse(m[1]));
            }
          });
        }
      );
      req.on('error', (e) => e.code !== 'ECONNRESET' && reject(e));
      setTimeout(() => reject(new Error('no llegó el aviso')), 5000).unref();
    });
    const aviso = await recibido;
    assert.strictEqual(aviso.tipo, 'asignaciones');
    assert.ok(Number.isInteger(aviso.version));
  });
});
