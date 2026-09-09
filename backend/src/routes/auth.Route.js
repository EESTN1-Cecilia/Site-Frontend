const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/auth.Middleware');
const { iniciarSesion, cerrarSesion, obtenerUsuario, cambiarMiContrasena } = require('../controllers/auth.Controller');

// /login es público; el resto exige autenticación.
router.post('/login', iniciarSesion);
router.post('/logout', autenticar, cerrarSesion);
router.get('/me', autenticar, obtenerUsuario);
router.put('/password', autenticar, cambiarMiContrasena);

module.exports = router;
