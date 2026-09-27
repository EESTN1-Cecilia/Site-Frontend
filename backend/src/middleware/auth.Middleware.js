const db = require('../database/db');
const { verificarToken } = require('../utils/tokens');

// Middleware de autenticación: verifica el JWT y carga al usuario desde la BD.
// Clave: la identidad y el rol salen de la BD (por el id del token), NUNCA del frontend.
async function autenticar(req, res, next) {
  const encabezado = req.headers.authorization;

  if (!encabezado || !encabezado.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }

  const token = encabezado.split(' ')[1];

  try {
    // HS256 fijo, más issuer y audience propios (utils/tokens.js).
    const decodificado = verificarToken(token);

    // Se re-lee el usuario en cada request: si fue deshabilitado o cambió de rol,
    // el token viejo deja de ser válido de inmediato.
    const usuario = await db.obtenerFila(
      'SELECT id, username, rol, area_id, activo, token_version FROM usuarios WHERE id = ?',
      decodificado.idUsuario
    );

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Cuenta inválida o deshabilitada' });
    }

    // Cambiar la contraseña sube token_version: los tokens anteriores ya no sirven.
    if ((decodificado.v || 0) !== (usuario.token_version || 0)) {
      return res.status(401).json({ error: 'La sesión ya no es válida. Iniciá sesión de nuevo.' });
    }

    // Token cerrado con logout antes de vencer.
    if (decodificado.jti) {
      const revocado = await db.obtenerFila('SELECT jti FROM tokens_revocados WHERE jti = ?', decodificado.jti);
      if (revocado) {
        return res.status(401).json({ error: 'La sesión ya no es válida. Iniciá sesión de nuevo.' });
      }
    }

    req.usuario = {
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      area_id: usuario.area_id,
      activo: usuario.activo,
    };
    req.token = { jti: decodificado.jti, exp: decodificado.exp };
    next();
  } catch (error) {
    // Respuestas distintas para token expirado vs inválido (más fácil de depurar),
    // pero ambas son 401.
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    return res.status(401).json({ error: 'Autenticación fallida' });
  }
}

module.exports = autenticar;
