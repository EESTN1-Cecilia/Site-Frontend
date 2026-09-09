// Middleware de autorización (se usa DESPUÉS de autenticar):
//   requerirRol(ROLES.DIRECCION)  → solo superadmin
// Devuelve 403 si el rol del usuario (leído de la BD en auth) no está permitido.
function requerirRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    next();
  };
}

module.exports = { requerirRol };
