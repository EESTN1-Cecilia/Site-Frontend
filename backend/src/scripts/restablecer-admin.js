require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const bcrypt = require('bcrypt');
const db = require('../database/db');

const RONDAS_BCRYPT = 12;

// Pone a la cuenta "admin" la contraseña de ADMIN_PASSWORD.
// El seed usa INSERT OR IGNORE: si "admin" ya existe, cambiar ADMIN_PASSWORD en
// .env no cambia su contraseña. Este script sí lo hace, y cierra las sesiones
// abiertas de la cuenta (sube token_version). No imprime la contraseña.
async function restablecer() {
  const contrasena = process.env.ADMIN_PASSWORD;
  if (!contrasena || contrasena.length < 8) {
    console.error('ADMIN_PASSWORD es requerida y debe tener al menos 8 caracteres');
    process.exit(1);
  }

  try {
    await db.asegurarMigraciones();

    const hash = await bcrypt.hash(contrasena, RONDAS_BCRYPT);
    const resultado = await db.ejecutar(
      `UPDATE usuarios SET
        password_hash = ?,
        activo = 1,
        token_version = token_version + 1,
        updated_at = datetime('now')
       WHERE username = 'admin'`,
      hash
    );

    if (resultado.changes !== 1) {
      console.error('No existe la cuenta "admin": corré primero el seed (node src/scripts/seed.js)');
      db.close();
      process.exit(1);
    }

    console.log('Contraseña de "admin" actualizada con la de ADMIN_PASSWORD. Se cerraron sus sesiones abiertas.');
    db.close();
    process.exit(0);
  } catch (error) {
    console.error('Error al restablecer la contraseña:', error.message);
    db.close();
    process.exit(1);
  }
}

restablecer();
