const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { ROLES } = require('../utils/roles');

const RONDAS_BCRYPT = 12;

// Login: valida credenciales con bcrypt y emite un JWT.
// Anti-enumeración: usuario inexistente, deshabilitado y contraseña incorrecta
// devuelven el mismo 401 (no se revela si el usuario existe).
async function iniciarSesion(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Credenciales inválidas' });
    }

    const usuario = await db.obtenerFila(
      'SELECT id, username, password_hash, rol, area_id, activo FROM usuarios WHERE username = ?',
      username
    );

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!usuario.activo) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const contrasenaValida = await bcrypt.compare(password, usuario.password_hash);
    if (!contrasenaValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { idUsuario: usuario.id },
      process.env.JWT_SECRET,
      { expiresIn: '8h', algorithm: 'HS256' }
    );

    // El token solo lleva el id; el resto (rol, area) se lee de la BD en cada request.
    return res.json({
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        rol: usuario.rol,
        area_id: usuario.area_id,
      },
    });
  } catch (error) {
    console.error('[Auth] Error en login:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

function cerrarSesion(req, res) {
  // Con JWT stateless no hay sesión que invalidar en el server: el cliente descarta el token.
  return res.json({ mensaje: 'Sesión cerrada correctamente' });
}

// Devuelve los datos del usuario autenticado y los destinos de subida que le corresponden.
async function obtenerUsuario(req, res) {
  try {
    const usuario = await db.obtenerFila(
      'SELECT id, username, rol, area_id, password_change_allowed, password_change_count FROM usuarios WHERE id = ?',
      req.usuario.id
    );

    if (!usuario) {
      return res.status(401).json({ error: 'Cuenta inválida' });
    }

    const respuesta = {
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      area_id: usuario.area_id,
      password_change_allowed: !!usuario.password_change_allowed,
      password_change_count: usuario.password_change_count || 0,
    };

    if (usuario.rol === ROLES.JEFATURA_AREA && usuario.area_id) {
      const area = await db.obtenerFila('SELECT nombre FROM areas WHERE id = ?', usuario.area_id);
      respuesta.destinos = area ? [area.nombre] : [];
    } else if (usuario.rol === ROLES.SERVIDOR) {
      respuesta.destinos = ['server'];
    } else if (usuario.rol === ROLES.DIRECCION) {
      const areas = await db.obtenerFilas('SELECT nombre FROM areas WHERE activo = 1');
      respuesta.destinos = [...areas.map(a => a.nombre), 'server'];
    }

    return res.json({ usuario: respuesta });
  } catch (error) {
    console.error('[Auth] Error al obtener usuario:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// Cambio de contraseña con regla de "una sola vez" para cuentas de sector.
// - direccion: puede cambiar SIEMPRE (no se auto-bloquea).
// - jefatura_area / server: cambian una vez y quedan bloqueados (password_change_allowed=0)
//   hasta que el superadmin los habilite con PUT /api/usuarios/permitir-cambio/:id.
async function cambiarMiContrasena(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const rol = req.usuario.rol;
    const { password_actual, nueva_password } = req.body;

    if (!password_actual || !nueva_password) {
      return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }

    if (typeof nueva_password !== 'string' || nueva_password.length < 8) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
    }

    if (typeof password_actual !== 'string') {
      return res.status(400).json({ error: 'Contraseña actual inválida' });
    }

    const usuario = await db.obtenerFila(
      'SELECT password_hash, rol, password_change_allowed, password_change_count FROM usuarios WHERE id = ?',
      usuarioId
    );

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const contrasenaValida = await bcrypt.compare(password_actual, usuario.password_hash);
    if (!contrasenaValida) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    const esSuperAdmin = rol === ROLES.DIRECCION;

    // Los sectores solo pueden cambiar si el superadmin les habilitó un cambio.
    if (!esSuperAdmin && !usuario.password_change_allowed) {
      return res.status(403).json({
        error: 'Esta cuenta ya utilizó su cambio de contraseña. Debe solicitar permiso a la dirección.',
      });
    }

    // Evita que pongan una contraseña igual a la actual.
    const contrasenaNuevaIgual = await bcrypt.compare(nueva_password, usuario.password_hash);
    if (contrasenaNuevaIgual) {
      return res.status(400).json({ error: 'La nueva contraseña no puede ser igual a la actual' });
    }

    const nuevoHash = await bcrypt.hash(nueva_password, RONDAS_BCRYPT);

    // Para sectores se bloquea el próximo cambio (allowed=0) y se incrementa el contador.
    const esCambioDeContrasena = usuario.rol !== ROLES.DIRECCION;

    await db.ejecutar(
      `UPDATE usuarios SET
        password_hash = ?,
        password_change_allowed = ?,
        password_change_count = password_change_count + 1,
        updated_at = datetime('now')
       WHERE id = ?`,
      nuevoHash,
      esCambioDeContrasena ? 0 : 1,
      usuarioId
    );

    return res.json({
      mensaje: 'Contraseña actualizada correctamente',
      password_change_count: (usuario.password_change_count || 0) + 1,
      password_change_allowed: esSuperAdmin,
    });
  } catch (error) {
    console.error('[Auth] Error al cambiar contraseña:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { iniciarSesion, cerrarSesion, obtenerUsuario, cambiarMiContrasena };
