process.env.NODE_ENV = 'test';
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

const rutaDb = path.join(__dirname, '..', '..', 'data', 'test-database.sqlite');
if (fs.existsSync(rutaDb)) fs.unlinkSync(rutaDb);

const app = require('../../app');
const db = require('../database/db');
const googleDriveService = require('../services/googleDriveService');
const { validarPDF, sanitizarNombreArchivo } = require('../controllers/upload.Controller');
const { esRolValido, ROLES } = require('../utils/roles');
const { OPCIONES } = require('../utils/tokens');
const intentos = require('../utils/intentos');

const CONTRASENA = 'password123';
const PDF_VALIDO = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF');

let servidorHTTP;
let puerto;
let ids = {};

function generarToken(idUsuario) {
  return jwt.sign({ idUsuario }, process.env.JWT_SECRET, { ...OPCIONES, expiresIn: '1h', algorithm: 'HS256' });
}

function generarTokenExpirado(idUsuario) {
  return jwt.sign({ idUsuario }, process.env.JWT_SECRET, { ...OPCIONES, expiresIn: '-1s', algorithm: 'HS256' });
}

function generarTokenInvalido() {
  return jwt.sign({ idUsuario: 999 }, 'clave-incorrecta', { ...OPCIONES, expiresIn: '1h', algorithm: 'HS256' });
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

function construirMultipart(campos, archivoBuffer, nombreArchivo) {
  const boundary = '----TestBoundary' + Date.now();
  let texto = '';
  for (const [nombre, valor] of Object.entries(campos)) {
    texto += `--${boundary}\r\nContent-Disposition: form-data; name="${nombre}"\r\n\r\n${valor}\r\n`;
  }
  if (archivoBuffer) {
    texto += `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${nombreArchivo}"\r\nContent-Type: application/pdf\r\n\r\n`;
    const partesBuffer = Buffer.from(texto, 'utf-8');
    const fin = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    return { buffer: Buffer.concat([partesBuffer, archivoBuffer, fin]), boundary };
  }
  texto += `--${boundary}--\r\n`;
  return { buffer: Buffer.from(texto, 'utf-8'), boundary };
}

async function peticionUpload(ruta, archivoBuffer, nombreArchivo, campos = {}, encabezados = {}) {
  return new Promise((resolve, reject) => {
    const { buffer, boundary } = construirMultipart(campos, archivoBuffer, nombreArchivo);
    const opciones = {
      method: 'POST',
      hostname: 'localhost',
      port: puerto,
      path: ruta,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': buffer.length,
        ...encabezados,
      },
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
    req.write(buffer);
    req.end();
  });
}

const ORIGINAL_SUBIR = googleDriveService.subirArchivo;

function mockearDrive() {
  let carpetaCapturada = null;
  googleDriveService.subirArchivo = async function (buffer, nombre, carpetaId, mime) {
    carpetaCapturada = carpetaId;
    return { id: 'mock-drive-id-' + Date.now(), name: nombre };
  };
  return {
    getCarpeta: () => carpetaCapturada,
    restablecer: () => { googleDriveService.subirArchivo = ORIGINAL_SUBIR; },
  };
}

async function configurarBD() {
  ids = {};
  intentos.reiniciar();
  await db.asegurarMigraciones();
  await db.ejecutar('DELETE FROM tokens_revocados');
  await db.ejecutar('DELETE FROM upload_logs');
  await db.ejecutar('DELETE FROM usuarios');
  await db.ejecutar('DELETE FROM areas');
  await db.ejecutar("DELETE FROM sqlite_sequence WHERE name IN ('usuarios', 'areas', 'upload_logs')");
  await db.ejecutar("INSERT INTO areas (nombre, drive_folder_id) VALUES ('matematica', 'folder-matematica')");
  await db.ejecutar("INSERT INTO areas (nombre, drive_folder_id) VALUES ('lengua', 'folder-lengua')");

  const areas = await db.obtenerFilas('SELECT id, nombre FROM areas');
  const areaMate = areas.find(a => a.nombre === 'matematica').id;
  const areaLengua = areas.find(a => a.nombre === 'lengua').id;

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
    'INSERT INTO usuarios (username, password_hash, rol, area_id, password_change_allowed, password_change_count) VALUES (?, ?, ?, ?, 1, 0)',
    'jefe_lengua', hash, 'jefatura_area', areaLengua
  );
  await db.ejecutar(
    'INSERT INTO usuarios (username, password_hash, rol, area_id, password_change_allowed, password_change_count) VALUES (?, ?, ?, ?, 1, 0)',
    'servidor', hash, 'server', null
  );
  await db.ejecutar(
    'INSERT INTO usuarios (username, password_hash, rol, area_id, password_change_allowed, password_change_count) VALUES (?, ?, ?, ?, 1, 0)',
    'director', hash, 'direccion', null
  );

  const filas = await db.obtenerFilas('SELECT id, username FROM usuarios');
  for (const f of filas) ids[f.username] = f.id;
}

// ======================================================================
// FUNCIONES UTILITARIAS
// ======================================================================
describe('Funciones Utilitarias', () => {
  describe('validarPDF', () => {
    it('acepta un PDF válido', () => {
      assert.doesNotThrow(() => validarPDF({ buffer: PDF_VALIDO, mimetype: 'application/pdf', originalname: 'test.pdf' }));
    });

    it('rechaza archivo sin buffer', () => {
      assert.throws(() => validarPDF(null), /No se proporcionó ningún archivo/);
    });

    it('rechaza archivo vacío', () => {
      assert.throws(() => validarPDF({ buffer: Buffer.alloc(0), mimetype: 'application/pdf', originalname: 'test.pdf' }), /vacío/);
    });

    it('rechaza MIME type incorrecto', () => {
      assert.throws(() => validarPDF({ buffer: PDF_VALIDO, mimetype: 'image/png', originalname: 'test.pdf' }), /inválido/);
    });

    it('rechaza extensión incorrecta', () => {
      assert.throws(() => validarPDF({ buffer: PDF_VALIDO, mimetype: 'application/pdf', originalname: 'test.exe' }), /inválida/);
    });

    it('rechaza contenido que no es PDF', () => {
      const bufferFalso = Buffer.from(' Este no es un PDF ');
      assert.throws(() => validarPDF({ buffer: bufferFalso, mimetype: 'application/pdf', originalname: 'test.pdf' }), /no es un PDF válido/);
    });
  });

  describe('sanitizarNombreArchivo', () => {
    it('mantiene nombre seguro', () => {
      assert.strictEqual(sanitizarNombreArchivo('documento.pdf'), 'documento.pdf');
    });

    it('elimina path traversal', () => {
      const resultado = sanitizarNombreArchivo('../../etc/passwd.pdf');
      assert.ok(!resultado.includes('..'));
      assert.ok(!resultado.includes('/'));
    });

    it('elimina caracteres especiales', () => {
      const resultado = sanitizarNombreArchivo('archivo<script>.pdf');
      assert.ok(!resultado.includes('<'));
      assert.ok(!resultado.includes('>'));
    });

    it('genera nombre para archivo vacío', () => {
      const resultado = sanitizarNombreArchivo('');
      assert.ok(resultado.endsWith('.pdf'));
    });

    it('trunca nombres largos', () => {
      const largo = 'a'.repeat(300) + '.pdf';
      const resultado = sanitizarNombreArchivo(largo);
      assert.ok(resultado.length <= 200);
    });

    it('agrega extensión .pdf si falta', () => {
      const resultado = sanitizarNombreArchivo('documento');
      assert.ok(resultado.endsWith('.pdf'));
    });
  });

  describe('esRolValido', () => {
    it('acepta roles válidos', () => {
      assert.ok(esRolValido('jefatura_area'));
      assert.ok(esRolValido('server'));
      assert.ok(esRolValido('direccion'));
    });

    it('rechaza roles inválidos', () => {
      assert.ok(!esRolValido('admin'));
      assert.ok(!esRolValido('superuser'));
      assert.ok(!esRolValido(''));
    });
  });
});

// ======================================================================
// AUTENTICACIÓN
// ======================================================================
describe('Autenticación', () => {
  before(async () => {
    await configurarBD();
    servidorHTTP = http.createServer(app);
    await new Promise((r) => servidorHTTP.listen(0, () => { puerto = servidorHTTP.address().port; r(); }));
  });

  after(() => new Promise((r) => servidorHTTP.close(r)));

  it('login con credenciales correctas', async () => {
    const res = await peticion('POST', '/api/auth/login', { username: 'director', password: CONTRASENA });
    assert.strictEqual(res.estado, 200);
    assert.ok(res.cuerpo.token);
    assert.strictEqual(res.cuerpo.usuario.rol, 'direccion');
  });

  it('login con contraseña incorrecta', async () => {
    const res = await peticion('POST', '/api/auth/login', { username: 'director', password: 'wrong' });
    assert.strictEqual(res.estado, 401);
    assert.ok(res.cuerpo.error);
  });

  it('login con usuario inexistente', async () => {
    const res = await peticion('POST', '/api/auth/login', { username: 'noexiste', password: CONTRASENA });
    assert.strictEqual(res.estado, 401);
  });

  it('login con campos vacíos', async () => {
    const res = await peticion('POST', '/api/auth/login', {});
    assert.strictEqual(res.estado, 400);
  });

  it('login con usuario deshabilitado', async () => {
    await db.ejecutar('UPDATE usuarios SET activo = 0 WHERE username = ?', 'servidor');
    const res = await peticion('POST', '/api/auth/login', { username: 'servidor', password: CONTRASENA });
    assert.strictEqual(res.estado, 401);
    assert.strictEqual(res.cuerpo.error, 'Credenciales inválidas');
    await db.ejecutar('UPDATE usuarios SET activo = 1 WHERE username = ?', 'servidor');
  });

  it('GET /me con token válido', async () => {
    const token = generarToken(ids.director);
    const res = await peticion('GET', '/api/auth/me', null, { Authorization: `Bearer ${token}` });
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(res.cuerpo.usuario.username, 'director');
  });

  it('GET /me sin token', async () => {
    const res = await peticion('GET', '/api/auth/me');
    assert.strictEqual(res.estado, 401);
  });

  it('GET /me con token inválido', async () => {
    const res = await peticion('GET', '/api/auth/me', null, { Authorization: 'Bearer token-falso' });
    assert.strictEqual(res.estado, 401);
  });

  it('GET /me con token expirado', async () => {
    const token = generarTokenExpirado(ids.director);
    const res = await peticion('GET', '/api/auth/me', null, { Authorization: `Bearer ${token}` });
    assert.strictEqual(res.estado, 401);
  });

  it('GET /me con token de usuario deshabilitado', async () => {
    await db.ejecutar('UPDATE usuarios SET activo = 0 WHERE username = ?', 'servidor');
    const token = generarToken(ids.servidor);
    const res = await peticion('GET', '/api/auth/me', null, { Authorization: `Bearer ${token}` });
    assert.strictEqual(res.estado, 401);
    await db.ejecutar('UPDATE usuarios SET activo = 1 WHERE username = ?', 'servidor');
  });

  it('logout con token válido', async () => {
    const token = generarToken(ids.director);
    const res = await peticion('POST', '/api/auth/logout', null, { Authorization: `Bearer ${token}` });
    assert.strictEqual(res.estado, 200);
  });

  it('logout sin token', async () => {
    const res = await peticion('POST', '/api/auth/logout');
    assert.strictEqual(res.estado, 401);
  });

  it('logout revoca el token en el servidor', async () => {
    const login = await peticion('POST', '/api/auth/login', { username: 'director', password: CONTRASENA });
    const auth = { Authorization: `Bearer ${login.cuerpo.token}` };
    assert.strictEqual((await peticion('GET', '/api/auth/me', null, auth)).estado, 200);
    assert.strictEqual((await peticion('POST', '/api/auth/logout', null, auth)).estado, 200);
    assert.strictEqual((await peticion('GET', '/api/auth/me', null, auth)).estado, 401);
  });

  it('logout de una sesión no cierra las otras de la misma cuenta', async () => {
    const a = await peticion('POST', '/api/auth/login', { username: 'director', password: CONTRASENA });
    const b = await peticion('POST', '/api/auth/login', { username: 'director', password: CONTRASENA });
    await peticion('POST', '/api/auth/logout', null, { Authorization: `Bearer ${a.cuerpo.token}` });
    const res = await peticion('GET', '/api/auth/me', null, { Authorization: `Bearer ${b.cuerpo.token}` });
    assert.strictEqual(res.estado, 200);
  });

  it('token firmado con la clave pero sin issuer/audience propios → 401', async () => {
    const token = jwt.sign({ idUsuario: ids.director }, process.env.JWT_SECRET, { expiresIn: '1h', algorithm: 'HS256' });
    const res = await peticion('GET', '/api/auth/me', null, { Authorization: `Bearer ${token}` });
    assert.strictEqual(res.estado, 401);
  });

  it('login con cuerpo que no es JSON → 400 (no 500)', async () => {
    const res = await peticion('POST', '/api/auth/login', { username: 'director', password: CONTRASENA }, { 'Content-Type': 'text/plain' });
    assert.strictEqual(res.estado, 400);
  });

  it(`después de ${intentos.MAX_POR_USUARIO} intentos fallidos el usuario queda bloqueado (429)`, async () => {
    for (let i = 0; i < intentos.MAX_POR_USUARIO; i++) {
      const res = await peticion('POST', '/api/auth/login', { username: 'jefe_lengua', password: 'incorrecta' });
      assert.strictEqual(res.estado, 401);
    }
    // Aun con la contraseña correcta: está bloqueado hasta que venza la ventana.
    const res = await peticion('POST', '/api/auth/login', { username: 'jefe_lengua', password: CONTRASENA });
    assert.strictEqual(res.estado, 429);
    intentos.reiniciar();
  });

  it('un login correcto limpia los fallos del usuario', async () => {
    for (let i = 0; i < intentos.MAX_POR_USUARIO - 1; i++) {
      await peticion('POST', '/api/auth/login', { username: 'jefe_mate', password: 'incorrecta' });
    }
    assert.strictEqual((await peticion('POST', '/api/auth/login', { username: 'jefe_mate', password: CONTRASENA })).estado, 200);
    await peticion('POST', '/api/auth/login', { username: 'jefe_mate', password: 'incorrecta' });
    assert.strictEqual((await peticion('POST', '/api/auth/login', { username: 'jefe_mate', password: CONTRASENA })).estado, 200);
    intentos.reiniciar();
  });

  it('muchos intentos fallidos desde la misma IP con usuarios distintos → 429', async () => {
    let ultimo;
    for (let i = 0; i < 21; i++) {
      ultimo = await peticion('POST', '/api/auth/login', { username: `inexistente_${i}`, password: 'x' });
    }
    assert.strictEqual(ultimo.estado, 429);
    intentos.reiniciar();
  });
});

// ======================================================================
// AUTORIZACIÓN
// ======================================================================
describe('Autorización', () => {
  before(async () => {
    await configurarBD();
    servidorHTTP = http.createServer(app);
    await new Promise((r) => servidorHTTP.listen(0, () => { puerto = servidorHTTP.address().port; r(); }));
  });

  after(() => new Promise((r) => servidorHTTP.close(r)));

  it('sin token accede a ruta protegida → 401', async () => {
    const res = await peticion('GET', '/api/usuarios');
    assert.strictEqual(res.estado, 401);
  });

  it('jefatura_area NO puede gestionar usuarios → 403', async () => {
    const token = generarToken(ids.jefe_mate);
    const res = await peticion('GET', '/api/usuarios', null, { Authorization: `Bearer ${token}` });
    assert.strictEqual(res.estado, 403);
  });

  it('server NO puede gestionar usuarios → 403', async () => {
    const token = generarToken(ids.servidor);
    const res = await peticion('GET', '/api/usuarios', null, { Authorization: `Bearer ${token}` });
    assert.strictEqual(res.estado, 403);
  });

  it('direccion SÍ puede gestionar usuarios → 200', async () => {
    const token = generarToken(ids.director);
    const res = await peticion('GET', '/api/usuarios', null, { Authorization: `Bearer ${token}` });
    assert.strictEqual(res.estado, 200);
    assert.ok(Array.isArray(res.cuerpo.usuarios));
  });

  it('jefatura_area NO puede crear usuarios → 403', async () => {
    const token = generarToken(ids.jefe_mate);
    const res = await peticion('POST', '/api/usuarios', { username: 'nuevo', password: 'test1234', rol: 'server' }, { Authorization: `Bearer ${token}` });
    assert.strictEqual(res.estado, 403);
  });

  it('token con id de usuario inexistente → 401', async () => {
    const token = generarToken(99999);
    const res = await peticion('GET', '/api/auth/me', null, { Authorization: `Bearer ${token}` });
    assert.strictEqual(res.estado, 401);
  });
});

// ======================================================================
// GESTIÓN DE USUARIOS
// ======================================================================
describe('Gestión de Usuarios', () => {
  let tokenDirector;

  before(async () => {
    await configurarBD();
    servidorHTTP = http.createServer(app);
    await new Promise((r) => servidorHTTP.listen(0, () => { puerto = servidorHTTP.address().port; r(); }));
    tokenDirector = generarToken(ids.director);
  });

  after(() => new Promise((r) => servidorHTTP.close(r)));

  it(' listar usuarios', async () => {
    const res = await peticion('GET', '/api/usuarios', null, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 200);
    assert.ok(res.cuerpo.usuarios.length >= 4);
  });

  it('obtener usuario por ID', async () => {
    const res = await peticion('GET', `/api/usuarios/${ids.jefe_mate}`, null, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(res.cuerpo.usuario.username, 'jefe_mate');
  });

  it('obtener usuario inexistente → 404', async () => {
    const res = await peticion('GET', '/api/usuarios/99999', null, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 404);
  });

  it('crear usuario válido', async () => {
    const res = await peticion('POST', '/api/usuarios', { username: 'nuevo_user', password: 'password123', rol: 'server' }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 201);
    assert.strictEqual(res.cuerpo.rol, 'server');
  });

  it('crear usuario duplicado → 409', async () => {
    const res = await peticion('POST', '/api/usuarios', { username: 'nuevo_user', password: 'password123', rol: 'server' }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 409);
  });

  it('crear jefatura_area sin area_id → 400', async () => {
    const res = await peticion('POST', '/api/usuarios', { username: 'jefe_sin_area', password: 'password123', rol: 'jefatura_area' }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 400);
  });

  it('crear usuario con rol inválido → 400', async () => {
    const res = await peticion('POST', '/api/usuarios', { username: 'test_user', password: 'password123', rol: '超级管理员' }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 400);
  });

  it('crear usuario con contraseña corta → 400', async () => {
    const res = await peticion('POST', '/api/usuarios', { username: 'test_user2', password: '123', rol: 'server' }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 400);
  });

  it('crear jefatura_area con area_id válido', async () => {
    const area = await db.obtenerFila('SELECT id FROM areas LIMIT 1');
    const res = await peticion('POST', '/api/usuarios', { username: 'jefe_nuevo', password: 'password123', rol: 'jefatura_area', area_id: area.id }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 201);
    assert.strictEqual(res.cuerpo.rol, 'jefatura_area');
  });

  it('desactivar usuario', async () => {
    const res = await peticion('DELETE', `/api/usuarios/${ids.servidor}`, null, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 200);
    const verificacion = await db.obtenerFila('SELECT activo FROM usuarios WHERE id = ?', ids.servidor);
    assert.strictEqual(verificacion.activo, 0);
    await db.ejecutar('UPDATE usuarios SET activo = 1 WHERE id = ?', ids.servidor);
  });

  it('listar áreas', async () => {
    const res = await peticion('GET', '/api/usuarios/areas', null, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 200);
    assert.ok(res.cuerpo.areas.length >= 2);
  });

  it('dirección no puede desactivarse ni quitarse el rol a sí misma → 400', async () => {
    const auth = { Authorization: `Bearer ${tokenDirector}` };
    assert.strictEqual((await peticion('DELETE', `/api/usuarios/${ids.director}`, null, auth)).estado, 400);
    assert.strictEqual((await peticion('PUT', `/api/usuarios/${ids.director}`, { activo: false }, auth)).estado, 400);
    assert.strictEqual((await peticion('PUT', `/api/usuarios/${ids.director}`, { rol: 'server' }, auth)).estado, 400);
    const yo = await db.obtenerFila('SELECT rol, activo FROM usuarios WHERE id = ?', ids.director);
    assert.strictEqual(yo.rol, 'direccion');
    assert.strictEqual(yo.activo, 1);
  });

  it('asignar un área inexistente → 400', async () => {
    const res = await peticion('PUT', `/api/usuarios/${ids.jefe_mate}`, { area_id: 99999 }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 400);
  });

  it('dar área a un rol que no es jefatura_area → 400', async () => {
    const area = await db.obtenerFila('SELECT id FROM areas LIMIT 1');
    const res = await peticion('PUT', `/api/usuarios/${ids.servidor}`, { area_id: area.id }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 400);
  });

  it('pasar a jefatura_area a un rol sin área → 400', async () => {
    const res = await peticion('PUT', `/api/usuarios/${ids.servidor}`, { rol: 'jefatura_area' }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 400);
  });

  it('pasar de jefatura_area a server limpia el área', async () => {
    const jefe = await db.obtenerFila('SELECT id FROM usuarios WHERE username = ?', 'jefe_nuevo');
    const res = await peticion('PUT', `/api/usuarios/${jefe.id}`, { rol: 'server' }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 200);
    const actualizado = await db.obtenerFila('SELECT rol, area_id FROM usuarios WHERE id = ?', jefe.id);
    assert.strictEqual(actualizado.rol, 'server');
    assert.strictEqual(actualizado.area_id, null);
  });

  it('restablecer la contraseña de una cuenta cierra sus sesiones y deja entrar con la nueva', async () => {
    const tokenViejo = generarToken(ids.servidor);
    assert.strictEqual((await peticion('GET', '/api/auth/me', null, { Authorization: `Bearer ${tokenViejo}` })).estado, 200);

    const res = await peticion('PUT', `/api/usuarios/${ids.servidor}/password`, { nueva_password: 'Temporal1234' }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 200);

    assert.strictEqual((await peticion('GET', '/api/auth/me', null, { Authorization: `Bearer ${tokenViejo}` })).estado, 401);
    const login = await peticion('POST', '/api/auth/login', { username: 'servidor', password: 'Temporal1234' });
    assert.strictEqual(login.estado, 200);
    const fila = await db.obtenerFila('SELECT password_change_allowed FROM usuarios WHERE id = ?', ids.servidor);
    assert.strictEqual(fila.password_change_allowed, 1);
  });

  it('restablecer contraseña: sólo dirección y con contraseña de 8 o más', async () => {
    const corta = await peticion('PUT', `/api/usuarios/${ids.jefe_mate}/password`, { nueva_password: '123' }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(corta.estado, 400);
    const sinPermiso = await peticion('PUT', `/api/usuarios/${ids.jefe_mate}/password`, { nueva_password: 'Temporal1234' }, { Authorization: `Bearer ${generarToken(ids.jefe_lengua)}` });
    assert.strictEqual(sinPermiso.estado, 403);
  });
});

// ======================================================================
// SUBIDA DE ARCHIVOS
// ======================================================================
describe('Subida de Archivos', () => {
  let tokenJefeMate, tokenServidor, tokenDirector;
  let mock;

  before(async () => {
    await configurarBD();
    servidorHTTP = http.createServer(app);
    await new Promise((r) => servidorHTTP.listen(0, () => { puerto = servidorHTTP.address().port; r(); }));
    tokenJefeMate = generarToken(ids.jefe_mate);
    tokenServidor = generarToken(ids.servidor);
    tokenDirector = generarToken(ids.director);
  });

  after(() => new Promise((r) => servidorHTTP.close(r)));

  it('jefatura_area sube a su área correctamente', async () => {
    mock = mockearDrive();
    const res = await peticionUpload('/api/upload', PDF_VALIDO, 'examen.pdf', {}, { Authorization: `Bearer ${tokenJefeMate}` });
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(res.cuerpo.exito, true);
    assert.strictEqual(mock.getCarpeta(), 'folder-matematica');
    mock.restablecer();
  });

  it('server sube a su carpeta correctamente', async () => {
    mock = mockearDrive();
    const res = await peticionUpload('/api/upload', PDF_VALIDO, 'ematp.pdf', {}, { Authorization: `Bearer ${tokenServidor}` });
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(res.cuerpo.exito, true);
    assert.strictEqual(mock.getCarpeta(), 'carpeta-ematp-test');
    mock.restablecer();
  });

  it('direccion sube a área指定', async () => {
    mock = mockearDrive();
    const res = await peticionUpload('/api/upload', PDF_VALIDO, 'directiva.pdf', { destination: 'lengua' }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(mock.getCarpeta(), 'folder-lengua');
    mock.restablecer();
  });

  it('direccion sube a server', async () => {
    mock = mockearDrive();
    const res = await peticionUpload('/api/upload', PDF_VALIDO, 'servidor.pdf', { destination: 'server' }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(mock.getCarpeta(), 'carpeta-ematp-test');
    mock.restablecer();
  });

  it('sin archivo → 400', async () => {
    const res = await peticionUpload('/api/upload', null, '', {}, { Authorization: `Bearer ${tokenJefeMate}` });
    assert.strictEqual(res.estado, 400);
  });

  it('archivo vacío → 400', async () => {
    const res = await peticionUpload('/api/upload', Buffer.alloc(0), 'vacio.pdf', {}, { Authorization: `Bearer ${tokenJefeMate}` });
    assert.strictEqual(res.estado, 400);
  });

  it('MIME type incorrecto → 415', async () => {
    const boundary = '----TestBoundary' + Date.now();
    const cuerpo = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="imagen.pdf"\r\nContent-Type: image/png\r\n\r\nPNG fake content\r\n--${boundary}--\r\n`;
    const buffer = Buffer.from(cuerpo, 'utf-8');
    return new Promise((resolve) => {
      const req = http.request({
        method: 'POST', hostname: 'localhost', port: puerto, path: '/api/upload',
        headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': buffer.length, Authorization: `Bearer ${tokenJefeMate}` },
      }, (res) => {
        let datos = '';
        res.on('data', (c) => datos += c);
        res.on('end', () => {
          assert.strictEqual(res.statusCode, 415);
          resolve();
        });
      });
      req.write(buffer);
      req.end();
    });
  });

  it('contenido que no es PDF → 415', async () => {
    mock = mockearDrive();
    const falsoPdf = Buffer.from('Este es un archivo de texto, no un PDF');
    const res = await peticionUpload('/api/upload', falsoPdf, 'falso.pdf', {}, { Authorization: `Bearer ${tokenJefeMate}` });
    assert.strictEqual(res.estado, 415);
    mock.restablecer();
  });

  it('sin autenticación → 401', async () => {
    const res = await peticionUpload('/api/upload', PDF_VALIDO, 'test.pdf');
    assert.strictEqual(res.estado, 401);
  });

  it('jefatura_area puede subir → 200 (es un rol permitido para upload)', async () => {
    const tempMock = mockearDrive();
    const res = await peticionUpload('/api/upload', PDF_VALIDO, 'test.pdf', {}, { Authorization: `Bearer ${tokenJefeMate}` });
    assert.strictEqual(res.estado, 200);
    tempMock.restablecer();
  });
});

// ======================================================================
// SEGURIDAD
// ======================================================================
describe('Seguridad', () => {
  let tokenJefeMate, tokenJefeLengua, tokenServidor, tokenDirector;

  before(async () => {
    await configurarBD();
    servidorHTTP = http.createServer(app);
    await new Promise((r) => servidorHTTP.listen(0, () => { puerto = servidorHTTP.address().port; r(); }));
    tokenJefeMate = generarToken(ids.jefe_mate);
    tokenJefeLengua = generarToken(ids.jefe_lengua);
    tokenServidor = generarToken(ids.servidor);
    tokenDirector = generarToken(ids.director);
  });

  after(() => new Promise((r) => servidorHTTP.close(r)));

  it('IDOR: jefatura_area NO puede subir a carpeta de otra área', async () => {
    mock = mockearDrive();
    const res = await peticionUpload('/api/upload', PDF_VALIDO, 'test.pdf', { destination: 'lengua' }, { Authorization: `Bearer ${tokenJefeMate}` });
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(mock.getCarpeta(), 'folder-matematica', 'Jefe de matemática debe subir a su carpeta, no a lengua');
    mock.restablecer();
  });

  it('IDOR: jefatura_area de lengua sube a su propia carpeta', async () => {
    mock = mockearDrive();
    const res = await peticionUpload('/api/upload', PDF_VALIDO, 'test.pdf', {}, { Authorization: `Bearer ${tokenJefeLengua}` });
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(mock.getCarpeta(), 'folder-lengua');
    mock.restablecer();
  });

  it('privilege escalation: el rol efectivo viene del DB, no del request', async () => {
    const tokenJefe = generarToken(ids.jefe_mate);
    const res = await peticion('GET', '/api/usuarios', null, { Authorization: `Bearer ${tokenJefe}` });
    assert.strictEqual(res.estado, 403, 'jefatura_area no debe poder gestionar usuarios aunque lo intente');
  });

  it('token manipulado (firma inválida) → 401', async () => {
    const tokenFalso = generarTokenInvalido();
    const res = await peticion('GET', '/api/auth/me', null, { Authorization: `Bearer ${tokenFalso}` });
    assert.strictEqual(res.estado, 401);
  });

  it('SQL injection en login → rechazado', async () => {
    const res = await peticion('POST', '/api/auth/login', { username: "admin' OR '1'='1", password: 'test' });
    assert.strictEqual(res.estado, 401);
  });

  it('path traversal en filename → sanitizado', async () => {
    mock = mockearDrive();
    const res = await peticionUpload('/api/upload', PDF_VALIDO, '../../etc/passwd.pdf', {}, { Authorization: `Bearer ${tokenJefeMate}` });
    assert.strictEqual(res.estado, 200);
    assert.ok(!res.cuerpo.nombreArchivo.includes('..'));
    assert.ok(!res.cuerpo.nombreArchivo.includes('/'));
    mock.restablecer();
  });

  it('destination inválido para dirección → 400', async () => {
    const res = await peticionUpload('/api/upload', PDF_VALIDO, 'test.pdf', { destination: 'carpeta_secreta' }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 400);
  });

  it('multipart con más campos de los que usa el endpoint → 400', async () => {
    const res = await peticionUpload('/api/upload', PDF_VALIDO, 'test.pdf', { a: '1', b: '2', c: '3' }, { Authorization: `Bearer ${tokenServidor}` });
    assert.strictEqual(res.estado, 400);
  });

  it('multipart con un campo de texto demasiado largo → 400', async () => {
    const res = await peticionUpload('/api/upload', PDF_VALIDO, 'test.pdf', { destination: 'x'.repeat(5000) }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 400);
  });

  it('destination falso (intentar folderId arbitrario) → 400', async () => {
    const res = await peticionUpload('/api/upload', PDF_VALIDO, 'test.pdf', { destination: '1u7f8rWwf4XV1wUfZNLT7_q8tpRrWVYHM' }, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 400);
  });

  it('datos sensibles no se exponen en errores de login', async () => {
    const res = await peticion('POST', '/api/auth/login', { username: 'noexiste', password: 'test' });
    assert.strictEqual(res.estado, 401);
    assert.ok(!res.cuerpo.error.includes('usuario no existe') || res.cuerpo.error === 'Credenciales inválidas');
  });

  it('GET /me no expone password_hash', async () => {
    const res = await peticion('GET', '/api/auth/me', null, { Authorization: `Bearer ${tokenDirector}` });
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(res.cuerpo.usuario.password_hash, undefined);
  });

  it('health check funciona', async () => {
    const res = await peticion('GET', '/api/health');
    assert.strictEqual(res.estado, 200);
    assert.strictEqual(res.cuerpo.status, 'ok');
  });

  it('ruta inexistente → 404', async () => {
    const res = await peticion('GET', '/api/ruta-fantasma');
    assert.strictEqual(res.estado, 404);
  });
});
