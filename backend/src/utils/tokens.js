const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Emisión y verificación de JWT en un solo lugar.
// - issuer/audience: un token de otro servicio firmado con la misma clave no sirve acá.
// - jti: identifica el token para poder revocarlo en el logout.
// - v: versión de credencial del usuario; al cambiar la contraseña se incrementa
//   en la BD y los tokens anteriores dejan de valer.
const OPCIONES = { issuer: 'tec1-backend', audience: 'tec1-panel' };
const DURACION = '8h';

function emitirToken(usuario) {
  return jwt.sign(
    { idUsuario: usuario.id, v: usuario.token_version || 0 },
    process.env.JWT_SECRET,
    { ...OPCIONES, expiresIn: DURACION, algorithm: 'HS256', jwtid: crypto.randomUUID() }
  );
}

function verificarToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { ...OPCIONES, algorithms: ['HS256'] });
}

module.exports = { emitirToken, verificarToken, OPCIONES };
