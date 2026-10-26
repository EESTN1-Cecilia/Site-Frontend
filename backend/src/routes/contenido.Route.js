const express = require('express');
const router = express.Router();
const autenticar = require('../middleware/auth.Middleware');
const { requerirRol } = require('../middleware/role.Middleware');
const { ROLES } = require('../utils/roles');
const { EDITORES } = require('../utils/contenido');
const c = require('../controllers/contenido.Controller');

// Rutas del contenido del sitio público (textos, ajustes, notas, mesas,
// programas y proyectos). Se montan en /api ANTES del express.json global de
// 10 kb: las páginas y las notas llevan imágenes subidas, así que acá el
// límite es mayor, y el cuerpo se lee recién después de autenticar.
const cuerpo = express.json({ limit: '8mb' });
const TODOS = [ROLES.DIRECCION, ROLES.JEFATURA_AREA, ROLES.SERVIDOR];

router.get('/contenido', c.obtenerContenido);

// El permiso por página lo decide el controlador (depende del reparto de Dirección).
router.put('/contenido/textos', autenticar, requerirRol(...TODOS), cuerpo, c.guardarTextos);
router.put('/ajustes', autenticar, requerirRol(...EDITORES.ajustes), cuerpo, c.guardarAjustes);

router.get('/publicaciones', autenticar, c.listarPublicaciones);
router.post('/publicaciones', autenticar, requerirRol(...EDITORES.publicaciones), cuerpo, c.guardarPublicacion);
router.post('/publicaciones/:id/aprobar', autenticar, requerirRol(ROLES.DIRECCION), c.aprobarPublicacion);
router.post('/publicaciones/:id/devolver', autenticar, requerirRol(ROLES.DIRECCION), c.devolverPublicacion);
router.delete('/publicaciones/:id', autenticar, requerirRol(...EDITORES.publicaciones), c.borrarPublicacion);

router.put('/mesas', autenticar, requerirRol(...EDITORES.mesas), cuerpo, c.guardarMesas);
router.put('/programas', autenticar, requerirRol(...EDITORES.programas), cuerpo, c.guardarProgramas);
router.put('/proyectos/:area', autenticar, requerirRol(...EDITORES.proyectos), cuerpo, c.guardarProyectos);

// El panel (grillas, plano y asignaciones) está en asignaciones.Route.js.

module.exports = router;
