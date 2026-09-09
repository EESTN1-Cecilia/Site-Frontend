// Roles del sistema (constantes centralizadas: se usan en controllers, rutas y seed).
const ROLES = {
  JEFATURA_AREA: 'jefatura_area',
  SERVIDOR: 'server',
  DIRECCION: 'direccion',
};

// Lista blanca de roles válidos (para validar lo que llega por request).
const ROLES_VALIDOS = Object.values(ROLES);

function esRolValido(rol) {
  return ROLES_VALIDOS.includes(rol);
}

module.exports = { ROLES, ROLES_VALIDOS, esRolValido };
