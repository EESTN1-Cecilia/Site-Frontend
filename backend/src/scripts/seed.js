require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcrypt');
const db = require('../database/db');
const { ROLES } = require('../utils/roles');

const RONDAS_BCRYPT = 12;

// Script idempotente (INSERT OR IGNORE): crea las áreas y los 4 usuarios iniciales.
// Se puede correr varias veces sin duplicar datos. Requiere ADMIN_PASSWORD.
async function semilla() {
  const contrasenaAdmin = process.env.ADMIN_PASSWORD;
  if (!contrasenaAdmin) {
    console.error('La variable de entorno ADMIN_PASSWORD es requerida');
    console.error('Ejemplo: ADMIN_PASSWORD=MiContraseñaSegura123 node src/scripts/seed.js');
    process.exit(1);
  }

  if (typeof contrasenaAdmin !== 'string' || contrasenaAdmin.length < 8) {
    console.error('ADMIN_PASSWORD debe tener al menos 8 caracteres');
    process.exit(1);
  }

  const contrasenaPredeterminada = process.env.SEED_PASSWORD || '12345678';

  try {
    await db.asegurarMigraciones();

    // Áreas iniciales. El drive_folder_id viene de DRIVE_JEFE_AREA_ID (o PLACEHOLDER);
    // habrá que reemplazarlo en la BD por la carpeta real de cada área.
    const areas = [
      { nombre: 'matematica', carpetaId: process.env.DRIVE_JEFE_AREA_ID || 'PLACEHOLDER' },
      { nombre: 'lengua', carpetaId: process.env.DRIVE_JEFE_AREA_ID || 'PLACEHOLDER' },
    ];

    const idsArea = {};
    for (const area of areas) {
      await db.ejecutar(
        'INSERT OR IGNORE INTO areas (nombre, drive_folder_id) VALUES (?, ?)',
        area.nombre, area.carpetaId
      );
      const fila = await db.obtenerFila('SELECT id FROM areas WHERE nombre = ?', area.nombre);
      idsArea[area.nombre] = fila.id;
    }
    console.log('Áreas aseguradas');

    const hashAdmin = await new Promise((resolve, reject) => {
      bcrypt.hash(contrasenaAdmin, RONDAS_BCRYPT, (err, resultado) => {
        if (err) reject(err);
        else resolve(resultado);
      });
    });

    const hashSector = await new Promise((resolve, reject) => {
      bcrypt.hash(contrasenaPredeterminada, RONDAS_BCRYPT, (err, resultado) => {
        if (err) reject(err);
        else resolve(resultado);
      });
    });

    // Superadmin: siempre puede cambiar su contraseña (no se auto-bloquea)
    await db.ejecutar(
      `INSERT OR IGNORE INTO usuarios
        (username, password_hash, rol, area_id, password_change_allowed, password_change_count)
       VALUES (?, ?, ?, NULL, 1, 0)`,
      'admin', hashAdmin, ROLES.DIRECCION
    );
    console.log('Usuario superadmin asegurado (admin)');

    // Cuentas de sector: contraseña predeterminada, un único cambio disponible
    const sectores = [
      { username: 'jefatura_matematica', rol: ROLES.JEFATURA_AREA, area_id: idsArea['matematica'] },
      { username: 'jefatura_lengua', rol: ROLES.JEFATURA_AREA, area_id: idsArea['lengua'] },
      { username: 'ematp', rol: ROLES.SERVIDOR, area_id: null },
    ];

    for (const sector of sectores) {
      await db.ejecutar(
        `INSERT OR IGNORE INTO usuarios
          (username, password_hash, rol, area_id, password_change_allowed, password_change_count)
         VALUES (?, ?, ?, ?, 1, 0)`,
        sector.username, hashSector, sector.rol, sector.area_id
      );
    }
    console.log(`Cuentas de sector aseguradas (contraseña predeterminada: ${contrasenaPredeterminada})`);

    db.close();
    console.log('Semilla completada');
    process.exit(0);
  } catch (error) {
    console.error('Error durante la semilla:', error.message);
    db.close();
    process.exit(1);
  }
}

semilla();
