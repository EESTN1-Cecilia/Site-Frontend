const jwt = require('jsonwebtoken');
const db = require('../database/db');

// Middleware de autenticación: verifica el JWT y carga al usuario desde la BD.
// Clave: la identidad y el rol salen de la BD (por el id del token), NUNCA del frontend.
async function autenticar(req, res, next) {
  const encabezado = req.headers.authorization;

  if (!encabezado || !encabezado.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }

  const token = encabezado.split(' ')[1];

  try {
    // Se fuerza el algoritmo HS256 (evita ambigüedad de algoritmo).
    const decodificado = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });

    // Se re-lee el usuario en cada request: si fue deshabilitado o cambió de rol,
    // el token viejo deja de ser válido de inmediato.
    const usuario = await db.obtenerFila(
      'SELECT id, username, rol, area_id, activo FROM usuarios WHERE id = ?',
      decodificado.idUsuario
    );

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Cuenta inválida o deshabilitada' });
    }

    req.usuario = usuario;
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
