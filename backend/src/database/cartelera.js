// Cartelera digital: lo que se muestra en los televisores de los corredores.
//
// - cartelera: imágenes que cargan Dirección, Jefatura de Área y EMATP, con su
//   nivel de prioridad (3, 2, 1), vigencia, duración en pantalla y si están
//   fijadas. La imagen se guarda en la base (BLOB); se pide por `clave`, que
//   es aleatoria e irrepetible.
// - pantallas: cada televisor tiene su enlace secreto (`token`). El televisor
//   no inicia sesión: con ese enlace sólo puede ver la cartelera.
const TABLAS = `
  CREATE TABLE IF NOT EXISTS cartelera (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    clave TEXT NOT NULL UNIQUE,
    titulo TEXT NOT NULL DEFAULT '',
    mime TEXT NOT NULL,
    datos BLOB NOT NULL,
    duracion INTEGER NOT NULL DEFAULT 10,
    desde TEXT,
    hasta TEXT,
    activo INTEGER NOT NULL DEFAULT 1,
    fijada INTEGER NOT NULL DEFAULT 0,
    nivel INTEGER NOT NULL CHECK(nivel IN (1, 2, 3)),
    orden INTEGER NOT NULL DEFAULT 0,
    autor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS pantallas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    token TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`;

const migrar = (db) =>
  new Promise((resolve, reject) => db.exec(TABLAS, (err) => (err ? reject(err) : resolve())));

module.exports = { migrar };
