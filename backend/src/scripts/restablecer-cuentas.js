require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcrypt');
const db = require('../database/db');

const RONDAS_BCRYPT = 12;

// Las cuentas de sector que crea seed.js (misma lista).
const SECTORES = ['daniela_monje', 'mariano_cipres', 'ematp'];

// Vuelve las cuentas del seed a las contraseñas del .env: "admin" a la de
// ADMIN_PASSWORD y las de sector a la de SEED_PASSWORD. Sirve para probar el
// sitio en local con una base que ya estaba creada: el seed usa INSERT OR
// IGNORE y no pisa cuentas existentes.
// También les devuelve el cambio de contraseña disponible y cierra sus
// sesiones abiertas (sube token_version). No imprime las contraseñas.
// En producción no corre: ahí cada sector ya eligió la suya y esto la pisaría.
function contrasenaDeEntorno(nombre) {
  const valor = process.env[nombre];
  if (!valor || valor.length < 8) {
    console.error(`${nombre} es requerida y debe tener al menos 8 caracteres`);
    process.exit(1);
  }
  return valor;
}

async function restablecer() {
  if (process.env.NODE_ENV === 'production') {
    console.error('Este script es para probar en local: no corre con NODE_ENV=production.');
    console.error('Para la cuenta admin del servidor usá npm run restablecer-admin.');
    process.exit(1);
  }

  const hashAdmin = await bcrypt.hash(contrasenaDeEntorno('ADMIN_PASSWORD'), RONDAS_BCRYPT);
  const hashSector = await bcrypt.hash(contrasenaDeEntorno('SEED_PASSWORD'), RONDAS_BCRYPT);

  try {
    await db.asegurarMigraciones();

    const cuentas = [['admin', hashAdmin], ...SECTORES.map((usuario) => [usuario, hashSector])];
    const faltan = [];
    for (const [usuario, hash] of cuentas) {
      const resultado = await db.ejecutar(
        `UPDATE usuarios SET
          password_hash = ?,
          activo = 1,
          password_change_allowed = 1,
          password_change_count = 0,
          token_version = token_version + 1,
          updated_at = datetime('now')
         WHERE username = ?`,
        hash, usuario
      );
      if (resultado.changes !== 1) faltan.push(usuario);
    }

    if (faltan.length) {
      console.error(`No existen: ${faltan.join(', ')}. Corré primero el seed (node src/scripts/seed.js).`);
      db.close();
      process.exit(1);
    }

    console.log('Cuentas de prueba restablecidas: admin con ADMIN_PASSWORD y las de sector con SEED_PASSWORD.');
    console.log('Se cerraron sus sesiones abiertas.');
    db.close();
    process.exit(0);
  } catch (error) {
    console.error('Error al restablecer las cuentas:', error.message);
    db.close();
    process.exit(1);
  }
}

restablecer();
