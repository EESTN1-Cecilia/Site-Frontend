const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/auth.Middleware');
const { requerirRol } = require('../middleware/role.Middleware');
const {
  listarUsuarios,
  obtenerUsuarioPorId,
  listarAreas,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  permitirCambioContrasena,
} = require('../controllers/usuario.Controller');

// Todas las rutas de usuarios exigen autenticación y rol direccion (superadmin).
router.use(autenticar);
router.use(requerirRol('direccion'));

router.get('/', listarUsuarios);
router.get('/areas', listarAreas);
router.get('/:id', obtenerUsuarioPorId);
router.post('/', crearUsuario);
// IMPORTANTE: /permitir-cambio/:id debe ir ANTES de /:id, si no Express capturaría
// "permitir-cambio" como si fuera un :id y la ruta nunca se alcanzaría.
router.put('/permitir-cambio/:id', permitirCambioContrasena);
router.put('/:id', actualizarUsuario);
router.delete('/:id', eliminarUsuario);

module.exports = router;
