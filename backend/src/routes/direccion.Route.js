const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/auth.Middleware');
const { requerirRol } = require('../middleware/role.Middleware');
const { ROLES } = require('../utils/roles');
const { resumen } = require('../controllers/direccion.Controller');

// Tablero de Dirección: sólo Dirección lo ve.
router.get('/resumen', autenticar, requerirRol(ROLES.DIRECCION), resumen);

module.exports = router;
