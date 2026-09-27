const bcrypt = require('bcrypt');
const db = require('../database/db');
const { ROLES } = require('../utils/roles');
const { emitirToken } = require('../utils/tokens');
const intentos = require('../utils/intentos');

const RONDAS_BCRYPT = 12;

// Hash de una contraseña que nadie usa: si el usuario no existe se compara igual
// contra este, para que el tiempo de respuesta no revele si la cuenta existe.
let hashFicticio = null;
const obtenerHashFicticio = () => {
  hashFicticio = hashFicticio || bcrypt.hash('cuenta-inexistente', RONDAS_BCRYPT);
  return hashFicticio;
};

// Login: valida credenciales con bcrypt y emite un JWT.
// Anti-enumeración: usuario inexistente, deshabilitado y contraseña incorrecta
// devuelven el mismo 401 y tardan lo mismo (siempre se corre bcrypt).
// Anti fuerza bruta: tope de intentos fallidos por IP y por usuario (utils/intentos.js).
async function iniciarSesion(req, res) {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
  }

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Credenciales inválidas' });
  }

  const espera = intentos.segundosBloqueado(req.ip, username);
  if (espera) {
    res.set('Retry-After', String(espera));
    return res.status(429).json({ error: 'Demasiados intentos fallidos. Probá de nuevo en unos minutos.' });
  }

  if (!intentos.tomarTurno()) {
    res.set('Retry-After', '1');
    return res.status(429).json({ error: 'El servidor está ocupado. Probá de nuevo en unos segundos.' });
  }

  try {
    const usuario = await db.obtenerFila(
      'SELECT id, username, password_hash, rol, area_id, activo, token_version FROM usuarios WHERE username = ?',
      username
    );

    const cuentaValida = !!usuario && !!usuario.activo;
    const hash = cuentaValida ? usuario.password_hash : await obtenerHashFicticio();
    const contrasenaValida = await bcrypt.compare(password, hash);

    if (!cuentaValida || !contrasenaValida) {
      intentos.registrarFallo(req.ip, username);
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    intentos.registrarExito(username);

    // El token solo lleva el id (y la versión de credencial); el resto (rol, area)
    // se lee de la BD en cada request.
    return res.json({
      token: emitirToken(usuario),
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
  } finally {
    intentos.liberarTurno();
  }
}

// Logout: el token queda revocado en el servidor hasta que vence, aunque
// alguien se haya guardado una copia. Sólo afecta a esta sesión: las demás
// sesiones de una cuenta de sector compartida siguen abiertas.
async function cerrarSesion(req, res) {
  try {
    if (req.token && req.token.jti) {
      const ahora = Math.floor(Date.now() / 1000);
      await db.ejecutar('DELETE FROM tokens_revocados WHERE expira < ?', ahora);
      await db.ejecutar(
        'INSERT OR IGNORE INTO tokens_revocados (jti, expira) VALUES (?, ?)',
        req.token.jti, req.token.exp || ahora
      );
    }
    return res.json({ mensaje: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('[Auth] Error al cerrar sesión:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
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
// Cambiar la contraseña cierra todas las sesiones abiertas de la cuenta (sube
// token_version); quien la cambió recibe un token nuevo en la respuesta.
async function cambiarMiContrasena(req, res) {
  try {
    const usuarioId = req.usuario.id;
    const { password_actual, nueva_password } = req.body || {};

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

    const esSuperAdmin = usuario.rol === ROLES.DIRECCION;

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

    // UPDATE condicional: si otro pedido cambió la contraseña (o gastó el cambio
    // habilitado) mientras corría bcrypt, no se aplica. Así el cambio único no se
    // puede duplicar con dos pedidos simultáneos.
    const resultado = await db.ejecutar(
      `UPDATE usuarios SET
        password_hash = ?,
        password_change_allowed = ?,
        password_change_count = password_change_count + 1,
        token_version = token_version + 1,
        updated_at = datetime('now')
       WHERE id = ? AND password_hash = ? AND (password_change_allowed = 1 OR rol = ?)`,
      nuevoHash,
      esSuperAdmin ? 1 : 0,
      usuarioId,
      usuario.password_hash,
      ROLES.DIRECCION
    );

    if (resultado.changes !== 1) {
      return res.status(409).json({ error: 'La contraseña cambió mientras se procesaba el pedido. Probá de nuevo.' });
    }

    const actualizado = await db.obtenerFila('SELECT id, token_version FROM usuarios WHERE id = ?', usuarioId);

    return res.json({
      mensaje: 'Contraseña actualizada correctamente',
      password_change_count: (usuario.password_change_count || 0) + 1,
      password_change_allowed: esSuperAdmin,
      token: emitirToken(actualizado),
    });
  } catch (error) {
    console.error('[Auth] Error al cambiar contraseña:', error.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { iniciarSesion, cerrarSesion, obtenerUsuario, cambiarMiContrasena };
