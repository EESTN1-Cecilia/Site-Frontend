require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcrypt');
const db = require('../database/db');
const { ROLES } = require('../utils/roles');

const RONDAS_BCRYPT = 12;

// Script idempotente (INSERT OR IGNORE): crea las áreas y los 4 usuarios iniciales.
// Se puede correr varias veces sin duplicar datos. Requiere ADMIN_PASSWORD y
// SEED_PASSWORD: no hay contraseñas por defecto, porque una contraseña conocida
// deja entrar a cualquiera a las cuentas de sector.
function contrasenaDeEntorno(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`La variable de entorno ${nombre} es requerida`);
    console.error('Ejemplo: ADMIN_PASSWORD=... SEED_PASSWORD=... node src/scripts/seed.js');
    process.exit(1);
  }
  if (valor.length < 8) {
    console.error(`${nombre} debe tener al menos 8 caracteres`);
    process.exit(1);
  }
  return valor;
}

async function semilla() {
  const contrasenaAdmin = contrasenaDeEntorno('ADMIN_PASSWORD');
  const contrasenaPredeterminada = contrasenaDeEntorno('SEED_PASSWORD');

  try {
    await db.asegurarMigraciones();

    // Áreas iniciales. El drive_folder_id viene de DRIVE_JEFE_AREA_ID (o PLACEHOLDER);
    // habrá que reemplazarlo en la BD por la carpeta real de cada área.
    const areas = [
      { nombre: 'matematica', carpetaId: process.env.DRIVE_JEFE_AREA_ID || 'PLACEHOLDER' },
      { nombre: 'lengua', carpetaId: process.env.DRIVE_JEFE_AREA_ID || 'PLACEHOLDER' },
      // Jefatura de Área sin un departamento en particular.
      { nombre: 'general', carpetaId: process.env.DRIVE_JEFE_AREA_ID || 'PLACEHOLDER' },
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

    // Cuentas de sector: contraseña de SEED_PASSWORD, un único cambio disponible
    // Las jefaturas de Área son Daniela Monje y Mariano Cipres (las cuentas
    // jefatura_matematica y jefatura_lengua se dieron de baja).
    const sectores = [
      { username: 'daniela_monje', nombre: 'Daniela Monje', rol: ROLES.JEFATURA_AREA, area_id: idsArea['general'] },
      { username: 'mariano_cipres', nombre: 'Mariano Cipres', rol: ROLES.JEFATURA_AREA, area_id: idsArea['general'] },
      { username: 'ematp', nombre: null, rol: ROLES.SERVIDOR, area_id: null },
    ];

    for (const sector of sectores) {
      await db.ejecutar(
        `INSERT OR IGNORE INTO usuarios
          (username, nombre, password_hash, rol, area_id, password_change_allowed, password_change_count)
         VALUES (?, ?, ?, ?, ?, 1, 0)`,
        sector.username, sector.nombre, hashSector, sector.rol, sector.area_id
      );
    }
    // La contraseña no se imprime: queda en el historial de la terminal y en logs.
    console.log('Cuentas de sector aseguradas (con la contraseña de SEED_PASSWORD)');

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
