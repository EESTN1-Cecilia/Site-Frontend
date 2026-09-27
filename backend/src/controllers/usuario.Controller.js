const bcrypt = require('bcrypt');
const db = require('../database/db');
const { esRolValido, ROLES } = require('../utils/roles');

const RONDAS_BCRYPT = 12;

// Todas las funciones de este archivo son SOLO para el rol direccion (se protege
// en la ruta con requerirRol). El area_id solo se valida/acepta para jefatura_area.

async function listarUsuarios(req, res) {
  try {
    const usuarios = await db.obtenerFilas(
      `SELECT id, username, rol, area_id, activo, password_change_allowed, password_change_count, created_at
       FROM usuarios`
    );
    return res.json({ usuarios });
  } catch (error) {
    console.error('[Usuarios] Error al listar:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function obtenerUsuarioPorId(req, res) {
  try {
    const { id } = req.params;
    const usuario = await db.obtenerFila(
      `SELECT id, username, rol, area_id, activo, password_change_allowed, password_change_count, created_at
       FROM usuarios WHERE id = ?`,
      id
    );

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json({ usuario });
  } catch (error) {
    console.error('[Usuarios] Error al obtener:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function listarAreas(req, res) {
  try {
    const areas = await db.obtenerFilas('SELECT id, nombre, activo FROM areas WHERE activo = 1');
    return res.json({ areas });
  } catch (error) {
    console.error('[Usuarios] Error al listar áreas:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function crearUsuario(req, res) {
  try {
    const { username, password, rol, area_id } = req.body;

    if (!username || !password || !rol) {
      return res.status(400).json({ error: 'Usuario, contraseña y rol son requeridos' });
    }

    if (typeof username !== 'string' || username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: 'El nombre de usuario debe tener entre 3 y 50 caracteres' });
    }

    if (!esRolValido(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    // Solo jefatura_area puede tener area_id; para el resto se rechaza.
    if (rol === ROLES.JEFATURA_AREA) {
      if (!area_id) {
        return res.status(400).json({ error: 'El area_id es requerido para el rol jefatura_area' });
      }
      const area = await db.obtenerFila('SELECT id FROM areas WHERE id = ? AND activo = 1', area_id);
      if (!area) {
        return res.status(400).json({ error: 'Área inválida o inactiva' });
      }
    }

    if (rol !== ROLES.JEFATURA_AREA && area_id) {
      return res.status(400).json({ error: 'El area_id solo es válido para el rol jefatura_area' });
    }

    const hashContrasena = await bcrypt.hash(password, RONDAS_BCRYPT);

    // Toda cuenta nueva arranca con password_change_allowed=1 y contador en 0.
    const resultado = await db.ejecutar(
      'INSERT INTO usuarios (username, password_hash, rol, area_id, password_change_allowed, password_change_count) VALUES (?, ?, ?, ?, 1, 0)',
      username, hashContrasena, rol, area_id || null
    );

    return res.status(201).json({
      id: resultado.lastID,
      username,
      rol,
      area_id: area_id || null,
      password_change_allowed: true,
      password_change_count: 0,
    });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    }
    console.error('[Usuarios] Error al crear:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function actualizarUsuario(req, res) {
  try {
    const { id } = req.params;
    const { username, rol, area_id, activo } = req.body || {};

    const existente = await db.obtenerFila('SELECT id, rol, area_id FROM usuarios WHERE id = ?', id);
    if (!existente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (rol !== undefined && !esRolValido(rol)) {
      return res.status(400).json({ error: 'Rol inválido' });
    }

    if (username !== undefined) {
      if (typeof username !== 'string' || username.length < 3 || username.length > 50) {
        return res.status(400).json({ error: 'El nombre de usuario debe tener entre 3 y 50 caracteres' });
      }
    }

    if (activo !== undefined && typeof activo !== 'boolean' && activo !== 0 && activo !== 1) {
      return res.status(400).json({ error: 'El campo activo debe ser verdadero o falso' });
    }

    // Dirección no puede dejarse afuera a sí misma: si no, la escuela podría
    // quedar sin nadie que gestione las cuentas.
    if (existente.id === req.usuario.id && ((activo !== undefined && !activo) || (rol && rol !== ROLES.DIRECCION))) {
      return res.status(400).json({ error: 'No podés desactivar tu propia cuenta ni quitarte el rol de dirección' });
    }

    // Mismas reglas que al crear: sólo jefatura_area lleva área, y tiene que ser activa.
    const rolFinal = rol || existente.rol;
    let areaFinal = area_id !== undefined ? (area_id || null) : existente.area_id;
    if (rolFinal === ROLES.JEFATURA_AREA) {
      const area = areaFinal
        ? await db.obtenerFila('SELECT id FROM areas WHERE id = ? AND activo = 1', areaFinal)
        : null;
      if (!area) {
        return res.status(400).json({ error: 'El rol jefatura_area requiere un área válida y activa' });
      }
    } else {
      if (area_id) {
        return res.status(400).json({ error: 'El area_id solo es válido para el rol jefatura_area' });
      }
      areaFinal = null;
    }

    const campos = [];
    const valores = [];

    if (username) { campos.push('username = ?'); valores.push(username); }
    if (rol) { campos.push('rol = ?'); valores.push(rol); }
    if (areaFinal !== existente.area_id) { campos.push('area_id = ?'); valores.push(areaFinal); }
    if (activo !== undefined) { campos.push('activo = ?'); valores.push(activo ? 1 : 0); }

    if (campos.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    campos.push("updated_at = datetime('now')");
    valores.push(id);

    await db.ejecutar(`UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`, ...valores);

    return res.json({ mensaje: 'Usuario actualizado' });
  } catch (error) {
    if (error.message && error.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    }
    console.error('[Usuarios] Error al actualizar:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function eliminarUsuario(req, res) {
  try {
    const { id } = req.params;
    const existente = await db.obtenerFila('SELECT id FROM usuarios WHERE id = ?', id);
    if (!existente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (existente.id === req.usuario.id) {
      return res.status(400).json({ error: 'No podés desactivar tu propia cuenta' });
    }

    // "Eliminar" es un borrado lógico (activo=0): se conserva el historial de uploads.
    await db.ejecutar("UPDATE usuarios SET activo = 0, updated_at = datetime('now') WHERE id = ?", id);
    return res.json({ mensaje: 'Usuario desactivado' });
  } catch (error) {
    console.error('[Usuarios] Error al eliminar:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// El superadmin habilita UN nuevo cambio de contraseña a una cuenta de sector
// que quedó bloqueada (password_change_allowed=1).
async function permitirCambioContrasena(req, res) {
  try {
    const { id } = req.params;

    const existente = await db.obtenerFila('SELECT id FROM usuarios WHERE id = ?', id);
    if (!existente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await db.ejecutar(
      "UPDATE usuarios SET password_change_allowed = 1, updated_at = datetime('now') WHERE id = ?",
      id
    );

    return res.json({ mensaje: 'Cambio de contraseña habilitado para el usuario' });
  } catch (error) {
    console.error('[Usuarios] Error al permitir cambio de contraseña:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// El superadmin pone una contraseña nueva a una cuenta (por ejemplo, si un sector
// perdió el acceso o alguien de afuera se la cambió). Cierra todas las sesiones
// abiertas de esa cuenta y le deja un cambio habilitado para que el sector
// elija la suya.
async function restablecerContrasena(req, res) {
  try {
    const { id } = req.params;
    const { nueva_password } = req.body || {};

    if (typeof nueva_password !== 'string' || nueva_password.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }

    const existente = await db.obtenerFila('SELECT id FROM usuarios WHERE id = ?', id);
    if (!existente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const hashContrasena = await bcrypt.hash(nueva_password, RONDAS_BCRYPT);
    await db.ejecutar(
      `UPDATE usuarios SET
        password_hash = ?,
        password_change_allowed = 1,
        token_version = token_version + 1,
        updated_at = datetime('now')
       WHERE id = ?`,
      hashContrasena, id
    );

    return res.json({ mensaje: 'Contraseña restablecida. Se cerraron las sesiones abiertas de la cuenta.' });
  } catch (error) {
    console.error('[Usuarios] Error al restablecer contraseña:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = {
  listarUsuarios,
  obtenerUsuarioPorId,
  listarAreas,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  permitirCambioContrasena,
  restablecerContrasena,
};
