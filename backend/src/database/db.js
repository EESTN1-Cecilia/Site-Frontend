const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Carpeta donde se guarda la base de datos SQLite (data/database.sqlite)
const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// En tests se usa un archivo distinto por suite (TEST_DB_NAME) para
// evitar el error SQLITE_BUSY por concurrencia del runner.
const esTesting = process.env.NODE_ENV === 'test';
const nombreArchivo = esTesting
  ? (process.env.TEST_DB_NAME || 'test-database.sqlite')
  : 'database.sqlite';
const rutaDb = path.join(dataDir, nombreArchivo);

// Conexión única (singleton). No se guardan PDFs como BLOB: solo metadatos.
const db = new sqlite3.Database(rutaDb);

db.serialize(() => {
  // SQLite no controla las claves foráneas si no se le pide (por conexión).
  db.run('PRAGMA foreign_keys = ON');

  db.run(`CREATE TABLE IF NOT EXISTS areas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE,
    drive_folder_id TEXT NOT NULL,
    activo INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('jefatura_area', 'server', 'direccion')),
    area_id INTEGER REFERENCES areas(id),
    activo INTEGER DEFAULT 1,
    password_change_allowed INTEGER DEFAULT 1,
    password_change_count INTEGER DEFAULT 0,
    token_version INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS upload_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES usuarios(id),
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    destination TEXT NOT NULL,
    drive_file_id TEXT,
    status TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // Tokens cerrados con logout antes de vencer (jti). Se borran al vencer.
  db.run(`CREATE TABLE IF NOT EXISTS tokens_revocados (
    jti TEXT PRIMARY KEY,
    expira INTEGER NOT NULL
  )`);

  // Contenido del sitio público que se edita desde gestión. Una fila por
  // sección (textos, ajustes, mesas, programas, proyectos) con su JSON.
  // Mientras una sección no tiene fila, el sitio muestra el contenido original.
  db.run(`CREATE TABLE IF NOT EXISTS contenido (
    seccion TEXT PRIMARY KEY,
    datos TEXT NOT NULL,
    actualizado_por INTEGER REFERENCES usuarios(id),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Notas de Novedades y avisos de Previas. estado: pendiente | publicada | devuelta.
  db.run(`CREATE TABLE IF NOT EXISTS publicaciones (
    id TEXT PRIMARY KEY,
    datos TEXT NOT NULL,
    estado TEXT NOT NULL CHECK(estado IN ('pendiente', 'publicada', 'devuelta')),
    autor_id INTEGER REFERENCES usuarios(id),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run('CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username)');
  db.run('CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol)');
  db.run('CREATE INDEX IF NOT EXISTS idx_upload_logs_user_id ON upload_logs(user_id)');
});

// Helpers async. IMPORTANTE: en sqlite3, llamar .get()/.all()/.run() sin callback
// devuelve el Statement y NO ejecuta la consulta, por eso se centraliza aquí con Promise.
db.obtenerFila = function (sql, ...params) {
  // Devuelve una sola fila (o undefined si no hay). Se usa db.get y no
  // prepare().get(): el statement preparado quedaba abierto hasta el GC.
  return new Promise((resolve, reject) => {
    this.get(sql, ...params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.obtenerFilas = function (sql, ...params) {
  // Devuelve todas las filas como array
  return new Promise((resolve, reject) => {
    this.all(sql, ...params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

db.ejecutar = function (sql, ...params) {
  // Ejecuta un INSERT/UPDATE/DELETE
  return new Promise((resolve, reject) => {
    this.run(sql, ...params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

// SQLite no soporta "ADD COLUMN IF NOT EXISTS"; se chequea con PRAGMA y
// se hace ALTER solo si la columna aún no existe (usado para migraciones).
db.agregarColumnaSiNoExiste = function (tabla, columna, definicion) {
  return new Promise((resolve) => {
    this.all(`PRAGMA table_info(${tabla})`, [], (err, filas) => {
      if (err) return resolve();
      const existe = filas.some(c => c.name === columna);
      if (existe) return resolve();
      this.run(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`, (errAlterar) => {
        if (errAlterar) {
          console.error(`[DB] No se pudo agregar columna ${columna}:`, errAlterar.message);
        }
        resolve();
      });
    });
  });
};

// Migraciones que se aplican al arrancar (app.js las invoca)
db.asegurarMigraciones = async function () {
  await db.agregarColumnaSiNoExiste('usuarios', 'password_change_allowed', 'INTEGER DEFAULT 1');
  await db.agregarColumnaSiNoExiste('usuarios', 'password_change_count', 'INTEGER DEFAULT 0');
  await db.agregarColumnaSiNoExiste('usuarios', 'token_version', 'INTEGER DEFAULT 0');
  // Nombre y apellido de la persona (el username es sólo para entrar).
  await db.agregarColumnaSiNoExiste('usuarios', 'nombre', 'TEXT');

  // Espacios, grillas, módulos y asignaciones (plano y Espacios y horarios).
  await require('./espacios').migrar(db);
  // Cartelera digital (televisores de los corredores).
  await require('./cartelera').migrar(db);
};

// Varias escrituras como una sola: o quedan todas o ninguna. Quien llama se
// encarga de que no corran dos transacciones a la vez (van en una cola).
db.transaccion = async function (tarea) {
  await db.ejecutar('BEGIN IMMEDIATE');
  try {
    const resultado = await tarea();
    await db.ejecutar('COMMIT');
    return resultado;
  } catch (error) {
    await db.ejecutar('ROLLBACK').catch(() => {});
    throw error;
  }
};

module.exports = db;
