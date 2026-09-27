process.env.NODE_ENV = 'test';
process.env.TEST_DB_NAME = 'test-database-password.sqlite';
process.env.JWT_SECRET = 'clave-test-segura-para-testing-123';
process.env.DRIVE_EMATP_ID = 'carpeta-ematp-test';
process.env.DRIVE_JEFE_AREA_ID = 'carpeta-jefe-test';
process.env.MAX_FILE_SIZE = '5242880';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const rutaDb = path.join(__dirname, '..', '..', 'data', 'test-database-password.sqlite');
if (fs.existsSync(rutaDb)) fs.unlinkSync(rutaDb);

const app = require('../../app');
const db = require('../database/db');
const { OPCIONES } = require('../utils/tokens');

const CONTRASENA = 'password123';
const NUEVA_CONTRASENA = 'nuevaPass123';

let servidorHTTP;
let puerto;
let ids = {};

function generarToken(idUsuario) {
  return jwt.sign({ idUsuario }, process.env.JWT_SECRET, { ...OPCIONES, expiresIn: '1h', algorithm: 'HS256' });
}

async function peticion(metodo, ruta, cuerpo, encabezados = {}) {
  return new Promise((resolve, reject) => {
    const opciones = {
      method: metodo,
      hostname: 'localhost',
      port: puerto,
      path: ruta,
      headers: { 'Content-Type': 'application/json', ...encabezados },
    };
    const req = http.request(opciones, (res) => {
      let datos = '';
      res.on('data', (c) => datos += c);
      res.on('end', () => {
        try { resolve({ estado: res.statusCode, cuerpo: JSON.parse(datos) }); }
        catch { resolve({ estado: res.statusCode, cuerpo: datos }); }
      });
    });
    req.on('error', reject);
    if (cuerpo) req.write(JSON.stringify(cuerpo));
    req.end();
  });
}

async function configurarBD() {
  ids = {};
  await db.asegurarMigraciones();
  await db.ejecutar('DELETE FROM upload_logs');
  await db.ejecutar('DELETE FROM usuarios');
  await db.ejecutar('DELETE FROM areas');
  await db.ejecutar("DELETE FROM sqlite_sequence WHERE name IN ('usuarios', 'areas', 'upload_logs')");
  await db.ejecutar("INSERT INTO areas (nombre, drive_folder_id) VALUES ('matematica', 'folder-matematica')");

  const areas = await db.obtenerFilas('SELECT id, nombre FROM areas');
  const areaMate = areas.find(a => a.nombre === 'matematica').id;

  const hash = await new Promise((resolve, reject) => {
    bcrypt.hash(CONTRASENA, 12, (err, resultado) => {
      if (err) reject(err);
      else resolve(resultado);
    });
  });

  await db.ejecutar(
    'INSERT INTO usuarios (username, password_hash, rol, area_id, password_change_allowed, password_change_count) VALUES (?, ?, ?, ?, 1, 0)',
    'jefe_mate', hash, 'jefatura_area', areaMate
  );
  await db.ejecutar(
    'INSERT INTO usuarios (username, password_hash, rol, area_id, password_change_allowed, password_change_count) VALUES (?, ?, ?, NULL, 1, 0)',
    'servidor', hash, 'server'
  );
  await db.ejecutar(
    'INSERT INTO usuarios (username, password_hash, rol, area_id, password_change_allowed, password_change_count) VALUES (?, ?, ?, NULL, 1, 0)',
    'director', hash, 'direccion'
  );

  const filas = await db.obtenerFilas('SELECT id, username FROM usuarios');
  for (const f of filas) ids[f.username] = f.id;
}

describe('Cambio de contraseña de cuentas de sector', () => {
  let tokenJefe, tokenServidor, tokenDirector;

  before(async () => {
    await configurarBD();
    servidorHTTP = http.createServer(app);
    await new Promise((r) => servidorHTTP.listen(0, () => { puerto = servidorHTTP.address().port; r(); }));
    tokenJefe = generarToken(ids.jefe_mate);
    tokenServidor = generarToken(ids.servidor);
    tokenDirector = generarToken(ids.director);
  });

  after(() => new Promise((r) => servidorHTTP.close(r)));

  it('jefatura_area puede cambiar su contraseña la primera vez', async () => {
    const res = await peticion('PUT', '/api/auth/password',
      { password_actual: CONTRASENA, nueva_password: NUEVA_CONTRASENA },
      { Authorization: `Bearer ${tokenJefe}` });
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(res.cuerpo.password_change_allowed, false);
    assert.strictEqual(res.cuerpo.password_change_count, 1);
    assert.ok(res.cuerpo.token);

    // Cambiar la contraseña cierra las sesiones anteriores: el token viejo ya no sirve.
    const conViejo = await peticion('GET', '/api/auth/me', null, { Authorization: `Bearer ${tokenJefe}` });
    assert.strictEqual(conViejo.estado, 401);

    tokenJefe = res.cuerpo.token;
    const conNuevo = await peticion('GET', '/api/auth/me', null, { Authorization: `Bearer ${tokenJefe}` });
    assert.strictEqual(conNuevo.estado, 200);
  });

  it('jefatura_area NO puede cambiar su contraseña una segunda vez (búsqueda del cambio de una sola vez)', async () => {
    const res = await peticion('PUT', '/api/auth/password',
      { password_actual: NUEVA_CONTRASENA, nueva_password: 'otraPass456' },
      { Authorization: `Bearer ${tokenJefe}` });
    assert.strictEqual(res.estado, 403);
    assert.ok(res.cuerpo.error.includes('solicitar permiso'));
  });

  it('después de un cambio bloqueado, la vieja contraseña (la nueva) sigue funcionando', async () => {
    const resLogin = await peticion('POST', '/api/auth/login', { username: 'jefe_mate', password: NUEVA_CONTRASENA });
    assert.strictEqual(resLogin.estado, 200);
  });

  it('superadmin (direccion) SIEMPRE puede cambiar su contraseña', async () => {
    const primera = await peticion('PUT', '/api/auth/password',
      { password_actual: CONTRASENA, nueva_password: 'claveAdmin1' },
      { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(primera.estado, 200);
    assert.strictEqual(primera.cuerpo.password_change_allowed, true);
    assert.strictEqual(primera.cuerpo.password_change_count, 1);
    tokenDirector = primera.cuerpo.token;

    const segunda = await peticion('PUT', '/api/auth/password',
      { password_actual: 'claveAdmin1', nueva_password: 'claveAdmin2' },
      { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(segunda.estado, 200);
    assert.strictEqual(segunda.cuerpo.password_change_count, 2);
    assert.strictEqual(segunda.cuerpo.password_change_allowed, true);
  });

  it('cambiar contraseña con contraseña actual incorrecta → 401', async () => {
    const res = await peticion('PUT', '/api/auth/password',
      { password_actual: 'incorrecta', nueva_password: NUEVA_CONTRASENA },
      { Authorization: `Bearer ${tokenServidor}` });
    assert.strictEqual(res.estado, 401);
  });

  it('cambiar contraseña con nueva contraseña corta → 400', async () => {
    const res = await peticion('PUT', '/api/auth/password',
      { password_actual: CONTRASENA, nueva_password: '123' },
      { Authorization: `Bearer ${tokenServidor}` });
    assert.strictEqual(res.estado, 400);
  });

  it('cambiar contraseña sin token → 401', async () => {
    const res = await peticion('PUT', '/api/auth/password',
      { password_actual: CONTRASENA, nueva_password: NUEVA_CONTRASENA });
    assert.strictEqual(res.estado, 401);
  });

  it('cambiar contraseña con campos faltantes → 400', async () => {
    const res = await peticion('PUT', '/api/auth/password',
      { nueva_password: NUEVA_CONTRASENA },
      { Authorization: `Bearer ${tokenServidor}` });
    assert.strictEqual(res.estado, 400);
  });
});

describe('Superadmin permite cambiar contraseña de nuevo', () => {
  let tokenJefe, tokenDirector, tokenServidor;

  before(async () => {
    await configurarBD();
    servidorHTTP = http.createServer(app);
    await new Promise((r) => servidorHTTP.listen(0, () => { puerto = servidorHTTP.address().port; r(); }));
    tokenJefe = generarToken(ids.jefe_mate);
    tokenDirector = generarToken(ids.director);
    tokenServidor = generarToken(ids.servidor);
  });

  after(() => new Promise((r) => servidorHTTP.close(r)));

  it('jefatura usa su único cambio, queda bloqueado', async () => {
    const res = await peticion('PUT', '/api/auth/password',
      { password_actual: CONTRASENA, nueva_password: NUEVA_CONTRASENA },
      { Authorization: `Bearer ${tokenJefe}` });
    assert.strictEqual(res.estado, 200);
    tokenJefe = res.cuerpo.token;
  });

  it('el superadmin NO puede permitir cambio a un usuario inexistente → 404', async () => {
    const res = await peticion('PUT', '/api/usuarios/permitir-cambio/99999', null, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 404);
  });

  it('un sector NO puede llamar al endpoint de permitir cambio (solo superadmin) → 403', async () => {
    const res = await peticion('PUT', `/api/usuarios/permitir-cambio/${ids.jefe_mate}`, null, { Authorization: `Bearer ${tokenServidor}` });
    assert.strictEqual(res.estado, 403);
  });

  it('el superadmin habilita un nuevo cambio y el sector puede cambiar de nuevo', async () => {
    const permitir = await peticion('PUT', `/api/usuarios/permitir-cambio/${ids.jefe_mate}`, null, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(permitir.estado, 200);

    const cambiar = await peticion('PUT', '/api/auth/password',
      { password_actual: NUEVA_CONTRASENA, nueva_password: 'otraPass456' },
      { Authorization: `Bearer ${tokenJefe}` });
    assert.strictEqual(cambiar.estado, 200);
    assert.strictEqual(cambiar.cuerpo.password_change_count, 2);
  });

  it('endpoint de permitir cambio requiere autenticación → 401', async () => {
    const res = await peticion('PUT', `/api/usuarios/permitir-cambio/${ids.jefe_mate}`);
    assert.strictEqual(res.estado, 401);
  });
});

describe('Listado de usuarios muestra cantidad de cambios', () => {
  let tokenDirector;

  before(async () => {
    await configurarBD();
    servidorHTTP = http.createServer(app);
    await new Promise((r) => servidorHTTP.listen(0, () => { puerto = servidorHTTP.address().port; r(); }));
    tokenDirector = generarToken(ids.director);
  });

  after(() => new Promise((r) => servidorHTTP.close(r)));

  it('el listado incluye password_change_allowed y password_change_count', async () => {
    let res = await peticion('GET', '/api/usuarios', null, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 200);

    const jefe = res.cuerpo.usuarios.find(u => u.username === 'jefe_mate');
    assert.ok('password_change_count' in jefe);
    assert.ok('password_change_allowed' in jefe);
    assert.strictEqual(jefe.password_change_count, 0);
    assert.strictEqual(jefe.password_change_allowed, 1);

    await peticion('PUT', '/api/auth/password',
      { password_actual: CONTRASENA, nueva_password: NUEVA_CONTRASENA },
      { Authorization: `Bearer ${generarToken(ids.jefe_mate)}` });

    res = await peticion('GET', '/api/usuarios', null, { Authorization: `Bearer ${tokenDirector}` });
    const jefeActualizado = res.cuerpo.usuarios.find(u => u.username === 'jefe_mate');
    assert.strictEqual(jefeActualizado.password_change_count, 1);
    assert.strictEqual(jefeActualizado.password_change_allowed, 0);
  });

  it('GET /me expone el estado de cambio de contraseña del usuario', async () => {
    const res = await peticion('GET', '/api/auth/me', null, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(typeof res.cuerpo.usuario.password_change_allowed, 'boolean');
    assert.strictEqual(typeof res.cuerpo.usuario.password_change_count, 'number');
  });
});

describe('Cambio único de contraseña con pedidos simultáneos', () => {
  before(async () => {
    await configurarBD();
    servidorHTTP = http.createServer(app);
    await new Promise((r) => servidorHTTP.listen(0, () => { puerto = servidorHTTP.address().port; r(); }));
  });

  after(() => new Promise((r) => servidorHTTP.close(r)));

  it('dos cambios a la vez de la misma cuenta de sector: sólo se aplica uno', async () => {
    const auth = { Authorization: `Bearer ${generarToken(ids.servidor)}` };
    const respuestas = await Promise.all([
      peticion('PUT', '/api/auth/password', { password_actual: CONTRASENA, nueva_password: 'primeraNueva1' }, auth),
      peticion('PUT', '/api/auth/password', { password_actual: CONTRASENA, nueva_password: 'segundaNueva2' }, auth),
    ]);
    assert.strictEqual(respuestas.filter((r) => r.estado === 200).length, 1);

    const fila = await db.obtenerFila('SELECT password_change_count, password_change_allowed FROM usuarios WHERE id = ?', ids.servidor);
    assert.strictEqual(fila.password_change_count, 1);
    assert.strictEqual(fila.password_change_allowed, 0);
  });
});
